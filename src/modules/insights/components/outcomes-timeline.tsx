"use client";

import { useId } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ChartContainer, ChartTooltip } from "@/shared/ui/chart";
import { Surface } from "@/shared/ui/surface";
import type { OutcomesDay } from "../outcomes-report";

const dayInMilliseconds = 86_400_000;

function chartPoints(days: OutcomesDay[]) {
  const points: { time: number; count: number }[] = [];
  for (const { date, count } of days) {
    const time = Date.parse(date);
    const previous = points.at(-1);
    if (previous && time - previous.time > dayInMilliseconds) {
      const firstZero = previous.time + dayInMilliseconds;
      const lastZero = time - dayInMilliseconds;
      points.push({ time: firstZero, count: 0 });
      if (lastZero !== firstZero) points.push({ time: lastZero, count: 0 });
    }
    points.push({ time, count });
  }
  return points;
}

export function OutcomesTimeline({ days }: { days: OutcomesDay[] }) {
  const i18n = useI18n();
  const copy = i18n.dict.insights.outcomes.charts;
  const heading = useId();
  const description = useId();
  if (days.length === 0) return null;

  const data = chartPoints(days);
  const first = data[0].time;
  const last = data[data.length - 1].time;
  const span = Math.round((last - first) / dayInMilliseconds);
  const labels = Math.min(span, 4);
  const ticks = Array.from({ length: labels + 1 }, (_, index) =>
    first + Math.round(index * span / Math.max(labels, 1)) * dayInMilliseconds,
  );
  const tickOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", ...(span >= 365 ? { year: "2-digit" } : {}) };
  const dayLabel = (time: number) => i18n.date(time, { year: "numeric", month: "long", day: "numeric" }, "UTC");

  return <Surface as="section" className="panel outcomes-timeline" depth="raised" aria-labelledby={heading} aria-describedby={description}>
    <div className="outcomes-chart-heading">
      <div>
        <h2 className="panel-title" id={heading}>{copy.timelineTitle}</h2>
        <p className="panel-subtitle" id={description}>{copy.timelineDescription}</p>
      </div>
    </div>
    <ChartContainer className="outcomes-line-chart" config={{ count: { label: copy.introductionsRecorded, color: "var(--weft-orange)" } }}>
      <LineChart accessibilityLayer data={data} margin={{ top: 10, right: 14, bottom: 4, left: 0 }} title={copy.timelineTitle}>
        <CartesianGrid stroke="var(--weft-border)" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="time" type="number" ticks={ticks} domain={span ? [first, last] : [first - dayInMilliseconds, first + dayInMilliseconds]}
          tickFormatter={(value: number) => i18n.date(value, tickOptions, "UTC")} tick={{ fill: "var(--weft-text-muted)", fontSize: 11 }}
          axisLine={false} tickLine={false} tickMargin={9} minTickGap={12} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} domain={[0, "auto"]} tickFormatter={(value: number) => i18n.number(value)} tick={{ fill: "var(--weft-text-muted)", fontSize: 11 }}
          axisLine={false} tickLine={false} width={44} />
        <ChartTooltip labelFormatter={(value) => dayLabel(Number(value))}
          formatter={(value) => [i18n.number(Number(value)), copy.introductionsRecorded]}
          contentStyle={{ background: "var(--weft-surface)", borderColor: "var(--weft-border)", borderRadius: "var(--weft-radius-sm)" }} />
        <Line dataKey="count" type="linear" stroke="var(--color-count)" strokeWidth={2.5}
          dot={data.length <= 12 ? { r: 3, fill: "var(--color-count)", strokeWidth: 0 } : false}
          activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
    <details className="outcomes-daily-data">
      <summary className="text-link">{copy.viewDailyCounts}</summary>
      <table className="outcomes-daily-table">
        <caption className="sr-only">{copy.dailyCaption}</caption>
        <thead><tr><th scope="col">{copy.date}</th><th scope="col">{copy.introductionsRecorded}</th></tr></thead>
        <tbody>{days.map(({ date, count }) => <tr key={date}><th scope="row">{dayLabel(Date.parse(date))}</th><td>{i18n.number(count)}</td></tr>)}</tbody>
      </table>
    </details>
  </Surface>;
}
