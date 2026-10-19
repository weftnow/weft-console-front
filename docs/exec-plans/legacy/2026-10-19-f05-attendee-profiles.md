# F05 — Profile editing and information completeness

## Context

Backlog F05 (Sheary, Phase 2, Antonio reviews): store per-guest matching information (goals, offers, avoid, desired connections, background, LinkedIn details, missing details), show what is available vs missing, keep profile versions, mark organizer-only information, and notify F07 on every important save. Completeness never gates matching; there is no ready/approve button. F04 (merged, PR #20) is the pattern to copy.

Decisions confirmed by user:
- **UI:** no supplied design — extend the attendee roster with a **Profile** row action opening an inline panel (like `NetworkingPanel`).
- **Who:** active owners and organizers only (same as F04). Staff/sponsors get 403.
- **Fields:** one free-text field each; empty = unknown (stored as `null`, never `""`).
- **ORGANIZER_ONLY:** per-field private flag. Private fields are still sent to matching but never appear in the shareable summary.

Current state:
- `event_guests` (`src/infrastructure/database/schema/events.ts`) has only CSV fields; `linkedin` is a URL string. Latest migration `drizzle/0005_networking_inclusion.sql`.
- `event_matching_changes` log + `recordChange()` in `src/modules/attendees/server/networking-repository.ts` is the F07 notification.
- No F06/F07 data format agreed yet; F03 (identity) not built.

## Data model (migration `drizzle/0006_*` via `pnpm db:generate`)

1. **`event_guests.profile_version`** integer not null default 0 (0 = no profile saved yet). Optimistic concurrency pointer to the current version.
2. **`event_guest_profile_versions`** (append-only, never updated or deleted):
   - `id` uuid pk, `event_id`, `guest_id`, `version` int ≥ 1
   - text, nullable: `summary` (shareable intro), `goals`, `offers`, `desired_connections`, `avoid`, `background`, `linkedin_details`, `missing_details`. Each `null` or 1–2000 chars after trim (`summary` ≤ 500).
   - `organizer_only_fields` text[] not null default `{}`, checked ⊆ the matching field keys (not `summary`, which is shareable by definition)
   - `created_by` → users, `created_at`
   - composite FK `(guest_id, event_id)` → `event_guests(id, event_id)` on delete cascade; unique `(guest_id, version)`; index `(event_id, guest_id, version desc)`
3. **`event_matching_change_kind`** add value `profile_updated` (`guest_ids` = [guestId]).

Current profile = row where `version = event_guests.profile_version`. Old versions stay for F06/F08 to reference `(guest_id, version)`.

## Module layout (`src/modules/attendees/`, mirroring F04)

- `profile-schemas.ts` — `PROFILE_FIELDS` const + labels, input `{ fields: {...}, organizerOnly: string[], expectedVersion }` (strictObject, trim→null), `ProfileDto`, result/conflict schemas.
- `profile-completeness.ts` — pure, shared with F06/F07: `profileCompleteness(guest, profile)` → per key `available | missing` for goals, background, LinkedIn (`linkedin_details` present → available; URL only → `url_only`, never "read"), plus offers/desired connections. `shareableSummary(profile)` drops organizer-only fields.
- `server/profile-service.ts` — `decideProfileSave(snapshot, input)`: requireOperator (reuse/extract from `networking-service.ts`), 404 guest, identical content → noop, stale `expectedVersion` → `ProfileConflictError` carrying latest profile.
- `server/profile-repository.ts` — transaction: reuse `lockOperator` + `recordChange` (export them from `networking-repository.ts`, or move to a shared `server/locks.ts`), lock guest row, insert version N+1, bump `profile_version`, write `profile_updated` log row.
- `mutations/update-profile.ts` — client fetcher with `StaleProfileError`, same shape as `mutations/update-networking.ts`; reuse `mutations/api-error.ts`.
- `src/infrastructure/http/profile-handlers.ts` — same guards as `networking-handlers.ts`.

## API

| Method & path | Body | Result |
|---|---|---|
| `GET /api/events/[eventId]/guests/[guestId]/profile` | — | 200 `{ profile (current or empty v0), completeness, summary }` |
| `PUT /api/events/[eventId]/guests/[guestId]/profile` | `{ fields, organizerOnly, expectedVersion }` | 200 new version; 200 no-op if unchanged (no version, no log row); 409 `CONFLICT` with latest; 422 invalid |

Event Detail read (`src/modules/events/server/repository.ts` `findById`, `event-dto.ts`, `event-record.ts`): add only a light `profile: { version, completeness }` per guest, so the roster stays small for 2000 guests; full text loads via GET when the panel opens.

## UI

- `attendee-roster.tsx`: new **Profile** column showing completeness chips (Goals · Background · LinkedIn available/missing); filter "Missing goals / background / LinkedIn"; **Profile** row action.
- New `components/profile-panel.tsx`: textarea per field, "Organizer only" checkbox per field, completeness list, shareable-summary preview, "Last saved vN by …"; on 409 show latest saved values. Copy states that missing information does not stop matching. Refresh through the existing `onChanged` roster refresh.

## Review items for Antonio

- Profile payload/completeness shape for F06; whether `profile_updated` + version is enough for F07 (suggest F07 reads current version at run time).
- F07/F08 must keep accepted/active introductions pinned to the version they were created with (F05 guarantees versions are immutable).
- F03 merge: keep the newest profile version from the main record and keep the other record's versions linked.

## Docs

`docs/backend/attendee-profiles.md` (model, API, permissions, log kind, privacy rule), same style as `networking-participation.md`.

## Verification

- Unit: schema trim/null, organizer-only subset, `profileCompleteness` (URL-only LinkedIn ≠ details), `shareableSummary` hides private fields, decision noop/conflict/forbidden.
- Handler tests (pattern of `tests/networking-api.test.mjs`): 400/401/403/404/409/415/422.
- DB tests (`WEFT_DATABASE_TEST=1`, `tests/profile-database.test.mjs`): save writes version + log row atomically; concurrent saves with same version → one 409; old versions kept; migration defaults `profile_version = 0`.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`; manual in `pnpm dev`: edit/save, conflict in two tabs, organizer-only hidden from summary, staff denied.
- Branch: `feat/f05-attendee-profiles` from `main`.
