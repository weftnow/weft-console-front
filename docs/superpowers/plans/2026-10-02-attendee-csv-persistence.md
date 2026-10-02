# Attendee CSV Persistence Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` and implement inline, task by task. Track checkbox steps. This is a planning artifact; implementation and database changes have not started.

**Goal:** Organizers upload CSV attendees to an existing event, append valid new records to Neon, see accurate import results, and retain the roster after refresh.

**Architecture:** Extend the existing event roster and database tables. Keep import contracts/client interaction in Events, business rules in a dedicated server import service, database operations in a dedicated repository, and the Next.js route thin. Reuse the current CSV parser, Zod guest schemas, organization permissions, auth boundary, HTTP errors, and Drizzle connection.

**Tech Stack:** Existing Next.js 16.3.5, TypeScript, Neon PostgreSQL, Drizzle ORM 0.45.x, Zod 4, csv-parse 7 and node:test. No new dependency is needed.

**Spec:** The user's October 2 request for persistent attendee CSV uploads and a sensible schema compatible with implemented events. The user explicitly selected **append new attendees and preserve existing records**. Authentication remains outside scope under the prior agreement.

## Database environment decision (updated October 2)

The user selected `production` → `weft_console` for real pilot data and `dev` → `weft_console_test` shared by local development and automated tests. No separate test branch or development database is required. All local URLs target `dev` / `weft_console_test`: pooled `DATABASE_URL`, direct `DATABASE_MIGRATION_URL` and `DATABASE_TEST_URL`, with `WEFT_MIGRATION_TARGET=development`. Stop local/preview app usage during live tests and treat this shared data as disposable. Destructive migration bootstrap/upgrade checks require a temporary scratch database or isolated schema; do not reset the shared development database. This decision supersedes earlier requirements for a separately isolated live-test database. See `docs/backend/create-event.md` for explicit environment loading and deployment assignments.

## What exists today

- Commit `d6c5bd2` implements event creation and persistent Event Detail. The working tree was clean when inspected.
- `src/modules/events/server/service.ts` already parses initial CSV data server side during Create Event. Its repository inserts guests and import metadata in the event-creation transaction.
- `event_guests` already has UUID IDs, an event FK, guest/contact fields, a guest-type enum, CSV/manual source, ordering, and event-scoped normalized-email uniqueness. This is the correct starting point; do not create a parallel attendees table.
- `event_attendee_imports` uses `event_id` as its primary key, permitting only one import per event. Guests are not linked to an individual import, and guest UUIDs are omitted from the current DTO.
- `AttendeeRoster` is read-only. CSV controls exist in Create Event, not the persisted Event Detail roster. Its counts-only/truncation copy is left over from the demo and does not describe the current atomic backend.
- `deriveEventMetrics` now counts saved guest rows correctly. Preserve that behavior rather than summing historical import counts.
- The shared CSV parser handles quoted commas/newlines, BOM, aliases, bounded input, Zod validation, and LinkedIn normalization. It returns logical guest-record numbers but throws the first row error. Its header handling can silently collapse duplicate columns; strengthen that deliberately.
- `getCurrentUser()` still returns null. All protected production requests fail closed. Automated tests inject trusted actors at server boundaries only.
- `drizzle/0000_create_event_backend.sql` and its metadata exist. The setup guide says live Neon inspection/migration verification is pending. No live database was accessed for this plan, and production schema state must not be assumed from local files.

## Global constraints

- Append imports. Do not delete guests or overwrite existing contact/profile/type data.
- Enforce active owner/organizer membership in the event's organization. Staff/sponsors have no full-roster import access.
- Determine actor and organization server side; the request does not accept `userId`, `organizationId`, counts, source, guest IDs or database timestamps.
- Authenticate and authorize every import, including replayed imports. Preserve the unconfigured auth seam; no provider/login/impersonation work.
- Keep existing Create Event CSV persistence working. Both creation and later uploads use the same parser, normalization rules and import-batch schema.
- Use server-only database modules, Zod at boundaries, parameterized Drizzle queries, consistent application errors, and safe logs without raw CSV/contact data.
- One synchronous transaction commits the batch and its guests together. No raw file storage, background queue, generic repository framework or separate backend service.
- Preserve the current UI. Add a small roster import panel/action, progress/error/result states and import history using current components and styles.
- Generate a new migration; do not rewrite `0000`, reset a populated database or manually change production tables.
- Before implementation, read relevant installed Next.js Route Handler and router-refresh guides. Planning already reviewed these under `node_modules/next/dist/docs/`.
- Implementation completion requires `pnpm lint`, `pnpm typecheck`, `pnpm test`, affected permission/flow verification, and an accurate report of pending live checks.

