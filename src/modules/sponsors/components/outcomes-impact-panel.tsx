import { IdeaIcon, PeopleIcon, PieIcon, StarIcon, TargetIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { partnerReportData, type ImpactStat } from "../partner-report-data";
import { PartnerMark } from "./partner-mark";

const glyphs: Record<ImpactStat["icon"], typeof TargetIcon> = {
  target: TargetIcon,
  idea: IdeaIcon,
  star: StarIcon,
  people: PeopleIcon,
};

export function OutcomesImpactPanel() {
  const { partner } = partnerReportData;
  const { quote, stats } = partnerReportData.impact;

  return (
    <Surface
      aria-labelledby="partner-impact-title"
      as="section"
      className="panel partner-panel partner-impact"
      depth="raised"
    >
      <div className="panel-heading">
        <div className="section-head">
          <span className="section-head__icon"><PieIcon height="19" width="19" /></span>
          <h2 className="panel-title" id="partner-impact-title">Outcomes &amp; impact</h2>
        </div>
      </div>
      <div className="impact-grid">
        {stats.map((stat) => {
          const Glyph = glyphs[stat.icon];

          return (
            <Surface as="article" className="impact-tile" depth="inset" key={stat.label}>
              <span aria-hidden="true" className="impact-tile__icon"><Glyph height="17" width="17" /></span>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </Surface>
          );
        })}
      </div>
      <Surface as="figure" className="partner-quote" depth="inset">
        <span aria-hidden="true" className="partner-quote__mark">&ldquo;</span>
        <blockquote>{quote}</blockquote>
        <figcaption>
          <PartnerMark size={30} />
          <span>
            <small>Partner</small>
            <strong>{partner.name}</strong>
          </span>
        </figcaption>
      </Surface>
    </Surface>
  );
}
