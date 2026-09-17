import Image from "next/image";
import type { ReactNode } from "react";

import {
  BriefcaseIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClipboardIcon,
  CloseIcon,
  ExternalLinkIcon,
  LocationIcon,
  NoteIcon,
  PeopleIcon,
  SendIcon,
  ShieldIcon,
  TargetIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { peopleData, type ParticipationDetail } from "../people-data";

const detailIcons: Record<ParticipationDetail["icon"], ReactNode> = {
  calendar: <CalendarIcon height="15" width="15" />,
  goal: <TargetIcon height="15" width="15" />,
  status: <ShieldIcon height="15" width="15" />,
  registration: <ClipboardIcon height="15" width="15" />,
};

function PanelSection({
  action,
  children,
  icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Surface as="section" className="person-section" depth="inset">
      <div className="person-section__head">
        <span aria-hidden="true">{icon}</span>
        <h3>{title}</h3>
        {action ? <div className="person-section__action">{action}</div> : null}
      </div>
      {children}
    </Surface>
  );
}

function ParticipationValue({ detail }: { detail: ParticipationDetail }) {
  if (detail.tone === "status") {
    return <span className="people-status people-status--vip">{detail.value}</span>;
  }

  if (detail.tone === "confirmed") {
    return <span className="people-flag people-flag--confirmed">{detail.value}</span>;
  }

  return (
    <>
      <strong>{detail.value}</strong>
      {detail.caption ? <span>{detail.caption}</span> : null}
    </>
  );
}

export function PersonProfilePanel() {
  const { bio, category, history, location, met, metTotal, participation, person, portrait } =
    peopleData.profile;

  return (
    <Surface
      aria-labelledby="person-profile-name"
      as="aside"
      className="person-panel"
      depth="raised"
    >
      <header className="person-identity">
        <Image
          alt={`Portrait of ${person.name}`}
          className="person-identity__portrait"
          height={96}
          sizes="96px"
          src={portrait}
          width={96}
        />
        <div className="person-identity__copy">
          <h2 id="person-profile-name">{person.name}</h2>
          <p>
            {person.role}
            <span className="people-status people-status--vip">VIP</span>
          </p>
          <span>{person.company}</span>
        </div>
        <TactileButton
          aria-label={`Close ${person.name} profile`}
          className="person-panel__close"
          iconOnly
          variant="ghost"
        >
          <CloseIcon height="17" width="17" />
        </TactileButton>
      </header>

      <div className="person-meta">
        <span><LocationIcon height="15" width="15" />{location}</span>
        <span><BriefcaseIcon height="15" width="15" />{category}</span>
      </div>

      <p className="person-bio">{bio}</p>

      <div className="person-actions">
        <TactileButton variant="primary">
          <SendIcon height="15" width="15" /> Message
        </TactileButton>
        <TactileButton>
          View full profile <ExternalLinkIcon height="14" width="14" />
        </TactileButton>
      </div>

      <PanelSection icon={<CalendarIcon height="16" width="16" />} title="Current participation">
        <dl className="person-details">
          {participation.map((detail) => (
            <div key={detail.label}>
              <dt>
                <span aria-hidden="true">{detailIcons[detail.icon]}</span>
                {detail.label}
              </dt>
              <dd><ParticipationValue detail={detail} /></dd>
            </div>
          ))}
        </dl>
      </PanelSection>

      <PanelSection
        action={<span className="person-section__count">{history.length} events</span>}
        icon={<CalendarIcon height="16" width="16" />}
        title="Event history"
      >
        <ol className="person-timeline">
          {history.map((entry) => (
            <li key={entry.id}>
              <span aria-hidden="true" className="person-timeline__dot" />
              <div className="person-timeline__event">
                <strong>{entry.name}</strong>
                <span>{entry.date}</span>
              </div>
              <div className="person-timeline__stats">
                <span>{entry.introductions} introductions</span>
                <span>{entry.valuable} valuable</span>
              </div>
              <ChevronRightIcon height="14" width="14" />
            </li>
          ))}
        </ol>
      </PanelSection>

      <PanelSection
        action={<span className="text-link">View all ({metTotal})</span>}
        icon={<PeopleIcon height="16" width="16" />}
        title="People they've met"
      >
        <ul className="person-met">
          {met.map((connection) => (
            <li key={connection.id}>
              <Image
                alt={`Portrait of ${connection.name}`}
                className="people-avatar"
                height={34}
                sizes="34px"
                src={connection.avatar}
                width={34}
              />
              <div className="person-met__copy">
                <strong>{connection.name}</strong>
                <span>{connection.role} · {connection.company}</span>
              </div>
              <span className="person-met__event">{connection.event}</span>
              <span
                className={`people-flag ${connection.valuable ? "people-flag--valuable" : "people-flag--unmarked"}`}
              >
                {connection.valuable ? "Valuable" : "Not marked"}
              </span>
              <ChevronRightIcon height="14" width="14" />
            </li>
          ))}
        </ul>
      </PanelSection>

      <section className="person-notes">
        <div className="person-section__head">
          <span aria-hidden="true"><NoteIcon height="16" width="16" /></span>
          <h3>Notes</h3>
        </div>
        <div className="person-notes__row">
          <Surface className="person-notes__field" depth="inset">
            <label className="visually-hidden" htmlFor="person-note">
              Add a note about {person.name}
            </label>
            <input
              id="person-note"
              placeholder={`Add a note about ${person.name.split(" ")[0]}…`}
              readOnly
              type="text"
            />
          </Surface>
          <TactileButton aria-label="Save note" iconOnly>
            <SendIcon height="15" width="15" />
          </TactileButton>
        </div>
      </section>
    </Surface>
  );
}
