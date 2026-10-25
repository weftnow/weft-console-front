# English and Spanish translations (Console + Engine)

Status: Active — step 1 done; implementation in progress
Owner: current agent
Created: 2026-10-25
Specification: [English and Spanish translations](../../changes/2026-10-25-console-translations.md)

## Goal and acceptance criteria

Spanish-speaking organizers can use the whole Console in Spanish, and Spanish-language events get match reasons written in Spanish by the engine (`/Users/shearytan/Documents/SurnX/weft-engine`).

- Each user picks English or Spanish. The choice is stored in Postgres (`users.locale`), mirrored in a `weft_locale` cookie, and defaults from `Accept-Language`. URLs do not change (no `/[lang]` prefix).
- `<html lang>`, page metadata, all Console UI copy, enum labels, client-visible errors, and date/number formatting follow the user's locale. Clerk sign-in/up is localized if `@clerk/localizations` can be used; otherwise it is recorded as debt.
- Each event has a language (`events.language`, `en` | `es`, default = creator's UI locale). Only the event's Owner/Organizer can change it. A change records an `event_matching_changes` row so the engine runs again.
- The engine reads `events.language` into its snapshot, so the fingerprint changes when the language changes. It writes `shareable_reasons` in that language, keeps quotes verbatim, and records `language` in run provenance. Reason codes stay as codes.
- The simulation's demo reasons follow the event language.
- Typed dictionaries with no new i18n dependency. A missing Spanish key fails `pnpm typecheck`.

**Out of scope:** the attendee-facing experience, email/SMS templates, other locales, translating user-entered content (event names, profiles), professional translation review. Spanish strings are flagged for native review before launch.

**Tenants and roles:** a user changes only their own locale. Event language follows existing `requireEventCreator` rules. Operator, Wefter, sponsor, inactive, outsider and cross-tenant callers stay denied by the unchanged checks, and denied paths return localized errors.

## Context

- Next.js 16.3.5: read `node_modules/next/dist/docs/01-app/02-guides/internationalization.md` before coding.
- Baseline: all copy is hardcoded English in about 215 TS/TSX files. `<html lang="en">` is in `src/app/layout.tsx`. `Intl` calls hardcode `"en"`/`"en-US"` (`modules/events/event-form.ts`, `create-event-page.tsx`, `team-invitations.tsx`, `profile-panel.tsx`, `matches-panel.tsx`, `app/wefter/[eventId]/page.tsx`, `insights/components/organizer-overview.tsx`).
- The only locale code already present is an unused `locale: z.enum(["en","es"])` on `matchListQuerySchema` (`src/modules/network/matches-schemas.ts`). `queries/matches.ts` and `infrastructure/http/matches-handler.ts` pass it along, but `server/matches-service.ts` ignores it. It will be removed.
- Engine: `src/matching/console.py` `snapshot()` selects from `public.events`. The reason verification prompt is in `src/matching/worker.py` (`"Verify each cited quote is exact…"`), and the prompt version is in `src/config.py`.
- Decisions made by the user on 2026-10-25 and not to be reopened: per-user preference (not URL prefix, not per-org); per-event engine language (not dual generation, not UI-only); typed dictionaries (not next-intl).

## Steps and progress

- [x] 1. Docs (2026-10-25): write the change spec with a Spanish glossary (Evento, Asistente, Organizador, Patrocinador, VIP; "Wefter" and "Kami" are not translated). Update `docs/product.md`, `docs/domain.md`, `docs/engineering.md` (i18n conventions) and `docs/design/design-system.md`. In the engine repo, write a change spec and an active plan, and update `docs/matching-api.md` and `docs/matching-quality.md`.
- [x] 2. Foundation (2026-10-25; user step added in 3) in `src/shared/i18n/`:
  - `locales.ts`: `LOCALES`, `Locale`, `DEFAULT_LOCALE`, `localeSchema`, `hasLocale`.
  - `negotiate.ts`: a pure `Accept-Language` q-value parser.
  - `get-locale.ts`: `server-only` and React `cache`; order is user → cookie → header → `en`.
  - `dictionaries/en.ts` is the source of truth, split by namespace (`common`, `nav`, `auth`, `events`, `attendees`, `network`, `insights`, `organizations`, `errors`, `wefter`). `dictionaries/es.ts` uses `satisfies Dictionary`, and each locale is loaded lazily.
  - `translate.ts`: `{var}` interpolation and `Intl.PluralRules` `{one, other}` leaves.
  - `format.ts`: number, date, date-time with time zone, and relative formatting by locale.
  - `I18nProvider.tsx` and `useI18n()`.
  - Wire `src/app/layout.tsx`: `lang`, provider, `generateMetadata`, Clerk localization.
- [x] 3. User preference (2026-10-25):
  - Add `users.locale` to `schema/identity.ts`, with a check constraint for `en`/`es` and default `en`. Run `pnpm db:generate` and review the migration; never hand-edit snapshots.
  - Extend `AuthenticatedUser` in `current-user.ts`, `resolve-current-user.ts` and `identity-repository.ts`.
  - Add a `setLocale` server action in `src/app/account/actions.ts`. It updates only the actor's own row, sets the cookie, and calls `revalidatePath("/", "layout")`. When signed out it only sets the cookie.
  - Add the switcher to `shared/ui/console-account.tsx` and `shared/ui/auth-shell.tsx`, with the labels "English" / "Español".
- [ ] 4. Event language:
  - Add `events.language` to `schema/events.ts`.
  - Add a selector to create-event (`create-event-page.tsx`, `event-form.ts`) and to event settings (`settings-schemas.ts`), validated on the server.
  - A change records an `event_matching_changes` row; follow the kind pattern in `drizzle/0012_f07_matching_change_kinds.sql`.
  - Add Spanish templates to `modules/network/simulation/demo-matches.ts`.
  - Remove the unused matches `locale` query param.
- [ ] 5. String extraction, one commit per module in this order: `shared/ui` → app shells (sign-in, sign-up, access-required, select-organization, onboarding, accept-invitation, `error.tsx`) → `organizations` → `events` → `attendees` → `network` → `insights` → `sponsors` → `wefter`. Rules:
  - `ApplicationError` keeps a stable `code`. The client maps the code to an `errors.*` message, and server logs stay in English.
  - Zod messages shown to users become codes rendered from dictionaries (for example `attendees/profile-schemas.ts`).
  - Enum label maps (revocation reasons, unavailable reasons, guest types, roles) move to dictionaries keyed by enum value.
  - CSV header names stay in English because they are a data contract; help text is translated.
  - Check Spanish copy length at 620px and in tables, pills and buttons.
- [ ] 6. Engine:
  - In `console.py` `snapshot()`, select `language` and include it in the snapshot.
  - Add `language: Literal["en","es"]` to the schemas and record it in run provenance. An Alembic migration is needed only if provenance is a typed column.
  - In the `worker.py` verification prompt, require reasons in English or Spanish and keep quotes verbatim.
  - Bump `matching_prompt_version`.
  - Leave the evaluation prompts language-agnostic.
- [ ] 7. Guardrails:
  - Add `tests/i18n.test.mjs` covering: key parity, no empty strings, placeholder parity, valid plural leaves, `negotiateLocale`, and `translate`.
  - Add a JSX string-literal check for `src/modules/**/components`, with an allowlist for Weft, Wefter and Kami.
  - Update tests that assert English copy (`tests/matches-browsing.test.mjs`, `tests/attendee-import-client.test.mjs`).
  - Add engine pytest coverage: the snapshot includes `language`, the prompt contains the Spanish instruction, and the fingerprint changes when the language changes.
- [ ] 8. Verify acceptance (below) and update this plan with actual results.

## Decisions and discoveries

- 2026-10-25: The user chose per-user locale stored in Postgres with a cookie mirror, per-event engine language, and typed dictionaries with no dependency.
- 2026-10-25: Branches. Console `feat/console-translations` was created from `feat/matching-simulation` (user choice) because `main` lacks `demo-matches.ts` and the match browsing code; it also contains those 7 unmerged commits and is 4 commits behind `origin/main` (not merged). The engine branch `feat/console-translations` lives in the worktree `/Users/shearytan/Documents/SurnX/weft-engine-translations` (from `origin/main`), because the main engine checkout holds unrelated uncommitted DeepSeek edits to `worker.py`/`config.py` that conflict with `main`. Those edits are untouched. The worktree has no Poetry env yet; the `.python-version` of 3.14 is missing from pyenv.
- 2026-10-25: `@clerk/localizations` was not resolvable through `@clerk/nextjs`. Added `@clerk/localizations@^4.24.1` (the one justified dependency; it pulls a newer `@clerk/shared` copy, data only). `esES` is passed to `ClerkProvider` when the locale is `es`.
- 2026-10-25: Dictionary layout: `dictionaries/en.ts` and `es.ts` compose per-namespace files in `en/` and `es/` so each module commit touches its own files. `Dictionary` is the English shape widened to `string`; each `es/<ns>.ts` is `satisfies Dictionary["<ns>"]`, so adding an English key fails typecheck until Spanish exists (verified with a probe key). Components read typed properties (`dict.events.title`), not string key paths; `createI18n` in `i18n.ts` (no `"use client"`) gives `t`, `plural`, `number`, `date`, `dateTime`, `relative`, and `I18nProvider`/`useI18n` wrap it for client components.
- 2026-10-25: `getLocale()` resolves user, then `weft_locale` cookie, then `Accept-Language`, then `en`. A missing or unprovisioned user (`getCurrentUser` throws FORBIDDEN) falls through to the cookie. `setLocale` validates with `localeSchema`, updates only the actor's row, and sets the cookie (1 year, lax).
- 2026-10-25: Migration `drizzle/0014_spotty_war_machine.sql` (generated by `pnpm db:generate`, not hand-edited, not applied): adds `users.locale text not null default 'en'` with check `users_locale_valid`. `tests/merge-contracts.test.mjs` pinned the last journal entry to 0013; it now pins entry 13 by index so later migrations do not trip it.

## Verification

Step 1: `pnpm check:docs` (Console) and `python3 scripts/check_harness.py` (engine worktree) passed. `make check-docs` in the engine worktree failed only because pyenv lacks Python 3.14 there.

Required when implementing:

- Console: `pnpm verify` and `pnpm build`. Run `pnpm dev --hostname localhost --port 3000` and check:
  - With `Accept-Language: es`, sign-in shows Spanish and `lang="es"`.
  - The switcher persists the choice across sign-out/sign-in.
  - Organizer flows work in both locales: create event, CSV import, roster, matches list and detail, invitations, settings.
  - No raw keys appear and dates and numbers are localized.
  - The permission checks from the acceptance criteria hold.
  - Simulation shows Spanish reasons for a Spanish event.
- Engine: `make verify`. On an isolated database, run a Spanish event and confirm Spanish reasons, verbatim quotes, and provenance `language: "es"`. Do an expert sample review following `docs/matching-quality.md`.
- Migrations are generated and reviewed, never applied at startup.

## Handoff or outcome

Next action: step 4 (event language: `events.language`, selectors, change row, Spanish demo templates, remove matches `locale` param). Engine plan: `weft-engine-translations/docs/exec-plans/active/2026-10-25-event-language.md`.
