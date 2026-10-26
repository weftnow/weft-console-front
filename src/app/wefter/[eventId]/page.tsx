import { notFound } from "next/navigation";
import { getI18n } from "@/shared/i18n/get-locale";
import { requireLocalActor } from "@/infrastructure/auth/console-page-context";
import { getWefterContext } from "@/modules/events/server/access-repository";
import { getOwnWefterHours } from "@/modules/events/server/settings-repository";
import { uuidSchema } from "@/modules/events/event-schemas";
import { StaffEventShell } from "@/modules/events/components/staff-event-shell";

export const dynamic = "force-dynamic";

export default async function WefterEventPage(props: { params: Promise<{ eventId: string }> }) {
  const i18n = await getI18n();
  const copy = i18n.dict.wefter.hours;
  const actor = await requireLocalActor();
  const { eventId } = await props.params;
  if (!uuidSchema.safeParse(eventId).success) notFound();
  const context = await getWefterContext(eventId, actor.id);
  if (!context) notFound();
  const schedule = await getOwnWefterHours(eventId, actor.id);
  return <StaffEventShell name={context.name} venue={context.venue}>
    <section aria-labelledby="wefter-hours-heading">
      <div className="event-management-heading"><div><h2 id="wefter-hours-heading">{copy.heading}</h2><p>{copy.description}</p></div>{schedule ? <span className="event-timezone">{schedule.timezone.replaceAll("_", " ")}</span> : null}</div>
      {schedule?.availabilityWindows.length ? <ul className="staff-event-hours">{schedule.availabilityWindows.map((window, index) => <li key={`${window.startsAt}-${index}`}><span>{i18n.dateTime(window.startsAt, schedule.timezone)}</span><span aria-hidden="true">–</span><span>{i18n.dateTime(window.endsAt, schedule.timezone)}</span></li>)}</ul> : <p className="staff-event-empty">{copy.empty}</p>}
    </section>
  </StaffEventShell>;
}
