import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryObserver, isCancelledError } from "@tanstack/react-query";
import { loadTs } from "./load-ts.mjs";
import { event } from "./event-detail-fixture.mjs";

const scope = { actorId: "actor", sessionId: "session", activeOrganizationId: "workspace-A" };
const contract = () => loadTs("src/modules/events/queries/event-detail-query.ts");
const read = (...args) => loadTs("src/modules/events/queries/fetch-event-detail.ts").fetchEventDetail(...args);
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(r => setTimeout(r, 0));

test("query contract isolates event, actor, session and active workspace, excludes tab", () => {
  const { eventDetailKey, eventDetailQueryOptions } = contract();
  assert.deepEqual(eventDetailKey(scope, event.id), ["events", "detail", "actor", "session", "workspace-A", event.id]);
  for (const field of Object.keys(scope)) assert.notDeepEqual(eventDetailKey({ ...scope, [field]: "other" }, event.id), eventDetailKey(scope, event.id));
  assert.notDeepEqual(eventDetailKey(scope, "other-event"), eventDetailKey(scope, event.id));
  assert.deepEqual(eventDetailKey({ ...scope, tab: "attendees" }, event.id), eventDetailKey(scope, event.id));
  const options = eventDetailQueryOptions(scope, event.id);
  assert.equal(options.staleTime, 30_000); assert.equal(options.gcTime, 600_000);
  for (const flag of ["refetchOnMount", "refetchOnWindowFocus", "refetchOnReconnect"]) assert.equal(options[flag], true);
  assert.equal(options.networkMode, "always"); assert.equal(options.refetchInterval, undefined);
  assert.equal(options.placeholderData, undefined);
  assert.equal(options.retry(0, new Error("network")), true); assert.equal(options.retry(1, new Error("network")), false);
  assert.equal(options.retry(0, new DOMException("Cancelled", "AbortError")), false);
});

test("fetch validates identity, envelope and same-origin uncached abortable request", async () => {
  const signal = new AbortController().signal;
  assert.deepEqual(await read(event.id, signal, async (url, options) => {
    assert.equal(url, `/api/events/${event.id}`); assert.equal(options.credentials, "same-origin");
    assert.equal(options.cache, "no-store"); assert.equal(options.signal, signal);
    return Response.json({ data: { event } });
  }), { kind: "ready", event });
  for (const value of [{ data: { event: { ...event, id: event.organizationId } } }, {}, { data: { event: { ...event, coverImage: "https://evil.example" } } }]) {
    await assert.rejects(read(event.id, signal, async () => Response.json(value)), e => e.code === "INTERNAL_ERROR");
  }
  const aborted = new DOMException("Aborted", "AbortError");
  await assert.rejects(read(event.id, signal, async () => { throw aborted; }), e => e === aborted);
  await assert.rejects(read(event.id, signal, async () => ({ ok: true, json: async () => { throw aborted; } })), e => e === aborted);
  await assert.rejects(read(event.id, signal, async () => { throw Error("secret"); }), e => e.code === "INTERNAL_ERROR" && !e.message.includes("secret"));
});

test("fresh revisit makes zero requests; stale mounts expose data and deduplicate one read", async () => {
  const { eventDetailQueryOptions, seedEventDetail } = contract();
  const client = new QueryClient(); let calls = 0; const pending = deferred();
  const options = { ...eventDetailQueryOptions(scope, event.id), queryFn: async () => { calls++; return pending.promise; } };
  seedEventDetail(client, scope, event);
  const fresh = new QueryObserver(client, options); const stopFresh = fresh.subscribe(() => {});
  assert.equal(fresh.getCurrentResult().data.event.name, event.name); assert.equal(calls, 0); stopFresh();
  client.setQueryData(options.queryKey, { kind: "ready", event }, { updatedAt: Date.now() - 30_001 });
  const stale = new QueryObserver(client, options); const other = new QueryObserver(client, options);
  const stop = stale.subscribe(() => {}); const stopOther = other.subscribe(() => {});
  assert.equal(stale.getCurrentResult().data.event.name, event.name); assert.equal(stale.getCurrentResult().isFetching, true); assert.equal(calls, 1);
  pending.resolve({ kind: "ready", event }); await tick(); stop(); stopOther(); client.clear();
});

test("401/403/404 replace cached DTO while transient failures retain the successful DTO", async () => {
  const { eventDetailQueryOptions, seedEventDetail } = contract();
  for (const [status, kind] of [[401,"unauthorized"],[403,"forbidden"],[404,"not-found"],[500,null]]) {
    const client = new QueryClient(); seedEventDetail(client, scope, event);
    const options = { ...eventDetailQueryOptions(scope, event.id), retry: false, queryFn: ({ signal }) => read(event.id, signal, async () => new Response("", { status })) };
    const observer = new QueryObserver(client, options); const stop = observer.subscribe(() => {});
    const result = await observer.refetch();
    if (kind) { assert.deepEqual(result.data, { kind }); assert.equal(result.error, null); }
    else { assert.equal(result.data.event.name, event.name); assert.equal(result.error.code, "INTERNAL_ERROR"); }
    stop(); client.clear();
  }
});

