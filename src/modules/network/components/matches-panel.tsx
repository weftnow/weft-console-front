"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PeopleIcon } from "@/shared/ui/icons";
import { EmptyState } from "@/shared/ui/empty-state";
import { Surface } from "@/shared/ui/surface";
import { ConsoleDialog } from "@/shared/ui/console-dialog";
import { eventMatchKey, eventMatchesKey, fetchEventMatch, fetchEventMatches, type MatchListOptions } from "../queries/matches";
import {
  MATCHES_SUBTITLE, describeSync, emptyMatchesCopy, introductionPathHints, introductionPathLabels,
  revocationReasonCopy, statusLabels,
} from "../matches-copy";
import type { MatchListDto, MatchStatus, MatchSummaryDto } from "../matches-schemas";
import { MatchDetailLoader, MatchDetailView } from "./match-detail-view";

export { MatchDetailView };

type Filter = MatchStatus | "all";
type IntroductionFilter = "all" | "sms_coordination" | "wefter";
const FILTERS: { id: Filter; label: string }[] = [{ id: "all", label: "All" }, { id: "active", label: "Active" }, { id: "revoked", label: "Revoked" }];
const INTRODUCTION_FILTERS: { id: IntroductionFilter; label: string }[] = [
  { id: "all", label: "All introduction methods" },
  { id: "sms_coordination", label: introductionPathLabels.sms_coordination },
  { id: "wefter", label: introductionPathLabels.wefter },
];

function StatusPill({ match }: { match: Pick<MatchSummaryDto, "status" | "revocationReason"> }) {
  return <span className={`status-pill match-pill match-pill--${match.status}`}>{statusLabels[match.status]}</span>;
}

export type MatchesViewProps = {
  list: MatchListDto;
  filter: Filter;
  search?: string;
  introductionPath?: IntroductionFilter;
  onFilter: (filter: Filter) => void;
  onSearch?: (search: string) => void;
  onIntroductionPath?: (path: IntroductionFilter) => void;
  onPage?: (page: number) => void;
  onOpen: (matchId: string) => void;
};

