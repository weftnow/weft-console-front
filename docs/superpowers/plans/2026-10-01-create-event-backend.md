# Create Event Backend Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Steps use checkboxes for tracking. This document authorizes planning only; it does not initiate implementation or production migrations.

**Goal:** An authorized organizer creates an event in Neon, reaches `/events/{returnedId}`, and sees the saved event after refreshing or opening it in another authenticated browser.

**Architecture:** Keep Next.js pages and Route Handlers thin. Put event services and repositories inside the existing Events module, organization permissions inside Organizations, and database/auth adapters under `src/infrastructure`. Services receive verified actor IDs and validated inputs, contain no Next.js imports, and coordinate atomic repository operations.

**Tech Stack:** Existing Next.js 16.3.5, React 19.2.8 and TypeScript; Neon PostgreSQL, Drizzle ORM, Zod, and a server authentication integration contract. Authentication implementation is explicitly outside scope. Node.js runtime with `pg` and `drizzle-orm/node-postgres` for interactive transactions.

**Spec:** The user's Create Event backend requirements supplied on October 1, 2026, the user's clarification that authentication has not been implemented and is outside scope, and this document's explicitly proposed decisions. Relevant repository references: `ARCHITECTURE.md`, `docs/product.md`, `src/modules/events/components/create-event-page.tsx`, and `src/modules/events/event-record.ts`. Earlier demo plans describe the current implementation, not the new persistence requirements.

## Database environment decision (updated October 2)

The user selected `production` → `weft_console` for real pilot data and `dev` → `weft_console_test` shared by local development and automated tests. No separate test branch or development database is required. All local URLs target `dev` / `weft_console_test`: pooled `DATABASE_URL`, direct `DATABASE_MIGRATION_URL` and `DATABASE_TEST_URL`, with `WEFT_MIGRATION_TARGET=development`. Stop local/preview app usage during live tests and treat this shared data as disposable. Destructive migration bootstrap/upgrade checks require a temporary scratch database or isolated schema; do not reset the shared development database. This decision supersedes earlier requirements for a separately isolated live-test database. See `docs/backend/create-event.md` for explicit environment loading and deployment assignments.

## Repository findings

- The actual routes are `/events/new` and `/events/[eventId]`, not `/dashboard/events/...`.
- `create-event-page.tsx` currently creates slug IDs in the browser, compresses covers, and calls `saveEventRecord()` to write localStorage before redirecting.
- Event Detail's route is already a Server Component. Its client component currently calls `loadEventRecord()` after mounting, including a seeded-event fallback.
- `package.json` contains Next.js, React and Recharts. There is no installed/configured application auth integration, Neon integration, Drizzle, Zod, database schema, or organization/user model in the inspected source.
- The displayed organizer and staff are hardcoded. Staff IDs such as `maria` are demo identifiers, not membership IDs.
- No API/error conventions exist to reuse. Existing tests use `node:test` in `tests/*.test.mjs` and transpile TypeScript with the installed TypeScript compiler.
- `docs/domain.md`, `docs/engineering.md`, `docs/adr/`, and `specs/`, referenced by AGENTS.md, are absent. Design guidance actually lives under `docs/design/`.
- The existing uncommitted change renames the package to `weft-console-frontend`; preserve it.
- No live Neon database was inspected: there is no connection configuration in this checkout. Absence of a local schema does not prove an external database is empty.

## Global constraints

- Keep the existing Create Event layout and shared controls. Change behavior, data sources, errors, and necessary copy only.
- Use Next.js as the backend layer; introduce no separate backend application.
- Validate all external input with Zod, including IDs, nested guests, file metadata and query parameters.
- Enforce authentication and organization authorization server side for every protected read and write.
- Never persist client identity, organizer names, role claims, event IDs, aggregate counts, timestamps, or unknown fields as trusted facts.
- Mark database, auth adapters, services and repositories `server-only`; keep shared schemas and DTOs safe to import in clients.
- Generate and apply versioned Drizzle migrations; do not use schema push or manual production DDL.
- No production migration runs during development or this planning task.
- Before writing implementation code, read the installed Next.js documentation relevant to the changed APIs. Planning reviewed Route Handlers, Server/Client Components, and authentication guides under `node_modules/next/dist/docs/`.
- Run `pnpm lint`, `pnpm typecheck`, and `pnpm test` before implementation completion, as required by AGENTS.md.