## Domain and schema decisions

An event guest represents an attendee's participation/contact snapshot **at one event**. It is not a Console login account. A person can participate in several events without their event-specific company, role or audience context being forcibly overwritten across events.

Keep `event_guests` as the participation table. Event ownership flows through `event_guests.event_id → events.organization_id`; do not duplicate organization IDs on guest rows unnecessarily. An email is only an event-local deduplication key, not a verified identity or a global person identifier. Global people/network identity resolution will later need explicit matching and consent rules; this import does not invent that model. A `Sponsor` guest is an attendee category, not automatically a Console sponsor membership or sponsor company record.

### Evolve `event_attendee_imports` into import batches

Keep the table name, replacing its event-only PK with a UUID `id` PK. Each successful upload creates one immutable batch, unless it replays an existing batch.

| Column | Meaning/constraint |
| --- | --- |
| `id` | UUID PK, default generated by PostgreSQL |
| `event_id` | Nonnull FK to events, cascade on event deletion |
| `imported_by` | Nonnull FK to local users, restrict user deletion; set from verified actor |
| `file_name` | Existing bounded display filename, 1–255 trimmed characters; no filesystem paths or control characters |
| `content_hash` | Nullable SHA-256 fingerprint, exactly 64 lowercase hex characters when present; null only for legacy batches with unrecoverable content |
| `fingerprint_version` | Nonnull integer default 1, CHECK equals 1 for this implementation |
| `imported_count` | Number of valid nonblank candidate records in this file |
| `stored_count` | Number of new guest records actually inserted by this batch |
| `duplicate_count` | Existing-roster email matches skipped during this upload |
| `blank_count` | Blank records ignored by parser; excludes the header |
| `vip_count`, `sponsor_count` | Counts among newly inserted records, not skipped candidates |
| `imported_at` | UTC `timestamptz`, nonnull default now |

Constraints: nonnegative counts; `imported_count = stored_count + duplicate_count`; VIP plus sponsor counts at most `stored_count`; candidate/stored counts at most 2,000. Add unique `(id, event_id)` for the composite guest FK; partial unique index `(event_id, fingerprint_version, content_hash)` where hash is nonnull; and index `(event_id, imported_at, id)` for deterministic history.

No pending/failed status is needed for synchronous atomic imports. A row describes a committed result. Invalid imports roll back and produce errors; they do not create misleading successful history rows.

### Extend `event_guests`

- Add nullable `import_id` and composite FK `(import_id, event_id) → event_attendee_imports(id, event_id)`, preventing a guest from referencing another event's import. Use `ON DELETE NO ACTION`; import deletion is outside scope. Event deletion still cascades to its children.
- Add nonnull UTC `created_at`/`updated_at`, default now for new records.
- Add CHECK: `source = 'csv'` requires `import_id`; `source = 'manual'` requires null. Add CHECK that `normalized_email IS NOT DISTINCT FROM nullif(lower(btrim(email)), '')`; preserve the existing partial unique email index. Blank emails do not collapse into one attendee.
- Add unique `(event_id, position)` to guarantee deterministic append ordering; preflight existing data before adding it. Keep `job_position` separate from this integer order.
- Keep contact string columns and existing bounds/enum checks compatible with Create Event. Avoid an unrelated blank-string/null migration in this feature.
- Include saved guest UUIDs/timestamps/import IDs in the output DTO. Do not add these fields to CSV/manual input schemas. Use persisted UUIDs as roster React keys.

The 2,000-attendee pilot limit becomes an **event roster total**, enforced inside the append transaction, not just a per-file limit. This keeps the existing full-roster DTO and browser pagination bounded. Expected attendees remains an estimate, never a capacity rule. Imports for live/completed events remain allowed because the current model has no closed-roster lifecycle policy.

## Import semantics

