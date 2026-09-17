import { CalendarIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { partnerReportData } from "../partner-report-data";
import { PartnerAvatar } from "./partner-avatar";

export function FollowUpsPanel() {
  const { followUps } = partnerReportData;

  return (
    <Surface
      aria-labelledby="partner-follow-ups-title"
      as="section"
      className="panel table-panel partner-panel"
      depth="raised"
    >
      <div className="panel-heading">
        <div className="section-head">
          <span className="section-head__icon"><CalendarIcon height="19" width="19" /></span>
          <h2 className="panel-title" id="partner-follow-ups-title">Upcoming follow ups</h2>
        </div>
      </div>
      <div className="table-scroll">
        <table className="partner-table">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Company</th>
              <th scope="col">Next action</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody className="table-body-well" data-depth="inset">
            {followUps.map((followUp) => (
              <tr key={followUp.id}>
                <td>
                  <div className="partner-identity">
                    <PartnerAvatar name={followUp.name} src={followUp.avatar} />
                    <span>{followUp.name}</span>
                  </div>
                </td>
                <td className="cell-muted">{followUp.company}</td>
                <td className="cell-muted">{followUp.action}</td>
                <td className={followUp.imminent ? "partner-date--imminent" : undefined}>
                  {followUp.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