## Prerequisites and proposed decisions

**Authentication is outside scope, as explicitly confirmed by the user.** Define a small server-side verified-user contract and a fail-closed integration seam; do not select/install an authentication provider, build login/session handling, or invent a default user. Until a future auth implementation supplies a verified local user UUID, API requests return 401 and protected pages show an authentication-required state. Tests may inject a trusted actor at the server boundary; no development identity header, query parameter or production mock session is permitted. The code can be implementation-ready, but the real authenticated browser lifecycle cannot be declared complete until auth is integrated.

**Organization provisioning:** Use the minimal local tables below. A restricted provisioning command can attach an existing local user UUID to a pilot organization; no user is treated as authenticated merely because that record exists. Populate real pilot users and connect provider identities when the later authentication implementation is available. If that work introduces authoritative organization tables, adapt/reuse them rather than duplicating them. Public signup, invitations, organization creation, and team administration are separate work. Never auto-enroll a submitting user into an organization.

**Pilot scope:** Persist the existing form's event data, initial guests/import metadata, and valid staff assignments atomically. These are creation inputs, not a complete attendee/team management backend. Persist covers with a bounded database-backed pilot implementation so selecting an image actually survives refresh. Keep Kami simulation, networking metrics, attendee operations after creation, and persistent drafts outside this feature.

**Active organization:** Once authentication is connected, for one authorized organization, the server selects it. For multiple organizations, require an explicit selection using existing organization context if found; otherwise add a compact organization field to the existing form. Treat the submitted UUID only as a target and always verify membership. Display the verified user as organizer.

**Permission policy proposed for the pilot:** Local organization memberships have `owner`, `organizer`, `staff`, or `sponsor` roles and an active flag. Only active owners/organizers can create events or load the full organizer Event Detail. Staff and sponsors cannot access this organizer DTO, which includes guest contact data. No global Weft-staff bypass is introduced. Keep this policy explicit for the future authentication integration; no provider role is automatically equivalent to a local organization membership.

**Recovery and duplicates:** Use a synchronous submit guard and disabled controls. Do not automatically retry POST requests. This prevents repeated clicks in one form; it does not guarantee exactly-once creation after a lost response or across tabs. Server idempotency is a separately identified follow-up if needed for the pilot.

## Form inventory and API contract

| Existing UI input | API field | Proposed validation/persistence |
| --- | --- | --- |
| Event name | `name` | Trimmed, required, 1–160 characters |
| City | `city` | One of the existing five options |
| Venue | `venue` | Optional, trimmed, at most 200 characters; blank becomes null |
| Expected attendees | `expectedAttendees` | Null or integer 0–1,000,000; an estimate, not an attendee limit |
| Start/end dates | `startDate`, `endDate` | Required real calendar dates, exact `YYYY-MM-DD`, end date at or after start |
| Start/end times | `startTime`, `endTime` | Optional, exact `HH:mm`; blank becomes null |
| Cover image | `coverImage` | Optional normalized raster data URL; bounded and decoded server side |
| Description | `description` | Trimmed, required, 1–500 characters, matching the displayed required marker and existing counter |
| Event categories | `categories` | Required nonempty array from the existing ten options, no duplicates |
| Expected audience | `expectedAudience` | Optional array from the existing eleven options, no duplicates |
| CSV selection | `attendeeImport` | Null or `{ fileName, csvText }`; parse again on the server |
| Manual guest list | `manualGuests` | Validated guest objects; source set by server |
| Staff selection | `staffMembershipIds` | Unique UUIDs; server verifies active same-organization staff/organizer memberships |
| Organizer display | None | Derived from verified auth user, never submitted as identity |