1. Accept at most 1 MiB UTF-8 CSV, at most 2,000 valid candidates, and the existing 3 MiB complete JSON request limit.
2. Reuse the downloaded Create Event template and column aliases. Require a recognized first/last name column and at least one name for every nonblank guest record. Email remains optional for CSV and valid when supplied; all existing field bounds, guest-type and LinkedIn rules apply.
3. Reject duplicate headers and multiple columns mapping to the same canonical field. Preserve unknown columns as ignored input only; they are never persisted. A nonblank row without a name is invalid, not silently skipped.
4. Duplicate normalized emails **within the file** reject the whole file with logical record/field errors, matching initial Create Event semantics. Errors refer to logical record numbers, not physical text lines when fields contain newlines.
5. Normalize then compare nonempty emails against the target event's current roster. Skip those already present, preserving their fields, guest type, source and provenance. Show the number skipped. The same email in another event/organization does not prevent insertion here.
6. Guests without email are accepted as distinct records. Do not merge by name/company/phone. Their protection against retry duplication is the batch fingerprint; reordered/changed files may legitimately append such records again, and the result/preview should explain this limitation.
7. Calculate a versioned fingerprint server side: SHA-256 of UTF-8 `JSON.stringify` of normalized guest tuples, in input order, with fixed field order `[firstName,lastName,email,phone,company,position,profileType,linkedin,guestType]`. Ignore filename, header spelling, BOM and newline encoding. Never trust a client hash.
8. An existing fingerprint in the same event returns that batch as a replay without any write, including for no-email guests. This is a content replay safeguard, not a claim to global person deduplication. Check replay before capacity, so retrying a successful full-roster import works.
9. If all candidates match existing emails, record a successful batch with `stored_count = 0` and the duplicate count. If an identical batch already exists, return it instead.
10. If new guests would push the roster beyond 2,000, reject atomically with 422. Report existing count, remaining capacity and proposed additions. No truncation, partial commits or CSV replacement.

## API, DTO and UI contract

Add `POST /api/events/{eventId}/attendee-imports` with JSON `{ fileName: string, csvText: string }`. JSON matches the implemented creation uploader; no multipart/object-storage pipeline is required for this bounded feature.

Success: `201` for a committed new batch, `200` for a replay:

```json
{
  "data": {
    "import": {
      "id": "uuid",
      "eventId": "uuid",
      "fileName": "guests.csv",
      "importedCount": 20,
      "storedCount": 17,
      "duplicateCount": 3,
      "blankCount": 0,
      "vipCount": 2,
      "sponsorCount": 1,
      "importedAt": "ISO timestamp"
    },
    "replayed": false
  }
}
```

Shared Zod response contracts validate client responses. Do not expose the hash, actor identity or raw CSV in browser DTOs. For a replay, counts describe that batch's original result; use explicit “This file was already imported; no attendees were added again” feedback, not a new insertion claim.

Replace `attendees.imported` with `attendees.imports: AttendeeImportDto[]` (latest 20 batches, ordered newest first with UUID tie-breaking) and `attendees.importCount` (total successful batches). Bound history output even though the database keeps all batches; label the visible history as the latest imports. Return saved guest IDs and provenance in `EventDetailDto`; update Create Event response parsing and affected fixtures together. `deriveEventMetrics` continues to count actual guest rows. A separate GET endpoint is unnecessary: the existing authorized Server Component query returns roster/history after `router.refresh()`.

Reuse errors/statuses: 400 malformed JSON/UUID, 401 no actor, 403 forbidden membership/origin, 404 missing event, 413 request size, 415 media type, 422 CSV/row/capacity/business validation, 500 sanitized unexpected failures. Field paths include `fileName`, `csvText`, `rows.{logicalRecord}.{field}`. Cap displayed row errors at 20 and indicate additional errors; do not return raw row values. Authorization precedes expensive CSV parsing and replay disclosure.

Add Import CSV in the roster header and empty state. Reuse the upload affordance/template and retain file selection on failure. Preview is advisory; the server reruns validation and duplicate detection. While uploading, synchronously guard submit and disable import actions. On success show added/skipped counts, refresh the current detail route and retain the attendees tab. Keep search/filter state; if filters hide new attendees, say so or offer Clear filters. If saving succeeds but refresh fails, report “Import saved; refresh to load the updated roster,” without encouraging a second creation claim. No localStorage or simulated success.

## Transaction and responsibility boundaries

`importAttendees({ userId, eventId, data })` validates request/ID, resolves event ownership, checks owner/organizer membership, parses/normalizes candidates, computes the fingerprint, and delegates the atomic append decision.

Use one concrete `withLockedEventRoster` repository operation rather than generic dependency injection. It starts a Drizzle transaction, locks the active membership row, rechecks the event's organization while locking the event row, and provides a framework-independent snapshot to a service callback. Define its contract in `attendee-import-types.ts`:

