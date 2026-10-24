import type { ReactNode } from "react";
import {
  CheckIcon, ChevronDownIcon, DocumentIcon, LinkIcon, MessageIcon,
  NoteIcon, PeopleIcon, ShieldIcon, TargetIcon,
} from "@/shared/ui/icons";
import { formatRelativeActivity } from "@/modules/events/event-record";
import { introductionPathHints, introductionPathLabels, revocationReasonCopy, statusLabels } from "../matches-copy";
import type { MatchDetailDto } from "../matches-schemas";

type MatchGuest = MatchDetailDto["guests"][number];

export function MatchDetailLoader() {
  return <div className="match-loading" role="status">
    <div className="match-loading__status"><span className="match-loading__spinner" aria-hidden="true" />Loading match details…</div>
    <div aria-hidden="true">
      <div className="match-loading__pair">
        {[0, 1].map((side) => <div className="match-loading__person" key={side}>
          <span className="match-loading__shape match-loading__avatar" />
          <span className="match-loading__shape match-loading__name" />
          <span className="match-loading__shape match-loading__company" />
        </div>)}
      </div>
      <div className="match-loading__benefits">
        {[0, 1].map((side) => <div key={side}>
          <span className="match-loading__shape match-loading__name" />
          <span className="match-loading__shape match-loading__line" />
          <span className="match-loading__shape match-loading__line" />
          <span className="match-loading__shape match-loading__company" />
        </div>)}
      </div>
    </div>
  </div>;
}

function GuestIdentity({ guest }: { guest: MatchGuest }) {
  const initials = guest.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase() || "?";
  return <section className="match-identity" aria-label={guest.name || "Unnamed guest"}>
    <span className="match-identity__avatar" aria-hidden="true">{initials}</span>
    <h3>{guest.name || "Unnamed guest"}</h3>
    <p className="match-identity__company">{guest.company || "No company recorded"}</p>
    {guest.jobPosition ? <p className="match-identity__role">{guest.jobPosition}</p> : null}
    <span className="match-identity__type">{guest.guestType}</span>
    {guest.participation === "excluded" ? <span className="match-identity__excluded">Excluded from networking</span> : null}
  </section>;
}

function DetailDisclosure({ icon: Icon, title, meta, children }: {
  icon: typeof PeopleIcon; title: string; meta?: string | number; children: ReactNode;
}) {
  return <details className="match-disclosure">
    <summary><Icon height="17" width="17" /><span>{title}</span>{meta !== undefined ? <span className="match-disclosure__meta">{meta}</span> : null}<ChevronDownIcon className="match-disclosure__chevron" height="16" width="16" /></summary>
    <div className="match-disclosure__body">{children}</div>
  </details>;
}

