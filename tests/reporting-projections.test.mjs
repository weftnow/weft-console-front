import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { reportingEvidenceSchema } = loadTs("src/modules/insights/reporting-contract.ts");
const { buildReportingProjections } = loadTs("src/modules/insights/reporting-projections.ts");

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const person = (n, eligible = true) => ({ personId: uuid(n), eligible, name: `Person ${n}` });
const participant = (n, evidence = {}) => ({ personId: uuid(n), ...evidence });
const goal = (kind, result) => ({ kind, result });
const match = (id, a, b, options = {}) => ({
  id: uuid(id), personIds: [uuid(a), uuid(b)], method: "wefter", ...options,
});
const request = (id, n, kind, status, reason) => ({ id, personId: uuid(n), kind, status, reason });
const checkIn = (id, window, followUp, secondMeeting = null, opportunity = null) => ({
  matchId: uuid(id), window, followUp, secondMeeting, opportunity,
});

function event(id, month, overrides = {}) {
  const date = `2026-${String(month).padStart(2, "0")}-01`;
  const { evidence = {}, matches = [], endsAt = `${date}T18:00:00Z`, ...rest } = overrides;
  return {
    id, name: `Edition ${id.toUpperCase()}`, startsAt: `${date}T10:00:00Z`, endsAt,
    timezone: "UTC", trackingStartedAt: date, people: [], ...rest,
    matches: matches.map((entry) => ({ completedAt: endsAt, ...entry })),
    evidence: evidence === null ? null : reportingEvidenceSchema.parse(evidence),
  };
}

function reports(sources, query = {}, now = "2026-09-01T00:00:00Z") {
  return Object.fromEntries(buildReportingProjections(
    sources, { view: "event", metric: "coverage", window: 7, ...query }, new Date(now),
  ).map((report) => [report.id, report]));
}

test("returns every projection for the view, in report order, and honors event scope", () => {
  const a = event("a", 1, { people: [person(1)] });
  const b = event("b", 2, { people: [person(2), person(3)] });
  const upcoming = event("c", 10, { people: [person(4), person(5), person(6)], evidence: { requests: [] } });

  assert.deepEqual(Object.keys(reports([upcoming, b, a], { report: "coverage" })), [
    "goals", "demand", "follow-through", "coverage",
  ]);
  assert.deepEqual(Object.keys(reports([], { view: "across" })), ["series", "relationships"]);
  assert.deepEqual(Object.keys(reports([], { view: "sponsors" })), ["sponsor-outcomes"]);
  assert.ok(Object.values(reports([])).every(({ status }) => status === "unavailable"));
  assert.deepEqual(reports([upcoming, b, a]).coverage.measure, { count: 0, total: 2 });
  assert.deepEqual(reports([b, a], { eventId: a.id }).coverage.measure, { count: 0, total: 1 });
  assert.equal(reports([b], { eventId: a.id }).coverage.status, "unavailable");
  assert.equal(reports([upcoming], { eventId: upcoming.id }).demand.status, "collecting");
});

