import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";
import { createOutcomesFixture, outcomesDatabaseEnabled } from "./outcomes-fixture.mjs";

const { getOutcomesReport, startOutcomesTracking, getMatchCompletion, setMatchCompletion } =
  loadTs("src/modules/insights/server/outcomes-service.ts");
const { ApplicationError } = loadTs("src/shared/lib/application-error.ts");

function hasError(code, kind) {
  return (error) => error instanceof ApplicationError && error.code === code &&
    (kind === undefined || error.details?.kind === kind);
}

test("invalid outcomes scope and changes fail before querying storage", async () => {
  const valid = { userId: "a9e66ce8-6d86-4ff7-b3dc-b1c90cdb2183", organizationId: "08def0a4-5af6-4d62-a424-8b21d4c56d42",
    eventId: "34a7a20c-7a5b-494c-ae4b-8344ac8e73c2", matchId: "2245eceb-e5af-4c65-b47e-4c098f6fbd7b" };
  await assert.rejects(getOutcomesReport({ ...valid, userId: "clerk-id" }), hasError("FORBIDDEN"));
  await assert.rejects(getOutcomesReport({ ...valid, eventId: "" }), hasError("NOT_FOUND"));
  await assert.rejects(startOutcomesTracking({ ...valid, eventId: undefined }), hasError("NOT_FOUND"));
  await assert.rejects(getMatchCompletion({ ...valid, matchId: "bad" }), hasError("NOT_FOUND"));
  for (const expectedRevision of [-1, 0.5, NaN, "0"]) {
    await assert.rejects(setMatchCompletion({ ...valid, expectedRevision, completed: true }), hasError("VALIDATION_ERROR"));
  }
  await assert.rejects(setMatchCompletion({ ...valid, expectedRevision: 0, completed: "false" }), hasError("VALIDATION_ERROR"));
});

