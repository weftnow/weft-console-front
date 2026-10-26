"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { PeopleIcon } from "@/shared/ui/icons";
import { EmptyState } from "@/shared/ui/empty-state";
import { Surface } from "@/shared/ui/surface";
import { ConsoleDialog } from "@/shared/ui/console-dialog";
import { eventMatchKey, eventMatchesKey, fetchEventMatch, fetchEventMatches, type MatchListOptions } from "../queries/matches";
import { describeSync, emptyMatchesCopy } from "../matches-copy";
import type { MatchListDto, MatchStatus, MatchSummaryDto } from "../matches-schemas";
import { MatchDetailLoader, MatchDetailView } from "./match-detail-view";

export { MatchDetailView };

type Filter = MatchStatus | "all";
type IntroductionFilter = "all" | "sms_coordination" | "wefter";
const FILTERS: Filter[] = ["all", "active", "revoked"];
const INTRODUCTION_FILTERS: IntroductionFilter[] = ["all", "sms_coordination", "wefter"];

function StatusPill({ match }: { match: Pick<MatchSummaryDto, "status" | "revocationReason"> }) {
  const { dict } = useI18n();
  return <span className={`status-pill match-pill match-pill--${match.status}`}>{dict.network.matches.status[match.status]}</span>;
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

export function MatchesList({ list, filter, search = "", introductionPath = "all", onFilter, onSearch = () => {}, onIntroductionPath = () => {}, onPage = () => {}, onOpen }: MatchesViewProps) {
  const i18n = useI18n();
  const { dict, t } = i18n;
  const copy = dict.network.matches;
  const countText = i18n.number;
  const totalMatches = list.counts.active + list.counts.revoked;
  const { page, pageSize, total } = list.pagination ?? { page: 1, pageSize: 25, total: list.matches.length };
  const visible = list.matches.filter((match) => filter === "all" || match.status === filter);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const syncNote = describeSync(i18n, list.sync);
  const empty = search ? { title: copy.empty.searchTitle, description: copy.empty.searchDescription } : emptyMatchesCopy(i18n, filter, totalMatches);
  return (
    <>
      {syncNote ? <p className="match-sync-note" role="status">{syncNote}</p> : null}
      <div className="match-browse-controls">
        <label className="match-search-label" htmlFor="match-search">{copy.searchLabel}</label>
        <input id="match-search" className="match-search" type="search" value={search} maxLength={200} placeholder={copy.searchLabel} onChange={(event) => onSearch(event.target.value)} />
        <label className="sr-only" htmlFor="match-introduction">{copy.filterMethod}</label>
        <select id="match-introduction" className="match-introduction-filter" value={introductionPath} onChange={(event) => onIntroductionPath(event.target.value as IntroductionFilter)}>
          {INTRODUCTION_FILTERS.map((id) => <option key={id} value={id}>{id === "all" ? copy.filters.allMethods : copy.introPaths[id].label}</option>)}
        </select>
      </div>
      {totalMatches > 0 ? (
        <div className="match-toolbar" role="group" aria-label={copy.filterStatus}>
          {FILTERS.map((id) => (
            <button aria-pressed={filter === id} className="match-filter" key={id} onClick={() => onFilter(id)} type="button">
              {copy.filters[id]}<span>{countText(id === "all" ? totalMatches : list.counts[id])}</span>
            </button>
          ))}
        </div>
      ) : null}
      {visible.length === 0 ? (
        <>
          <EmptyState icon={PeopleIcon} size="panel" title={empty.title} description={empty.description} />
          {search ? <p className="match-result-count">{copy.zeroMatches}</p> : null}
        </>
      ) : (
        <div className="table-scroll">
          <table className="event-table match-table" role="table">
            <caption className="sr-only">{copy.caption}</caption>
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col">{copy.columns.attendee}</th><th scope="col">{copy.columns.matchedWith}</th><th scope="col">{copy.columns.introduction}</th><th scope="col">{copy.columns.why}</th>
                {filter === "all" ? <th scope="col">{copy.columns.status}</th> : null}<th className="match-actions-heading" scope="col">{copy.columns.details}</th>
              </tr>
            </thead>
            <tbody className="table-body-well" role="rowgroup" data-depth="inset">
              {visible.map((match) => <MatchRow key={match.id} match={match} showStatus={filter === "all"} onOpen={onOpen} />)}
            </tbody>
          </table>
        </div>
      )}
      <div className="match-pagination" aria-label={copy.pagesLabel}>
        <span className="match-result-count">{t(copy.range, { from: countText(first), to: countText(last), total: countText(total) })}</span>
        <div>
          <button className="event-text-action" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>{copy.previous}</button>
          <span aria-live="polite">{t(copy.pageOf, { page, count: pageCount })}</span>
          <button className="event-text-action" type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>{copy.next}</button>
        </div>
      </div>
    </>
  );
}

function MatchRow({ match, showStatus, onOpen }: { match: MatchSummaryDto; showStatus: boolean; onOpen: (id: string) => void }) {
  const { dict, t } = useI18n();
  const copy = dict.network.matches;
  const [attendee, other] = match.guests;
  const names = t(copy.names, { a: attendee.name, b: other.name });
  return <tr key={match.id} role="row" data-status={match.status}>
    <td data-label={copy.columns.attendee} role="cell"><strong>{attendee.name || copy.unnamed}</strong></td>
    <td data-label={copy.columns.matchedWith} role="cell"><strong>{other.name || copy.unnamed}</strong></td>
    <td data-label={copy.columns.introduction} role="cell"><span title={copy.introPaths[match.introductionPath].hint}>{copy.introPaths[match.introductionPath].label}</span></td>
    <td data-label={copy.columns.why} role="cell" className="match-reason-cell">{match.reasonPreview ?? <span className="table-empty">{copy.noReason}</span>}</td>
    {showStatus ? <td data-label={copy.columns.status} role="cell"><StatusPill match={match} />{match.revocationReason ? <span className="match-reason-note">{copy.revocation[match.revocationReason]}</span> : null}</td> : null}
    <td className="match-actions-cell" role="cell"><button aria-haspopup="dialog" aria-label={t(copy.viewFor, { names })} className="event-text-action" onClick={() => onOpen(match.id)} type="button">{copy.viewDetails}</button></td>
  </tr>;
}

export function MatchesPanelView(props: { body: React.ReactNode; summary: string | null; simulated?: boolean }) {
  const copy = useI18n().dict.network.matches;
  return (
    <Surface as="section" className="panel table-panel roster-panel match-panel" data-simulated={props.simulated ? "true" : undefined} depth="raised" aria-labelledby="matches-title">
      <div className="panel-heading">
        <div className="section-head">
          <PeopleIcon className="section-head__icon" height="19" width="19" />
          <div>
            <h2 className="panel-title" id="matches-title">{copy.heading}</h2>
            <p className="panel-subtitle">{copy.subtitle}</p>
            {props.summary ? <p className="match-summary">{props.summary}</p> : null}
          </div>
        </div>
      </div>
      <div aria-live="polite">{props.body}</div>
    </Surface>
  );
}

function MatchDetailDialog({ eventId, matchId, onClose }: { eventId: string; matchId: string | null; onClose: () => void }) {
  const { dict, t } = useI18n();
  const copy = dict.network.matches;
  const query = useQuery({
    queryKey: eventMatchKey(eventId, matchId ?? "none"),
    queryFn: () => fetchEventMatch(eventId, matchId!),
    enabled: matchId !== null, retry: false,
  });
  const title = query.data ? t(copy.names, { a: query.data.guests[0].name, b: query.data.guests[1].name }) : copy.detailsTitle;
  let body;
  if (query.data) body = <MatchDetailView match={query.data} />;
  else if (query.isError) body = <p className="match-muted" role="alert">{query.error.message} <button className="event-text-action" onClick={() => void query.refetch()} type="button">{copy.retry}</button></p>;
  else body = <MatchDetailLoader />;
  return <ConsoleDialog open={matchId !== null} onClose={onClose} title={title} description={copy.detailsDescription}>{body}</ConsoleDialog>;
}

export function MatchesPanel({ eventId }: { eventId: string }) {
  const i18n = useI18n();
  const copy = i18n.dict.network.matches;
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
  else if (query.isError) body = <p className="match-muted" role="alert">{copy.loadFailed} <button className="event-text-action" onClick={retry} type="button">{copy.retry}</button></p>;
  else body = <p className="match-muted">{copy.loading}</p>;
  const counts = query.data?.counts;
  return (
    <>
      <MatchesPanelView body={body} simulated={query.data?.simulated === true} summary={counts ? i18n.t(copy.summary, { active: i18n.number(counts.active), revoked: i18n.number(counts.revoked) }) : null} />
      <MatchDetailDialog eventId={eventId} matchId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
