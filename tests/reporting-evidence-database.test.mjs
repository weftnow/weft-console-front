import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { loadTs } from "./load-ts.mjs";
import { createOutcomesFixture, outcomesDatabaseEnabled } from "./outcomes-fixture.mjs";

const { getReportingEvidence, readReportingSources, saveReportingEvidence } = loadTs("src/modules/insights/server/reporting-evidence.ts");
const { startOutcomesTracking, setMatchCompletion } = loadTs("src/modules/insights/server/outcomes-service.ts");
const { reportingEvidenceSchema } = loadTs("src/modules/insights/reporting-contract.ts");
const gated = { skip: !outcomesDatabaseEnabled };
const blank = { revision: 0, evidence: reportingEvidenceSchema.parse({}) };
const objective = (matchIds) => ({ key: "intro", label: "Introductions", measure: "qualified", target: 5, matchIds });
const sponsor = (matchIds) => ({ key: "partner", label: "Partner", objectives: [objective(matchIds)] });
const followUp = (matchId) => ({ matchId, window: 7, followUp: true, secondMeeting: false, opportunity: null });

async function setDates(pool, eventId, days) {
  await pool.query(`update events set starts_at = now() + $2 * interval '1 day',
    ends_at = now() + $2 * interval '1 day' + interval '2 hours' where id = $1`, [eventId, days]);
}

test("event selection defaults, across cutoff, explicit scope and empty organization", gated, async (t) => {
  const { pool, organizationId, userIds, eventId, untrackedId, foreignEventId } = await createOutcomesFixture(t);
  const scope = { organizationId, userId: userIds.owner };
  const read = (selection = { across: false }) => readReportingSources(scope, selection);
  await setDates(pool, eventId, 1);
  await setDates(pool, untrackedId, 3);
  assert.equal((await read()).selectedEventId, eventId);
  assert.deepEqual((await read({ across: true })).sources, []);
  await setDates(pool, eventId, -3);
  await setDates(pool, untrackedId, -1);
  assert.equal((await read()).selectedEventId, untrackedId);
  const across = await read({ across: true });
  assert.deepEqual(across.sources.map(({ id }) => id), [eventId, untrackedId]);
  assert.deepEqual(across.events.map(({ id }) => id), [untrackedId, eventId]);
  await setDates(pool, untrackedId, 1);
  assert.equal((await read()).selectedEventId, eventId);
  assert.deepEqual((await read({ across: true })).sources.map(({ id }) => id), [eventId]);
  const explicit = await read({ eventId: untrackedId.toUpperCase(), across: false });
  assert.equal(explicit.selectedEventId, untrackedId);
  assert.deepEqual(explicit.sources.map(({ id, evidence, matches, people, trackingStartedAt }) =>
    ({ id, evidence, matches, people, trackingStartedAt })), [{ id: untrackedId, evidence: null, matches: [], people: [], trackingStartedAt: null }]);
  for (const across of [true, false]) await assert.rejects(read({ across, eventId: foreignEventId }), { code: "NOT_FOUND" });
  await pool.query("delete from events where organization_id = $1", [organizationId]);
  assert.deepEqual(await read(), { events: [], sources: [] });
});