test("Outcomes tracking, attestations, and audit history stay scoped and replay safe",
  { skip: !outcomesDatabaseEnabled }, async (t) => {
    const { pool, userIds, organizationId, foreignOrgId, eventId, untrackedId, foreignEventId, addGuest, addMatch } =
      await createOutcomesFixture(t);
    const organization = { userId: userIds.owner, organizationId };
    const localEvent = { ...organization, eventId };
    const organizer = { ...localEvent, userId: userIds.organizer };
    const foreign = { userId: userIds.foreignOwner, organizationId: foreignOrgId, eventId: foreignEventId };
    const [a, b, c, d] = await Promise.all([0, 1, 2, 3].map((position) => addGuest(eventId, position)));
    const [foreignA, foreignB] = await Promise.all([0, 1].map((position) => addGuest(foreignEventId, position)));
    const primary = { ...localEvent, matchId: await addMatch(eventId, a, b) };
    const second = { ...organizer, matchId: await addMatch(eventId, c, d) };
    const foreignMatchId = await addMatch(foreignEventId, foreignA, foreignB);
    const confirm = { ...primary, completed: true, expectedRevision: 0 };

    const unstarted = { trackingStartedAt: null, completedAt: null, revision: 0 };
    const before = await getOutcomesReport(organization);
    assert.deepEqual(before.eventOptions, [
      { eventId: untrackedId, eventName: "Untracked event" },
      { eventId, eventName: "Tracked event" },
    ]);
    assert.deepEqual(before.totals, { completedIntroductions: 0, trackedEvents: 0, totalEvents: 2 });
    assert.ok(before.events.every((event) => event.completedIntroductions === 0 && event.peopleIntroduced === 0 && !event.trackingStartedAt));
    assert.deepEqual(await getMatchCompletion(primary), unstarted);
    await assert.rejects(setMatchCompletion(confirm), hasError("CONFLICT", "TRACKING_NOT_STARTED"));
    await assert.rejects(pool.query("insert into event_match_completions (event_id, match_id, revision) values ($1,$2,1)",
      [eventId, primary.matchId]), { constraint: "event_match_completions_tracking_fk" });

    for (const userId of [userIds.staff, userIds.sponsor, userIds.inactive, userIds.outsider, userIds.foreignOwner]) {
      await assert.rejects(getOutcomesReport({ ...organization, userId }), hasError("FORBIDDEN"));
      await assert.rejects(startOutcomesTracking({ ...localEvent, userId }), hasError("FORBIDDEN"));
      await assert.rejects(getMatchCompletion({ ...primary, userId }), hasError("FORBIDDEN"));
      await assert.rejects(setMatchCompletion({ ...confirm, userId }), hasError("FORBIDDEN"));
    }
    for (const operation of [getOutcomesReport, startOutcomesTracking, getMatchCompletion, setMatchCompletion]) {
      await assert.rejects(operation({ ...confirm, eventId: foreignEventId, matchId: foreignMatchId }), hasError("NOT_FOUND"));
    }
    await assert.rejects(getMatchCompletion({ ...primary, matchId: foreignMatchId }), hasError("NOT_FOUND"));
    await assert.rejects(setMatchCompletion({ ...confirm, matchId: foreignMatchId }), hasError("NOT_FOUND"));
    await assert.rejects(startOutcomesTracking({ ...foreign, userId: userIds.owner }), hasError("FORBIDDEN"));

    const beforeStart = Date.now();
    const [start, repeatedStart] = await Promise.all([startOutcomesTracking(localEvent), startOutcomesTracking(organizer)]);
    assert.deepEqual(repeatedStart, start);
    assert.ok(Date.parse(start.trackingStartedAt) >= beforeStart && Date.parse(start.trackingStartedAt) <= Date.now());
    const tracking = (await pool.query("select started_by, started_at from event_outcomes_tracking where event_id = $1", [eventId])).rows;
    assert.equal(tracking.length, 1);
    assert.ok([userIds.owner, userIds.organizer].includes(tracking[0].started_by));
    assert.equal(tracking[0].started_at.toISOString(), start.trackingStartedAt);
    assert.deepEqual(await getMatchCompletion(primary), { ...unstarted, ...start });
    const zero = await getOutcomesReport(organization);
    assert.deepEqual(zero.totals, { completedIntroductions: 0, trackedEvents: 1, totalEvents: 2 });
    assert.equal(zero.events.find((event) => event.eventId === untrackedId).trackingStartedAt, null);

    await assert.rejects(pool.query("insert into event_match_completions (event_id, match_id, revision) values ($1,$2,1)",
      [eventId, foreignMatchId]), { constraint: "event_match_completions_match_fk" });
    const [completed, replay] = await Promise.all([setMatchCompletion(confirm), setMatchCompletion(confirm)]);
    assert.deepEqual(replay, completed);
    assert.equal(completed.revision, 1);
    assert.ok(Date.parse(completed.completedAt) >= Date.parse(start.trackingStartedAt));
    const corrected = { ...primary, userId: userIds.organizer, expectedRevision: 1, completed: false };
    await assert.rejects(setMatchCompletion({ ...corrected, expectedRevision: 0 }), (error) =>
      hasError("CONFLICT", "STALE_VERSION")(error) && error.details.current.completedAt === completed.completedAt);

    await setMatchCompletion({ ...second, completed: true, expectedRevision: 0 });
    await pool.query("update event_guests set person_id = $2 where id = $1", [c.id, a.personId]);
    await startOutcomesTracking(foreign);
    await setMatchCompletion({ ...foreign, matchId: foreignMatchId, completed: true, expectedRevision: 0 });
    const report = await getOutcomesReport({ ...organizer, eventId: eventId.toUpperCase() });
    assert.deepEqual(report, {
      eventOptions: before.eventOptions,
      selectedEventId: eventId,
      totals: { completedIntroductions: 2, trackedEvents: 1, totalEvents: 1 },
      events: [{ eventId, eventName: "Tracked event", startsAt: "2026-11-18T01:00:00.000Z", timezone: "Asia/Singapore",
        trackingStartedAt: start.trackingStartedAt, completedIntroductions: 2, peopleIntroduced: 3 }],
    });

    await pool.query("update event_matches set status = 'revoked', revoked_at = now(), revocation_reason = 'pair_blocked' where id = $1",
      [primary.matchId]);
    assert.deepEqual(await getOutcomesReport(localEvent), report);
    const undone = await setMatchCompletion(corrected);
    assert.deepEqual(undone, { ...start, completedAt: null, revision: 2 });
    assert.deepEqual(await setMatchCompletion(corrected), undone);
    await assert.rejects(setMatchCompletion(confirm), hasError("CONFLICT", "STALE_VERSION"));
    await assert.rejects(setMatchCompletion({ ...confirm, expectedRevision: 2 }), hasError("CONFLICT", "MATCH_REVOKED"));
    const after = await getOutcomesReport(localEvent);
    assert.equal(after.totals.completedIntroductions, 1);
    assert.equal(after.events[0].peopleIntroduced, 2);
    const history = (await pool.query(
      "select revision, completed, changed_by, changed_at from event_match_completion_changes where event_id = $1 and match_id = $2 order by revision",
      [eventId, primary.matchId],
    )).rows;
    assert.deepEqual(history.map(({ revision, completed, changed_by }) => ({ revision, completed, changed_by })), [
      { revision: 1, completed: true, changed_by: userIds.owner },
      { revision: 2, completed: false, changed_by: userIds.organizer },
    ]);
    assert.equal(history[0].changed_at.toISOString(), completed.completedAt);
    assert.ok(history[1].changed_at >= history[0].changed_at);
    await pool.query("update organization_memberships set active = false where user_id = $1 and organization_id = $2",
      [userIds.organizer, organizationId]);
    await assert.rejects(getOutcomesReport(organizer), hasError("FORBIDDEN"));
    await assert.rejects(setMatchCompletion(corrected), hasError("FORBIDDEN"));
  });