Additional targeting field: `organizationId`, a UUID checked against membership. No `eventType` or `attendeeLimit` field is added: the current UI has neither. No status selector exists.

Proposed safety limits: maximum 2,000 total initial guests, CSV at most 1 MiB UTF-8, normalized cover at most 256 KiB decoded, and complete JSON request at most 3 MiB. Replace the current 10 MB CSV message and silent truncation with these explicit pilot limits. Confirm deployment request limits before implementation; enforce bounds while reading, not only via `Content-Length`.

Guest validation: manual first name is required and at most 100 characters; last name at most 100; email is required for manual guests, optional for CSV guests, valid when supplied and at most 254; phone at most 40; company/position at most 200; profile type at most 100. CSV requires at least one name and allows missing email, preserving existing import behavior. `guestType` is `Attendee`, `VIP`, or `Sponsor`; unknown nonblank CSV values are errors. Normalize bare `linkedin.com/in/...` links to HTTPS; permit only LinkedIn HTTP(S) profile URLs, at most 500 characters. Reject duplicated nonempty normalized emails within the combined initial roster with row/field errors. Do not use email as global person identity.

`POST /api/events` returns `201` with `{ data: { event: EventDetailDto } }` and `Location: /events/{id}`. DTO dates/times are strings, timestamps are ISO strings, and the cover is an authenticated URL rather than embedded bytes. Use an explicit DTO mapper and a shared response schema; the frontend validates successful responses rather than casting arbitrary JSON.

Errors use `{ error: { code, message, fields? } }`, where `fields` maps input paths to one message. Codes/statuses: `INVALID_JSON`/400, `UNAUTHORIZED`/401, `FORBIDDEN`/403, `NOT_FOUND`/404, `PAYLOAD_TOO_LARGE`/413, `VALIDATION_ERROR`/422, and `INTERNAL_ERROR`/500. Use 415 for unsupported request content type. Business validation errors use 422. Unexpected failures return “Something went wrong while creating the event. Please try again.” Log a request ID and safe context server side; exclude bodies, contact details, credentials, SQL parameters and stack traces from responses. Sanitize logged database errors because their detail can contain guest data.

## Date and lifecycle decisions

The browser submits date-only strings and optional wall-clock times, never `new Date(input).toISOString()`. The server derives timezone from the selected city:

| City | IANA timezone |
| --- | --- |
| Las Vegas, USA | `America/Los_Angeles` |
| Singapore | `Asia/Singapore` |
| Davos, Switzerland | `Europe/Zurich` |
| Aspen, USA | `America/Denver` |
| Monaco | `Europe/Monaco` |

Persist the exact local dates, optional times and timezone alongside derived UTC `starts_at`/`ends_at` timestamps. These local fields preserve whether a time was omitted. Resolve conversions in one pure helper using `@js-temporal/polyfill`, with DST disambiguation set to reject; report nonexistent or ambiguous entered times as field errors. This small dependency avoids hand-written timezone conversion.

Missing start time means local midnight. Missing end time means midnight following the selected end date. Explicit end times are exclusive boundaries. Require `ends_at > starts_at`. Date-only single-day events are therefore valid and occupy the full local day. Past dates are allowed; no scheduling prohibition was requested.

Do not persist a time-derived `upcoming`/`live`/`completed` status that becomes stale. Compute that status from UTC instants with the same helper used by Detail and event listings. Explicit draft/cancelled/published transitions remain future lifecycle work.

## Schema proposal

Inspect the target Neon branch read-only before finalizing these tables; reuse authoritative equivalents and baseline an existing schema without attempting to recreate it.