test("goal achievement counts each respondent once and keeps goal bases and survey coverage distinct", () => {
  const source = event("a", 1, {
    people: [person(1), person(1), person(2), person(3), person(4), person(5), person(6)],
    evidence: {
      participants: [
        participant(1, { segment: "Founders", surveyInvited: true, surveyResponded: true,
          goals: [goal("buyers", "achieved"), goal("partners", "achieved")] }),
        participant(1, { goals: [goal("buyers", "achieved"), goal("buyers", null)] }),
        participant(2, { segment: "Founders", surveyInvited: true, surveyResponded: true,
          goals: [goal("buyers", "partial")] }),
        participant(3, { segment: "Operators", surveyInvited: true, surveyResponded: true,
          goals: [goal("buyers", "unmet")] }),
        participant(4, { segment: "Founders", surveyInvited: true, surveyResponded: true,
          goals: [goal("buyers", null), goal("talent", null)] }),
        participant(5, { segment: "Founders", surveyInvited: true, surveyResponded: false }),
        participant(6, { segment: "Operators", goals: [goal("investors", "partial"), goal("investors", "unmet")] }),
        participant(99, { goals: [goal("buyers", "achieved")] }),
      ],
    },
  });

  const { goals } = reports([source]);
  assert.equal(goals.status, "ready");
  assert.deepEqual(goals.measure, { count: 1, total: 3 });
  assert.deepEqual(goals.responseCoverage, { count: 4, total: 5 });
  assert.deepEqual(goals.options, [{ key: "Founders", label: "Founders" }, { key: "Operators", label: "Operators" }]);
  assert.deepEqual(goals.columns, ["goal", "achieved", "partial", "unmet"]);
  const buyers = goals.rows.find(({ id }) => id === "buyers");
  assert.deepEqual(buyers.label, { key: "buyers" });
  assert.deepEqual(buyers.counts, Array(3).fill({ count: 1, total: 3 }));
  assert.ok(buyers.values.every((value) => Math.abs(value - 100 / 3) < 1e-10));
  assert.deepEqual(goals.rows.find(({ id }) => id === "investors").values, [null, null, null]);
  assert.deepEqual(goals.rows.find(({ id }) => id === "talent").values, [null, null, null]);
  assert.deepEqual(goals.details.buyers.rows[0].cells, [
    { text: "Founders" }, { text: "1" }, { text: "1" }, { text: "0" },
    { text: "2" }, { text: "3" }, { text: "3" }, { text: "3" },
  ]);
  const filtered = reports([source], { segment: "Founders" }).goals;
  assert.deepEqual(filtered.measure, { count: 1, total: 2 });
  assert.deepEqual(filtered.responseCoverage, { count: 3, total: 4 });
  assert.deepEqual(filtered.rows[0].values, [50, 50, 0]);
});

test("unmet demand deduplicates requests and reconciles open reasons without treating missing evidence as zero", () => {
  const open = request("a", 1, "buyers", "open", "no_candidate");
  const source = event("a", 1, {
    people: [person(1), person(2), person(3)],
    evidence: {
      participants: [
        participant(1, { segment: "Founders", goals: [goal("partners", null)] }),
        participant(2, { segment: "Operators" }),
      ],
      requests: [
        open, open, request("b", 1, "buyers", "open"), request("c", 2, "buyers", "fulfilled"),
        request("d", 2, "partners", "open", "declined"), request("e", 3, "talent", "fulfilled"),
        request("orphan", 99, "talent", "open"),
      ],
    },
  });

  const { demand } = reports([source]);
  assert.deepEqual(demand.measure, { count: 3, total: 5 });
  assert.deepEqual(demand.rows.map(({ id, values }) => [id, values]), [
    ["buyers", [2]], ["partners", [1]], ["talent", [0]],
  ]);
  assert.deepEqual(demand.details.buyers.rows.slice(0, 4).map(({ cells }) => cells[2].text), ["1", "0", "0", "1"]);
  assert.deepEqual(demand.details.buyers.rows.find(({ id }) => id === "goal:partners").cells, [
    { key: "goal" }, { key: "partners" }, { text: "1" },
  ]);
  assert.deepEqual(reports([source], { segment: "Operators" }).demand.measure, { count: 1, total: 2 });

  assert.equal(reports([event("missing", 1)]).demand.status, "unavailable");
  const zero = reports([event("empty", 1, { evidence: { requests: [] } })]).demand;
  assert.equal(zero.status, "ready");
  assert.deepEqual(zero.measure, { count: 0, total: 0 });
});