test("Outcomes excludes persisted simulated matches and keeps real reporting readable in simulation",
  { skip: !outcomesDatabaseEnabled }, async (t) => {
    const { userIds, organizationId, eventId, untrackedId, addGuest, addMatch } = await createOutcomesFixture(t);
    const localEvent = { userId: userIds.owner, organizationId, eventId };
    const [a, b, c] = await Promise.all([0, 1, 2].map((position) => addGuest(eventId, position)));
    const { deterministicUuid } = loadTs("src/modules/network/server/simulated-engine.ts");
    const { DEMO_FIXTURES } = loadTs("src/modules/network/simulation/demo-matches.ts");
    const fixturePair = DEMO_FIXTURES[0][0];
    const demoId = deterministicUuid("recommendation", eventId, fixturePair.a, fixturePair.b);
    const demo = { ...localEvent, matchId: await addMatch(eventId, a, b, demoId) };
    const real = { ...localEvent, matchId: await addMatch(eventId, a, c) };

    await startOutcomesTracking(localEvent);
    const completion = await setMatchCompletion({ ...real, completed: true, expectedRevision: 0 });
    const before = await getOutcomesReport(localEvent);
    await assert.rejects(getMatchCompletion(demo), hasError("NOT_FOUND"));
    await assert.rejects(setMatchCompletion({ ...demo, completed: true, expectedRevision: 0 }), hasError("NOT_FOUND"));

    process.env.WEFT_ENGINE_MODE = "simulation";
    await assert.rejects(startOutcomesTracking({ ...localEvent, eventId: untrackedId }), hasError("CONFLICT", "SIMULATION_ACTIVE"));
    await assert.rejects(setMatchCompletion({ ...real, completed: false, expectedRevision: 1 }), hasError("CONFLICT", "SIMULATION_ACTIVE"));
    await assert.rejects(getMatchCompletion(demo), hasError("NOT_FOUND"));
    assert.deepEqual(await getMatchCompletion(real), completion);
    assert.deepEqual(await getOutcomesReport(localEvent), before);
  });