| Table | Columns/constraints |
| --- | --- |
| `users` | UUID PK; display name; optional avatar; UTC created/updated timestamps. An application identity record only, with no passwords, sessions or chosen provider subject format. A later auth integration maps its verified subject to this UUID. |
| `organizations` | UUID PK; nonnull name; UTC created/updated timestamps |
| `organization_memberships` | UUID PK; organization/user FKs; role enum/check; active boolean default true; unique `(organization_id, user_id)` |
| `events` | UUID PK default `gen_random_uuid()`; organization/creator FKs; name/description/city; nullable venue and attendee estimate; nonnull category/audience `text[]` defaults; local `date` and nullable `time` columns; timezone; nonnull UTC start/end/created/updated `timestamptz` |
| `event_guests` | UUID PK; event FK; validated guest columns; guest-type/source enums; stable position; optional normalized email; event-scoped partial unique index on nonnull normalized email |
| `event_attendee_imports` | Event FK/PK; filename; server-derived imported/stored/VIP/sponsor counts; UTC imported timestamp. No raw CSV retention. |
| `event_staff` | Event/membership FKs; composite PK preventing duplicate assignment. Membership names/avatars come from real users. |
| `event_covers` | Event FK/PK; bounded `bytea`; fixed normalized MIME type; UTC created timestamp |

Use CHECK constraints for nonblank required text, string maxima, attendee estimate range, date/instant ordering, allowed city/category/audience values and cover size. Category values match the current UI: Sports, Luxury, Investing, Startups, Technology, Entertainment, Web3, Real Estate, Fashion, Media. Audience values come from `EVENT_AUDIENCE_OPTIONS`.

Indexes: membership `(user_id, active)`; events `(organization_id, starts_at, id)` and creator FK; guest `(event_id, position)`; staff membership FK. Primary/unique keys already cover other event lookups. No GIN/full-text indexes until an actual query requires them.

Use restrictive organization/user deletion; event children can cascade on event deletion, although deletion is not implemented here. Protect staff/event organization consistency with a composite FK using organization IDs on both associations, not just a UI check. `updated_at` changes explicitly on future updates; no unnecessary trigger now.

## File ownership

Create:

- `src/infrastructure/database/client.ts`, `schema/{identity,events}.ts`: Drizzle client and schema.
- `drizzle.config.ts`, `drizzle/`: generated SQL and migration metadata.
- `.env.example`: placeholders only; opt it into git with `.gitignore`.
- `src/infrastructure/auth/current-user.ts`: verified-user contract and fail-closed seam for future authentication.
- `src/modules/organizations/{types,service,repository}.ts`: memberships, organization selection, authorization.
- `src/modules/events/{event-options,event-schemas,event-dto,event-schedule}.ts`: client-safe vocabularies, Zod contracts, DTO types, date conversion.
- `src/modules/events/server/{service,repository,cover-image}.ts`: event behavior, data access, image processing.
- `src/modules/events/queries/get-event.ts`: authorized server read facade.
- `src/modules/events/mutations/create-event.ts`: client fetch adapter, not database code.
- `src/shared/lib/application-error.ts`, `src/infrastructure/http/{errors,request-body}.ts`: safe application errors and HTTP adaptation.
- `src/app/api/events/route.ts`, `src/app/api/events/[eventId]/cover/route.ts`: creation and protected raster serving.
- `src/app/events/[eventId]/{loading,error,not-found}.tsx`: route states using existing UI primitives.
- `scripts/seed-pilot.ts`, `docs/backend/create-event.md`: restricted provisioning and setup/rollout guide.
- `tests/{event-validation,event-service,event-api,event-database,event-create-client}.test.mjs`: targeted automated checks using the existing test convention.

Modify: `package.json`, `pnpm-lock.yaml`, `.gitignore`, `README.md`, `src/app/events/new/page.tsx`, `src/app/events/[eventId]/page.tsx`, `src/modules/events/components/create-event-page.tsx`, `src/modules/events/components/event-detail-page.tsx`, `src/modules/events/event-record.ts`, and `src/modules/events/guest-csv.ts`. Add narrowly scoped changes to `src/app/globals.css` only if existing error styles cannot support accessibility.

No provider-specific route, login UI or authentication dependency is introduced. The above seam is not an implemented authentication system.

## Review focus

1. Forged organization/staff IDs or revoked membership must never create an event or expose its guests.
2. Optional times, calendar-invalid dates and DST transitions must produce predictable instants or useful errors.
3. CSV overflow, malformed rows and invalid covers must fail visibly without partial persistence or silently discarded input.
4. Duplicate clicks and failed requests must preserve form data and restore usable submission controls.
5. A database outage must never cause seeded/localStorage fallback or leak private error information.

