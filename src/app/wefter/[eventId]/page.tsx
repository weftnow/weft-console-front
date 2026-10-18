import { notFound } from "next/navigation";
import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { getWefterContext } from "@/modules/events/server/access-repository";
import { getOwnWefterHours } from "@/modules/events/server/settings-repository";
import { uuidSchema } from "@/modules/events/event-schemas";
import { StaffEventShell } from "@/modules/events/components/staff-event-shell";

export const dynamic = "force-dynamic";

export default async function WefterEventPage(props: { params: Promise<{ eventId: string }> }) {
  const actor = await requireLocalActor();
  const { eventId } = await props.params;
  if (!uuidSchema.safeParse(eventId).success) notFound();
  const context = await getWefterContext(eventId, actor.id);
  if (!context) notFound();
  const schedule = await getOwnWefterHours(eventId, actor.id);
  return <StaffEventShell name={context.name} venue={context.venue}>
    <section aria-labelledby="wefter-hours-heading">
      <div className="event-management-heading"><div><h2 id="wefter-hours-heading">Your availability hours</h2><p>Managed by the event organizers.</p></div>{schedule ? <span className="event-timezone">{schedule.timezone.replaceAll("_", " ")}</span> : null}</div>
      {schedule?.availabilityWindows.length ? <ul className="staff-event-hours">{schedule.availabilityWindows.map((window, index) => <li key={`${window.startsAt}-${index}`}><span>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: schedule.timezone }).format(new Date(window.startsAt))}</span><span aria-hidden="true">–</span><span>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: schedule.timezone }).format(new Date(window.endsAt))}</span></li>)}</ul> : <p className="staff-event-empty">No hours added yet. Ask an event organizer to set your availability.</p>}
    </section>
  </StaffEventShell>;
}
