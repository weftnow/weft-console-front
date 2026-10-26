# English and Spanish translations

Status: Ready — decisions settled with the user on 2026-10-25; implementation in progress
Plan: [Console translations plan](../exec-plans/active/2026-10-25-console-translations.md)
Engine counterpart: `weft-engine` `docs/changes/2026-10-25-event-language.md`

## Problem

The Console is English only. Spanish-speaking organizers cannot use it, and match reasons written by the engine are always English.

## Requirements

- Supported locales are `en` and `es`. English is the default and the fallback.
- Each user has one locale. It is stored in `users.locale` (check constraint `en`/`es`, default `en`) and mirrored in a `weft_locale` cookie. Resolution order is signed-in user, then cookie, then `Accept-Language` (q-values, language subtag match), then `en`. URLs do not change; there is no `/[lang]` prefix and no per-organization setting.
- A signed-in user changes only their own locale. A signed-out visitor changes only the cookie. The switcher shows the fixed labels "English" and "Español" in both locales.
- `<html lang>`, page metadata, all Console UI copy, enum labels, client-visible errors, and date, time and number formatting follow the locale. Clerk sign-in and sign-up are localized if `@clerk/localizations` can be used; otherwise that is recorded as debt.
- Each event has a language, `events.language` (`en` | `es`). New events default to the creator's UI locale. Only an active Owner or Organizer of the event's organization can change it (`requireEventCreator`). A change records an `event_matching_changes` row so the engine runs again.
- The simulation's demo reasons follow the event language.
- Dictionaries are typed TypeScript objects. `en.ts` is the source of truth; `es.ts` is declared `satisfies Dictionary`, so a missing key fails `pnpm typecheck`. No i18n dependency is added (no `next-intl`).
- `ApplicationError` keeps a stable `code`. The client maps the code to an `errors.*` message; server logs stay English. User-visible Zod messages become codes rendered from dictionaries.
- CSV header names stay English because they are a data contract. Help text around them is translated.
- User-entered content (event names, profiles, company names) is never translated.

## Spanish glossary

Latin-American-neutral Spanish. Buttons and menu items use the infinitive ("Guardar", "Crear evento"); sentences address the user as "tú". Strings are flagged for native review before launch.

| English | Spanish | Notes |
| --- | --- | --- |
| Event | Evento | |
| Attendee / Guest | Asistente / Invitado | "Asistente" is the default. "Invitado" only where the English says "guest" in the invitation sense (guest type) |
| Organizer | Organizador | Gender-neutral plural: "organizadores" |
| Owner | Propietario | |
| Sponsor / Partner | Patrocinador / Socio | |
| VIP | VIP | Unchanged |
| Match | Coincidencia | "Match" is not used in UI copy |
| Introduction | Presentación | |
| Matching | Emparejamiento | |
| Roster | Lista de asistentes | |
| Import | Importar | |
| Team | Equipo | |
| Invitation | Invitación | |
| Settings | Configuración | |
| Wefter | Wefter | Product role name, not translated |
| Kami | Kami | Product name, not translated |
| Weft | Weft | Brand, not translated |

## Out of scope

The attendee-facing experience, email and SMS templates, other locales, translating user-entered content, professional translation review, a per-organization default locale, and dual-language reason generation.

## Affected roles and organizations

A user changes only their own `users.locale`. Event language follows the existing `requireEventCreator` rules. Operator, Wefter, sponsor, inactive, outsider and cross-tenant callers stay denied by the unchanged checks, and denied paths return localized errors.

## Acceptance scenarios

- With `Accept-Language: es` and no cookie or account, sign-in renders Spanish and `<html lang="es">`.
- Switching language persists across sign-out and sign-in for a signed-in user, and the cookie follows the account value.
- Create event, CSV import, roster, matches list and detail, invitations and settings work in both locales with no raw keys, and dates and numbers are localized.
- Changing an event's language as an Owner or Organizer records a matching change; any other role is denied with a localized error.
- A Spanish event produces Spanish reasons in simulation and from the engine, with verbatim quotes and run provenance `language: "es"`.
- Removing a Spanish key from `es.ts` fails `pnpm typecheck`.

## Open items

- Whether `@clerk/localizations` resolves through `@clerk/nextjs` (checked in step 2).
- Native Spanish review of all strings.