test("follow-through uses UTC elapsed windows and separate, overlapping bases for usable answers", () => {
  const source = event("a", 3, {
    startsAt: "2026-03-07T10:00:00-05:00",
    endsAt: "2026-03-07T18:00:00-05:00",
    timezone: "America/New_York",
    people: [1, 2, 3, 4, 5, 6].map((n) => person(n)),
    matches: [
      match(101, 1, 2), match(102, 2, 1), match(103, 1, 3, { method: "sms_coordination" }),
      match(104, 2, 4), match(105, 4, 5), match(106, 5, 6, { completedAt: null }),
    ],
    evidence: {
      followUps: [
        checkIn(101, 7, true, true, true), checkIn(102, 7, true, true, true),
        checkIn(103, 7, false, null, false), checkIn(104, 7, null),
        checkIn(106, 7, true, true, true), checkIn(103, 30, true, false),
      ],
    },
  });

  const early = reports([source], {}, "2026-03-14T22:59:59.999Z")["follow-through"];
  assert.equal(early.status, "collecting");
  assert.ok(early.rows.every(({ values }) => values[0] === null));
  assert.deepEqual(early.responseCoverage, { count: 0, total: 0 });

  const due = reports([source], {}, "2026-03-14T23:00:00Z")["follow-through"];
  assert.equal(due.status, "ready");
  assert.deepEqual(due.measure, { count: 1, total: 2 });
  assert.deepEqual(due.responseCoverage, { count: 2, total: 4 });
  assert.deepEqual(due.rows.map(({ label, values, counts }) => [label, values, counts[0]]), [
    [{ key: "followUp" }, [50], { count: 1, total: 2 }],
    [{ key: "secondMeeting" }, [100], { count: 1, total: 1 }],
    [{ key: "opportunity" }, [50], { count: 1, total: 2 }],
  ]);
  assert.deepEqual(due.details.secondMeeting.rows.map(({ id, cells }) => [id, ...cells.slice(1).map(({ text }) => text)]), [
    ["sms_coordination", "0", "0", "1", "1"], ["wefter", "1", "1", "1", "3"],
  ]);

  assert.equal(reports([source], { window: 30 }, "2026-04-06T22:59:59.999Z")["follow-through"].status, "collecting");
  const thirty = reports([source], { window: 30 }, "2026-04-06T23:00:00Z")["follow-through"];
  assert.deepEqual(thirty.responseCoverage, { count: 1, total: 4 });
  assert.deepEqual(thirty.rows.map(({ values }) => values[0]), [100, 0, null]);
});

test("conflicting pair answers stay unknown while response coverage records the check-in", () => {
  const source = event("a", 1, {
    people: [person(1), person(2)],
    matches: [match(101, 1, 2), match(102, 2, 1)],
    evidence: { followUps: [checkIn(101, 7, true), checkIn(102, 7, false)] },
  });
  const report = reports([source])["follow-through"];
  assert.equal(report.status, "unavailable");
  assert.equal(report.measure, undefined);
  assert.deepEqual(report.responseCoverage, { count: 1, total: 1 });
  assert.deepEqual(report.rows[0].values, [null]);
});

test("coverage uses one event-wide basis and unique canonical people and completed pairs", () => {
  const source = event("a", 1, {
    people: [person(1), person(1), person(2), person(3), person(4), person(5), person(6), person(7, false)],
    matches: [
      match(101, 1, 2), match(102, 2, 1), match(103, 1, 3),
      match(104, 4, 2, { completedAt: null }), match(105, 4, 4), match(106, 4, 5, { completedAt: "2027-01-01" }),
    ],
    evidence: {
      participants: [
        participant(1, { segment: "Founders", attended: true }), participant(2, { segment: "Founders", attended: true }),
        participant(3, { segment: "Operators", attended: true }), participant(4, { segment: "Operators", attended: true }),
        participant(5, { segment: "Guests", attended: false }), participant(6, { segment: "Guests" }),
        participant(7, { segment: "Founders", attended: true }),
      ],
    },
  });

  const { coverage } = reports([source]);
  assert.equal(coverage.basis, "attendance");
  assert.deepEqual(coverage.measure, { count: 3, total: 4 });
  assert.deepEqual(coverage.rows.map(({ label, values }) => [label, values]), [
    [{ text: "Founders" }, [0, 50, 50]], [{ text: "Operators" }, [50, 50, 0]],
  ]);
  assert.deepEqual(coverage.details["segment:Operators"].rows[0].cells, [
    { key: "zero" }, { text: "1" }, { text: "2" },
  ]);
  const filtered = reports([source], { segment: "Guests" }).coverage;
  assert.equal(filtered.basis, "attendance");
  assert.equal(filtered.status, "unavailable");
  assert.equal(filtered.measure, undefined);

  const roster = reports([{ ...source, evidence: null }]).coverage;
  assert.equal(roster.basis, "roster");
  assert.deepEqual(roster.measure, { count: 3, total: 6 });
  assert.deepEqual(roster.rows[0].label, { key: "unsegmented" });
  const unknown = reports([{ ...source, trackingStartedAt: null }]).coverage;
  assert.equal(unknown.status, "unavailable");
  assert.equal(unknown.measure, undefined);
});

