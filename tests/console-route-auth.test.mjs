import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const appRoot = path.resolve("src/app");

function routePages(directory = appRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return routePages(target);
    return entry.name === "page.tsx" ? [target] : [];
  });
}

test("active Clerk session supplies the verified subject and pending sessions redirect", async () => {
  const { createRequireClerkSession } = loadTs("@/infrastructure/auth/require-session");
  const redirect = async () => { throw new Error("redirected"); };

  await assert.rejects(
    createRequireClerkSession(async () => ({ userId: null, sessionStatus: "pending" }), redirect),
    /redirected/,
  );
  const requireSession = createRequireClerkSession(async () => ({ userId: "user_verified_123", sessionStatus: "active" }), redirect);
  assert.deepEqual(await requireSession({ subject: "forged" }), { subject: "user_verified_123" });
});

test("every business page checks the server session before rendering", () => {
  const publicRoutes = new Set([
    path.join(appRoot, "sign-in", "[[...sign-in]]", "page.tsx"),
    path.join(appRoot, "sign-up", "[[...sign-up]]", "page.tsx"),
    path.join(appRoot, "accept-invitation", "page.tsx"),
  ]);
  const unguarded = routePages().filter((file) => {
    if (publicRoutes.has(file)) return false;
    const source = readFileSync(file, "utf8");
    return !source.includes("requireClerkSession(") && !source.includes("requireOrganizerPageContext(");
  });
  assert.deepEqual(unguarded, [], `unguarded business routes: ${unguarded.map((file) => path.relative(appRoot, file)).join(", ")}`);
});

test("Clerk session guard rejects missing and pending sessions without accepting caller identity", async () => {
  const { createRequireClerkSession } = loadTs("@/infrastructure/auth/require-session");
  let redirects = 0;
  const redirect = async () => { redirects += 1; throw new Error("redirected"); };
  await assert.rejects(createRequireClerkSession(async () => ({ userId: null, sessionStatus: "signed-out" }), redirect));
  await assert.rejects(createRequireClerkSession(async () => ({ userId: "pending_user", sessionStatus: "pending" }), redirect));
  assert.equal(redirects, 2);
});