## Task 1: Define the authentication seam and inspect the database

**Files:** `src/infrastructure/auth/current-user.ts`, `docs/backend/create-event.md`.

**Interfaces:** Define `AuthenticatedUser = { id: string; displayName: string; avatarUrl: string | null }` and `getCurrentUser(): Promise<AuthenticatedUser | null>`. The future auth adapter must verify a real session and map its provider subject to a local user UUID. It must never accept request-body identity as proof.

- [ ] Define the contract and an explicitly unconfigured, fail-closed resolver returning null. Keep the implementation server-only. No provider selection, auth SDK, cookies/session implementation or fake login.
- [ ] Document the integration requirements: verified session, local user mapping, unauthenticated page behavior and trusted server-owned resolver. Until integration, protected API requests return 401 and pages show an authentication-required state.
- [ ] Inspect the target Neon development branch/schema read-only, including migration history and existing user/organization identifiers. Do not print connection strings. Record reuse/baseline requirements if tables already exist. If access is unavailable, generate the migration locally but leave live inspection/application explicitly pending.
- [ ] Record the proposed creation rules, upload/guest caps, role policy and multi-organization behavior. Keep real pilot identity provisioning and authenticated browser acceptance gated on the later auth work.

**Acceptance:** The backend has a clearly typed auth boundary and cannot authorize anonymous requests. Automated service/API tests can inject trusted verified-user results without exposing a runtime impersonation mechanism. No auth-provider implementation is included.

## Task 2: Establish the shared validated event contract

**Files:** event options/schemas/DTO/schedule, application-error, validation tests.

**Interfaces:** Export `CreateEventInput` inferred from `createEventSchema`; `EventDetailDto`; `createEventResponseSchema`; `resolveEventSchedule(input): EventSchedule` with local fields, timezone and ISO instants; and `ApplicationError(code, message, fields?)`. Move pure types/options out of fixture-bearing `event-record.ts` without breaking existing consumers.

- [ ] Add Zod and the Temporal polyfill. Pin compatible stable versions in the lockfile. Write tests for trim/required lengths, the existing city/category/audience values, malformed UUIDs, numeric bounds, unknown keys and invalid nested guests.
- [ ] Implement strict request/response schemas. Normalize optional blanks to null and deduplicate only where explicitly intended; reject repeated category/audience/staff IDs. Client `attendees`/`profiles` map to `expectedAttendees`/`expectedAudience` before validation; numeric conversion is explicit and must not turn blank into zero.
- [ ] Test exact calendar validation, backwards intervals, `00:00`, both missing times, one missing time, single-day all-day events, DST gaps/overlaps, and browsers in different timezones. Implement `resolveEventSchedule` and derive status from its UTC interval.
- [ ] Ensure the required description/categories markers agree with client and server validation. Field errors include `description`, `categories`, `endDate`, `endTime`, and nested guest paths.
- [ ] Run the targeted validation tests; acceptance is deterministic results independent of the browser/server timezone.

## Task 3: Add Neon/Drizzle schema and migrations

**Files:** database client/schema, Drizzle config/migrations, environment example, package scripts, database tests.

**Interfaces:** Export a lazy server-only Drizzle database accessor; explicit identity/event schema exports; `db:generate` and `db:migrate` scripts. Repositories own Drizzle transaction types; services never import them.