test("series preserves missing editions, compares only the same coverage basis, and links to the edition", () => {
  const series = { key: "industry", label: "Industry Summit" };
  const otherSeries = { key: "other", label: "Other Summit" };
  const a = event("a", 1, { people: [1, 2, 3, 4].map((n) => person(n)), matches: [match(101, 1, 2)], evidence: { series } });
  const b = event("b", 2, { people: [person(1)], trackingStartedAt: null, evidence: { series } });
  const c = event("c", 3, {
    people: [person(1)], evidence: { series, participants: [participant(1, { attended: true })] },
  });
  const d = event("d", 4, { people: [person(1), person(2)], matches: [match(102, 1, 2)], evidence: { series } });
  const other = event("other", 5, { people: [person(1)], evidence: { series: otherSeries } });
  const events = [d, b, other, c, a];
  const { series: projection } = reports(events, { view: "across", series: "industry", window: 30 });
  assert.deepEqual(projection.rows.map(({ id, values }) => [id, values]), [
    ["a", [50]], ["b", [null]], ["c", [null]], ["d", [100]],
  ]);
  assert.deepEqual(projection.breakdown.rows[2].cells.slice(2), [
    { text: "0" }, { text: "1" }, { key: "attendance" }, { key: "ready" },
  ]);
  assert.deepEqual(projection.measure, { count: 2, total: 2 });
  assert.equal(projection.basis, "roster");
  assert.equal(projection.delta, 50);
  assert.equal(projection.rows[3].href, "/outcomes/reports?view=event&eventId=d&report=coverage&window=30");
  assert.deepEqual(reports(events, { view: "across", series: "industry", from: "2026-02-01", to: "2026-04-01" })
    .series.rows.map(({ id }) => id), ["b", "c", "d"]);
  assert.equal(reports(events, { view: "across", series: "industry", from: "2026-02-01" }).series.delta, undefined);
  assert.equal(reports([a, b], { view: "across", series: "industry" }).series.measure, undefined);
  assert.deepEqual(reports(events, { view: "across" }).series.rows.map(({ id }) => id), ["other"]);
});

test("series compares the selected follow-up age and leaves an immature edition as a collecting gap", () => {
  const series = { key: "industry", label: "Industry Summit" };
  const a = event("a", 1, {
    people: [person(1), person(2)], matches: [match(101, 1, 2)],
    evidence: { series, followUps: [checkIn(101, 7, false), checkIn(101, 30, true)] },
  });
  const b = event("b", 2, {
    people: a.people, matches: [match(102, 1, 2)],
    evidence: { series, followUps: [checkIn(102, 7, true), checkIn(102, 30, false)] },
  });
  const { series: early } = reports([a, b], { view: "across", metric: "follow-through", window: 30 }, "2026-02-10");
  assert.deepEqual(early.rows.map(({ values }) => values), [[100], [null]]);
  assert.equal(early.delta, undefined);
  assert.deepEqual(early.breakdown.rows.at(-1).cells.at(-1), { key: "collecting" });
  const { series: seven } = reports([a, b], { view: "across", metric: "follow-through", window: 7 }, "2026-02-10");
  assert.equal(seven.delta, 100);
  const { series: thirty } = reports([a, b], { view: "across", metric: "follow-through", window: 30 }, "2026-03-10");
  assert.equal(thirty.delta, -100);
});

test("series uses unique goal respondents and preserves the segment on edition links", () => {
  const series = { key: "industry", label: "Industry Summit" };
  const a = event("a", 1, {
    people: [person(1), person(2)],
    evidence: { series, goalSurveyWindow: 7, participants: [
      participant(1, { segment: "New founders", goals: [goal("buyers", "unmet"), goal("partners", "partial")] }),
      participant(2, { segment: "Operators", goals: [goal("buyers", "achieved")] }),
    ] },
  });
  const b = event("b", 2, {
    people: [person(3)],
    evidence: { series, goalSurveyWindow: 7, participants: [
      participant(3, { segment: "New founders", goals: [goal("buyers", "achieved"), goal("partners", "achieved")] }),
    ] },
  });
  const { series: projection } = reports([b, a], { view: "across", metric: "goals", segment: "New founders" });
  assert.deepEqual(projection.rows.map(({ values }) => values), [[0], [100]]);
  assert.deepEqual(projection.measure, { count: 1, total: 1 });
  assert.equal(projection.delta, 100);
  assert.equal(projection.rows[1].href, "/outcomes/reports?view=event&eventId=b&report=goals&window=7&segment=New+founders");
  assert.equal(reports([b, a], { view: "across", metric: "goals", window: 30 }).series.status, "unavailable");
});

