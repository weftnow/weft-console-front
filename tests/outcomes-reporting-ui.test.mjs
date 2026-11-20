import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs, stubTs } from "./load-ts.mjs";

const cssProxy = new Proxy(
  {},
  {
    get: (_target, property) => String(property),
  },
);
stubTs("@/modules/insights/components/reporting-page.module.css", { default: cssProxy });

const { ReportingPage } = loadTs("src/modules/insights/components/reporting-page.tsx");
const {
  buildReportsHref,
  switchViewHref,
  selectReportHref,
  toggleDetailHref,
  recordedMeetingsHref,
  evidenceEntryHref,
} = loadTs("src/modules/insights/components/reporting-href.ts");
const {
  reportingCopyByLocale,
  localizeLabel,
  localizeKey,
  formatDeltaPoints,
} = loadTs("src/modules/insights/reporting-copy.ts");

const EVENT_1 = "11111111-1111-4111-8111-111111111111";
const EVENT_2 = "22222222-2222-4222-8222-222222222222";
const EVENT_3 = "33333333-3333-4333-8333-333333333333";

const BASE_EVENTS = [
  { id: EVENT_1, name: "Davos Summit", endsAt: "2026-01-22T18:00:00.000Z" },
  { id: EVENT_2, name: "London Forum", endsAt: "2026-04-14T18:00:00.000Z" },
  { id: EVENT_3, name: "Singapore Exchange", endsAt: "2026-07-09T18:00:00.000Z" },
];

function renderReporting(model, locale = "en") {
  return renderToStaticMarkup(React.createElement(ReportingPage, { model, locale }));
}

function collectLeaves(value, path = []) {
  if (typeof value === "string") return [[path.join("."), value]];
  return Object.entries(value).flatMap(([key, child]) => collectLeaves(child, [...path, key]));
}

function placeholderSignature(text) {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
}

test("reporting copy has complete EN/ES key and placeholder parity and localizes known label keys", () => {
  const enLeaves = new Map(collectLeaves(reportingCopyByLocale.en));
  const esLeaves = new Map(collectLeaves(reportingCopyByLocale.es));
  assert.deepEqual([...esLeaves.keys()].sort(), [...enLeaves.keys()].sort());
  for (const [key, enText] of enLeaves) {
    const esText = esLeaves.get(key);
    assert.ok(enText.trim().length > 0, `empty en copy at ${key}`);
    assert.ok(esText.trim().length > 0, `empty es copy at ${key}`);
    assert.equal(placeholderSignature(esText), placeholderSignature(enText), `placeholder mismatch at ${key}`);
  }

  assert.equal(localizeLabel("en", { key: "buyers" }), "Buyers");
  assert.equal(localizeLabel("es", { key: "buyers" }), "Compradores");
  assert.equal(localizeLabel("es", { key: "no_candidate" }), "Sin asistente adecuado identificado");
  assert.equal(localizeLabel("en", { key: "next_steps" }), "Reported next steps");
  assert.equal(localizeLabel("es", { key: "next_steps" }), "Próximos pasos reportados");
  assert.equal(localizeLabel("en", { text: "Enterprise buyers" }), "Enterprise buyers");
  assert.equal(localizeKey("en", "custom_metric_name"), "Custom metric name");
  assert.equal(formatDeltaPoints("en", 8).text, "+8 pp");
  assert.equal(formatDeltaPoints("es", -4.5).text, "-4,5 pp");
});

test("reporting URL builders emit canonical /outcomes/reports query params and preserve context", () => {
  const baseQuery = {
    view: "event",
    report: "goals",
    eventId: EVENT_1,
    segment: "founders",
    window: 30,
    metric: "coverage",
    detail: "buyers",
  };

  assert.equal(
    buildReportsHref(baseQuery),
    `/outcomes/reports?view=event&eventId=${EVENT_1}&report=goals&segment=founders&window=30&metric=coverage&detail=buyers`,
  );
  assert.equal(
    toggleDetailHref(baseQuery, "buyers"),
    `/outcomes/reports?view=event&eventId=${EVENT_1}&report=goals&segment=founders&window=30&metric=coverage`,
  );
  assert.equal(
    toggleDetailHref(baseQuery, "investors"),
    `/outcomes/reports?view=event&eventId=${EVENT_1}&report=goals&segment=founders&window=30&metric=coverage&detail=investors`,
  );
  assert.equal(
    selectReportHref(baseQuery, "demand"),
    `/outcomes/reports?view=event&eventId=${EVENT_1}&report=demand&segment=founders&window=30&metric=coverage`,
  );
  assert.equal(
    switchViewHref(baseQuery, "across"),
    `/outcomes/reports?view=across&eventId=${EVENT_1}&report=series&window=30&metric=coverage`,
  );
  assert.equal(recordedMeetingsHref(EVENT_1), `/outcomes?eventId=${EVENT_1}`);
  assert.equal(recordedMeetingsHref(undefined), "/outcomes");
  assert.equal(evidenceEntryHref(EVENT_1), `/outcomes/reports/evidence?eventId=${EVENT_1}`);
  assert.equal(evidenceEntryHref(undefined), "/outcomes/reports/evidence");
});

