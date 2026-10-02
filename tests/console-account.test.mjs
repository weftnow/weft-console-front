import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("sidebar displays server supplied identity and role through Clerk account controls", () => {
  const sidebar = read("src/shared/ui/console-sidebar.tsx");
  const account = read("src/shared/ui/console-account.tsx");
  assert.match(sidebar, /ConsoleAccount/);
  assert.doesNotMatch(sidebar, /Nick|Organizer<\/span>/);
  assert.match(sidebar, /organization\.name/);
  assert.match(account, /UserButton/);
  assert.match(account, /clearOrganizationSelection/);
  assert.match(account, /signOut\(\{ redirectUrl: "\/sign-in" \}\)/);
});

test("dashboard views render real records or empty states, so they carry no demo-data notice", () => {
  for (const file of [
    "src/modules/insights/components/organizer-overview.tsx",
    "src/modules/events/components/events-page.tsx",
    "src/modules/network/components/network-page.tsx",
    "src/modules/attendees/components/people-page.tsx",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /DemoDataNotice|-data"/);
    assert.match(source, /EmptyState/);
  }
});

test("authentication routes preserve same-origin destinations and sign out to sign-in", () => {
  const signIn = read("src/app/sign-in/[[...sign-in]]/page.tsx");
  const signUp = read("src/app/sign-up/[[...sign-up]]/page.tsx");
  assert.doesNotMatch(signIn + signUp, /forceRedirectUrl=/);
  assert.match(signIn + signUp, /fallbackRedirectUrl=/);
});