test("cancelled delayed read cannot overwrite import replacement or a new scope", async () => {
  const { eventDetailQueryOptions, seedEventDetail, refreshEventDetail } = contract();
  const client = new QueryClient(); seedEventDetail(client, scope, event);
  const pending = deferred(); let calls = 0; let oldSignal;
  const updated = { ...event, name: "Updated", attendees: { ...event.attendees, importCount: 1 } };
  const options = { ...eventDetailQueryOptions(scope, event.id), queryFn: ({ signal }) => {
    calls++; if (calls === 1) { oldSignal = signal; return pending.promise; }
    return Promise.resolve({ kind: "ready", event: updated });
  } };
  const observer = new QueryObserver(client, options); const stop = observer.subscribe(() => {});
  const old = observer.refetch(); await refreshEventDetail(client, scope, event.id);
  assert.equal(oldSignal.aborted, true); assert.equal(calls, 2);
  pending.resolve({ kind: "ready", event }); await old; await tick();
  assert.deepEqual(client.getQueryData(options.queryKey).event, updated);
  assert.equal(client.getQueryData(contract().eventDetailKey({ ...scope, sessionId: "new" }, event.id)), undefined);
  stop(); client.clear();
});

test("import refresh propagates transient and terminal failures without discarding saved cache on 5xx", async () => {
  const { eventDetailQueryOptions, seedEventDetail, refreshEventDetail } = contract();
  for (const terminal of [false, true]) {
    const client = new QueryClient(); seedEventDetail(client, scope, event);
    const observer = new QueryObserver(client, { ...eventDetailQueryOptions(scope, event.id), retry: false,
      queryFn: async () => { if (terminal) return { kind: "forbidden" }; throw Error("failed"); } });
    const stop = observer.subscribe(() => {});
    await assert.rejects(refreshEventDetail(client, scope, event.id));
    assert.equal(observer.getCurrentResult().data.kind, terminal ? "forbidden" : "ready");
    stop(); client.clear();
  }
});

test("query cancellation aborts request and allows a later read", async () => {
  const { eventDetailQueryOptions } = contract(); const client = new QueryClient(); let signal;
  const options = { ...eventDetailQueryOptions(scope, event.id), queryFn: context => { signal = context.signal; return new Promise(() => {}); } };
  const promise = client.fetchQuery(options); await client.cancelQueries({ queryKey: options.queryKey, exact: true });
  await assert.rejects(promise, isCancelledError); assert.equal(signal.aborted, true);
  assert.equal((await client.fetchQuery({ ...options, queryFn: async () => ({ kind: "ready", event }) })).event.id, event.id);
  client.clear();
});

test("inactive cache expires only after ten minutes", t => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1_000_000 });
  const { eventDetailQueryOptions } = contract(); const client = new QueryClient();
  const options = eventDetailQueryOptions(scope, event.id);
  const observer = new QueryObserver(client, { ...options, enabled: false }); const stop = observer.subscribe(() => {});
  client.setQueryData(options.queryKey, { kind: "ready", event }); stop();
  t.mock.timers.tick(599_999); assert.equal(client.getQueryData(options.queryKey).event.id, event.id);
  t.mock.timers.tick(1); assert.equal(client.getQueryData(options.queryKey), undefined); client.clear();
});

test("replacement DTO drives current guest rows, metrics, activity and readiness while roster state remains mounted", async () => {
  const { eventDetailQueryOptions, seedEventDetail, refreshEventDetail } = contract();
  const client = new QueryClient(); seedEventDetail(client, scope, event);
  const guest = (id, guestType) => ({
    id, guestType, firstName: id, lastName: "Guest", email: `${id}@example.test`, company: "Weft",
    position: "Founder", linkedin: "", phone: "", profileType: "Investor", source: "csv",
    importId: event.id, createdAt: event.createdAt, updatedAt: event.updatedAt,
  });
  const imported = {
    ...event,
    attendees: {
      guests: [guest("guest-1", "VIP"), guest("guest-2", "Sponsor")],
      imports: [{ id: event.id, eventId: event.id, fileName: "guests.csv", importedCount: 2, storedCount: 2,
        duplicateCount: 0, blankCount: 0, vipCount: 1, sponsorCount: 1, importedAt: event.updatedAt }],
      importCount: 1,
    },
  };
  const observer = new QueryObserver(client, { ...eventDetailQueryOptions(scope, event.id), queryFn: async () => ({ kind: "ready", event: imported }) });
  const stop = observer.subscribe(() => {});
  await refreshEventDetail(client, scope, event.id);
  const current = observer.getCurrentResult().data.event;
  const { deriveEventMetrics } = loadTs("src/modules/events/event-record.ts");
  assert.deepEqual(deriveEventMetrics(current), { attendees: 2, attendeesAreExpected: false, sponsors: 1, staff: 0, vips: 1 });
  assert.equal(current.attendees.guests.length, 2);
  assert.equal(current.attendees.imports.length, 1);
  assert.equal(current.attendees.importCount, 1);
  const detailSource = (await import("node:fs")).readFileSync("src/modules/events/components/event-detail-page.tsx", "utf8");
  const rosterSource = (await import("node:fs")).readFileSync("src/modules/events/components/attendee-roster.tsx", "utf8");
  assert.match(detailSource, /useMemo\(\(\) => deriveEventMetrics\(event\), \[event\]\)/);
  assert.match(detailSource, /<AttendeeRoster event=\{event\}/);
  assert.match(rosterSource, /const guests = event\.attendees\.guests/);
  assert.match(rosterSource, /const currentPage = Math\.min\(page, pageCount - 1\)/);
  assert.doesNotMatch(detailSource, /key=\{(?:event\.updatedAt|Date\.now\(\)|query\.dataUpdatedAt)\}/);
  stop(); client.clear();
});
