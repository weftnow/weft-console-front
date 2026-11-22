"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { PeopleIcon } from "@/shared/ui/icons";
import { EmptyState } from "@/shared/ui/empty-state";
import { LoadingPlaceholder, LoadingSpinner } from "@/shared/ui/loading";
import { Surface } from "@/shared/ui/surface";
import { ConsoleDialog } from "@/shared/ui/console-dialog";
import { MatchCompletionPanel } from "@/modules/insights/components/match-completion-panel";
import { eventMatchKey, eventMatchesQueryOptions, fetchEventMatch } from "../queries/matches";
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
  list?: MatchListDto;
  filter: Filter;
  search?: string;
  introductionPath?: IntroductionFilter;
  updating?: boolean;
  refreshing?: boolean;
  onFilter: (filter: Filter) => void;
  onSearch?: (search: string) => void;
  onIntroductionPath?: (path: IntroductionFilter) => void;
  onPage?: (page: number) => void;
  onRetry?: () => void;
  onOpen: (matchId: string) => void;
};

export function MatchesList({ list, filter, search = "", introductionPath = "all", updating = false, refreshing = false, onFilter, onSearch = () => {}, onIntroductionPath = () => {}, onPage = () => {}, onRetry, onOpen }: MatchesViewProps) {
  const i18n = useI18n();
  const copy = i18n.dict.network.matches;
  const syncNote = list ? describeSync(i18n, list.sync) : null;
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
      {list ? (
        <MatchResults list={list} filter={filter} searching={search.trim() !== ""} updating={updating} refreshing={refreshing} onFilter={onFilter} onPage={onPage} onOpen={onOpen} />
      ) : onRetry ? (
        <p className="match-muted" role="alert">{copy.loadFailed} <button className="event-text-action" onClick={onRetry} type="button">{copy.retry}</button></p>
      ) : (
        <LoadingPlaceholder label={copy.loading}>
          <div className="match-toolbar">
            {FILTERS.map((id) => <span className="loading-skeleton match-filter-skeleton" key={id} />)}
          </div>
          <MatchTable showStatus={filter === "all"}>
            {[0, 1, 2].map((row) => (
              <tr className="match-row-skeleton" key={row}>
                {(filter === "all" ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 5]).map((column) => (
                  <td key={column}><span className="loading-skeleton" /></td>
                ))}
              </tr>
            ))}
          </MatchTable>
        </LoadingPlaceholder>
      )}
    </>
  );
}

function MatchTable({ children, showStatus }: { children: React.ReactNode; showStatus: boolean }) {
  const copy = useI18n().dict.network.matches;
  return (
    <div className="table-scroll">
      <table className="event-table match-table" role="table">
        <caption className="sr-only">{copy.caption}</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col">{copy.columns.attendee}</th><th scope="col">{copy.columns.matchedWith}</th><th scope="col">{copy.columns.introduction}</th><th scope="col">{copy.columns.why}</th>
            {showStatus ? <th scope="col">{copy.columns.status}</th> : null}<th className="match-actions-heading" scope="col">{copy.columns.details}</th>
          </tr>
        </thead>
        <tbody className="table-body-well" role="rowgroup" data-depth="inset">{children}</tbody>
      </table>
    </div>
  );
}

