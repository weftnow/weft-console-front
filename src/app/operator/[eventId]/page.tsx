import { notFound } from "next/navigation";
import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { getEvent } from "@/modules/events/server/service";
import { uuidSchema } from "@/modules/events/event-schemas";
import { AuthShell } from "@/shared/ui/auth-shell";

export const dynamic = "force-dynamic";

export default async function OperatorEventPage(props: { params: Promise<{ eventId: string }> }) {
  const actor = await requireLocalActor();
  const { eventId } = await props.params;
  if (!uuidSchema.safeParse(eventId).success) notFound();
  let event;
  try { event = await getEvent({ userId: actor.id, eventId }); }
  catch { notFound(); }
  return <AuthShell title={event.name} description={[event.venue, event.city].filter(Boolean).join(" · ")}>
    <section className="grid gap-4" aria-labelledby="operator-roster-heading">
      <h2 className="text-base font-semibold" id="operator-roster-heading">Roster · {event.attendees.guests.length}</h2>
      {event.attendees.guests.length ? <ul className="grid gap-2">
        {event.attendees.guests.map((guest) => <li className="rounded-lg border border-border px-3 py-2" key={guest.id}>
          <strong>{guest.firstName} {guest.lastName}</strong><p className="text-sm text-muted-foreground">{[guest.position, guest.company].filter(Boolean).join(" · ")}</p>
        </li>)}
      </ul> : <p>No guests have been added to this event.</p>}
    </section>
  </AuthShell>;
}