test("membership, event, person and match boundaries apply to every evidence operation", gated, async (t) => {
  const { pool, organizationId, foreignOrgId, eventId, untrackedId, foreignEventId, userIds, addGuest, addMatch } = await createOutcomesFixture(t);
  const scope = { organizationId, eventId, userId: userIds.owner };
  const write = (overrides) => saveReportingEvidence({ ...scope, evidence: {}, expectedRevision: 0, ...overrides });
  assert.deepEqual(await getReportingEvidence(scope), blank);
  for (const access of ["wefter", "operator"]) {
    await pool.query(`insert into event_staff (event_id, organization_id, membership_id, console_access)
      select $1,$2,id,$4 from organization_memberships where user_id = $3 and organization_id = $2
      on conflict (event_id,membership_id) do update set console_access = excluded.console_access`,
    [eventId, organizationId, userIds.staff, access]);
    const staff = { ...scope, userId: userIds.staff };
    await assert.rejects(getReportingEvidence(staff), { code: "FORBIDDEN" });
    await assert.rejects(readReportingSources(staff, { across: true }), { code: "FORBIDDEN" });
    await assert.rejects(write(staff), { code: "FORBIDDEN" });
  }
  for (const denied of [
    ...[userIds.sponsor, userIds.inactive, userIds.outsider, userIds.foreignOwner].map((userId) => ({ ...scope, userId })),
    { ...scope, organizationId: foreignOrgId, eventId: foreignEventId },
  ]) {
    await assert.rejects(getReportingEvidence(denied), { code: "FORBIDDEN" });
    await assert.rejects(readReportingSources(denied, { across: false, eventId: denied.eventId }), { code: "FORBIDDEN" });
    await assert.rejects(write(denied), { code: "FORBIDDEN" });
  }
  await assert.rejects(getReportingEvidence({ ...scope, eventId: foreignEventId }), { code: "NOT_FOUND" });
  await assert.rejects(write({ eventId: foreignEventId }), { code: "NOT_FOUND" });
  const local = await addGuest(eventId, 0);
  for (const otherEvent of [untrackedId, foreignEventId]) {
    const [a, b] = await Promise.all([addGuest(otherEvent, 0), addGuest(otherEvent, 1)]);
    const matchId = await addMatch(otherEvent, a, b);
    for (const evidence of [
      { participants: [{ personId: a.personId }] },
      { requests: [{ id: "need", personId: a.personId, kind: "peers", status: "open" }] },
      { reconnections: [[local.personId, b.personId]] }, { sponsors: [sponsor([matchId])] }, { followUps: [followUp(matchId)] },
    ]) await assert.rejects(write({ evidence }), { code: "VALIDATION_ERROR" });
  }
  assert.deepEqual(await getReportingEvidence(scope), blank);
});

test("attendance history uses only earlier verified keys in the selected organization", gated, async (t) => {
  const { pool, organizationId, foreignOrgId, userIds, eventId, untrackedId, foreignEventId, addGuest } = await createOutcomesFixture(t);
  await Promise.all([
    setDates(pool, untrackedId, -10), setDates(pool, eventId, -2), setDates(pool, foreignEventId, -20),
  ]);
  const [first, repeat, newcomer, foreign] = await Promise.all([
    addGuest(untrackedId, 0), addGuest(eventId, 0), addGuest(eventId, 1), addGuest(foreignEventId, 0),
  ]);
  const evidence = (participants) => ({ participants: participants.map(([person, networkKey]) => ({ personId: person.personId, networkKey, attended: true })) });
  const scope = { organizationId, userId: userIds.owner };
  await saveReportingEvidence({ ...scope, eventId: untrackedId, expectedRevision: 0, evidence: evidence([[first, "returning"]]) });
  await saveReportingEvidence({ ...scope, eventId, expectedRevision: 0, evidence: evidence([[repeat, "returning"], [newcomer, "other-tenant"]]) });
  await saveReportingEvidence({ organizationId: foreignOrgId, userId: userIds.foreignOwner, eventId: foreignEventId, expectedRevision: 0, evidence: evidence([[foreign, "other-tenant"]]) });
  assert.deepEqual((await readReportingSources(scope, { across: false, eventId })).sources[0].priorNetworkKeys, ["returning"]);
  assert.deepEqual((await readReportingSources(scope, { across: false, eventId: untrackedId })).sources[0].priorNetworkKeys, []);
});

