"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ChevronRightIcon } from "@/shared/ui/icons";
import { outcomesHref } from "../outcomes-navigation";
import type { OutcomesReport } from "../outcomes-report";

const metrics = ["completedIntroductions", "peopleIntroduced"] as const;

export function OutcomesByEvent({ events, compare = false }: { events: OutcomesReport["events"]; compare?: boolean }) {
  const i18n = useI18n();
  const copy = i18n.dict.insights.outcomes;
  const heading = useId();
  const [metric, setMetric] = useState<(typeof metrics)[number]>("completedIntroductions");
  const ranked = [...events].sort((a, b) =>
    Number(!a.trackingStartedAt) - Number(!b.trackingStartedAt) || b[metric] - a[metric],
  );
  const max = Math.max(ranked[0]?.[metric] ?? 0, 1);
  const visible = ranked.slice(0, compare ? 8 : 5);

  return <section className="outcomes-event-bars" aria-labelledby={heading}>
    <div className="outcomes-chart-heading">
      <h3 className="panel-title" id={heading}>{compare ? copy.charts.compareTitle : copy.charts.eventTitle}</h3>
      {compare ? <div className="outcomes-metric-switch" role="group" aria-label={copy.charts.metricLabel}>
        {metrics.map((choice) => (
          <button key={choice} className="match-filter" type="button" aria-pressed={choice === metric} onClick={() => setMetric(choice)}>
            {copy.metrics[choice]}
          </button>
        ))}
      </div> : null}
    </div>
    <ul className="outcomes-bar-list" aria-label={copy.metrics[metric]}>
      {visible.map((event) => <li key={event.eventId}>
        <Link className="outcomes-bar-link" href={outcomesHref(event.eventId)} prefetch={false}>
          <span className="outcomes-bar-name">{event.eventName}</span>
          {event.trackingStartedAt ? <>
            <span className="outcomes-bar-track" aria-hidden="true"><span style={{ width: `${event[metric] / max * 100}%` }} /></span>
            <span className="outcomes-bar-value">{i18n.number(event[metric])}</span>
          </> : <span className="outcomes-bar-untracked">{copy.table.statusUntracked}</span>}
          <ChevronRightIcon className="outcomes-bar-chevron" width="14" height="14" />
        </Link>
      </li>)}
    </ul>
    {ranked.length > visible.length ? <p className="outcomes-chart-note">
      {i18n.t(copy.charts.eventLimit, { shown: i18n.number(visible.length), total: i18n.number(ranked.length) })}
    </p> : null}
  </section>;
}
