import {
  CalendarIcon,
  LinkIcon,
  PeopleIcon,
  StarIcon,
  TrendIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { partnerReportData, type PartnerMetricIcon } from "../partner-report-data";

const glyphs: Record<PartnerMetricIcon, typeof PeopleIcon> = {
  people: PeopleIcon,
  link: LinkIcon,
  calendar: CalendarIcon,
  star: StarIcon,
};

export function PartnerMetrics() {
  return (
    <section aria-label="Event outcomes for this partner" className="partner-metrics">
      {partnerReportData.metrics.map((metric) => {
        const Glyph = glyphs[metric.icon];

        return (
          <Surface
            as="article"
            className={`metric ${metric.emphasis ? "metric--selected" : ""}`.trim()}
            depth="raised"
            key={metric.label}
          >
            <Surface className="metric__icon" depth="inset"><Glyph height="19" width="19" /></Surface>
            <div className="metric__value">{metric.value}</div>
            <div className="metric__label">{metric.label}</div>
            <div className="metric__trend"><TrendIcon height="14" width="14" />{metric.trend}</div>
            <p className="metric__comparison">{metric.comparison}</p>
          </Surface>
        );
      })}
    </section>
  );
}
