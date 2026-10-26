import { notFound } from "next/navigation";
import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { getEvent } from "@/modules/events/server/service";
import { uuidSchema } from "@/modules/events/event-schemas";
import { StaffEventShell } from "@/modules/events/components/staff-event-shell";

export const dynamic = "force-dynamic";

export default async function OperatorEventPage(props: { params: Promise<{ eventId: string }> }) {
  const actor = await requireLocalActor();
  const { eventId } = await props.params;
  if (!uuidSchema.safeParse(eventId).success) notFound();
  let event;
  try { event = await getEvent({ userId: actor.id, eventId }); }
  catch { notFound(); }
  return <StaffEventShell name={event.name} venue={[event.venue, event.city].filter(Boolean).join(" · ")}>
    <section aria-labelledby="staff-roster-heading">
      <div className="event-management-heading"><div><h2 id="staff-roster-heading">Attendees</h2><p>{event.attendees.guests.length} attendee records · View only</p></div></div>
      {event.attendees.guests.length ? <ul className="staff-event-roster">
        {event.attendees.guests.map((guest) => <li key={guest.id}>
          <strong>{guest.firstName} {guest.lastName}</strong><p>{[guest.position, guest.company].filter(Boolean).join(" · ")}</p>
        </li>)}
      </ul> : <p>No guests have been added to this event.</p>}
    </section>
  </StaffEventShell>;
}