test("Event view: Goal Achievement renders stacked bars, survey coverage, segment selector, drill-down, and cross-links", () => {
  const html = renderReporting({
    organizationName: "Analytical Engines",
    selectedEventId: EVENT_1,
    events: BASE_EVENTS,
    series: [],
    sponsors: [],
    query: {
      view: "event",
      report: "goals",
      eventId: EVENT_1,
      segment: "founders",
      window: 7,
      metric: "goals",
      detail: "buyers",
    },
    projections: [
      {
        id: "goals",
        status: "ready",
        measure: { count: 36, total: 52 },
        responseCoverage: { count: 58, total: 120 },
        columns: ["goal", "achieved", "partial", "unmet"],
        options: [
          { key: "founders", label: "Founders" },
          { key: "operators", label: "Operators" },
        ],
        rows: [
          {
            id: "buyers",
            label: { key: "buyers" },
            values: [68, 20, 12],
            counts: [{ count: 17, total: 25 }],
          },
          {
            id: "investors",
            label: { key: "investors" },
            values: [50, 30, 20],
            counts: [{ count: 10, total: 20 }],
          },
        ],
        details: {
          buyers: {
            columns: ["segment", "achieved", "eligible", "response_coverage"],
            rows: [
              {
                id: "seg-founders",
                cells: [{ text: "Founders" }, { text: "72%" }, { text: "18" }, { text: "14 / 18" }],
              },
            ],
          },
        },
      },
      { id: "demand", status: "ready", measure: { count: 9, total: 31 }, columns: [], rows: [] },
      { id: "follow-through", status: "collecting", columns: [], rows: [] },
      { id: "coverage", status: "unavailable", columns: [], rows: [] },
    ],
  });

  assert.match(html, /Outcomes reports/);
  assert.match(html, /Analytical Engines/);
  assert.match(html, new RegExp(`href="/outcomes\\?eventId=${EVENT_1}"`));
  assert.match(html, new RegExp(`href="/outcomes/reports/evidence\\?eventId=${EVENT_1}"`));
  assert.match(html, /69\.2%/);
  assert.match(html, /36 of 52/);
  assert.match(html, /58 of 120 invited answered the survey/);
  assert.match(html, /Founders/);
  assert.match(html, /Operators/);
  assert.match(html, /Buyers/);
  assert.match(html, /Investors/);
  assert.match(html, /Segment breakdown for Buyers/);
  assert.match(html, /Clear selection/);
  assert.match(html, /14 \/ 18/);
  assert.match(html, /<caption[^>]*>Attendee goal achievement by goal<\/caption>/);
});

test("Event view: Unmet Demand renders ranked bars and opens reason drill-down table", () => {
  const html = renderReporting({
    organizationName: "Analytical Engines",
    selectedEventId: EVENT_1,
    events: BASE_EVENTS,
    series: [],
    sponsors: [],
    query: {
      view: "event",
      report: "demand",
      eventId: EVENT_1,
      window: 7,
      metric: "goals",
      detail: "buyers",
    },
    projections: [
      {
        id: "demand",
        status: "ready",
        measure: { count: 14, total: 42 },
        columns: ["connection_type", "open_requests"],
        rows: [
          { id: "buyers", label: { key: "buyers" }, values: [9], counts: [{ count: 9, total: 22 }] },
          { id: "partners", label: { key: "partners" }, values: [5], counts: [{ count: 5, total: 20 }] },
        ],
        details: {
          buyers: {
            columns: ["reason", "count"],
            rows: [
              { id: "r1", cells: [{ key: "no_candidate" }, { text: "5" }] },
              { id: "r2", cells: [{ key: "scheduling" }, { text: "3" }] },
              { id: "r3", cells: [{ key: "declined" }, { text: "1" }] },
            ],
          },
        },
      },
    ],
  });

  assert.match(html, /Unmet demand/);
  assert.match(html, /14 of 42/);
  assert.match(html, /Reasons open for Buyers/);
  assert.match(html, /No suitable attendee identified/);
  assert.match(html, /Scheduling conflict/);
  assert.match(html, /Declined or cancelled/);
});

