"use client";

import type { ReactNode } from "react";
import {
  CheckIcon, ChevronDownIcon, DocumentIcon, LinkIcon, MessageIcon,
  NoteIcon, PeopleIcon, ShieldIcon, TargetIcon,
} from "@/shared/ui/icons";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { formatRelativeActivity } from "@/modules/events/event-record";
import type { MatchDetailDto } from "../matches-schemas";

type MatchGuest = MatchDetailDto["guests"][number];

export function MatchDetailLoader() {
  const copy = useI18n().dict.network.matches.detail;
  return <div className="match-loading" role="status">
    <div className="match-loading__status"><span className="match-loading__spinner" aria-hidden="true" />{copy.loading}</div>
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
  const { dict } = useI18n();
  const copy = dict.network.matches;
  const initials = guest.name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase() || "?";
  return <section className="match-identity" aria-label={guest.name || copy.unnamed}>
    <span className="match-identity__avatar" aria-hidden="true">{initials}</span>
    <h3>{guest.name || copy.unnamed}</h3>
    <p className="match-identity__company">{guest.company || copy.detail.noCompany}</p>
    {guest.jobPosition ? <p className="match-identity__role">{guest.jobPosition}</p> : null}
    <span className="match-identity__type">{dict.events.guestTypes[guest.guestType]}</span>
    {guest.participation === "excluded" ? <span className="match-identity__excluded">{copy.detail.excluded}</span> : null}
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
  const copy = useI18n().dict.network.matches.detail;
  const rows = ([[copy.profileFields.summary, profile.summary], [copy.profileFields.goals, profile.goals], [copy.profileFields.offers, profile.offers], [copy.profileFields.desiredConnections, profile.desiredConnections], [copy.profileFields.background, profile.background]] as [string, string | null][])
    .flatMap(([label, value]) => (value ? [[label, value] as [string, string]] : []));
  if (rows.length === 0) return <p className="match-muted">{copy.noProfileDetails}</p>;
  return <dl className="match-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

/** A pair-first review, with supporting and technical context available on demand. */
export function MatchDetailView({ match }: { match: MatchDetailDto }) {
  const i18n = useI18n();
  const { dict, t } = i18n;
  const text = dict.network.matches;
  const copy = text.detail;
  const withShareableContext = match.guests.filter((guest) => guest.shareableReason);
  const commonMissing = match.guests[0].missingInformation.filter((item) => match.guests[1].missingInformation.includes(item));
  const withMissingInformation = match.guests.map((guest) => ({
    id: guest.id, name: guest.name, items: guest.missingInformation.filter((item) => !commonMissing.includes(item)),
  })).filter((guest) => guest.items.length > 0);
  const hasMissingInformation = commonMissing.length > 0 || withMissingInformation.length > 0;
  const profileCount = match.guests.filter((guest) => guest.profile !== null).length;
  const context = match.uncertainty || (profileCount === 0 ? copy.noProfileBoth : profileCount === 1 ? copy.noProfileOne : null);
  const MethodIcon = match.introductionPath === "sms_coordination" ? MessageIcon : PeopleIcon;
  return <div className="match-detail">
    <div className="match-overview">
      <div className="match-overview__state">
        <span className={`status-pill match-pill match-pill--${match.status}`}>{text.status[match.status]}</span>
        <span>{match.status === "active" ? copy.stillValid : copy.withdrawn}</span>
        <span className="match-overview__time">{t(copy.selected, { when: formatRelativeActivity(i18n, match.createdAt) })}</span>
      </div>
      <div className="match-score" aria-label={t(copy.scoreLabel, { score: match.pairScore })}>
        <span>{copy.score}</span><div><strong>{match.pairScore}</strong><span>{copy.outOf}</span></div>
      </div>
    </div>

    {match.revocationReason ? <div className="match-context match-context--revoked" role="note"><ShieldIcon height="18" width="18" /><div><h4>{copy.revokedTitle}</h4><p>{text.revocation[match.revocationReason]}</p></div></div> : null}

    <div className="match-identity-pair" role="group" aria-label={copy.matchedAttendees}>
      {match.guests.map((guest) => <GuestIdentity guest={guest} key={guest.id} />)}
      <span className="match-identity-pair__link" aria-hidden="true"><LinkIcon height="20" width="20" /></span>
    </div>

      <section className="match-benefits" aria-labelledby="match-benefits-title">
      <h3 className="match-section-title" id="match-benefits-title"><TargetIcon height="18" width="18" />{copy.whyTitle}</h3>
      <div className="match-benefits__columns">
        {match.guests.map((guest) => <div className="match-benefit" key={guest.id}>
          <h4>{t(copy.forGuest, { name: guest.name || copy.thisAttendee })}</h4>
          <p>{guest.benefit || <span className="match-muted">{copy.noBenefit}</span>}</p>
        </div>)}
      </div>
    </section>

    {context || hasMissingInformation ? <section className="match-context" aria-labelledby="match-context-title">
      <NoteIcon height="18" width="18" />
      <div><h4 id="match-context-title">{copy.contextTitle}</h4>
        {context ? <p>{context}</p> : null}
        {hasMissingInformation ? <dl className="match-missing">
          {commonMissing.length > 0 ? <div><dt>{copy.missingBoth}</dt><dd>{commonMissing.join(" · ")}</dd></div> : null}
          {withMissingInformation.map((guest) => <div key={guest.id}><dt>{t(copy.missingFor, { name: guest.name || copy.thisAttendee })}</dt><dd>{guest.items.join(" · ")}</dd></div>)}
        </dl> : null}
      </div>
    </section> : null}

    <div className="match-method">
      <span className="match-method__icon"><MethodIcon height="19" width="19" /></span>
      <div><span className="match-eyebrow">{copy.method}</span><strong>{text.introPaths[match.introductionPath].label}</strong><p>{text.introPaths[match.introductionPath].hint}</p></div>
    </div>
    <p className="match-selection-note">{copy.selectionNote}</p>

    <section className="match-restrictions" aria-label={copy.restrictions}>
      {match.restrictions.length === 0 ? <p className="match-restrictions__clear"><CheckIcon height="16" width="16" />{copy.noRestrictions}</p> : <>
        <h3 className="match-section-title"><ShieldIcon height="18" width="18" />{copy.restrictionsTitle}</h3>
        <ul>{match.restrictions.map((restriction, index) => <li key={index}>
          {t(copy.shouldntMatch, { name: match.guests.find((guest) => guest.id === restriction.guestId)?.name || copy.aGuest, other: restriction.otherGuestName, reason: restriction.reason ? ` — ${restriction.reason}` : "" })}
        </li>)}</ul>
      </>}
    </section>

    <div className="match-supporting">
      {withShareableContext.length > 0 ? <DetailDisclosure icon={MessageIcon} title={copy.shareable} meta={withShareableContext.length}>
        <div className="match-detail-columns">{withShareableContext.map((guest) => <div key={guest.id}><h4>{t(copy.forGuest, { name: guest.name || copy.thisAttendee })}</h4><blockquote>{guest.shareableReason}</blockquote></div>)}</div>
      </DetailDisclosure> : null}
      {match.evidence.length > 0 ? <DetailDisclosure icon={DocumentIcon} title={copy.evidence} meta={match.evidence.length}>
        <ul className="match-evidence">{match.evidence.map((item, index) => {
          const owner = match.guests.find((guest) => guest.id === item.guestId);
          const evidenceText = item.quote ?? Object.entries(item).filter(([key]) => key !== "guestId").map(([, value]) => value).join(" · ");
          return <li key={index}>{owner ? <span>{owner.name || text.unnamed}</span> : null}<blockquote>{evidenceText || copy.noEvidenceText}</blockquote></li>;
        })}</ul>
      </DetailDisclosure> : null}
      <DetailDisclosure icon={PeopleIcon} title={copy.otherMatches} meta={match.earlierIntroductions.length}>
        {match.earlierIntroductions.length === 0 ? <p className="match-muted">{copy.noOtherMatches}</p> : <ul className="match-related">
          {match.earlierIntroductions.map((other) => <li key={`${other.guestId}-${other.matchId}`}>
            <span>{match.guests.find((guest) => guest.id === other.guestId)?.name || copy.aGuest}<span className="match-related__with">{copy.with}</span><strong>{other.otherGuestName}</strong></span>
            <span className={`match-status-text match-status-text--${other.status}`}>{text.status[other.status]}</span>
          </li>)}
        </ul>}
      </DetailDisclosure>
      <DetailDisclosure icon={NoteIcon} title={copy.profiles} meta={t(copy.profilesMeta, { count: profileCount })}>
        <div className="match-detail-columns">{match.guests.map((guest) => <section key={guest.id}>
          <h4>{guest.name || text.unnamed}</h4>
          {guest.profile ? <ProfileBlock profile={guest.profile} /> : <p className="match-muted">{copy.noProfile}</p>}
          <dl className="match-profile-meta"><div><dt>{copy.directionalFit}</dt><dd>{guest.directionalScore}/100</dd></div><div><dt>{copy.profileVersion}</dt><dd>{guest.pinnedProfileVersion}</dd></div></dl>
          {guest.currentProfileVersion > guest.pinnedProfileVersion ? <p className="match-muted">{t(copy.editedSince, { version: guest.currentProfileVersion })}</p> : null}
        </section>)}</div>
        <p className="match-muted match-detail__source">{match.sourceRunId ? t(copy.run, { id: match.sourceRunId }) : copy.noRun}</p>
      </DetailDisclosure>
    </div>
  </div>;
}
