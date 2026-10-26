import { notFound } from "next/navigation";
import { getI18n } from "@/shared/i18n/get-locale";
import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { getEvent } from "@/modules/events/server/service";
import { uuidSchema } from "@/modules/events/event-schemas";
import { StaffEventShell } from "@/modules/events/components/staff-event-shell";

export const dynamic = "force-dynamic";

export default async function OperatorEventPage(props: { params: Promise<{ eventId: string }> }) {
  const { dict, plural, number } = await getI18n();
  const copy = dict.wefter.operator;
  const actor = await requireLocalActor();
  const { eventId } = await props.params;
  if (!uuidSchema.safeParse(eventId).success) notFound();
  let event;
  try { event = await getEvent({ userId: actor.id, eventId }); }
  catch { notFound(); }
  return <StaffEventShell name={event.name} venue={[event.venue, event.city].filter(Boolean).join(" · ")}>
    <section aria-labelledby="staff-roster-heading">
      <div className="event-management-heading"><div><h2 id="staff-roster-heading">{copy.heading}</h2><p>{plural(copy.summary, event.attendees.guests.length, { count: number(event.attendees.guests.length) })}</p></div></div>
      {event.attendees.guests.length ? <ul className="staff-event-roster">
        {event.attendees.guests.map((guest) => <li key={guest.id}>
          <strong>{guest.firstName} {guest.lastName}</strong><p>{[guest.position, guest.company].filter(Boolean).join(" · ")}</p>
        </li>)}
      </ul> : <p>{copy.empty}</p>}
    </section>
  </StaffEventShell>;
}