test("Event view: Follow-through renders 7/30 window selector, collecting banner, stage bars, and introduction-type breakdown", () => {
  const html = renderReporting({
    organizationName: "Analytical Engines",
    selectedEventId: EVENT_1,
    events: BASE_EVENTS,
    series: [],
    sponsors: [],
    query: {
      view: "event",
      report: "follow-through",
      eventId: EVENT_1,
      window: 30,
      metric: "goals",
    },
    projections: [
      {
        id: "follow-through",
        status: "collecting",
        measure: { count: 21, total: 30 },
        responseCoverage: { count: 30, total: 48 },
        columns: ["stage", "rate"],
        rows: [
          { id: "follow_up", label: { key: "follow_up" }, values: [70], counts: [{ count: 21, total: 30 }] },
          { id: "second_meeting", label: { key: "second_meeting" }, values: [40], counts: [{ count: 12, total: 30 }] },
          { id: "opportunity", label: { key: "opportunity" }, values: [17], counts: [{ count: 5, total: 30 }] },
        ],
        breakdown: {
          columns: ["introduction_type", "rate", "pairs"],
          rows: [
            { id: "wefter", cells: [{ key: "wefter" }, { text: "78%" }, { text: "14 / 18" }] },
            { id: "sms", cells: [{ key: "sms_coordination" }, { text: "58%" }, { text: "7 / 12" }] },
          ],
        },
      },
    ],
  });

  assert.match(html, /Collecting/);
  assert.match(html, /30-day check-in window is still open/);
  assert.match(html, /window=7/);
  assert.match(html, /window=30/);
  assert.match(html, /30 of 48 due completed pairs responded/);
  assert.match(html, /Reported follow-up/);
  assert.match(html, /Second meeting/);
  assert.match(html, /Concrete opportunity/);
  assert.match(html, /SMS coordination/);
  assert.match(html, /Wefter/);
});

test("Event view: Networking Coverage distinguishes roster vs attendance basis and supports bucket drill-down", () => {
  const html = renderReporting({
    organizationName: "Analytical Engines",
    selectedEventId: EVENT_1,
    events: BASE_EVENTS,
    series: [],
    sponsors: [],
    query: {
      view: "event",
      report: "coverage",
      eventId: EVENT_1,
      window: 7,
      metric: "goals",
      detail: "first_time:zero",
    },
    projections: [
      {
        id: "coverage",
        status: "ready",
        basis: "roster",
        measure: { count: 72, total: 100 },
        columns: ["segment", "zero", "one", "two_plus"],
        rows: [
          {
            id: "first_time",
            label: { key: "first_time" },
            values: [30, 45, 25],
            counts: [{ count: 18 }, { count: 27 }, { count: 15 }],
          },
          {
            id: "returning",
            label: { key: "returning" },
            values: [25, 35, 40],
            counts: [{ count: 10 }, { count: 14 }, { count: 16 }],
          },
        ],
        details: {
          "first_time:zero": {
            columns: ["segment", "attendees"],
            rows: [{ id: "ft-0", cells: [{ key: "first_time" }, { text: "18" }] }],
          },
        },
      },
    ],
  });

  assert.match(html, /Eligible people on the roster/);
  assert.match(html, /First-time attendees/);
  assert.match(html, /Returning attendees/);
  assert.match(html, /Coverage detail for First-time attendees · 0 introductions/);
  assert.match(html, /aria-current="true" aria-label="First-time attendees · 0 introductions: 30%"/);
});

