import { partnerReportData } from "../partner-report-data";
import { FollowUpsPanel } from "./follow-ups-panel";
import { InvestmentOpportunitiesPanel } from "./investment-opportunities-panel";
import { OpportunityPipelinePanel } from "./opportunity-pipeline-panel";
import { OutcomesImpactPanel } from "./outcomes-impact-panel";
import { PartnerGoalsPanel } from "./partner-goals-panel";
import { PartnerMetrics } from "./partner-metrics";
import { PartnerReportHero } from "./partner-report-hero";
import { PeopleMetPanel } from "./people-met-panel";

/**
 * Standalone partner report. It deliberately renders without the organizer
 * console navigation — a partner opens this as their own view of one event.
 */
export function PartnerReportPage() {
  const { event } = partnerReportData;

  return (
    <div className="partner-shell">
      <main className="partner-main">
        <PartnerReportHero />
        <PartnerMetrics />
        <div className="partner-analysis-grid">
          <PartnerGoalsPanel />
          <OpportunityPipelinePanel />
        </div>
        <InvestmentOpportunitiesPanel />
        <div className="partner-closing-grid">
          <PeopleMetPanel />
          <OutcomesImpactPanel />
        </div>
        <FollowUpsPanel />
        <footer className="dashboard-footer">
          <span>We Are One &nbsp;|&nbsp; Powered by Weft</span>
          <span>Partner report &nbsp;·&nbsp; {event.city} &nbsp;·&nbsp; {event.edition}</span>
        </footer>
      </main>
    </div>
  );
}
