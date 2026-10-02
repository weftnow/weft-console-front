import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const event = (guests) => ({ attendees: { guests, imported: null }, staff: [] });
const guest = (firstName, company, position, guestType = "Attendee") => ({
  firstName, lastName: "Lane", company, position, guestType, email: "", phone: "", linkedin: "", profileType: "", source: "manual",
});

test("preview suggestions come from the event's real guests", () => {
  const { buildKamiPreviewScenarios } = loadTs("src/modules/events/kami-preview.ts");
  const scenarios = buildKamiPreviewScenarios(event([guest("Ada", "Analytical Ltd", "Founder"), guest("Grace", "Cobol Co", "Partner", "VIP")]));
  assert.equal(scenarios.length, 3);
  assert.equal(scenarios[0].suggestion.name, "Ada Lane");
  assert.equal(scenarios[0].suggestion.company, "Analytical Ltd");
  assert.match(scenarios[0].reason, /^Someone like Ada Lane/);
  for (const scenario of scenarios) assert.doesNotMatch(scenario.reason, /fits what you described/);
  assert.equal(scenarios[1].suggestion.name, "Grace Lane");
});

test("with no guests the preview uses generic descriptions, never named people", () => {
  const { buildKamiPreviewScenarios } = loadTs("src/modules/events/kami-preview.ts");
  const scenarios = buildKamiPreviewScenarios(event([]));
  assert.equal(scenarios.length, 3);
  for (const scenario of scenarios) {
    assert.doesNotMatch(JSON.stringify(scenario), /Sarah|Daniel|Sofia|Velocity|Atelier|Meridian|avatars/);
    assert.match(scenario.suggestion.name, /^A /);
  }
});
