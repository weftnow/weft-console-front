import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

test("invitation input normalizes case and whitespace while preserving email aliases", () => {
  const { parseInvitationInput } = loadTs("src/modules/organizations/invitations/validation.ts");
  assert.deepEqual(parseInvitationInput({ email: "  Ada.Lovelace+Weft@Example.COM ", role: "organizer" }), {
    email: "ada.lovelace+weft@example.com", role: "organizer",
  });
});

test("invitation input accepts only owner and organizer and enforces email limits", () => {
  const { parseInvitationInput } = loadTs("src/modules/organizations/invitations/validation.ts");
  for (const role of ["staff", "sponsor", "org:admin", "owner;organizer", null]) {
    assert.throws(() => parseInvitationInput({ email: "ada@example.com", role }));
  }
  assert.throws(() => parseInvitationInput({ email: `a${"x".repeat(250)}@example.com`, role: "owner" }));
  assert.throws(() => parseInvitationInput({ email: "invalid", role: "owner" }));
});

test("provider evidence accepts a secondary verified address and rejects alias substitution", () => {
  const { matchesInvitationEmail } = loadTs("src/modules/organizations/invitations/validation.ts");
  assert.equal(matchesInvitationEmail("ada+team@example.com", ["personal@example.com", "ADA+TEAM@example.com"]), true);
  assert.equal(matchesInvitationEmail("ada@example.com", ["ada+team@example.com"]), false);
  assert.equal(matchesInvitationEmail("ada.lovelace@example.com", ["adalovelace@example.com"]), false);
});
