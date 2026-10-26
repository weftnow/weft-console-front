import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require("@tanstack/react-query");
import { loadTs, stubTs } from "./load-ts.mjs";
import { event } from "./event-detail-fixture.mjs";
const scope = { actorId: "actor", sessionId: "session", activeOrganizationId: "A" };
stubTs("src/modules/events/components/events-query-provider.tsx", {
  useEventQueryScope: () => scope, useEndEventSession: () => () => {},
});
// Presentation is already render-tested separately; expose the boundary's actual props.
stubTs("src/modules/events/components/event-detail-page.tsx", {
  EventDetailPage: ({ event, refreshNotice }) => React.createElement("main", null, event.name, refreshNotice),
  MissingEvent: () => React.createElement("main", null, "Event not found"),
});
const contract = loadTs("src/modules/events/queries/event-detail-query.ts");
const render = client => {
  const { EventDetailQueryPage } = loadTs("src/modules/events/components/event-detail-query-page.tsx");
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(EventDetailQueryPage, { eventId: event.id, initialTab: "overview" })));
};

test("empty pending cache shows skeleton, ready empty roster and cached pending refresh show details", async () => {
  const client = new QueryClient();
  assert.match(render(client), /Loading event/);
  contract.seedEventDetail(client, scope, event);
  assert.match(render(client), /Launch/); assert.doesNotMatch(render(client), /Loading event/);
  const options = contract.eventDetailQueryOptions(scope, event.id);
  const pending = client.fetchQuery({ ...options, staleTime: 0, queryFn: ({ signal }) => { void signal; return new Promise(() => {}); } });
  pending.catch(() => {});
  assert.match(render(client), /Launch/); assert.doesNotMatch(render(client), /Loading event/);
  await client.cancelQueries(); client.clear();
});

test("terminal query results replace event presentation", () => {
  const client = new QueryClient();
  for (const [kind, text] of [["unauthorized", "Sign in required"], ["forbidden", "Access required"], ["not-found", "Event not found"]]) {
    client.setQueryData(contract.eventDetailKey(scope, event.id), { kind });
    const html = render(client); assert.match(html, new RegExp(text)); assert.doesNotMatch(html, /Launch|Loading event/);
  }
  client.clear();
});

test("query boundary retains cached data on refresh errors and exposes a first-load retry", () => {
  const source = require("node:fs").readFileSync("src/modules/events/components/event-detail-query-page.tsx", "utf8");
  assert.match(source, /query\.data\?\.kind === "ready"/);
  assert.match(source, /query\.isError \? <div className="event-detail-refresh-notice"/);
  assert.match(source, /Could not refresh event\. Showing the last loaded details\./);
  assert.match(source, /if \(query\.isPending\) return <EventDetailSkeleton \/>/);
  assert.match(source, /Could not load event/);
  assert.match(source, /Try again/);
});
