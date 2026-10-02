import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

test("server CSV parsing keeps quoted newlines and rejects invalid rows", () => {
  const { parseGuestCsvServer } = loadTs("src/modules/events/server/guest-csv-server.ts");
  const parsed = parseGuestCsvServer('\uFEFFFirst Name,Last Name,Email,Company,Guest Type\nAda,Lovelace,ada@example.com,"North,\nSouth",VIP\n');
  assert.equal(parsed.guests.length, 1);
  assert.equal(parsed.guests[0].company, "North,\nSouth");
  assert.equal(parsed.vips, 1);
  assert.throws(() => parseGuestCsvServer("First Name,Email,Guest Type\nAda,ada@example.com,Alien\n"));
});

test("invalid CSV profile links identify the offending row", () => {
  const { parseGuestCsvServer } = loadTs("src/modules/events/server/guest-csv-server.ts");
  assert.throws(
    () => parseGuestCsvServer("First Name,LinkedIn\nAda,https://example.com/in/ada\n"),
    /Row 2/,
  );
});

test("initial Create Event uploader can surface structured attendee CSV row errors", () => {
  const { getGuestCsvFieldError } = loadTs("src/modules/events/guest-csv.ts");
  assert.equal(getGuestCsvFieldError({ "attendeeImport.rows.8.email": "Enter a valid email address." }), "Enter a valid email address.");
  assert.equal(getGuestCsvFieldError({ description: "Required" }), null);
});