- [ ] Add compatible stable `drizzle-orm`, `pg`, `server-only`, development `drizzle-kit` and `@types/pg`. Use a bounded reusable pool, Neon-provided TLS connection configuration, and no database connection at module evaluation/build time.
- [ ] Define the inspected/reused identity schema and proposed event tables/constraints. Use `DATABASE_URL` for runtime and `DATABASE_MIGRATION_URL` for migration administration, with placeholders in `.env.example`. Validate configuration server side and fail closed; never use `NEXT_PUBLIC_` for secrets.
- [ ] Generate a named `create_event_backend` migration with Drizzle Kit. Commit the actual generated filename and metadata together; this planning task does not create an empty migration placeholder.
- [ ] Apply migrations on the `dev` branch / `weft_console_test` database with app usage stopped. Check clean bootstrap or the recorded existing-schema baseline, migration tracking, UUID/FK/check/unique constraints, and same-organization staff associations. Running migrate twice must not reapply changes.
- [ ] Add database integration tests proving constraint violations and complete rollback. Gate live tests with explicit `WEFT_DATABASE_TEST=1` and `DATABASE_TEST_URL` for `dev` / `weft_console_test`; default test runs must not contact a live/pilot database. An explicitly enabled database test suite must fail, not skip, if configuration is missing.

**Acceptance:** Versioned migrations create the intended schema in `dev` / `weft_console_test`; no runtime migration, production schema push or secret reaches browser imports.

## Task 4: Implement organization authorization and creation context

**Files:** Organizations service/repository/types, restricted pilot provisioning command, service tests, new-event route.

**Interfaces:** Consume `AuthenticatedUser` from Task 1; `requireEventCreator({ userId, organizationId }): Promise<AuthorizedOrganization>`; `getCreateEventContext({ userId })` returns permitted organizations and assignable membership-backed staff DTOs. Database reads live in the Organizations repository.

- [ ] Test an absent actor, nonmembers, inactive memberships, each role, multiple memberships and forged organization/staff targets. Supply actors only through test-owned server dependency seams.
- [ ] Implement explicit owner/organizer checks and same-organization staff validation. Protect the Create Event route and pass organizer/organization/staff props to its client component when a verified actor exists. Until auth integration, render an authentication-required state without inventing a login URL. Recheck permissions on submit even if the page was authorized earlier.
- [ ] Implement the restricted provisioning command with Zod-validated existing local user/organization UUIDs. Provisioning is intentional and idempotent; event submission never creates a user, organization or membership. Actual pilot user identity provisioning belongs to the later auth integration.
- [ ] Run targeted authorization tests. Verify direct POST and direct detail requests are denied independently of visible UI controls; the default unconfigured resolver must deny access.

## Task 5: Implement atomic creation and authorized retrieval

**Files:** Events server service/repository/cover utility, get-event query, guest-csv, service/database tests.

**Interfaces:** `createEvent({ userId, organizationId, data }): Promise<EventDetailDto>`; `getEvent({ userId, eventId }): Promise<EventDetailDto>`; `getEventCover({ userId, eventId }): Promise<{ bytes: Uint8Array; mimeType: string }>`; event repository `create(...)` and `findById(...)`. `create` returns persisted normalized data after commit.

- [ ] Test business rules before writes: authority, guest limits/duplicates, invalid staff, invalid schedules, malformed images, and untrusted client counts. Test retrieval denies unrelated organizations, staff and sponsors.
- [ ] Replace the CSV parser's simplistic line splitting with `csv-parse`, preserving recognized column aliases and the downloaded template. Use its browser entry for preview and server entry for authoritative parsing. Support UTF-8 BOM, quoted commas/newlines and blank lines; validate every retained row. Server computes imported/VIP/sponsor counts from accepted rows. Reject invalid rows and over-cap imports atomically with row errors; no silent truncation or counts-only saves.
- [ ] Add `sharp` as a direct dependency for server image decoding/normalization rather than relying on Next's transitive installation. Restrict data URL/base64 input and decoded size; accept JPEG/PNG/WebP, reject SVG and malformed files, cap decoded dimensions at 16 megapixels, normalize to WebP at at most 1600px and 256 KiB, and reject if those bounds cannot be met. Never silently remove a selected cover on failure. Store bytes, not arbitrary client URLs.
- [ ] Implement service preparation using shared schemas/scheduling, then one explicit repository transaction: lock and recheck active creator/selected staff membership rows, insert event, optional import metadata, all initial guests, assignments and cover. Lock memberships in a stable order. All related writes commit together; failures roll everything back. No generic unit-of-work abstraction is needed.
- [ ] Keep lock/query mechanics in repositories and role/business decisions in services/Organizations operations. Express the transaction authorization requirement through a concrete callback or specific Events repository method; do not expose Neon/Drizzle types to the service.
- [ ] Implement organization-scoped retrieval and explicit DTO mapping. Scope related guest/import/staff/cover reads to the authorized event. Unknown events return 404; unauthorized full organizer reads return 403, using generic wording without revealing event metadata. Do not serve localStorage/seed records as fallbacks.
- [ ] Test rollback with a failure after event insert, revoked memberships, cross-organization assignments, guest uniqueness, actual generated UUIDs, and persistence from a fresh database connection. Verify counts represent stored guests, not estimates.