test("coverage compares confirmations at the same age and displays verified repeat attendance", () => {
  const series = { key: "industry", label: "Industry Summit" };
  const a = event("a", 1, {
    people: [person(1), person(2), person(3)],
    priorNetworkKeys: ["returning"],
    evidence: { series, participants: [
      participant(1, { attended: true, networkKey: "returning" }),
      participant(2, { attended: true, networkKey: "new" }),
      participant(3, { attended: true }),
    ] },
    matches: [match(101, 1, 2, { completedAt: "2026-01-10T09:00:00Z" })],
  });
  const coverage = reports([a]).coverage;
  assert.deepEqual(coverage.rows.map(({ label }) => label.key), ["firstTracked", "identityUnknown", "returning"]);
  assert.deepEqual(coverage.details["segment:returning:one"].rows[0].cells, [{ key: "one" }, { text: "1" }, { text: "1" }]);
  assert.deepEqual(reports([a], { view: "across" }).series.measure, { count: 0, total: 3 });
  assert.deepEqual(reports([a], { view: "across", window: 30 }).series.measure, { count: 2, total: 3 });
});

test("cross-event relationships use checked-in network identities and count the first continuation only", () => {
  const checkedIn = (n, networkKey) => participant(n, { networkKey, attended: true });
  const first = event("a", 1, {
    people: [1, 2, 3, 4].map((n) => person(n)),
    matches: [match(101, 1, 2), match(102, 2, 1), match(103, 1, 3), match(104, 1, 4)],
    evidence: { participants: [
      checkedIn(1, "alpha"), checkedIn(2, "bravo"), checkedIn(3, "charlie"), participant(4, { networkKey: "delta" }),
    ] },
  });
  const second = event("b", 2, {
    people: [11, 12, 13, 14].map((n) => person(n)),
    matches: [match(105, 11, 12, { completedAt: null })],
    evidence: { participants: [
      checkedIn(11, "alpha"), checkedIn(12, "bravo"), checkedIn(13, "charlie"), checkedIn(14, "delta"),
    ], reconnections: [[uuid(11), uuid(14)]] },
  });
  const third = event("c", 3, {
    people: [21, 22, 23].map((n) => person(n)),
    matches: [match(106, 21, 23)],
    evidence: { participants: [
      checkedIn(21, "alpha"), checkedIn(22, "bravo"), participant(23, { networkKey: "charlie" }),
    ], reconnections: [[uuid(21), uuid(22)], [uuid(22), uuid(21)], [uuid(21), uuid(23)]] },
  });
  const fourth = event("d", 4, {
    people: [31, 32].map((n) => person(n)),
    matches: [match(107, 31, 32, { method: "sms_coordination" })],
    evidence: { participants: [checkedIn(31, "alpha"), checkedIn(32, "bravo")], reconnections: [[uuid(31), uuid(32)]] },
  });

  const { relationships } = reports([fourth, second, first, third], { view: "across" });
  assert.deepEqual(relationships.measure, { count: 1, total: 2 });
  assert.deepEqual(relationships.matrix.map(({ id }) => id), ["a", "b", "c", "d"]);
  assert.deepEqual(relationships.rows[0].values, [null, 0, 1, 0]);
  assert.deepEqual(relationships.rows[0].counts.slice(1), [
    { count: 0, total: 2 }, { count: 1, total: 1 }, { count: 0, total: 1 },
  ]);
  assert.deepEqual(relationships.details["a:c"].rows.map(({ cells }) => [cells[2], cells[4], cells[6], cells[8], cells[9]]), [
    [{ text: "Edition A" }, { key: "completed" }, { text: "Edition C" }, { key: "reconnection" }, { key: "unknown" }],
    [{ text: "Edition A" }, { key: "completed" }, { text: "Edition D" }, { key: "completed" }, { key: "sms_coordination" }],
  ]);
  const coAttendance = reports([first, second, third], { view: "across", from: "2026-02-01", to: "2026-02-01" }).relationships;
  assert.equal(coAttendance.status, "ready");
  assert.deepEqual(coAttendance.measure, { count: 0, total: 2 });
  assert.deepEqual(coAttendance.rows.find(({ id }) => id === "a").values, [0]);
  assert.deepEqual(coAttendance.matrix, [{ id: "b", label: "Edition B" }]);

  const withoutExplicitKeys = { ...second, people: [person(1), person(2)], evidence: reportingEvidenceSchema.parse({
    participants: [participant(1, { attended: true }), participant(2, { attended: true })],
    reconnections: [[uuid(1), uuid(2)]],
  }) };
  assert.equal(reports([first, withoutExplicitKeys], { view: "across" }).relationships.status, "unavailable");
});

