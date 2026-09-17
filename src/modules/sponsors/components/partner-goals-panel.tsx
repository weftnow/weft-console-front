import { CheckIcon, TargetIcon } from "@/shared/ui/icons";
import { ProgressRing } from "@/shared/ui/progress-ring";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { partnerReportData } from "../partner-report-data";

export function PartnerGoalsPanel() {
  const { achieved, items, total } = partnerReportData.goals;

  return (
    <Surface
      aria-labelledby="partner-goals-title"
      as="section"
      className="panel partner-panel"
      depth="raised"
    >
      <div className="panel-heading">
        <div className="section-head">
          <span className="section-head__icon"><TargetIcon height="19" width="19" /></span>
          <h2 className="panel-title" id="partner-goals-title">Your goals for this event</h2>
        </div>
        <TactileButton className="compact-select">Edit goals</TactileButton>
      </div>
      <div className="partner-goals">
        <ul className="goal-list">
          {items.map((goal) => (
            <li className={goal.completed ? undefined : "goal--open"} key={goal.label}>
              <span
                aria-hidden="true"
                className={`goal-check goal-check--${goal.completed ? "done" : "open"}`}
              >
                {goal.completed ? <CheckIcon height="14" width="14" /> : null}
              </span>
              <span>{goal.label}</span>
              <span className="visually-hidden">
                {goal.completed ? "Completed" : "Not completed"}
              </span>
            </li>
          ))}
        </ul>
        <div className="goals-ring">
          <ProgressRing
            ariaLabel={`${achieved} of ${total} goals achieved`}
            size={136}
            thickness={13}
            value={(achieved / total) * 100}
          />
          <div aria-hidden="true" className="goals-ring__center">
            <strong>{achieved}/{total}</strong>
            <span>goals achieved</span>
          </div>
        </div>
      </div>
    </Surface>
  );
}