test("replacement races return the authorized current revision and preserve JSON round trips", gated, async (t) => {
  const { pool, organizationId, eventId, userIds } = await createOutcomesFixture(t);
  const scope = { organizationId, eventId, userId: userIds.owner };
  const write = (expectedRevision, evidence, userId = scope.userId) => saveReportingEvidence({ ...scope, userId, evidence, expectedRevision });
  for (const expectedRevision of [0, 1]) {
    const results = await Promise.allSettled([
      write(expectedRevision, { series: { key: "one", label: '  Café 🧭 "1"  ' } }, userIds.owner),
      write(expectedRevision, { series: { key: "two", label: "Dos 🚀" }, requests: [] }, userIds.organizer),
    ]);
    const saved = results.filter((result) => result.status === "fulfilled");
    assert.equal(saved.length, 1);
    const winner = saved[0].value;
    assert.equal(winner.revision, expectedRevision + 1);
    assert.equal(winner.evidence.series.label, winner.evidence.series.key === "one" ? 'Café 🧭 "1"' : "Dos 🚀");
    const stale = results.find((result) => result.status === "rejected").reason;
    assert.equal(stale.code, "CONFLICT");
    assert.deepEqual(stale.details, { kind: "STALE_VERSION", current: winner });
    assert.deepEqual(await getReportingEvidence(scope), winner);
    assert.deepEqual((await readReportingSources(scope, { eventId, across: false })).sources[0].evidence, winner.evidence);
    const { rows } = await pool.query("select updated_by from event_reporting_evidence where event_id = $1", [eventId]);
    assert.deepEqual(rows, [{ updated_by: winner.evidence.series.key === "one" ? userIds.owner : userIds.organizer }]);
  }
  const current = await getReportingEvidence(scope);
  assert.deepEqual(await write(2, JSON.parse(JSON.stringify(current.evidence))), { ...current, revision: 3 });
});

test("report records resolve current roster people, recorded completions, method, and simulator provenance", gated, async (t) => {
  const { pool, organizationId, eventId, userIds, addGuest, addMatch } = await createOutcomesFixture(t);
  const scope = { organizationId, eventId, userId: userIds.owner };
  const source = async () => (await readReportingSources(scope, { eventId, across: false })).sources[0];
  const write = (evidence, expectedRevision = 0) => saveReportingEvidence({ ...scope, evidence, expectedRevision });
  const guests = await Promise.all([0, 1, 2, 3, 4].map((position) => addGuest(eventId, position)));
  const [a, b, c, duplicate, excluded] = guests;
  const complete = await addMatch(eventId, duplicate, b);
  const pending = await addMatch(eventId, a, c);
  const revoked = await addMatch(eventId, b, c);
  const { deterministicUuid } = loadTs("src/modules/network/server/simulated-engine.ts");
  const { DEMO_FIXTURES } = loadTs("src/modules/network/simulation/demo-matches.ts");
  const original = DEMO_FIXTURES[0][0];
  const demo = await addMatch(eventId, a, b, deterministicUuid("recommendation", eventId, original.a, original.b));
  const pair = DEMO_FIXTURES.at(-1)[0];
  const mixedCaseEventId = eventId.replace(/[a-f]/, (letter) => letter.toUpperCase());
  const mixedCaseDemo = await addMatch(eventId, b, excluded, deterministicUuid("recommendation", mixedCaseEventId, pair.a, pair.b));
  await pool.query("update event_matches set pair_score = $2, uncertainty = $3, benefits = $4::jsonb where id = $1",
    [mixedCaseDemo, pair.pairScore, pair.es.uncertainty, JSON.stringify({ [b.id]: pair.es.forB.benefit, [excluded.id]: pair.es.forA.benefit })]);

  const { trackingStartedAt } = await startOutcomesTracking(scope);
  const confirmed = await setMatchCompletion({ ...scope, matchId: complete, expectedRevision: 0, completed: true });
  await pool.query("update event_matches set introduction_path = 'wefter' where id = $1", [complete]);
  await pool.query("update event_matches set status = 'revoked', revoked_at = now(), revocation_reason = 'pair_blocked' where id in ($1, $2)", [complete, revoked]);
  // Even a persisted demo confirmation must never become a report source.
  await pool.query("insert into event_match_completions (event_id,match_id,revision,completed_at) values ($1,$2,1,now())", [eventId, demo]);
  await pool.query("update event_guests set person_id = $2 where id = $1", [duplicate.id, a.personId]);
  await pool.query(`update event_guests set networking_status = 'excluded', networking_exclusion_reason = 'guest_request',
    networking_excluded_at = now(), networking_excluded_by = $3 where id in ($1,$2)`, [a.id, excluded.id, userIds.owner]);
  await pool.query("update event_guests set first_name = 'First' where id = $1", [a.id]);
  const before = await source();
  assert.equal(before.trackingStartedAt, trackingStartedAt);
  assert.equal(before.evidence, null);
  assert.deepEqual(before.people.map((p) => p.personId).sort(), [a, b, c, excluded].map((g) => g.personId).sort());
  assert.equal(before.people.find((p) => p.personId === excluded.personId).eligible, false);
  assert.deepEqual(before.people.find((p) => p.personId === a.personId), { personId: a.personId, eligible: true, name: "First Guest" });
  assert.deepEqual(before.matches.map((m) => m.id).sort(), [complete, pending].sort());
  const meeting = before.matches.find((m) => m.id === complete);
  assert.equal(meeting.method, "wefter");
  assert.equal(meeting.completedAt, confirmed.completedAt);
  assert.deepEqual([...meeting.personIds].sort(), [a.personId, b.personId].sort());
  assert.equal(before.matches.find((m) => m.id === pending).completedAt, null);
  for (const evidence of [
    { participants: [{ personId: duplicate.personId }] }, { sponsors: [sponsor([revoked])] }, { sponsors: [sponsor([demo])] },
    { sponsors: [sponsor([mixedCaseDemo])] }, { followUps: [followUp(demo)] }, { followUps: [followUp(pending)] },
  ]) await assert.rejects(write(evidence), { code: "VALIDATION_ERROR" });

  const saved = await write({
    participants: [{ personId: a.personId.toUpperCase(), networkKey: "first" }],
    reconnections: [[a.personId, b.personId]], sponsors: [sponsor([complete, pending])],
    followUps: [followUp(complete), { ...followUp(complete), window: 30 }],
  });
  const actual = await source();
  assert.deepEqual(actual.evidence, saved.evidence);
  process.env.WEFT_ENGINE_MODE = "simulation";
  await assert.rejects(write({}, 1), (error) => error.code === "CONFLICT" && error.details.kind === "SIMULATION_ACTIVE");
  assert.deepEqual(await getReportingEvidence(scope), saved);
  assert.deepEqual(await source(), actual);
  process.env.WEFT_ENGINE_MODE = "engine";
  await setMatchCompletion({ ...scope, matchId: complete, expectedRevision: 1, completed: false });
  const corrected = await source();
  assert.deepEqual(corrected.matches.map((match) => match.id), [pending]);
  assert.deepEqual(corrected.evidence.followUps, []);
  assert.deepEqual(corrected.evidence.sponsors[0].objectives[0].matchIds, [pending]);
  assert.deepEqual(await getReportingEvidence(scope), saved);
  await assert.rejects(write(saved.evidence, 1), { code: "VALIDATION_ERROR" });
});