test("sponsor objectives use deduplicated, explicitly associated evidence for each measure", () => {
  const objective = (key, measure, matchIds, target, nextStep) => ({ key, label: key, measure, matchIds, target, nextStep });
  const source = event("a", 1, {
    people: [person(1), person(2), person(3), person(4)],
    matches: [match(101, 1, 2), match(102, 1, 3, { completedAt: null }), match(103, 1, 4)],
    evidence: {
      sponsors: [
        { key: "sponsor", label: "Build Co", objectives: [
          objective("qualified", "qualified", [uuid(101), uuid(102), uuid(101), uuid(999)], 3),
          objective("meetings", "meetings", [uuid(101), uuid(102)], 2),
          objective("next", "next_steps", [uuid(102), uuid(102)], null, "Send proposal"),
          objective("no-text", "next_steps", [uuid(101)], null),
          objective("no-association", "next_steps", [], null, "Send proposal"),
        ] },
        { key: "other", label: "Other Co", objectives: [objective("meetings", "meetings", [uuid(103)], null)] },
      ],
    },
  });
  const query = { view: "sponsors", sponsor: "sponsor", detail: "sponsor:meetings" };
  const report = reports([source], query)["sponsor-outcomes"];
  assert.equal(report.status, "ready");
  assert.deepEqual(report.measure, { count: 1, total: 2 });
  assert.deepEqual(Object.fromEntries(report.rows.map(({ id, values }) => [id, values])), {
    "sponsor:meetings": [1, 2], "sponsor:next": [1, null], "sponsor:no-association": [0, null],
    "sponsor:no-text": [0, null], "sponsor:qualified": [2, 3],
  });
  assert.deepEqual(report.details["sponsor:next"].rows[0].cells.slice(2), [
    { key: "next_steps" }, { key: "wefter" }, { key: "pending" }, { text: "Send proposal" },
  ]);
  assert.deepEqual(report.details["sponsor:meetings"].rows.map(({ id }) => id), [uuid(101)]);
  assert.equal(reports([source], { ...query, sponsor: "unknown" })["sponsor-outcomes"].status, "unavailable");
  const comparison = reports([source], { view: "sponsors" })["sponsor-outcomes"];
  assert.equal(comparison.measure, undefined);
  assert.ok(comparison.rows.some(({ id, label }) => id === "other:meetings" && label.text === "Other Co · meetings"));
});

test("projection order and evidence are deterministic without mutating the sources", () => {
  const a = event("a", 1, {
    people: [person(2), person(1)],
    matches: [match(101, 1, 2), match(102, 2, 1)],
    evidence: { participants: [
      participant(2, { segment: "Operators", goals: [goal("peers", "achieved")] }),
      participant(1, { segment: "Founders", goals: [goal("peers", "partial")] }),
    ], requests: [request("a", 1, "buyers", "open"), request("b", 2, "partners", "open")] },
  });
  const before = structuredClone(a);
  const reversed = structuredClone(a);
  reversed.people.reverse();
  reversed.matches.reverse();
  reversed.evidence.participants.reverse();
  reversed.evidence.requests.reverse();

  assert.deepEqual(reports([a]), reports([reversed]));
  assert.deepEqual(a, before);
});
