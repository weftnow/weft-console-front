import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs } from "./load-ts.mjs";

test("empty state renders an inset icon well, title, description and one action", () => {
  const { EmptyState } = loadTs("src/shared/ui/empty-state.tsx");
  const { CalendarIcon } = loadTs("src/shared/ui/icons.tsx");
  const html = renderToStaticMarkup(React.createElement(EmptyState, {
    icon: CalendarIcon, title: "No events yet",
    description: "Create your first event to start measuring networking outcomes.",
    action: React.createElement("a", { href: "/events/new" }, "Create event"),
  }));
  assert.match(html, /class="empty-state empty-state--page"/);
  assert.match(html, /class="surface-inset empty-state__icon"/);
  assert.match(html, /<h2>No events yet<\/h2>/);
  assert.match(html, /<p>Create your first event to start measuring networking outcomes\.<\/p>/);
  assert.match(html, /<a href="\/events\/new">Create event<\/a>/);
});

test("panel empty state is compact and may omit description and action", () => {
  const { EmptyState } = loadTs("src/shared/ui/empty-state.tsx");
  const { CalendarIcon } = loadTs("src/shared/ui/icons.tsx");
  const html = renderToStaticMarkup(React.createElement(EmptyState, { icon: CalendarIcon, title: "No live events right now", size: "panel" }));
  assert.match(html, /class="empty-state empty-state--panel"/);
  assert.match(html, /<h3>No live events right now<\/h3>/);
  assert.doesNotMatch(html, /<p>/);
});
