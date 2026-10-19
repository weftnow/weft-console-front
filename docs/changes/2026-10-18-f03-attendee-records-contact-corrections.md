# F03 Attendee records and contact corrections

Status: Complete
Linked plan: [Implement F03 attendee records and contact corrections](../exec-plans/completed/2026-10-18-f03-attendee-records-contact-corrections.md)
Source: Weft Console Implementation Backlog, feature F03, supplied by the user.

## Problem and requirements

Imported attendee details can currently be read from the event roster but not corrected in place. F03 adds authorized correction and duplicate identity review while preserving original guest IDs, import provenance, and related records.

- Correct first/last name, email, phone, company, position, profile type, guest type, and LinkedIn details without reimporting the attendee.
- Keep canonical person identity event-scoped and separate from guest/import IDs. Keep one main person record and explicitly link duplicate guest records to it; do not delete or rewrite imported source records.
- Flag missing contact details and syntactically invalid values. Phone flags are syntax-only: preserve explicit country codes, do not guess a country code, and do not claim that a number works or belongs to the guest.
- Suggest duplicate candidates only for exact normalized email or phone matches. Name similarity alone is not a candidate signal and never causes a merge.
- Identity links do not use the guest replacement revision. Guest detail replacements use a positive revision and the F01 `expectedRevision` / `409 STALE_VERSION` contract.
- If linking records conflicts with existing matches, pause the identity link until each affected match has an explicit disposition. Preserve related profiles, matches, and meeting results through stable guest IDs.

## Affected users and access

Owners and Organizers may read, correct, and resolve attendee identities within their organization. Staff operators retain read-only roster access under F01. Wefters, sponsors, attendees, inactive members, and users outside the event organization cannot read or mutate F03 data. Authorization is enforced in server operations, not only in the UI.

## Observable behavior

- Event Detail's existing roster exposes attendee correction, contact-quality flags, duplicate candidate review, and explicit identity linking.
- A correction to a stale guest revision returns the latest authorized guest snapshot and preserves the user's unsaved draft for deliberate review and resubmission.
- A proposed identity link is event-scoped, explicit, and atomic. A match conflict leaves the link unapplied until every conflict has been resolved.
- Unclear identity remains held from later matching and introductions. No name-based identity inference, cross-event person matching, phone verification, or country-code inference occurs.

## Compatibility and scope

Keep the current append-only CSV import, replay, duplicate-email, and capacity behavior. Corrections retain `guestId`, `source`, and `importId`; import batches remain immutable. The current repository has no persisted profiles, matches, or meeting results, so F03 does not create those future feature tables. It preserves their stable guest references and enforces the conflict rule for related records that exist when the operation is implemented.

At implementation time no related match records or match tables exist, so no current link can conflict with a persisted match. The future matching owner must integrate an atomic conflict check and explicit disposition for each affected match before links can affect those records. F03 does not create placeholders for that integration.

No attendee app, new CSV workflow, phone verification, communication attempts/history, cross-event people directory, redesign, or automatic merge is included.

## Acceptance scenarios

1. An Owner or Organizer corrects each supported detail, reloads the roster, and sees the saved value while the guest and import IDs/history remain unchanged.
2. Two edits based on the same revision result in one save and one stale-version conflict with an authorized current snapshot; the client retains the draft for review.
3. Blank or malformed contact values receive appropriate flags. Phone checks do not infer country codes or claim reachability.
4. Exact normalized email/phone candidates can be reviewed and explicitly linked. Name-only similarity does not suggest or link records. A record from another event cannot be linked.
5. A link that would create conflicting matches remains unapplied until each affected match has an explicit disposition; related records retain their original guest references.
6. Owner/Organizer writes succeed. Operator writes and Wefter, sponsor, attendee, inactive-member, outsider, cross-event, and cross-organization access are denied at the server boundary.
7. CSV import append/replay/capacity behavior remains unchanged, and migrations preserve all current attendee/import records.