- Snapshot: membership `{ active, role }`, event ID/organization ID, current count/max order, existing normalized emails matching candidates, and an optional matching batch.
- Callback returns either `{ kind: 'replay', import }` or `{ kind: 'append', guests, counts }`; service decides role, replay, duplicate skipping and capacity.
- Repository persists the append batch/guests, updates `events.updated_at` for a new successful batch, and returns `{ import, replayed }` from inside the transaction. No fallible post-commit read is needed to construct the result.

Use membership-before-event locking consistently; each transaction imports into one event. All future roster mutation writers must lock that event before computing capacity/order. The unique email/order/fingerprint constraints remain the final protection against inconsistent writers. Do not catch and ignore arbitrary `23505` errors as duplicates; only the planned replay/skip cases are successful.

## Migration strategy

1. Inspect the configured development database and migration journal read-only. Confirm the local schema represents it. Do not display credentials or assume that `0000` has been applied.
2. Generate a second named migration `attendee_import_batches`, preserving `0000` and its metadata. Change `db:generate` from its hardcoded creation name to a generic command so callers supply `--name`.
3. Add batch UUIDs, actor/count/fingerprint fields and guest provenance/timestamps in a staged migration. Give each legacy import one UUID; infer its actor from `events.creator_id` because legacy imports were only created during event creation. Keep its fingerprint null: the original CSV is unavailable and must not be fabricated.
4. Link existing CSV guest rows to that event's legacy batch. Backfill guest timestamps from the event creation timestamp, documenting that these are inferred legacy values. Preserve every guest UUID/contact field and existing import timestamp/count.
5. Preflight anomalies: CSV guests without a legacy batch, duplicated order positions, mismatched stored/guest counts, inconsistent normalized emails or imported totals. Stop and report them before adding constraints; do not discard/merge records silently or falsify history to make migration pass.
6. Replace the event-only PK, add the new FKs/checks/indexes and enforce nonnull fields after backfill. Test clean bootstrap and upgrade from populated `0000` fixtures.
7. Deploy the migration and application together in a controlled window. The old app expects one import per event and is not compatible with new history writes; do not let old/new versions write concurrently. After new batches exist, rollback requires a forward fix, not dropping history columns.

## File map

Create:

- `src/modules/events/attendee-import-types.ts`: typed request/result/snapshot/decision contracts.
- `src/modules/events/attendee-import-schemas.ts`: shared Zod input/result/history and saved-guest DTO schemas.
- `src/modules/events/server/attendee-import-service.ts`: authorization, import preparation, append policy.
- `src/modules/events/server/attendee-import-repository.ts`: scoped locks, snapshots and transactional writes.
- `src/modules/events/mutations/import-attendees.ts`: client fetch/response/error adapter.
- `src/modules/events/components/attendee-import-panel.tsx`: file/preview/submit/error/result interaction.
- `src/modules/events/guest-csv-template.ts`: extract the existing template/download helper for reuse without changing its columns.
- `src/infrastructure/http/import-attendees-handler.ts`: thin HTTP adaptation.
- `src/app/api/events/[eventId]/attendee-imports/route.ts`: Node.js POST route.
- `tests/attendee-import-{validation,service,api,database,client}.test.mjs`.
- `docs/backend/attendee-imports.md`.

Modify:

- Database `schema/events.ts`, `package.json` generation script and new generated `drizzle/` SQL/metadata.
- `guest-csv-core.ts`, `guest-csv.ts`, `server/guest-csv-server.ts`, `event-schemas.ts` only as needed to share parser/validation policy.
- Events `server/service.ts` and `server/repository.ts` for initial batch provenance and new DTO mapping.
- `event-dto.ts`, `event-record.ts`, `components/attendee-roster.tsx` and `components/event-detail-page.tsx` for saved UUIDs, imports/history and refresh; Create Event component for shared template imports.
- HTTP `errors.ts` to accept an optional operation-specific unexpected-error message, preserving existing callers. Import failures must not say “creating the event.”
- Existing event fixtures/tests impacted by `attendees.imports` and saved guest DTOs; `README.md`, backend guide, narrowly scoped `globals.css` if needed.

## Review focus

1. Cross-organization or revoked membership must prevent reads, replays and writes.
2. Repeated/concurrent files must not duplicate guests or exceed event capacity.
3. Duplicate email skipping must never overwrite manual/VIP/contact records or count skipped rows as new attendees.
4. Legacy migration must retain guest IDs/provenance and initial Create Event persistence.
5. Successful persistence followed by failed refresh must not look like a failed database save.