function MatchResults({ list, filter, searching, updating, refreshing, onFilter, onPage, onOpen }: {
  list: MatchListDto;
  filter: Filter;
  searching: boolean;
  updating: boolean;
  refreshing: boolean;
  onFilter: MatchesViewProps["onFilter"];
  onPage: (page: number) => void;
  onOpen: MatchesViewProps["onOpen"];
}) {
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
  const empty = searching ? { title: copy.empty.searchTitle, description: copy.empty.searchDescription } : emptyMatchesCopy(i18n, filter, totalMatches);
  return (
    <div aria-busy={updating}>
      {totalMatches > 0 ? (
        <div className="match-toolbar match-toolbar--filters" role="group" aria-label={copy.filterStatus}>
          {FILTERS.map((id) => (
            <button aria-pressed={filter === id} className="match-filter" key={id} onClick={() => onFilter(id)} type="button">
              {copy.filters[id]}<span>{countText(id === "all" ? totalMatches : list.counts[id])}</span>
            </button>
          ))}
          {refreshing ? <span className="match-refresh-indicator"><LoadingSpinner /></span> : null}
        </div>
      ) : null}
      {visible.length > 0 || searching ? (
        <MatchTable showStatus={filter === "all"}>
          {visible.map((match) => <MatchRow key={match.id} match={match} showStatus={filter === "all"} onOpen={onOpen} />)}
        </MatchTable>
      ) : null}
      {visible.length === 0 ? (
        <>
          <EmptyState icon={PeopleIcon} size="panel" title={empty.title} description={empty.description} />
          {searching ? <p className="match-result-count">{copy.zeroMatches}</p> : null}
        </>
      ) : null}
      <div className="match-pagination" aria-label={copy.pagesLabel}>
        <span aria-live="polite" className="match-result-count">{t(copy.range, { from: countText(first), to: countText(last), total: countText(total) })}</span>
        <div>
          <button className="event-text-action" type="button" disabled={updating || page <= 1} onClick={() => onPage(page - 1)}>{copy.previous}</button>
          <span aria-live="polite">{t(copy.pageOf, { page, count: pageCount })}</span>
          <button className="event-text-action" type="button" disabled={updating || page >= pageCount} onClick={() => onPage(page + 1)}>{copy.next}</button>
        </div>
      </div>
    </div>
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
      {props.body}
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
  if (query.data) {
    const outcome = matchId ? (
      <MatchCompletionPanel canConfirm={query.data.status === "active"} eventId={eventId} key={matchId} matchId={matchId} />
    ) : undefined;
    body = <MatchDetailView match={query.data} outcome={outcome} />;
  }
  else if (query.isError) body = <p className="match-muted" role="alert">{query.error.message} <button className="event-text-action" onClick={() => void query.refetch()} type="button">{copy.retry}</button></p>;
  else body = <MatchDetailLoader />;
  return <ConsoleDialog open={matchId !== null} onClose={onClose} title={title} description={copy.detailsDescription}>{body}</ConsoleDialog>;
}

export function MatchesPanel({ eventId }: { eventId: string }) {
  const i18n = useI18n();
  const copy = i18n.dict.network.matches;
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [introductionPath, setIntroductionPath] = useState<IntroductionFilter>("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const searchTerm = search.trim();
  useEffect(() => {
    if (searchTerm === debouncedSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearch]);

  const query = useQuery(eventMatchesQueryOptions(eventId, { status: filter, search: debouncedSearch, introductionPath, page }));
  const changeFilter = (value: Filter) => { setFilter(value); setPage(1); };
  const changeIntroductionPath = (value: IntroductionFilter) => { setIntroductionPath(value); setPage(1); };
  const body = (
    <MatchesList
      list={query.data}
      filter={filter}
      search={search}
      introductionPath={introductionPath}
      updating={searchTerm !== debouncedSearch || query.isPlaceholderData}
      refreshing={query.isPlaceholderData && query.isFetching}
      onSearch={setSearch}
      onFilter={changeFilter}
      onIntroductionPath={changeIntroductionPath}
      onPage={setPage}
      onRetry={query.isError ? () => void query.refetch() : undefined}
      onOpen={setOpenId}
    />
  );
  const counts = query.data?.counts;
  return (
    <>
      <MatchesPanelView body={body} simulated={query.data?.simulated === true} summary={counts ? i18n.t(copy.summary, { active: i18n.number(counts.active), revoked: i18n.number(counts.revoked) }) : null} />
      <MatchDetailDialog eventId={eventId} matchId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
