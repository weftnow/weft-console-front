"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PeopleIcon } from "@/shared/ui/icons";
import { EmptyState } from "@/shared/ui/empty-state";
import { Surface } from "@/shared/ui/surface";
import { ConsoleDialog } from "@/shared/ui/console-dialog";
import { formatRelativeActivity } from "@/modules/events/event-record";
import { eventMatchKey, eventMatchesKey, fetchEventMatch, fetchEventMatches } from "../queries/matches";
import {
  MATCHES_SUBTITLE, describeSync, emptyMatchesCopy, introductionPathHints, introductionPathLabels,
  revocationReasonCopy, statusLabels,
} from "../matches-copy";
import type { MatchDetailDto, MatchListDto, MatchStatus, MatchSummaryDto } from "../matches-schemas";

type Filter = MatchStatus | "all";
const FILTERS: { id: Filter; label: string }[] = [{ id: "all", label: "All" }, { id: "active", label: "Active" }, { id: "revoked", label: "Revoked" }];

function StatusPill({ match }: { match: Pick<MatchSummaryDto, "status" | "revocationReason"> }) {
  return <span className={`status-pill match-pill match-pill--${match.status}`}>{statusLabels[match.status]}</span>;
}

function GuestLine({ guest }: { guest: MatchSummaryDto["guests"][number] }) {
  const detail = [guest.jobPosition, guest.company].filter(Boolean).join(" · ");
  return (
    <div className="match-guest">
      <strong>{guest.name || "Unnamed guest"}</strong>
      {detail ? <span>{detail}</span> : null}
    </div>
  );
}

export type MatchesViewProps = {
  list: MatchListDto;
  filter: Filter;
  onFilter: (filter: Filter) => void;
  onOpen: (matchId: string) => void;
  onRetry: () => void;
};