## Task 1: Define reusable CSV contracts and append decisions

**Files:** new import types/schemas, CSV core/server/browser wrappers, validation tests.

**Interfaces:** `attendeeImportInputSchema`; `AttendeeImportInput`; `AttendeeImportDto`; `ImportAttendeesResult = { import: AttendeeImportDto; replayed: boolean }`; `prepareCsvImport(input): PreparedCsvImport`; `decideAttendeeAppend(snapshot, prepared): ImportDecision`.

- [ ] Write tests for the current template/aliases, BOM/quotes/newlines, invalid emails/URLs/types/lengths, empty CSV, duplicate/ambiguous headers, unknown fields, logical record errors and 1 MiB/2,000 limits.
- [ ] Extract only genuinely shared normalization/limits from the current parser. Preserve Create Event behavior, including rejection of duplicate candidate emails. Return bounded structured row errors without exposing raw values.
- [ ] Implement deterministic server fingerprinting and pure append decision tests: existing emails skipped, manual fields untouched, cross-event email permitted, replay checked before capacity, and no-email guests kept distinct.
- [ ] Run `node --test tests/attendee-import-validation.test.mjs tests/event-csv.test.mjs tests/event-service.test.mjs`; acceptance includes unchanged initial creation validation behavior.

## Task 2: Migrate the existing participation/import model safely

**Files:** Drizzle schema/new migration/metadata, package script, database tests.

**Interfaces:** Export the evolved `eventAttendeeImports` and `eventGuests` schemas with batch IDs/provenance, compatible with the existing database accessor.

- [ ] Create populated legacy fixtures with CSV plus manual guests and capture their UUIDs/counts before migrating. Test migration anomalies explicitly rather than normalizing them silently.
- [ ] Implement the staged schema/backfill strategy above. Generate the named migration with the installed Drizzle Kit; inspect generated SQL for drop/recreate data loss. Add required custom backfill/preflight SQL to the tracked migration.
- [ ] Apply on the shared `dev` / `weft_console_test` database only (with app usage stopped), using the existing `WEFT_MIGRATION_TARGET` mechanism. Verify clean bootstrap, populated upgrade, repeat migration tracking, FK/partial unique/check constraints and preserved data.
- [ ] Run live tests only with `WEFT_DATABASE_TEST=1` and `DATABASE_TEST_URL` targeting `dev` / `weft_console_test`. If unavailable, record live verification as pending; enabled tests must fail on missing configuration.

## Task 3: Keep Create Event and authorized Detail compatible

**Files:** existing event service/repository, event DTO/record, affected event tests.

**Interfaces:** `createEvent` and `getEvent` keep their existing call signatures; their DTO uses `attendees.imports` and persisted guest identifiers. Add the initial CSV's server fingerprint to preparation and return the latest 20 committed batches plus total batch count.

- [ ] Update initial creation to insert one batch before CSV guests, associate CSV rows with its UUID, keep manual `import_id` null, and set `imported_by` from the creator. Preserve the existing all-or-nothing creation transaction.
- [ ] Map all saved guest IDs/timestamps/import IDs and the latest 20 import summaries plus total batch count in authorized retrieval. Order history deterministically and keep actual guest-count metrics.
- [ ] Update strict response schemas, roster types and existing fixtures/tests together. Remove single-import counts-only/truncation assumptions; do not sum import candidate counts into attendance.
- [ ] Test creation with and without CSV, CSV/manual combined roster, failure rollback, legacy history retrieval, multiple batches and stable guest UUIDs. A file used during creation after this upgrade should replay safely when uploaded later. Legacy null-hash batches cannot prove file replay: existing emails still skip, but no-email legacy rows may be appended again on the first re-upload; document this instead of guessing identity.

## Task 4: Implement authorized transactional append persistence

**Files:** new service/repository, service/database tests.

**Interfaces:** `importAttendees({ userId: string, eventId: string, data: unknown }): Promise<ImportAttendeesResult>`; `withLockedEventRoster(args, decide): Promise<ImportAttendeesResult>`, using the concrete snapshot/decision types from Task 1 and no Next.js/Drizzle types in business logic.