test("an across read holds one tenant snapshot while roster and evidence change together", gated, async (t) => {
  const { pool, organizationId, eventId, userIds, addGuest } = await createOutcomesFixture(t);
  const scope = { organizationId, eventId, userId: userIds.owner };
  await setDates(pool, eventId, -2);
  const guest = await addGuest(eventId, 0);
  await saveReportingEvidence({ ...scope, expectedRevision: 0, evidence: { series: { key: "old", label: "Old" } } });
  const writer = await pool.connect();
  let reading;
  try {
    await writer.query("begin");
    await writer.query("lock table event_reporting_evidence in access exclusive mode");
    reading = readReportingSources(scope, { across: true });
    // Observe the reader waiting at the evidence query before committing the paired changes.
    const deadline = Date.now() + 5000;
    while (!(await writer.query(`select 1 from pg_locks where relation = 'event_reporting_evidence'::regclass
      and mode = 'AccessShareLock' and not granted`)).rowCount) {
      assert.ok(Date.now() < deadline, "reader reached evidence query");
      await delay(10);
    }
    await writer.query("update event_guests set first_name = 'After' where id = $1", [guest.id]);
    await writer.query(`update event_reporting_evidence set revision = 2,
      evidence = jsonb_set(evidence, '{series,key}', '"new"') where event_id = $1`, [eventId]);
    await writer.query("commit");
    const observed = (await reading).sources.find((event) => event.id === eventId);
    assert.equal(observed.people[0].name, "Fixture Guest");
    assert.equal(observed.evidence.series.key, "old");
    const next = (await readReportingSources(scope, { across: true })).sources.find((event) => event.id === eventId);
    assert.equal(next.people[0].name, "After Guest");
    assert.equal(next.evidence.series.key, "new");
  } finally {
    await writer.query("rollback");
    writer.release();
    await reading;
  }
});