## Task 6: Add thin HTTP endpoints

**Files:** POST events route, protected cover route, HTTP body/errors helpers, API tests.

**Interfaces:** `POST /api/events`; `GET /api/events/{eventId}/cover`. Event retrieval for Detail uses the server query, so no JSON GET endpoint is necessary in this iteration.

- [ ] Write request tests for 201, 400 malformed JSON, 401, 403, 413, 415, 422 field/business errors and sanitized 500 errors. Assert no raw SQL, Neon URL or stack trace appears in any error response.
- [ ] Implement POST in the Node.js runtime: resolve the actor through the server auth seam and return 401 when absent; enforce a trusted same-origin check for browser mutations, read a bounded JSON body, validate, invoke service, return the shared DTO envelope and Location header. Read errors must have predictable status/copy; no database or permission queries in the handler.
- [ ] Map known application errors centrally. Log sanitized unexpected failures once with a request ID. Return `Cache-Control: no-store` for authenticated responses; do not cache per-user authorization/data globally.
- [ ] Implement cover GET using the same authenticated event authorization, UUID validation, missing-cover 404, `image/webp`, `X-Content-Type-Options: nosniff`, and private/no-store response headers. The repository selects bytes only for this endpoint, not the Detail DTO.
- [ ] Run route tests, including forged JSON identity fields, mismatched origin, absent verified actor, oversized streaming bodies without Content-Length, and unauthorized image access.

## Task 7: Connect the existing form and persistent Event Detail

**Files:** create mutation, Create Event component/new route, Detail component/route boundaries, event-record, client tests.

**Interfaces:** Client `submitCreateEvent(input): Promise<EventDetailDto>` uses fetch and typed error adaptation. `EventDetailPage({ event: EventDetailDto, initialTab })` receives authorized serialized data, rather than an ID used for browser storage.

- [ ] Implement the fetch adapter without automatic retries. Distinguish field/API failures, malformed success responses and network failures. Keep safe application errors available to the component.
- [ ] Replace the hardcoded organizer/staff with server context while preserving their existing presentation. For multiple organizations, clear incompatible staff selections when organization changes and refetch/reload authorized context.
- [ ] Replace `createEventId`/`saveEventRecord` calls with shared client validation and POST. Set a synchronous ref guard before any async cover/CSV preparation, disable Create/Draft and snapshot inputs while pending, show “Creating…”, and release guards on failure. Validate image processing failures explicitly. Keep all entered data/files/selections on errors.
- [ ] Map errors into existing `FormField` slots and chip/upload/guest sections. Add `aria-invalid`, linked error descriptions and focus on the first invalid field. Show the requested generic network/server message and useful 401/403 feedback without automatically navigating away and losing data.
- [ ] Navigate using only `response.data.event.id`. Do not reset submission state before navigation completes in a way that permits another POST. Existing success feedback is optional; do not add cache libraries when none exist.
- [ ] Load Detail in its Server Component: resolve the actor through the auth seam, validate awaited route params, invoke `getEvent`, and pass the DTO to the interactive component. Remove its localStorage-loading effect and seeded fallback for persistent routes. Implement auth/access/not-found/error/loading states with existing primitives; sensitive read failures must not become an empty successful page.
- [ ] Adapt existing overview/roster metrics to persisted initial guests/staff and the server-derived schedule status. Use the protected cover URL with existing unoptimized image rendering. Retain the distinction between expected attendance and actual guests.
- [ ] Keep Save as Draft explicitly session-only with accurate feedback; this button currently does not persist drafts. Do not call POST from it or claim that its data will survive refresh. Kami configuration/simulation remains separate and must not replace saved event data.
- [ ] Test one POST for rapid repeated submissions, field errors, auth failures, network failures, invalid success JSON, preserved form data, pending-state recovery and redirect to the returned UUID. Test Detail without window/localStorage data and verify existing event-record metric checks remain valid.