- [ ] Test authorization before parsing, inactive/forged membership, missing event, replay, append/dedup policy and total capacity using injected repository snapshots.
- [ ] Implement the membership/event locks, organization recheck, matching-email/history reads, bulk guest inserts, batch insert and event timestamp update in one transaction. Assign new positions from locked max position, not total count. Select existing matches only inside the authorized event.
- [ ] Verify result DTO is constructed from transaction-returned values. Unexpected child insertion failure must leave no batch/guest/timestamp change.
- [ ] Add live tests for concurrent identical files (one batch), overlapping emails across different files, no-email replay, two near-capacity uploads (no overflow), and membership revocation. Assert fresh database reads retain saved attendees.
- [ ] Add a repeated-file test proving the batch replay does not rewrite attendance/history or change original records.

## Task 5: Expose the thin import endpoint

**Files:** Route Handler/HTTP adapter/errors helper, API tests.

**Interfaces:** `handleImportAttendees(request, eventId, dependencies?)` and POST route with awaited `RouteContext<'/api/events/[eventId]/attendee-imports'>` params. Reuse `readBoundedJson` and `errorResponse`.

- [ ] Test absent auth returns 401 without parsing/writes. Validate UUID/body, enforce the same-origin policy and content-type/body bounds, call the import service and validate its response DTO.
- [ ] Return 201 new/200 replay, private/no-store responses, and the consistent error envelope. Add operation-specific generic failure copy: “Something went wrong while importing attendees. Please try again.”
- [ ] Test every stated status, forged extra fields, sanitized row errors, cross-organization replay denial, streamed oversized requests and generic database failure logging.
- [ ] Confirm default auth still fails closed. No provider, default user, spoofable actor header or production test seam is added.

## Task 6: Add roster upload feedback and refresh

**Files:** import panel/client mutation, roster/detail components, client tests, minimal CSS.

**Interfaces:** `submitAttendeeImport(eventId, input, fetcher?): Promise<ImportAttendeesResult>`; `AttendeeImportPanel({ eventId, onSaved })`; roster consumes the persisted `EventDetailDto`.

- [ ] Add Import CSV for empty and populated rosters, file selection/replacement, template download and advisory preview using existing controls. Display the 1 MiB/2,000 roster limits and append/skip behavior.
- [ ] Implement synchronous submission guard, pending state, field/record errors, preserved file on failure, and schema-validated success/error responses. No automatic POST retry.
- [ ] Show committed/replayed counts with correct wording. Refresh the server-backed detail route after saving and keep the attendees tab/search/filter state; distinguish committed save from failed refresh.
- [ ] Display bounded import history metadata from the Detail DTO. Use guest UUID React keys and actual roster metrics; remove obsolete browser-quota/counts-only copy.
- [ ] Test duplicate clicks, validation/server/network failures, committed/replayed results, hidden-by-filter feedback, refresh failure, no-email UUID keys and retained selection. Keep the existing Create Event uploader working.

## Task 7: Verify persistence and document pilot operation

**Files:** backend import guide, README, required fixes/tests.

- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`; resolve regressions in initial creation, Detail and CSV preview.
- [ ] Run the explicit nonproduction migration/import/concurrency suites when configured. Record actual results and skipped checks accurately.
- [ ] With trusted test actors, verify upload → server parsing/authorization → atomic append → roster/history read → refresh from database, with empty localStorage. Verify unauthorized org/staff/sponsor denial and sanitized database errors.
- [ ] Verify default browser/API behavior remains authentication-required/401. Real authenticated browser acceptance is pending the separate auth integration; do not add a bypass to perform this check.
- [ ] Document migration/backfill, deploy compatibility window, limits, duplicate/replay semantics, no-email caveat, actual generated migration filename and future global people identity boundary.
- [ ] Summarize created/modified files, schema/migration/endpoints, checks performed, remaining auth/live-DB requirements and deferred capabilities.

## Deferred work

Authentication implementation; attendee edits/deletion/manual addition after creation; roster replacement; full global People directory persistence/identity matching; sponsor/company administration; large asynchronous imports; raw file retention/export; lifecycle restrictions; server-paginated rosters beyond the 2,000-record pilot bound.

## Technical references

Use composite FKs and uniqueness for cross-row consistency; CHECK constraints cannot reliably enforce an event-wide attendee count. Capacity is checked under the event lock. [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

Serialize competing append operations using row locks acquired consistently inside the transaction. [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html).

Use the installed Drizzle transaction API and its existing PostgreSQL driver. [Drizzle transactions](https://orm.drizzle.team/docs/transactions).
