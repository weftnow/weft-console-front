import type { CSSProperties } from "react";

import { FilterMenu } from "@/shared/ui/filter-menu";
import { OutcomesIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { partnerReportData } from "../partner-report-data";

export function OpportunityPipelinePanel() {
  const { scope, scopeOptions, stages } = partnerReportData.pipeline;

  return (
    <Surface
      aria-labelledby="partner-pipeline-title"
      as="section"
      className="panel partner-panel partner-pipeline"
      depth="raised"
    >
      <div className="panel-heading">
        <div className="section-head">
          <span className="section-head__icon"><OutcomesIcon height="19" width="19" /></span>
          <h2 className="panel-title" id="partner-pipeline-title">Opportunity pipeline</h2>
        </div>
        <FilterMenu label={scope} options={scopeOptions} />
      </div>
      <Surface aria-hidden="true" className="pipeline-well" depth="inset">
        {stages.map((stage) => (
          <span
            className="pipeline-bar"
            key={stage.label}
            style={{ "--bar-ratio": stage.ratio } as CSSProperties}
          />
        ))}
      </Surface>
      <ol className="pipeline-legend">
        {stages.map((stage) => (
          <li key={stage.label}>
            <strong>{stage.value}</strong>
            <span>{stage.label}</span>
          </li>
        ))}
      </ol>
    </Surface>
  );
}
