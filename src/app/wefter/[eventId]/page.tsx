import { notFound } from "next/navigation";
import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { getWefterContext } from "@/modules/events/server/access-repository";
import { getOwnWefterHours } from "@/modules/events/server/settings-repository";
import { uuidSchema } from "@/modules/events/event-schemas";
import { AuthShell } from "@/shared/ui/auth-shell";

export const dynamic = "force-dynamic";

export default async function WefterEventPage(props: { params: Promise<{ eventId: string }> }) {
  const actor = await requireLocalActor();
  const { eventId } = await props.params;
  if (!uuidSchema.safeParse(eventId).success) notFound();
  const context = await getWefterContext(eventId, actor.id);
  if (!context) notFound();
  const schedule = await getOwnWefterHours(eventId, actor.id);
  return <AuthShell title={context.name} description={context.venue || "Event access · Wefter"}>
    <section className="grid gap-3" aria-labelledby="wefter-empty-heading">
      <h2 className="text-base font-semibold" id="wefter-empty-heading">Your event workspace</h2>
      <h3 className="font-medium">Your availability hours</h3>
      {schedule?.availabilityWindows.length ? <ul className="grid gap-2">{schedule.availabilityWindows.map((window, index) => <li key={`${window.startsAt}-${index}`}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: schedule.timezone }).format(new Date(window.startsAt))} – {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: schedule.timezone }).format(new Date(window.endsAt))}</li>)}</ul> : <p>Your availability hours have not been configured.</p>}
      <p>These hours are managed by the event organizers. Assignment tools will be available when event assignments are enabled.</p>
    </section>
  </AuthShell>;
}
