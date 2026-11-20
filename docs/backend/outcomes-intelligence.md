# Outcomes report evidence

Owners and Organizers open the seven reports from **Outcomes** or an event's **Insights**. `/outcomes/reports` selects the latest completed event by default and accepts `eventId` for direct links. The Event, Across events, and Sponsors views keep selections in the URL. **Recorded meetings** opens the [existing confirmation summary](outcomes.md) at `/outcomes`.

In matching simulation, Outcomes and event Insights open the [read-only demo charts](outcomes.md#demo-mode), preserving the selected event. The reporting pages check demo mode before reading the reporting tables, so demo navigation also works on databases that have yet to run the reporting migrations.

## Record evidence

Open **Manage evidence** in an event report. The editor accepts pasted JSON or a local JSON file and supplies field examples, roster person IDs, and saved match IDs. Capture surveys and sponsor reviews through the organizer's current process, then load the structured results. In the console, saving replaces the event's one evidence document. Keep the reportable data for that event together when making corrections.

| Field | Meaning |
| --- | --- |
| `series` | Set a stable `key` and readable `label`. Reuse the key for editions of the same series. |
| `goalSurveyWindow` | Optional `7` or `30` for goal results measured that many days after the event. A comparable edition needs the same window. |
| `participants` | Identify a canonical event roster person by `personId`. Record known attendance, segment, survey invitations, responses and structured goals. Assign an optional `networkKey` to a person only after verifying their identity. Reuse that key for the same person within the organization. |
| `requests` | Record each connection request once with a stable ID, person, category, and status at the event cutoff. Use `null` for missing tracking and `[]` when tracking recorded zero requests. |
| `followUps` | Record one pair response per confirmed `matchId` and 7- or 30-day window after the event. An unanswered stage is `null`. An explicit negative answer is `false`. |
| `reconnections` | List pairs of event roster people whose later interaction the organizer can verify. Both must have checked in and have explicit network keys for the pair to appear in cross-event reporting. |
| `sponsors` | Record sponsor objectives, optional targets, match associations and next steps. Counts use deduplicated associations. Meetings require a current completion. |

## Interpret results

- Goal Achievement shows recorded answer bases and survey coverage. Unmet Demand uses the organizer-supplied cutoff snapshot. Follow-through uses the selected post-event window and shows responses alongside due completed pairs.
- Coverage uses unique eligible checked-in people when attendance is captured. It labels an eligible roster-based count otherwise. Earlier verified attendance in the same organization identifies returning people. The first tracked attendance label reflects the available history.
- Series comparisons use the chosen 7- or 30-day reporting age. Coverage uses confirmations recorded by that age and the current recorded roster or attendance evidence. A later correction can change these projections. Goal comparisons need `goalSurveyWindow`, and follow-through uses the corresponding check-in records. The table shows gaps and measured bases.
- Cross-event relationships require a completed introduction, explicit identity, and a later recorded interaction. Co-attendance establishes the denominator for opportunities to reconnect. The matrix counts each pair at its first recorded continuation in the selected range.
- Sponsor Outcomes is an organizer scorecard. Sponsor-facing publication and direct attendee survey delivery are future work.

## Storage and access

[Migration 0018](../../drizzle/0018_reporting_evidence.sql) adds a revisioned JSONB document per event. The API `/api/events/:eventId/reporting-evidence` returns `{ data: { revision, evidence } }`. Replacement requires a same-origin JSON `PUT` with `{ expectedRevision, evidence }`. A stale revision returns `409` and the authorized current revision. Explicit reloading preserves the organizer's ability to copy unsaved edits before replacing them.

The service validates references against the event inside the organizer's selected organization and excludes stored simulator pairs from real reports. Staff grants and sponsor memberships give no report access. Evidence writes are read-only when matching runs in simulation. The editor keeps older references available for correction when a later identity link or match correction removes them from report calculations.

Deploy the migration through the [normal guarded migration workflow](vercel-deployment.md). See [verification](../VERIFICATION.md) and the [report design](../changes/2026-11-24-outcomes-reporting-design.md).