test("Across events view: Event Series Performance handles 3+ editions with null gap, metric selector, delta pp, and row.href", () => {
  const html = renderReporting({
    organizationName: "Analytical Engines",
    selectedEventId: EVENT_3,
    events: BASE_EVENTS,
    series: [{ key: "global-summit", label: "Global Summit" }],
    sponsors: [],
    query: {
      view: "across",
      report: "series",
      series: "global-summit",
      from: "2026-01-01",
      to: "2026-12-31",
      window: 7,
      metric: "coverage",
    },
    projections: [
      {
        id: "series",
        status: "ready",
        delta: 12,
        measure: { count: 3, total: 4 },
        columns: ["edition", "rate"],
        rows: [
          {
            id: EVENT_1,
            label: { text: "Q1 Davos" },
            values: [64],
            counts: [{ count: 64, total: 100 }],
            href: `/outcomes/reports?view=event&eventId=${EVENT_1}&report=coverage`,
          },
          {
            id: "missing-ed",
            label: { text: "Q2 Interim" },
            values: [null],
          },
          {
            id: EVENT_2,
            label: { text: "Q3 London" },
            values: [76],
            counts: [{ count: 76, total: 100 }],
            href: `/outcomes/reports?view=event&eventId=${EVENT_2}&report=coverage`,
          },
        ],
      },
      { id: "relationships", status: "unavailable", columns: [], rows: [] },
    ],
  });

  assert.match(html, /\+12 pp/);
  assert.match(html, /<svg[^>]*role="img"/);
  assert.match(html, /Gaps indicate editions without usable data/);
  assert.match(html, /metric=goals/);
  assert.match(html, /metric=coverage/);
  assert.match(html, /metric=follow-through/);
  assert.match(html, new RegExp(`href="/outcomes/reports\\?view=event&amp;eventId=${EVENT_1}&amp;report=coverage"`));
  assert.match(html, /name="from"[^>]*value="2026-01-01"|value="2026-01-01"[^>]*name="from"/);
  assert.match(html, /name="to"[^>]*value="2026-12-31"|value="2026-12-31"[^>]*name="to"/);
});

test("Across events view: Event Series Performance renders paired cards for 2 editions without a line chart", () => {
  const html = renderReporting({
    organizationName: "Analytical Engines",
    events: BASE_EVENTS,
    series: [{ key: "global-summit", label: "Global Summit" }],
    sponsors: [],
    query: {
      view: "across",
      report: "series",
      series: "global-summit",
      window: 7,
      metric: "goals",
    },
    projections: [
      {
        id: "series",
        status: "ready",
        delta: -5,
        measure: { count: 2, total: 2 },
        columns: ["edition", "rate"],
        rows: [
          { id: EVENT_1, label: { text: "Edition 1" }, values: [70], counts: [{ count: 35, total: 50 }] },
          { id: EVENT_2, label: { text: "Edition 2" }, values: [65], counts: [{ count: 39, total: 60 }] },
        ],
      },
    ],
  });

  assert.match(html, /-5 pp/);
  assert.match(html, /Two comparable editions in range/);
  assert.doesNotMatch(html, /<svg[^>]*class="seriesSvg"/);
});

test("Across events view: Cross-Event Relationships renders matrix, event-pair table, and cellId row:col drill-down", () => {
  const cellId = `${EVENT_1}:${EVENT_2}`;
  const html = renderReporting({
    organizationName: "Analytical Engines",
    events: BASE_EVENTS,
    series: [],
    sponsors: [],
    query: {
      view: "across",
      report: "relationships",
      window: 7,
      metric: "goals",
      detail: cellId,
    },
    projections: [
      {
        id: "relationships",
        status: "ready",
        measure: { count: 6, total: 24 },
        columns: ["first_event", "later_event", "pairs"],
        matrix: [
          { id: EVENT_1, label: "Davos Summit" },
          { id: EVENT_2, label: "London Forum" },
        ],
        rows: [
          { id: EVENT_1, label: { text: "Davos Summit" }, values: [null, 6] },
          { id: EVENT_2, label: { text: "London Forum" }, values: [null, null] },
        ],
        details: {
          [cellId]: {
            columns: ["pair", "date", "evidence"],
            rows: [
              {
                id: "pair-1",
                cells: [{ text: "Ada & Grace" }, { text: "14 Apr 2026" }, { key: "weft_facilitated" }],
              },
            ],
          },
        },
      },
    ],
  });

  assert.match(html, /Cross-event relationships/);
  assert.match(html, /25%/);
  assert.match(html, /6 of 24/);
  assert.match(html, /Reconnected pairs: Davos Summit → London Forum/);
  assert.match(html, /Ada &amp; Grace/);
  assert.match(html, /Weft-facilitated/);
  assert.match(html, /First introduction/);
  assert.match(html, /Later interaction/);
});