export function MatchesList({ list, filter, onFilter, onOpen }: MatchesViewProps) {
  const total = list.counts.active + list.counts.revoked;
  const visible = list.matches.filter((match) => filter === "all" || match.status === filter);
  const syncNote = describeSync(list.sync);
  const empty = emptyMatchesCopy(filter, total);
  return (
    <>
      {syncNote ? <p className="match-sync-note" role="status">{syncNote}</p> : null}
      {total > 0 ? (
        <div className="match-toolbar" role="group" aria-label="Filter matches by status">
          {FILTERS.map(({ id, label }) => (
            <button aria-pressed={filter === id} className="match-filter" key={id} onClick={() => onFilter(id)} type="button">
              {label}<span>{id === "all" ? total : list.counts[id]}</span>
            </button>
          ))}
        </div>
      ) : null}
      {visible.length === 0 ? (
        <EmptyState icon={PeopleIcon} size="panel" title={empty.title} description={empty.description} />
      ) : (
        <div className="table-scroll">
          <table className="event-table match-table" role="table">
            <caption className="sr-only">Matches selected for this event</caption>
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col">Pair</th><th scope="col">Introduction</th><th scope="col">Why they were selected</th><th scope="col">Status</th><th className="match-actions-heading" scope="col">Details</th>
              </tr>
            </thead>
            <tbody className="table-body-well" role="rowgroup" data-depth="inset">
              {visible.map((match) => {
                const names = `${match.guests[0].name} and ${match.guests[1].name}`;
                return (
                  <tr key={match.id} role="row" data-status={match.status}>
                    <td className="match-pair-cell" role="cell"><GuestLine guest={match.guests[0]} /><GuestLine guest={match.guests[1]} /></td>
                    <td data-label="Introduction" role="cell"><span title={introductionPathHints[match.introductionPath]}>{introductionPathLabels[match.introductionPath]}</span></td>
                    <td data-label="Why" role="cell" className="match-reason-cell">{match.reasonPreview ?? <span className="table-empty">No reason recorded</span>}</td>
                    <td data-label="Status" role="cell">
                      <StatusPill match={match} />
                      {match.revocationReason ? <span className="match-reason-note">{revocationReasonCopy[match.revocationReason]}</span> : null}
                    </td>
                    <td className="match-actions-cell" role="cell">
                      <button aria-label={`View match details for ${names}`} className="event-text-action" onClick={() => onOpen(match.id)} type="button">View details</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function MatchesPanelView(props: { body: React.ReactNode; summary: string | null }) {
  return (
    <Surface as="section" className="panel table-panel roster-panel match-panel" depth="raised" aria-labelledby="matches-title">
      <div className="panel-heading">
        <div className="section-head">
          <PeopleIcon className="section-head__icon" height="19" width="19" />
          <div>
            <h2 className="panel-title" id="matches-title">Matches</h2>
            <p className="panel-subtitle">{MATCHES_SUBTITLE}</p>
            {props.summary ? <p className="match-summary">{props.summary}</p> : null}
          </div>
        </div>
      </div>
      <div aria-live="polite">{props.body}</div>
    </Surface>
  );
}

function ProfileBlock({ profile }: { profile: NonNullable<MatchDetailDto["guests"][number]["profile"]> }) {
  const rows = ([["Summary", profile.summary], ["Goals", profile.goals], ["Offers", profile.offers], ["Wants to meet", profile.desiredConnections], ["Background", profile.background]] as [string, string | null][])
    .flatMap(([label, value]) => (value ? [[label, value] as [string, string]] : []));
  if (rows.length === 0) return <p className="match-muted">No profile details saved yet.</p>;
  return <dl className="match-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

/** Everything the organizer needs to judge a pair. Contact details are never shown. */
export function MatchDetailView({ match }: { match: MatchDetailDto }) {
  return (
    <div className="match-detail">
      <div className="match-detail__meta">
        <StatusPill match={match} />
        <span>{introductionPathLabels[match.introductionPath]}</span>
        <span>Pair score {match.pairScore}/100</span>
        <span>Selected {formatRelativeActivity(match.createdAt)}</span>
      </div>
      {match.revocationReason ? (
        <p className="match-revoked-note" role="note"><strong>Revoked.</strong> {revocationReasonCopy[match.revocationReason]}</p>
      ) : null}
      <p className="match-muted">{introductionPathHints[match.introductionPath]} This is an automatic selection: no guest has been asked or has agreed to anything.</p>
      <div className="match-detail__guests">
        {match.guests.map((guest) => (
          <section aria-labelledby={`match-guest-${guest.id}`} className="match-detail__guest" key={guest.id}>
            <h3 id={`match-guest-${guest.id}`}>{guest.name || "Unnamed guest"}</h3>
            <p className="match-muted">{[guest.jobPosition, guest.company].filter(Boolean).join(" · ") || "No role or company"} · {guest.guestType}{guest.participation === "excluded" ? " · Excluded from networking" : ""}</p>
            <h4>Why this helps {guest.name.split(" ")[0] || "them"}</h4>
            <p>{guest.benefit ?? <span className="match-muted">No reason recorded.</span>}</p>
            {guest.shareableReason ? <><h4>What can be shared with them</h4><p>{guest.shareableReason}</p></> : null}
            {guest.missingInformation.length > 0 ? <><h4>Missing information</h4><ul>{guest.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul></> : null}
            <h4>Profile</h4>
            {guest.profile ? <ProfileBlock profile={guest.profile} /> : <p className="match-muted">No profile saved.</p>}
            <p className="match-muted">
              Selected using profile version {guest.pinnedProfileVersion}
              {guest.currentProfileVersion > guest.pinnedProfileVersion ? `; profile edited since (now version ${guest.currentProfileVersion})` : ""}. Fit {guest.directionalScore}/100.
            </p>
          </section>
        ))}
      </div>
      <section aria-labelledby="match-uncertainty"><h4 id="match-uncertainty">Uncertainty</h4><p>{match.uncertainty || <span className="match-muted">None noted.</span>}</p></section>
      {match.evidence.length > 0 ? (
        <section aria-labelledby="match-evidence"><h4 id="match-evidence">Supporting evidence</h4>
          <ul>{match.evidence.map((item, index) => <li key={index}>{item.quote ?? Object.values(item).join(" · ")}</li>)}</ul>
        </section>
      ) : null}
      <section aria-labelledby="match-restrictions"><h4 id="match-restrictions">Restrictions</h4>
        {match.restrictions.length === 0 ? <p className="match-muted">Neither guest has a do-not-match pair.</p> : (
          <ul>{match.restrictions.map((r, index) => {
            const owner = match.guests.find((guest) => guest.id === r.guestId)?.name ?? "A guest";
            return <li key={index}>{owner} shouldn’t be matched with {r.otherGuestName}{r.reason ? ` — ${r.reason}` : ""}</li>;
          })}</ul>
        )}
      </section>
      <section aria-labelledby="match-earlier"><h4 id="match-earlier">Earlier introductions at this event</h4>
        {match.earlierIntroductions.length === 0 ? <p className="match-muted">Neither guest has another match in this event.</p> : (
          <ul>{match.earlierIntroductions.map((e) => {
            const owner = match.guests.find((guest) => guest.id === e.guestId)?.name ?? "A guest";
            return <li key={e.matchId}>{owner} with {e.otherGuestName} · {statusLabels[e.status].toLowerCase()}</li>;
          })}</ul>
        )}
      </section>
      <p className="match-muted match-detail__source">{match.sourceRunId ? `Matching run ${match.sourceRunId}` : "Not tied to a matching run"}</p>
    </div>
  );
}

function MatchDetailDialog({ eventId, matchId, onClose }: { eventId: string; matchId: string | null; onClose: () => void }) {
  const query = useQuery({
    queryKey: eventMatchKey(eventId, matchId ?? "none"),
    queryFn: () => fetchEventMatch(eventId, matchId!),
    enabled: matchId !== null, retry: false,
  });
  const title = query.data ? `${query.data.guests[0].name} and ${query.data.guests[1].name}` : "Match details";
  let body;
  if (query.data) body = <MatchDetailView match={query.data} />;
  else if (query.isError) body = <p className="match-muted" role="alert">{query.error.message} <button className="event-text-action" onClick={() => void query.refetch()} type="button">Try again</button></p>;
  else body = <p className="match-muted">Loading match…</p>;
  return <ConsoleDialog open={matchId !== null} onClose={onClose} title={title} description="Why this pair was selected. Nothing here is a guest decision.">{body}</ConsoleDialog>;
}

export function MatchesPanel({ eventId }: { eventId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useQuery({ queryKey: eventMatchesKey(eventId), queryFn: () => fetchEventMatches(eventId), retry: false, refetchInterval: 30_000 });
  const retry = () => void query.refetch();
  let body;
  if (query.data) body = <MatchesList list={query.data} filter={filter} onFilter={setFilter} onOpen={setOpenId} onRetry={retry} />;
  else if (query.isError) body = <p className="match-muted" role="alert">Matches couldn’t be loaded. <button className="event-text-action" onClick={retry} type="button">Try again</button></p>;
  else body = <p className="match-muted">Loading matches…</p>;
  const counts = query.data?.counts;
  return (
    <>
      <MatchesPanelView body={body} summary={counts ? `${counts.active} active · ${counts.revoked} revoked` : null} />
      <MatchDetailDialog eventId={eventId} matchId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
