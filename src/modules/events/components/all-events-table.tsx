"use client";

import Link from "next/link";

import type { EventSummaryDto } from "../event-dto";
import { eventArt } from "../event-list";
import { formatEventDateRange } from "../event-record";
import { CityArtwork } from "@/shared/ui/city-artwork";
import { CalendarIcon, ChevronRightIcon } from "@/shared/ui/icons";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Surface } from "@/shared/ui/surface";

export function AllEventsTable({ events }: { events: EventSummaryDto[] }) {
  const i18n = useI18n();
  const copy = i18n.dict.events.list;
  return (
    <Surface as="section" className="panel table-panel all-events-panel" depth="raised" aria-labelledby="all-events-title">
      <div className="panel-heading">
        <div className="section-head">
          <CalendarIcon className="section-head__icon" height="19" width="19" />
          <h2 className="panel-title" id="all-events-title">{copy.allHeading}</h2>
        </div>
      </div>
      <div className="table-scroll">
        <table className="event-table all-events-table">
          <colgroup><col className="events-col-name" /><col className="events-col-city" /><col className="events-col-date" /><col className="events-col-status" /><col className="events-col-count" /><col className="events-col-open" /></colgroup>
          <thead><tr><th scope="col">{copy.columns.event}</th><th scope="col">{copy.columns.city}</th><th scope="col">{copy.columns.date}</th><th scope="col">{copy.columns.status}</th><th className="cell-number" scope="col">{copy.columns.guests}</th><th scope="col"><span className="sr-only">{copy.openEvent}</span></th></tr></thead>
          <tbody className="table-body-well" data-depth="inset">
            {events.map((event) => (
              <tr key={event.id}>
                <td><div className="event-name"><CityArtwork art={eventArt(event)} className="mini-city" /><Link href={`/events/${event.id}`}>{event.name}</Link></div></td>
                <td className="cell-muted">{i18n.dict.events.options.cities[event.city as keyof typeof i18n.dict.events.options.cities] ?? event.city}</td>
                <td className="cell-muted">{formatEventDateRange(i18n, event.startDate, event.endDate)}</td>
                <td><span className={`status-pill status-pill--${event.status}`}>{i18n.dict.events.status[event.status]}</span></td>
                <td className="cell-number">{i18n.number(event.guestCount)}</td>
                <td className="cell-action"><Link aria-label={i18n.t(copy.openNamed, { name: event.name })} href={`/events/${event.id}`}><ChevronRightIcon height="15" width="15" /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer"><span>{i18n.plural(copy.showing, events.length)}</span></div>
    </Surface>
  );
}