test("Sponsors view: Sponsor Outcomes handles with-target bars, null-target counts, comparison mode, and drill-down", () => {
  const withSponsorHtml = renderReporting({
    organizationName: "Analytical Engines",
    selectedEventId: EVENT_1,
    events: BASE_EVENTS,
    series: [],
    sponsors: [
      { key: "acme", label: "Acme Cloud" },
      { key: "globex", label: "Globex Ventures" },
    ],
    query: {
      view: "sponsors",
      report: "sponsor-outcomes",
      eventId: EVENT_1,
      sponsor: "acme",
      window: 7,
      metric: "goals",
      detail: "obj-1",
    },
    projections: [
      {
        id: "sponsor-outcomes",
        status: "ready",
        measure: { count: 14, total: 20 },
        columns: ["objective", "actual", "target"],
        rows: [
          { id: "obj-1", label: { key: "qualified" }, values: [14, 20] },
          { id: "obj-2", label: { key: "next_steps" }, values: [6, null] },
        ],
        details: {
          "obj-1": {
            columns: ["pair", "measure", "next_step"],
            rows: [
              { id: "m1", cells: [{ text: "Sponsor Lead & Buyer" }, { key: "meetings" }, { text: "Follow-up demo" }] },
            ],
          },
        },
      },
    ],
  });

  assert.match(withSponsorHtml, /70%/);
  assert.match(withSponsorHtml, /14 of 20/);
  assert.match(withSponsorHtml, /Qualified introductions/);
  assert.match(withSponsorHtml, /Reported next steps/);
  assert.match(withSponsorHtml, /Tracked without target/);
  assert.match(withSponsorHtml, /Supporting records for Qualified introductions/);
  assert.match(withSponsorHtml, /Follow-up demo/);

  const comparisonHtml = renderReporting({
    organizationName: "Analytical Engines",
    selectedEventId: EVENT_1,
    events: BASE_EVENTS,
    series: [],
    sponsors: [
      { key: "acme", label: "Acme Cloud" },
      { key: "globex", label: "Globex Ventures" },
    ],
    query: {
      view: "sponsors",
      report: "sponsor-outcomes",
      eventId: EVENT_1,
      window: 7,
      metric: "goals",
    },
    projections: [
      {
        id: "sponsor-outcomes",
        status: "ready",
        measure: { count: 22, total: 35 },
        columns: ["sponsor", "actual", "target"],
        rows: [
          { id: "acme", label: { text: "Acme Cloud" }, values: [14, 20] },
          { id: "globex", label: { text: "Globex Ventures" }, values: [8, 15] },
        ],
      },
    ],
  });

  assert.match(comparisonHtml, /Select a sponsor above/);
  assert.match(comparisonHtml, /sponsor=acme/);
  assert.match(comparisonHtml, /sponsor=globex/);
});

test("Measured zero, unavailable, and Spanish locale render distinctly and accurately", () => {
  const zeroHtml = renderReporting({
    organizationName: "Analytical Engines",
    selectedEventId: EVENT_1,
    events: BASE_EVENTS,
    series: [],
    sponsors: [],
    query: { view: "event", report: "demand", eventId: EVENT_1, window: 7, metric: "goals" },
    projections: [
      {
        id: "demand",
        status: "ready",
        measure: { count: 0, total: 18 },
        columns: ["connection_type", "open_requests"],
        rows: [{ id: "buyers", label: { key: "buyers" }, values: [0], counts: [{ count: 0, total: 18 }] }],
      },
    ],
  });
  assert.match(zeroHtml, /Measured zero/);
  assert.match(zeroHtml, /0 of 18/);
  assert.match(zeroHtml, /All recorded connection requests in this scope were fulfilled/);

  const unavailableEsHtml = renderReporting(
    {
      organizationName: "Motores Analíticos",
      selectedEventId: EVENT_1,
      events: BASE_EVENTS,
      series: [],
      sponsors: [],
      query: { view: "event", report: "goals", eventId: EVENT_1, window: 7, metric: "goals" },
      projections: [
        {
          id: "goals",
          status: "unavailable",
          columns: [],
          rows: [],
        },
      ],
    },
    "es",
  );
  assert.match(unavailableEsHtml, /Informes de resultados/);
  assert.match(unavailableEsHtml, /Reuniones registradas/);
  assert.match(unavailableEsHtml, /Gestionar evidencia/);
  assert.match(unavailableEsHtml, /Logro de objetivos de asistentes/);
  assert.match(unavailableEsHtml, /No disponible/);
  assert.match(unavailableEsHtml, /Entre eventos/);
  assert.match(unavailableEsHtml, /Patrocinadores/);
});