function ProfileBlock({ profile }: { profile: NonNullable<MatchGuest["profile"]> }) {
  const rows = ([["Summary", profile.summary], ["Goals", profile.goals], ["Offers", profile.offers], ["Wants to meet", profile.desiredConnections], ["Background", profile.background]] as [string, string | null][])
    .flatMap(([label, value]) => (value ? [[label, value] as [string, string]] : []));
  if (rows.length === 0) return <p className="match-muted">No profile details saved yet.</p>;
  return <dl className="match-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

/** A pair-first review, with supporting and technical context available on demand. */
export function MatchDetailView({ match }: { match: MatchDetailDto }) {
  const withShareableContext = match.guests.filter((guest) => guest.shareableReason);
  const commonMissing = match.guests[0].missingInformation.filter((item) => match.guests[1].missingInformation.includes(item));
  const withMissingInformation = match.guests.map((guest) => ({
    id: guest.id, name: guest.name, items: guest.missingInformation.filter((item) => !commonMissing.includes(item)),
  })).filter((guest) => guest.items.length > 0);
  const hasMissingInformation = commonMissing.length > 0 || withMissingInformation.length > 0;
  const profileCount = match.guests.filter((guest) => guest.profile !== null).length;
  const context = match.uncertainty || (profileCount === 0 ? "Neither attendee has a saved profile yet." : profileCount === 1 ? "One attendee has no saved profile yet." : null);
  const MethodIcon = match.introductionPath === "sms_coordination" ? MessageIcon : PeopleIcon;
  return <div className="match-detail">
    <div className="match-overview">
      <div className="match-overview__state">
        <span className={`status-pill match-pill match-pill--${match.status}`}>{statusLabels[match.status]}</span>
        <span>{match.status === "active" ? "Match remains valid" : "Match withdrawn"}</span>
        <span className="match-overview__time">Selected {formatRelativeActivity(match.createdAt)}</span>
      </div>
      <div className="match-score" aria-label={`Match score ${match.pairScore} / 100`}>
        <span>Match score</span><div><strong>{match.pairScore}</strong><span>/100</span></div>
      </div>
    </div>

    {match.revocationReason ? <div className="match-context match-context--revoked" role="note"><ShieldIcon height="18" width="18" /><div><h4>Match revoked</h4><p>{revocationReasonCopy[match.revocationReason]}</p></div></div> : null}

    <div className="match-identity-pair" role="group" aria-label="Matched attendees">
      {match.guests.map((guest) => <GuestIdentity guest={guest} key={guest.id} />)}
      <span className="match-identity-pair__link" aria-hidden="true"><LinkIcon height="20" width="20" /></span>
    </div>

      <section className="match-benefits" aria-labelledby="match-benefits-title">
      <h3 className="match-section-title" id="match-benefits-title"><TargetIcon height="18" width="18" />Why this match</h3>
      <div className="match-benefits__columns">
        {match.guests.map((guest) => <div className="match-benefit" key={guest.id}>
          <h4>For {guest.name || "this attendee"}</h4>
          <p>{guest.benefit || <span className="match-muted">No benefit recorded.</span>}</p>
        </div>)}
      </div>
    </section>

    {context || hasMissingInformation ? <section className="match-context" aria-labelledby="match-context-title">
      <NoteIcon height="18" width="18" />
      <div><h4 id="match-context-title">Match context</h4>
        {context ? <p>{context}</p> : null}
        {hasMissingInformation ? <dl className="match-missing">
          {commonMissing.length > 0 ? <div><dt>Missing for both attendees</dt><dd>{commonMissing.join(" · ")}</dd></div> : null}
          {withMissingInformation.map((guest) => <div key={guest.id}><dt>Missing for {guest.name || "this attendee"}</dt><dd>{guest.items.join(" · ")}</dd></div>)}
        </dl> : null}
      </div>
    </section> : null}

    <div className="match-method">
      <span className="match-method__icon"><MethodIcon height="19" width="19" /></span>
      <div><span className="match-eyebrow">Introduction method</span><strong>{introductionPathLabels[match.introductionPath]}</strong><p>{introductionPathHints[match.introductionPath]}</p></div>
    </div>
    <p className="match-selection-note">Automatically selected: no guest has been asked or has agreed to a meeting through the Console.</p>

    <section className="match-restrictions" aria-label="Restrictions">
      {match.restrictions.length === 0 ? <p className="match-restrictions__clear"><CheckIcon height="16" width="16" />No do-not-match restrictions</p> : <>
        <h3 className="match-section-title"><ShieldIcon height="18" width="18" />Do-not-match restrictions</h3>
        <ul>{match.restrictions.map((restriction, index) => <li key={index}>
          {match.guests.find((guest) => guest.id === restriction.guestId)?.name || "A guest"} shouldn’t be matched with {restriction.otherGuestName}{restriction.reason ? ` — ${restriction.reason}` : ""}
        </li>)}</ul>
      </>}
    </section>

    <div className="match-supporting">
      {withShareableContext.length > 0 ? <DetailDisclosure icon={MessageIcon} title="Shareable context" meta={withShareableContext.length}>
        <div className="match-detail-columns">{withShareableContext.map((guest) => <div key={guest.id}><h4>For {guest.name || "this attendee"}</h4><blockquote>{guest.shareableReason}</blockquote></div>)}</div>
      </DetailDisclosure> : null}
      {match.evidence.length > 0 ? <DetailDisclosure icon={DocumentIcon} title="Supporting evidence" meta={match.evidence.length}>
        <ul className="match-evidence">{match.evidence.map((item, index) => {
          const owner = match.guests.find((guest) => guest.id === item.guestId);
          const text = item.quote ?? Object.entries(item).filter(([key]) => key !== "guestId").map(([, value]) => value).join(" · ");
          return <li key={index}>{owner ? <span>{owner.name || "Unnamed guest"}</span> : null}<blockquote>{text || "No evidence text recorded."}</blockquote></li>;
        })}</ul>
      </DetailDisclosure> : null}
      <DetailDisclosure icon={PeopleIcon} title="Other matches at this event" meta={match.earlierIntroductions.length}>
        {match.earlierIntroductions.length === 0 ? <p className="match-muted">Neither attendee has another match in this event.</p> : <ul className="match-related">
          {match.earlierIntroductions.map((other) => <li key={`${other.guestId}-${other.matchId}`}>
            <span>{match.guests.find((guest) => guest.id === other.guestId)?.name || "A guest"}<span className="match-related__with">with</span><strong>{other.otherGuestName}</strong></span>
            <span className={`match-status-text match-status-text--${other.status}`}>{statusLabels[other.status]}</span>
          </li>)}
        </ul>}
      </DetailDisclosure>
      <DetailDisclosure icon={NoteIcon} title="Profiles & matching details" meta={`${profileCount}/2 profiles`}>
        <div className="match-detail-columns">{match.guests.map((guest) => <section key={guest.id}>
          <h4>{guest.name || "Unnamed guest"}</h4>
          {guest.profile ? <ProfileBlock profile={guest.profile} /> : <p className="match-muted">No profile saved.</p>}
          <dl className="match-profile-meta"><div><dt>Directional fit</dt><dd>{guest.directionalScore}/100</dd></div><div><dt>Profile version used</dt><dd>{guest.pinnedProfileVersion}</dd></div></dl>
          {guest.currentProfileVersion > guest.pinnedProfileVersion ? <p className="match-muted">Profile edited since selection; current version {guest.currentProfileVersion}</p> : null}
        </section>)}</div>
        <p className="match-muted match-detail__source">{match.sourceRunId ? `Matching run ${match.sourceRunId}` : "Not tied to a matching run"}</p>
      </DetailDisclosure>
    </div>
  </div>;
}
