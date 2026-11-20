# Outcomes reporting design

**Status** Ready. See the [execution plan](../exec-plans/active/2026-11-24-outcomes-intelligence.md) and [implemented evidence workflow](../backend/outcomes-intelligence.md).

## Purpose and scope

Help organizers understand what attendees gained from an event, what to change for the next one, and how relationships develop across their events. This draft covers the presentation of the seven agreed report topics. Layouts, metric definitions, data collection, and release order are proposals. The [product scope](../product.md) describes current delivery, including what the Console records about matches.

## Page structure

- Make **Outcomes** the organization-level entry point. Open on **Event** with the latest completed event selected. Link from Event Detail with that event preselected. Show the collection status when check-ins are pending and an event picker or empty state when no event has completed.
- Use three views: **Event**, **Across events**, and **Sponsors**. Event contains Goal Achievement, Unmet Demand, Follow-through, and Networking Coverage. Across events contains Event Series Performance and Cross-Event Relationships. Sponsors opens the organizer's sponsor scorecard.
- Keep scope controls in one row under the page title. Show an event picker for Event, series and date range for Across events, and event and sponsor pickers for Sponsors. Each view opens with one evidence-backed finding and a short list of reports with their headline figures or collection status. Selecting a report opens one primary visual and an evidence table in a shareable view within the Console. Preserve view, scope, report, and filters when navigating back.
- Inside a report, order the content as question and scope, lead measure with its denominator, main visual, and breakdown. Selecting a bar, point, or cell filters the breakdown. Provide the same interaction through keyboard-operable rows and readable counts. On narrow screens, stack the controls and use the table or a labeled list for wide matrices.
- Use the existing [Weft design system](../design/design-system.md). Use orange for the selected group or series, direct labels for meaning, and a quiet inset surface for the primary visual. Localize labels, dates, and numbers in English and Spanish.

## Event reports

### Attendee Goal Achievement

- **Lead measure.** Share of respondents who reported fully achieving at least one goal, among those with a recorded goal and a usable answer. Show survey coverage as a separate count. Example format: “36 of 52 respondents with recorded goals achieved at least one · 58 of 120 invited answered the survey.”
- **Visual.** Horizontal stacked bars by goal, with labeled segments for achieved, partly achieved, and unmet. Show the response count beside each bar. Add a segment filter for relevant attendee groups. A person can appear in multiple goal rows and counts once in the headline.
- **Drill-down and decision.** Selecting a goal shows its breakdown by attendee segment, with the eligible sample and feedback coverage. The organizer can see which audiences benefit from the format and which need a different guest mix.

### Unmet Demand

- **Lead measure.** Number of unique recorded requests still open at the event cutoff, with the number of recorded requests in scope. Use structured requests for desired connection types, such as “Meet an enterprise buyer.”
- **Visual.** Ranked horizontal bars of unresolved requests by connection type. Selecting a row opens a reason table with counts for no suitable attendee identified, scheduling conflict, declined or cancelled, and unknown, when the workflow supports those reasons. Use one reportable reason per open request so the reason counts reconcile.
- **Drill-down and decision.** Show requesting segments, recurring goals, and the reason distribution. The organizer can decide whether to invite more people from a segment, protect meeting time, or follow up on open requests.

### Follow-through

- **Lead measure.** Share of checked-in introduction pairs with at least one reported follow-up. Show check-in coverage separately as responding pairs out of completed pairs whose check-in is due.
- **Visual.** Horizontal bars for reported follow-up, second meeting, and concrete opportunity. Use the same denominator across these measures when the same pairs answered each question. Otherwise show the base per bar. The measures can overlap. Use a **7 days / 30 days** selector and label when the window is still collecting.
- **Drill-down and decision.** Break down results by introduction type. Keep reported next steps and response coverage visible when filtering. The organizer can see which introduction types generate momentum and where another check-in may help.

### Networking Coverage

- **Lead measure.** Share of unique eligible attendees with at least one recorded completed introduction. Use checked-in eligible attendees when attendance is reliably captured. Label any roster-based denominator as “eligible people on the roster” and keep it distinct in comparisons.
- **Visual.** One 100% stacked bar per segment showing attendees with zero, one, or two or more completed introductions, with counts at the end of each row. Start with first-time and returning attendees when organization-level identity is available. Use other reliably recorded attendee groups in the first release.
- **Drill-down and decision.** Selecting a segment and bucket shows its counts and completion breakdown. The organizer can identify groups to prioritize for outreach or Wefter support at the next event.

## Across-event reports

### Event Series Performance

