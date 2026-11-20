import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { getReportingEvidence, readReportingSources, saveReportingEvidence } = loadTs("src/modules/insights/server/reporting-evidence.ts");
const scope = { organizationId: randomUUID(), userId: randomUUID(), eventId: randomUUID() };
const personId = randomUUID();
const matchId = randomUUID();
const goal = { kind: "peers", result: "achieved" };
const request = { id: "ask", personId, kind: "peers", status: "open" };
const checkIn = { matchId, window: 7, followUp: false, secondMeeting: null, opportunity: true };
const objective = { key: "leads", label: "Leads", measure: "qualified", target: null, matchIds: [matchId] };
const sponsor = { key: "partner", label: "Partner", objectives: [objective] };

test("invalid reporting scope, revisions and evidence shapes fail with bounded field details", async () => {
  for (const read of [getReportingEvidence, saveReportingEvidence]) {
    await assert.rejects(read({ ...scope, userId: "external-subject" }), { code: "FORBIDDEN" });
    await assert.rejects(read({ ...scope, eventId: "" }), { code: "NOT_FOUND" });
  }
  await assert.rejects(readReportingSources(scope, { eventId: "bad", across: true }), { code: "NOT_FOUND" });
  await assert.rejects(readReportingSources(scope, { across: "false" }), { code: "VALIDATION_ERROR" });
  for (const expectedRevision of [-1, 0.5, 2 ** 31, "0"]) {
    await assert.rejects(saveReportingEvidence({ ...scope, evidence: {}, expectedRevision }), { code: "VALIDATION_ERROR" });
  }
  await assert.rejects(saveReportingEvidence({ ...scope, expectedRevision: 0, evidence: { participants: Array(2001).fill({}) } }),
    (error) => error.code === "VALIDATION_ERROR" && Object.keys(error.fields).length <= 20 && !!error.fields["evidence.participants.0.personId"]);
  await assert.rejects(saveReportingEvidence({ ...scope, expectedRevision: 0, evidence: { segment: "ü".repeat(1600000) } }),
    { code: "PAYLOAD_TOO_LARGE" });
});

test("evidence rejects duplicate keys in their own scope, self-reconnections and non-storable text", async () => {
  const other = randomUUID();
  const cases = [
    [{ participants: [{ personId }, { personId: personId.toUpperCase() }] }, "participants.1.personId"],
    [{ participants: [{ personId, networkKey: "p" }, { personId: other, networkKey: "p" }] }, "participants.1.networkKey"],
    [{ participants: [{ personId, goals: [goal, goal] }] }, "participants.0.goals.1.kind"],
    [{ requests: [request, request] }, "requests.1.id"],
    [{ followUps: [checkIn, { ...checkIn, matchId: matchId.toUpperCase() }] }, "followUps.1.window"],
    [{ reconnections: [[personId, other], [other, personId]] }, "reconnections.1"],
    [{ reconnections: [[personId, personId]] }, "reconnections.0"],
    [{ sponsors: [sponsor, sponsor] }, "sponsors.1.key"],
    [{ sponsors: [{ ...sponsor, objectives: [objective, objective] }] }, "sponsors.0.objectives.1.key"],
    [{ sponsors: [{ ...sponsor, objectives: [{ ...objective, matchIds: [matchId, matchId] }] }] }, "sponsors.0.objectives.0.matchIds.1"],
    [{ series: { key: "series", label: "embedded\0nul" } }, "series.label"],
    [{ participants: [{ personId, segment: "lone\uD800" }] }, "participants.0.segment"],
    [{ requests: [{ ...request, personId: 42 }] }, "requests.0.personId"],
  ];
  for (const [evidence, field] of cases) {
    await assert.rejects(saveReportingEvidence({ ...scope, expectedRevision: 0, evidence }),
      (error) => error.code === "VALIDATION_ERROR" && !!error.fields[`evidence.${field}`], field);
  }
});
