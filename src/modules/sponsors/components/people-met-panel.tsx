import { ChevronRightIcon, PeopleIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { partnerReportData } from "../partner-report-data";
import { OutcomeBadge } from "./outcome-badge";
import { PartnerAvatar } from "./partner-avatar";

export function PeopleMetPanel() {
  const { met, segments, total } = partnerReportData.people;

  return (
    <Surface
      aria-labelledby="partner-people-title"
      as="section"
      className="panel table-panel partner-panel partner-people"
      depth="raised"
    >
      <div className="panel-heading">
        <div className="section-head">
          <span className="section-head__icon"><PeopleIcon height="19" width="19" /></span>
          <h2 className="panel-title" id="partner-people-title">People you met</h2>
        </div>
        <TactileButton className="mini-view-all">
          View all ({total}) <ChevronRightIcon height="14" width="14" />
        </TactileButton>
      </div>
      <div aria-label="Filter introductions" className="partner-tabs" role="group">
        {segments.map((segment, index) => {
          const active = index === 0;

          return (
            <TactileButton
              aria-pressed={active}
              className={`partner-tab ${active ? "partner-tab--active" : ""}`.trim()}
              key={segment.label}
            >
              {segment.label} ({segment.count})
            </TactileButton>
          );
        })}
      </div>
      <div className="table-scroll">
        <table className="partner-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Company / Role</th>
              <th scope="col">Why Weft introduced</th>
              <th scope="col">Outcome</th>
              <th scope="col"><span className="visually-hidden">Open introduction</span></th>
            </tr>
          </thead>
          <tbody className="table-body-well" data-depth="inset">
            {met.map((person) => (
              <tr key={person.id}>
                <td>
                  <div className="partner-identity">
                    <PartnerAvatar name={person.name} src={person.avatar} />
                    <span>{person.name}</span>
                  </div>
                </td>
                <td>
                  <div className="partner-role">
                    <strong>{person.company}</strong>
                    <span>{person.role}</span>
                  </div>
                </td>
                <td className="cell-muted">{person.reason}</td>
                <td><OutcomeBadge outcome={person.outcome} /></td>
                <td className="cell-action"><ChevronRightIcon height="16" width="16" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