- **Lead measure.** Latest edition versus the previous comparable edition for the selected measure, expressed in percentage points alongside actual counts and denominators.
- **Visual.** A dot per edition on a chronological axis. Connect consecutive comparable editions when showing the trend over three or more editions. With two editions, use paired values in the table. Offer a metric selector for goal achievement, coverage, and follow-through, each with its own denominator. Leave a gap when an edition lacks usable data and compare post-event rates at the same measurement age.
- **Drill-down and decision.** Selecting an edition opens its event report with the same metric and applicable filters. The organizer can compare editions and investigate whether programming or audience changes coincided with different outcomes.

### Cross-Event Relationships

- **Lead measure.** Unique tracked pairs with a recorded interaction at a later event, out of tracked pairs with both attendees present at a later event in the selected scope. Show the number of pairs with later recorded interactions as well as the denominator.
- **Visual.** A matrix with the event of first tracked introduction down the left and the event of first subsequent recorded interaction across the top, in chronological order. Cells show unique pair counts. A pair appears once in this matrix and can have additional interactions in its history. Use a sortable table of event pairs for larger ranges or narrow screens.
- **Drill-down and decision.** Selecting a cell shows first introductions and later interactions, with their event dates, evidence, and any permission-appropriate pair history. Co-attendance establishes an opportunity to reconnect. Count continuation only when an interaction is recorded. The organizer can see which events start tracked relationships and which events help them continue.

## Sponsor report

### Sponsor Outcomes

- **Lead measure.** Progress against the selected sponsor's stated goal, with targets when the sponsor set them. Show a quiet sponsor comparison table when no sponsor is selected.
- **Visual.** A scorecard with columns for objective, target, actual, and next step. Use inline bars for numeric targets and a count for objectives tracked without a target. Distinguish qualified introductions, completed meetings, and reported next steps by giving each its own measure and definition.
- **Drill-down and decision.** Selecting a measure shows the supporting sponsor-linked records according to access. The organizer uses this scorecard for renewal and package design. A later sponsor-facing Partner Report can use the same layout with a separately authorized sponsor-scoped projection.

## Evidence and access

- Distinguish automatically selected matches, recorded completed introductions, and attendee-reported outcomes in labels and calculations. Record whether an introduction was Weft-facilitated or attendee-reported where that source is available. Display the event scope, measurement window, denominator, and response coverage with each rate.
- Distinguish measured zero, data still collecting, and unavailable or insufficient data. Missing feedback and missing outcome history stay unknown. Use the existing empty-state pattern before a report has a usable source. Keep small or sensitive group breakdowns aggregate until display rules are defined.
- Apply the existing organization boundary to Owners and Organizers. Staff and Wefter grants do not give access to organizer reports. Sponsor-facing access needs an independently authorized sponsor scope. Keep organizer-only profile text out of shared report views. See [domain roles](../domain.md) and [shared access contracts](../access-contracts.md).

## Proposed rollout and decisions

1. Establish structured goal and request categories, reason capture, completed introduction records, and a lightweight check-in. Ship Goal Achievement, Unmet Demand, and Follow-through as the first Event reports as those sources become available. Add Networking Coverage once eligible-attendee and completion counts are reliable.
2. Add Event Series Performance with explicit series membership and comparable reporting windows. Add Cross-Event Relationships when organization-scoped identity and later interaction evidence are available. Existing attendee links are event-local.
3. Add the organizer Sponsor Outcomes scorecard when sponsor objectives, qualification rules, and record associations exist. Define sponsor-facing report access separately.

Open decisions include where attendees answer and when windows start, which event statuses and attendance evidence qualify for each measure, how duplicate or conflicting pair feedback is resolved, the smallest cohorts shown, and how cross-event identity is confirmed. Current profile goals and desired connections are free text. Define structured capture before using them as report categories. See [attendee profiles](../backend/attendee-profiles.md) and [automatic matches](../backend/matches.md).

## Acceptance for a later implementation

- An Organizer opens Outcomes from the sidebar or an Event Detail page, gets the expected scope, and can inspect the evidence for all seven measures from each report's visual or table. Returning restores the previous filters.
- A synthetic event with missing check-ins, duplicate attendee records, and completed versus pending introductions shows the correct bases, unknowns, and recorded zeros. A 30-day window still in progress is visibly labeled. Cross-event fixtures cover comparable editions, a missing edition, and co-attendance without a recorded interaction.
- An Owner or Organizer can read only reports for the active organization. Event-only staff and Wefter grants cannot read these reports. Any later sponsor-facing report rejects unrelated sponsors and events at the server boundary.
- Both locales work at desktop and narrow widths with visible keyboard focus. Report values and selection remain available through labeled tables or lists. Verify implementation with the repository's [verification guide](../VERIFICATION.md).
