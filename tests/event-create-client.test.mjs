import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const { submitCreateEvent } = loadTs("src/modules/events/mutations/create-event.ts");

test("client adapter preserves typed API field errors and does not retry", async () => {
  let calls = 0;
  await assert.rejects(submitCreateEvent({ organizationId: "target" }, async () => {
    calls++;
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Check the event.", fields: { name: "Required" } } }, { status: 422 });
  }), (error) => error.code === "VALIDATION_ERROR" && error.fields.name === "Required");
  assert.equal(calls, 1);
});

test("client adapter rejects malformed success and network failures safely", async () => {
  await assert.rejects(submitCreateEvent({}, async () => Response.json({ data: { event: { id: "forged" } } }, { status: 201 })), (error) => error.code === "INTERNAL_ERROR");
  await assert.rejects(submitCreateEvent({}, async () => { throw new Error("network secret"); }), (error) => error.code === "INTERNAL_ERROR" && !error.message.includes("secret"));
});