**Acceptance:** With a trusted actor supplied in automated tests, the successful creation/detail lifecycle has no dependency on demo state. Without the future auth integration, production browser requests remain denied. Broader `/events` panels remain fixture-driven in this iteration; wiring all dashboards is tracked follow-up work, not a claim made by this feature.

## Task 8: Verify the pilot lifecycle and document rollout

**Files:** README, backend guide, integration tests and narrowly needed fixes.

- [ ] Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`; resolve failures attributable to this feature. Run the explicitly enabled database suite against `dev` / `weft_console_test` with app usage stopped and confirm migration/rollback checks pass.
- [ ] Run `pnpm build` with nonproduction configuration to check server-only boundaries and route compilation. Confirm importing client schemas does not pull in database/auth/secrets, and build does not require a live database connection.
- [ ] Verify the default browser routes show authentication-required states and anonymous requests return 401. Use test-only server resolver injection for automated lifecycle checks: minimal creation, cover/CSV/manual guests/staff, duplicate clicks, field/network/auth errors, timezone display and retained inputs. Do not ship a browser impersonation switch. Record real authenticated browser verification as pending until the separate auth integration; then refresh and open the returned URL in another authorized browser with empty localStorage.
- [ ] With trusted test actors, verify a second organization cannot read the event, guest data or cover. Confirm sponsors/staff cannot use the organizer endpoints. Simulate database failure and verify generic errors with no seed fallback.
- [ ] Record setup commands, environment variables, the future auth integration contract, pilot organization provisioning command, generated migration filenames, test-branch results, and the controlled release migration sequence. Apply the reviewed migration to the pilot database only in the authorized release step, never on every request/startup.
- [ ] Deliver an implementation summary listing files created/modified, actual schema/migration changes, endpoints, validation/error behavior, the final flow, confirmed assumptions and remaining work. Report tests actually run and any skipped live checks accurately.

## Deferred work and limits

- Authentication provider selection/implementation, real session verification and provider-subject mapping. These are required before organizers can use this protected flow in a browser.
- Persistent drafts, event editing/deletion/cancellation/publishing, server idempotency, and attendee/team changes after creation.
- Real Kami interactions, sponsor/partner management, introductions and event metrics beyond counts from saved creation inputs.
- Organization signup/invitations/team administration; role-specific staff/sponsor DTOs and permissions.
- Full event-list/dashboard persistence and cache integration. Existing fixture panels do not become production data as a side effect of this plan.
- Larger attendee imports with batch/async processing; object storage/CDN for covers when pilot database storage is no longer appropriate.
- Automatic migration of browser-local demo events. They have no verified organization/creator and must not be imported implicitly.

## Technical references

The installed Next.js guides are authoritative for this repository's version. For database implementation, Drizzle documents Neon support through HTTP, WebSocket and standard PostgreSQL drivers; the proposed Node runtime uses its node-postgres adapter. [Drizzle Neon connection guide](https://orm.drizzle.team/docs/connect-neon).

Generate checked-in SQL and apply tracked migrations with Drizzle Kit. [Drizzle migration guide](https://orm.drizzle.team/docs/migrations).

Ensure all statements in a transaction use the same checked-out database client through Drizzle's transaction API. [node-postgres transactions](https://node-postgres.com/features/transactions).

Use the dedicated parser for quoted CSV fields and supported browser/server entry points rather than extending ad hoc line splitting. [CSV Parse documentation](https://csv.js.org/parse/).
