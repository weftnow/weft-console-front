import {
  BriefcaseIcon,
  ChevronRightIcon,
  HomeIcon,
  SparklesIcon,
  TargetIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { partnerReportData, type InvestmentOpportunity } from "../partner-report-data";
import { OutcomeBadge } from "./outcome-badge";

const glyphs: Record<InvestmentOpportunity["glyph"], typeof TargetIcon> = {
  target: TargetIcon,
  sparkles: SparklesIcon,
  wellness: HomeIcon,
};

export function InvestmentOpportunitiesPanel() {
  const { opportunities } = partnerReportData;

  return (
    <Surface
      aria-labelledby="partner-opportunities-title"
      as="section"
      className="panel table-panel partner-panel"
      depth="raised"
    >
      <div className="panel-heading">
        <div className="section-head">
          <span className="section-head__icon"><BriefcaseIcon height="19" width="19" /></span>
          <h2 className="panel-title" id="partner-opportunities-title">Investment opportunities</h2>
        </div>
        <TactileButton className="mini-view-all">
          View all ({opportunities.length}) <ChevronRightIcon height="14" width="14" />
        </TactileButton>
      </div>
      <div className="table-scroll">
        <table className="partner-table partner-table--wide">
          <thead>
            <tr>
              <th scope="col">Company</th>
              <th scope="col">Opportunity</th>
              <th scope="col">Stage</th>
              <th scope="col">Why relevant</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="visually-hidden">Open opportunity</span></th>
            </tr>
          </thead>
          <tbody className="table-body-well" data-depth="inset">
            {opportunities.map((opportunity) => {
              const Glyph = glyphs[opportunity.glyph];

              return (
                <tr key={opportunity.id}>
                  <td>
                    <div className="company-identity">
                      <span
                        aria-hidden="true"
                        className={`company-mark company-mark--${opportunity.mark}`}
                      >
                        <Glyph height="18" width="18" />
                      </span>
                      <span>{opportunity.company}</span>
                    </div>
                  </td>
                  <td className="cell-muted">{opportunity.opportunity}</td>
                  <td>{opportunity.stage}</td>
                  <td className="cell-muted">{opportunity.relevance}</td>
                  <td><OutcomeBadge outcome={opportunity.status} /></td>
                  <td className="cell-action"><ChevronRightIcon height="16" width="16" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
