import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTs, stubTs } from "./load-ts.mjs";

stubTs("@/shared/ui/console-account", {
  ConsoleAccount: ({ user, organization }) =>
    React.createElement("div", { className: "profile" }, `${user.displayName} · ${organization.name} · ${organization.role}`),
});

const context = {
  user: { id: "5f750edf-c8d5-43c2-b3ca-5f0ab190405f", displayName: "Ada Lovelace", avatarUrl: null },
  organization: { id: "0b0d7f7c-1e0c-4a39-9a1e-8f2b5e4f4c11", name: "Analytical Engines" },
  membership: { id: "membership-1", role: "organizer" },
};

const render = (props) => {
  const { ConsoleSidebar } = loadTs("src/shared/ui/console-sidebar.tsx");
  return renderToStaticMarkup(React.createElement(ConsoleSidebar, { context, ...props }));
};

test("sidebar carries Weft branding and no tenant demo copy", () => {
  const html = render({ active: "overview" });
  assert.match(html, /aria-label="Weft"/);
  assert.match(html, /The networking layer for business events\./);
  assert.doesNotMatch(html, /WE ARE ONE|We Are One|Nick|Stronger Tomorrow/i);
});

test("sidebar profile is the Clerk account control fed by the server-resolved context", () => {
  assert.match(render({ active: "events" }), /Ada Lovelace · Analytical Engines · organizer/);
});

test("unsupported Outcomes navigation is disabled, not a dead anchor", () => {
  const html = render({ active: "overview" });
  assert.doesNotMatch(html, /href="#outcomes"/);
  assert.match(html, /aria-disabled="true"[^>]*>.*Outcomes/s);
});
