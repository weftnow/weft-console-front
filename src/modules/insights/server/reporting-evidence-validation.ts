import "server-only";
import { canonicalPair } from "@/modules/attendees/networking-eligibility";
import { ApplicationError } from "@/shared/lib/application-error";
import { reportingEvidenceSchema, type ReportingEvidence } from "../reporting-contract";
import type { EventRecords } from "./reporting-records";

function invalid(path: string, message: string): never {
  throw new ApplicationError("VALIDATION_ERROR", "Check the reporting evidence.", { [path]: message });
}

function unique(keys: Set<string>, key: string, path: string) {
  if (keys.has(key)) invalid(path, "This entry appears more than once.");
  keys.add(key);
}

function checkText(value: string | undefined, path: string) {
  // PostgreSQL jsonb requires Unicode scalar values and cannot represent U+0000.
  if (value !== undefined && (value.includes("\0") || !value.isWellFormed())) invalid(path, "Enter valid Unicode text without null characters.");
}

function checkSize(evidence: unknown) {
  let json: string;
  try {
    // Leave room for the revision on the next replacement through the bounded JSON request reader.
    json = JSON.stringify({ evidence, expectedRevision: 2147483647 });
  } catch {
    invalid("evidence", "Enter a JSON document.");
  }
  if (Buffer.byteLength(json) > 3 * 1024 * 1024) {
    throw new ApplicationError("PAYLOAD_TOO_LARGE", "The reporting evidence is too large.");
  }
}

export function parseEvidence(input: unknown): ReportingEvidence {
  checkSize(input);
  const parsed = reportingEvidenceSchema.safeParse(input);
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.slice(0, 20).map((issue) => [
      ["evidence", ...issue.path].join("."), issue.message,
    ]));
    throw new ApplicationError("VALIDATION_ERROR", "Check the reporting evidence.", fields);
  }
  const evidence = parsed.data;
  checkSize(evidence); // Contract defaults can enlarge the saved document.
  checkText(evidence.series?.label, "evidence.series.label");
  const people = new Set<string>();
  const networkKeys = new Set<string>();
  evidence.participants.forEach((person, i) => {
    const path = `evidence.participants.${i}`;
    unique(people, person.personId, `${path}.personId`);
    if (person.networkKey) unique(networkKeys, person.networkKey, `${path}.networkKey`);
    checkText(person.segment, `${path}.segment`);
    const goals = new Set<string>();
    person.goals.forEach((goal, j) => unique(goals, goal.kind, `${path}.goals.${j}.kind`));
  });
  const requests = new Set<string>();
  evidence.requests?.forEach((request, i) => unique(requests, request.id, `evidence.requests.${i}.id`));
  const windows = new Set<string>();
  evidence.followUps.forEach((entry, i) => unique(windows, `${entry.matchId}/${entry.window}`, `evidence.followUps.${i}.window`));
  const pairs = new Set<string>();
  evidence.reconnections.forEach(([a, b], i) => {
    const path = `evidence.reconnections.${i}`;
    if (a === b) invalid(path, "Choose two different people.");
    unique(pairs, canonicalPair(a, b).join("/"), path);
  });
  const sponsors = new Set<string>();
  evidence.sponsors.forEach((sponsor, i) => {
    const path = `evidence.sponsors.${i}`;
    unique(sponsors, sponsor.key, `${path}.key`);
    checkText(sponsor.label, `${path}.label`);
    const objectives = new Set<string>();
    sponsor.objectives.forEach((objective, j) => {
      const field = `${path}.objectives.${j}`;
      unique(objectives, objective.key, `${field}.key`);
      checkText(objective.label, `${field}.label`);
      checkText(objective.nextStep, `${field}.nextStep`);
      const matches = new Set<string>();
      objective.matchIds.forEach((match, k) => unique(matches, match, `${field}.matchIds.${k}`));
    });
  });
  return evidence;
}

// Reads omit references that became obsolete after an identity link, revocation, or correction.
// The revisioned editor document keeps the original entries so organizers can correct them.
export function scopeEvidence(evidence: ReportingEvidence, records: EventRecords, mode: "read" | "write"): ReportingEvidence {
  const people = new Set(records.people.map((person) => person.personId));
  const matches = new Map(records.matches.map((match) => [match.id, match]));
  function personExists(id: string, path: string) {
    if (people.has(id)) return true;
    if (mode === "write") invalid(path, "Choose a person on this event's roster.");
    return false;
  }
  function matchExists(id: string, path: string, completed: boolean) {
    const match = matches.get(id);
    if (match && (!completed || match.completedAt !== null)) return true;
    if (mode === "write") invalid(path, completed ? "Choose a confirmed meeting in this event." : "Choose a reportable match in this event.");
    return false;
  }
  return {
    ...evidence,
    participants: evidence.participants.filter((p, i) => personExists(p.personId, `evidence.participants.${i}.personId`)),
    requests: evidence.requests?.filter((r, i) => personExists(r.personId, `evidence.requests.${i}.personId`)) ?? null,
    reconnections: evidence.reconnections.filter((pair, i) => pair.every((id, j) => personExists(id, `evidence.reconnections.${i}.${j}`))),
    followUps: evidence.followUps.filter((f, i) => matchExists(f.matchId, `evidence.followUps.${i}.matchId`, true)),
    sponsors: evidence.sponsors.map((s, i) => ({
      ...s, objectives: s.objectives.map((o, j) => ({
        ...o, matchIds: o.matchIds.filter((id, k) => matchExists(id, `evidence.sponsors.${i}.objectives.${j}.matchIds.${k}`, false)),
      })),
    })),
  };
}