function countText(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

export function MatchesList({ list, filter, search = "", introductionPath = "all", onFilter, onSearch = () => {}, onIntroductionPath = () => {}, onPage = () => {}, onOpen }: MatchesViewProps) {
  const totalMatches = list.counts.active + list.counts.revoked;
  const { page, pageSize, total } = list.pagination ?? { page: 1, pageSize: 25, total: list.matches.length };
  const visible = list.matches.filter((match) => filter === "all" || match.status === filter);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const syncNote = describeSync(list.sync);
  const empty = search ? { title: "No matches found", description: "Search matches by attendee or company, or clear your search." } : emptyMatchesCopy(filter, totalMatches);
  return (
    <>
      {syncNote ? <p className="match-sync-note" role="status">{syncNote}</p> : null}
      <div className="match-browse-controls">
        <label className="match-search-label" htmlFor="match-search">Search matches by attendee or company</label>
        <input id="match-search" className="match-search" type="search" value={search} maxLength={200} placeholder="Search matches by attendee or company" onChange={(event) => onSearch(event.target.value)} />
        <label className="sr-only" htmlFor="match-introduction">Filter by introduction method</label>
        <select id="match-introduction" className="match-introduction-filter" value={introductionPath} onChange={(event) => onIntroductionPath(event.target.value as IntroductionFilter)}>
          {INTRODUCTION_FILTERS.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      {totalMatches > 0 ? (
        <div className="match-toolbar" role="group" aria-label="Filter matches by status">
          {FILTERS.map(({ id, label }) => (
            <button aria-pressed={filter === id} className="match-filter" key={id} onClick={() => onFilter(id)} type="button">
              {label}<span>{countText(id === "all" ? totalMatches : list.counts[id])}</span>
            </button>
          ))}
        </div>
      ) : null}
      {visible.length === 0 ? (
        <>
          <EmptyState icon={PeopleIcon} size="panel" title={empty.title} description={empty.description} />
          {search ? <p className="match-result-count">0 matches</p> : null}
        </>
      ) : (
        <div className="table-scroll">
          <table className="event-table match-table" role="table">
            <caption className="sr-only">Matches selected for this event</caption>
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col">Attendee</th><th scope="col">Matched with</th><th scope="col">Introduction</th><th scope="col">Why they were selected</th>
                {filter === "all" ? <th scope="col">Status</th> : null}<th className="match-actions-heading" scope="col">Details</th>
              </tr>
            </thead>
            <tbody className="table-body-well" role="rowgroup" data-depth="inset">
              {visible.map((match) => <MatchRow key={match.id} match={match} showStatus={filter === "all"} onOpen={onOpen} />)}
            </tbody>
          </table>
        </div>
      )}
      <div className="match-pagination" aria-label="Match result pages">
        <span className="match-result-count">{countText(first)}–{countText(last)} of {countText(total)} matches</span>
        <div>
          <button className="event-text-action" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
          <span aria-live="polite">Page {page} of {pageCount}</span>
          <button className="event-text-action" type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Next</button>
        </div>
      </div>
    </>
  );
}

function MatchRow({ match, showStatus, onOpen }: { match: MatchSummaryDto; showStatus: boolean; onOpen: (id: string) => void }) {
  const [attendee, other] = match.guests;
  const names = `${attendee.name} and ${other.name}`;
  return <tr key={match.id} role="row" data-status={match.status}>
    <td data-label="Attendee" role="cell"><strong>{attendee.name || "Unnamed guest"}</strong></td>
    <td data-label="Matched with" role="cell"><strong>{other.name || "Unnamed guest"}</strong></td>
    <td data-label="Introduction" role="cell"><span title={introductionPathHints[match.introductionPath]}>{introductionPathLabels[match.introductionPath]}</span></td>
    <td data-label="Why" role="cell" className="match-reason-cell">{match.reasonPreview ?? <span className="table-empty">No reason recorded</span>}</td>
    {showStatus ? <td data-label="Status" role="cell"><StatusPill match={match} />{match.revocationReason ? <span className="match-reason-note">{revocationReasonCopy[match.revocationReason]}</span> : null}</td> : null}
    <td className="match-actions-cell" role="cell"><button aria-haspopup="dialog" aria-label={`View match details for ${names}`} className="event-text-action" onClick={() => onOpen(match.id)} type="button">View details</button></td>
  </tr>;
}

export function MatchesPanelView(props: { body: React.ReactNode; summary: string | null; simulated?: boolean }) {
  return (
    <Surface as="section" className="panel table-panel roster-panel match-panel" data-simulated={props.simulated ? "true" : undefined} depth="raised" aria-labelledby="matches-title">
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
  else body = <MatchDetailLoader />;
  return <ConsoleDialog open={matchId !== null} onClose={onClose} title={title} description="Why this pair was selected. Nothing here is a guest decision.">{body}</ConsoleDialog>;
}

export function MatchesPanel({ eventId }: { eventId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [introductionPath, setIntroductionPath] = useState<IntroductionFilter>("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const options: MatchListOptions = { status: filter, search, introductionPath, page };
  const query = useQuery({ queryKey: eventMatchesKey(eventId, options), queryFn: () => fetchEventMatches(eventId, fetch, options), retry: false,
    refetchInterval: (current) => (current.state.data?.simulated ? 5_000 : 30_000),
  });
  const retry = () => void query.refetch();
  const changeFilter = (value: Filter) => { setFilter(value); setPage(1); };
  const changeSearch = (value: string) => { setSearch(value); setPage(1); };
  const changeIntroductionPath = (value: IntroductionFilter) => { setIntroductionPath(value); setPage(1); };
  let body;
  if (query.data) body = <MatchesList list={query.data} filter={filter} search={search} introductionPath={introductionPath} onSearch={changeSearch} onFilter={changeFilter} onIntroductionPath={changeIntroductionPath} onPage={setPage} onOpen={setOpenId} />;
  else if (query.isError) body = <p className="match-muted" role="alert">Matches couldn’t be loaded. <button className="event-text-action" onClick={retry} type="button">Try again</button></p>;
  else body = <p className="match-muted">Loading matches…</p>;
  const counts = query.data?.counts;
  return (
    <>
      <MatchesPanelView body={body} simulated={query.data?.simulated === true} summary={counts ? `${countText(counts.active)} active · ${countText(counts.revoked)} revoked` : null} />
      <MatchDetailDialog eventId={eventId} matchId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
