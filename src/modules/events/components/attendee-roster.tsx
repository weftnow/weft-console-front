"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  PeopleIcon,
  SearchIcon,
  SortIcon,
} from "@/shared/ui/icons";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { EmptyState } from "@/shared/ui/empty-state";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { ConsoleDialog } from "@/shared/ui/console-dialog";
import { NetworkingPanel } from "@/modules/attendees/components/networking-panel";
import { ProfilePanel } from "@/modules/attendees/components/profile-panel";
import { AttendeeImportPanel } from "./attendee-import-panel";
import { AttendeeRecordActions } from "./attendee-record-actions";
import type { SavedEventGuestRecord, EventGuestType, EventRecord } from "../event-record";
import { attendeeContactFlags } from "../attendee-contact";

const PAGE_SIZE = 25;
const compactRosterQuery = "(max-width: 620px)";
function subscribeCompactRoster(onChange: () => void) {
  const media = window.matchMedia(compactRosterQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const isCompactRoster = () => window.matchMedia(compactRosterQuery).matches;
const serverCompactRoster = () => false;
const GUEST_TYPES: EventGuestType[] = ["VIP", "Sponsor", "Attendee"];

type SortKey = "name" | "company" | "profileType";

function fullName(guest: SavedEventGuestRecord) {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

function sortValue(guest: SavedEventGuestRecord, key: SortKey) {
  if (key === "name") return `${guest.lastName} ${guest.firstName}`.trim().toLowerCase();
  return guest[key].toLowerCase();
}

/** Prefix a bare linkedin.com/in/... path so it resolves as an absolute URL. */
function linkedinHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function SortableHeader({
  active,
  compact,
  direction,
  onSort,
  sortKey,
}: {
  active: boolean;
  compact: boolean;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
  sortKey: SortKey;
}) {
  const { dict } = useI18n();
  return (
    <th aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"} scope="col">
      <button
        className="sortable roster-sort"
        data-active={active}
        onClick={() => onSort(sortKey)}
        tabIndex={compact ? -1 : undefined}
        type="button"
      >
        {dict.events.roster.sort[sortKey]}
        <SortIcon height="11" width="11" />
      </button>
    </th>
  );
}

function ImportHistory({ event }: { event: EventRecord }) {
  const { dict, plural, number, date, t } = useI18n();
  const copy = dict.events.roster.history;
  if (!event.attendees.importCount) return null;
  return <details className="attendee-import-history">
    <summary><span><strong>{copy.heading}</strong><span>{plural(copy.count, event.attendees.importCount)}</span></span><ChevronDownIcon height="15" width="15" /></summary>
    <ul aria-label={copy.latest}>{event.attendees.imports.map((batch) => <li key={batch.id}>
      <span className="attendee-import-history__file" title={batch.fileName}>{batch.fileName}</span>
      <time dateTime={batch.importedAt}>{date(batch.importedAt, { month: "short", day: "numeric", year: "numeric" })}</time>
      <span>{t(copy.summary, { added: number(batch.storedCount), skipped: number(batch.duplicateCount) })}</span>
    </li>)}</ul>
    {event.attendees.importCount > event.attendees.imports.length ? <p>{t(copy.showingLatest, { count: event.attendees.imports.length })}</p> : null}
  </details>;
}

export function AttendeeRoster({ event, onRosterChanged }: { event: EventRecord; onRosterChanged: () => void | Promise<void> }) {
  const i18n = useI18n();
  const { dict, plural, number, t } = i18n;
  const copy = dict.events.roster;
  const compact = useSyncExternalStore(subscribeCompactRoster, isCompactRoster, serverCompactRoster);
  const [query, setQuery] = useState("");
  const [guestType, setGuestType] = useState<EventGuestType | "all">("all");
  const [profileType, setProfileType] = useState("all");
  const [networking, setNetworking] = useState<"all" | "included" | "excluded">("all");
  const [missingProfile, setMissingProfile] = useState<"all" | "goals" | "background" | "linkedin">("all");
  const [panelBusy, setPanelBusy] = useState(false);
  const [panel, setPanel] = useState<{ kind: "networking" | "profile"; guestId: string } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [importOpen, setImportOpen] = useState(false);

  const guests = event.attendees.guests;
  const identityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const guest of guests) counts.set(guest.personId, (counts.get(guest.personId) ?? 0) + 1);
    return counts;
  }, [guests]);
  const peopleCount = identityCounts.size;
  const excludedCount = guests.filter((guest) => guest.networking.status === "excluded").length;
  const panelGuest = panel ? guests.find((guest) => guest.id === panel.guestId) : undefined;

  const profileTypes = useMemo(
    () => [...new Set(guests.map((guest) => guest.profileType).filter(Boolean))].sort(),
    [guests],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = guests.filter((guest) => {
      if (guestType !== "all" && guest.guestType !== guestType) return false;
      if (profileType !== "all" && guest.profileType !== profileType) return false;
      if (networking !== "all" && guest.networking.status !== networking) return false;
      if (missingProfile !== "all" && guest.profile.completeness[missingProfile] === "available") return false;
      if (!needle) return true;
      return [fullName(guest), guest.email, guest.phone, guest.company, guest.position]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });

    return matches.sort((a, b) => {
      const result = sortValue(a, sortKey).localeCompare(sortValue(b, sortKey));
      return direction === "asc" ? result : -result;
    });
  }, [direction, guestType, guests, networking, missingProfile, profileType, query, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const filtersActive = query.trim() !== "" || guestType !== "all" || profileType !== "all" || networking !== "all" || missingProfile !== "all";

  const clearFilters = () => {
    setQuery("");
    setGuestType("all");
    setProfileType("all");
    setNetworking("all");
    setMissingProfile("all");
    setPage(0);
  };

  const onSort = (key: SortKey) => {
    setDirection(sortKey === key && direction === "asc" ? "desc" : "asc");
    setSortKey(key);
    setPage(0);
  };

  return (
    <Surface as="section" className="panel table-panel roster-panel" depth="raised" aria-labelledby="roster-title">
      <div className="panel-heading">
        <div className="section-head">
          <PeopleIcon className="section-head__icon" height="19" width="19" />
          <div>
            <h2 className="panel-title" id="roster-title">{copy.heading}</h2>
            <p className="panel-subtitle">
              {guests.length === 0
                ? copy.empty
                : peopleCount === guests.length
                  ? plural(copy.attendeeCount, peopleCount, { count: number(peopleCount) })
                  : plural(copy.peopleRecords, peopleCount, { people: number(peopleCount), records: number(guests.length) })}
              {guests.length ? <span className="roster-networking-counts">{t(copy.networkingCounts, { included: guests.length - excludedCount, excluded: excludedCount })}</span> : null}
            </p>
          </div>
        </div>
        {event.attendees.canManage && guests.length > 0 ? <TactileButton className="roster-import-action" aria-expanded={importOpen} onClick={() => setImportOpen(true)} variant="primary">{copy.importCsv}</TactileButton> : null}
      </div>

      {guests.length > 0 ? <div className="roster-toolbar" role="search" aria-label={copy.filterLabel}>
            <label className="search-field search-field--compact">
              <SearchIcon height="15" width="15" />
              <input
                aria-label={copy.search}
                onChange={(input) => {
                  setQuery(input.target.value);
                  setPage(0);
                }}
                placeholder={copy.searchPlaceholder}
                type="search"
                value={query}
              />
            </label>
            <div className="roster-toolbar__filters"><label className="roster-filter">
              <span className="sr-only">{copy.filterGuestType}</span>
              <select
                onChange={(input) => {
                  setGuestType(input.target.value as EventGuestType | "all");
                  setPage(0);
                }}
                value={guestType}
              >
                <option value="all">{copy.allGuestTypes}</option>
                {GUEST_TYPES.map((type) => <option key={type} value={type}>{dict.events.guestTypes[type]}</option>)}
              </select>
              <ChevronDownIcon className="roster-filter__chevron" />
            </label>
            {profileTypes.length > 0 ? (
              <label className="roster-filter">
                <span className="sr-only">{copy.filterProfileType}</span>
                <select
                  onChange={(input) => {
                    setProfileType(input.target.value);
                    setPage(0);
                  }}
                  value={profileType}
                >
                  <option value="all">{copy.allProfiles}</option>
                  {profileTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <ChevronDownIcon className="roster-filter__chevron" />
              </label>
            ) : null}
            <label className="roster-filter">
              <span className="sr-only">{copy.filterNetworking}</span>
              <select value={networking} onChange={(input) => { setNetworking(input.target.value as typeof networking); setPage(0); }}>
                <option value="all">{copy.allNetworking}</option><option value="included">{copy.included}</option><option value="excluded">{copy.excluded}</option>
              </select><ChevronDownIcon className="roster-filter__chevron" />
            </label>
            <label className="roster-filter roster-filter--details">
              <span className="sr-only">{copy.filterMissing}</span>
              <select value={missingProfile} onChange={(input) => { setMissingProfile(input.target.value as typeof missingProfile); setPage(0); }}>
                <option value="all">{copy.allDetails}</option><option value="goals">{copy.missingGoals}</option><option value="background">{copy.missingBackground}</option><option value="linkedin">{copy.missingLinkedin}</option>
              </select><ChevronDownIcon className="roster-filter__chevron" />
            </label>
            <label className="roster-filter roster-mobile-sort">
              <span className="sr-only">{copy.sortLabel}</span>
              <select value={`${sortKey}:${direction}`} onChange={(input) => {
                const [key, order] = input.target.value.split(":") as [SortKey, "asc" | "desc"];
                setSortKey(key); setDirection(order); setPage(0);
              }}>
                {(Object.keys(copy.sortOptions) as (keyof typeof copy.sortOptions)[]).map((option) => <option key={option} value={option}>{copy.sortOptions[option]}</option>)}
              </select>
              <ChevronDownIcon className="roster-filter__chevron" />
            </label>
            {filtersActive ? <button className="event-text-action" type="button" onClick={clearFilters}>{copy.clearFilters}</button> : null}</div>
      </div> : null}

      {importOpen && event.attendees.canManage ? (
        <AttendeeImportPanel
          eventId={event.id}
          existingGuests={guests}
          hasActiveFilters={filtersActive}
          onCancel={() => setImportOpen(false)}
          onClearFilters={clearFilters}
          onSaved={onRosterChanged}
        />
      ) : null}

      {event.attendees.canManage ? <ConsoleDialog open={!!panelGuest} busy={panelBusy} onClose={() => setPanel(null)} title={panel?.kind === "profile" ? copy.panelProfile : copy.panelNetworking} description={panelGuest ? fullName(panelGuest) : undefined}>
        {panelGuest ? panel?.kind === "profile" ? <ProfilePanel key={panelGuest.id} eventId={event.id} guest={panelGuest} onBusyChange={setPanelBusy} onChanged={onRosterChanged} onClose={() => setPanel(null)} /> : <NetworkingPanel key={panelGuest.id} eventId={event.id} guest={panelGuest} onBusyChange={setPanelBusy} guests={guests} blocks={event.attendees.matchBlocks} onChanged={onRosterChanged} onClose={() => setPanel(null)} /> : null}
      </ConsoleDialog> : null}

      {guests.length === 0 ? (
        <EmptyState
          action={event.attendees.canManage && !importOpen ? <TactileButton onClick={() => setImportOpen(true)} variant="primary">{copy.importCsv}</TactileButton> : undefined}
          description={event.attendees.canManage ? copy.uploadHint : copy.notAddedYet}
          icon={PeopleIcon}
          title={copy.noAttendees}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          action={<TactileButton onClick={clearFilters}>{copy.showAll}</TactileButton>}
          description={copy.noMatchesDescription}
          icon={PeopleIcon}
          title={copy.noMatches}
        />
      ) : (
        <>
          <div className="table-scroll">
            <table className={`event-table roster-table ${event.attendees.canManage ? "" : "roster-table--readonly"}`} role="table">
              <caption className="sr-only">{t(copy.caption, { name: event.name })}</caption>
              <colgroup><col className="roster-col-person" /><col className="roster-col-company" /><col className="roster-col-profile" /><col className="roster-col-type" />{event.attendees.canManage ? <col className="roster-col-actions" /> : null}</colgroup>
              <thead>
                <tr>
                  <SortableHeader compact={compact} active={sortKey === "name"} direction={direction} onSort={onSort} sortKey="name" />
                  <SortableHeader compact={compact} active={sortKey === "company"} direction={direction} onSort={onSort} sortKey="company" />
                  <SortableHeader compact={compact} active={sortKey === "profileType"} direction={direction} onSort={onSort} sortKey="profileType" />
                  <th scope="col">{copy.guestType}</th>
                  {event.attendees.canManage ? <th className="roster-actions-heading" scope="col">{copy.actions}</th> : null}
                </tr>
              </thead>
              <tbody className="table-body-well" role="rowgroup" data-depth="inset">
                {visible.map((guest) => {
                  const flags = attendeeContactFlags(guest.email, guest.phone);
                  const linkedCount = (identityCounts.get(guest.personId) ?? 1) - 1;
                  const profileDetails = ([['goals', copy.detailGoals], ['background', copy.detailBackground], ['linkedin', copy.detailLinkedin]] as const)
                    .map(([key, label]) => ({ label, state: guest.profile.completeness[key] }));
                  const availableDetails = profileDetails.filter((detail) => detail.state === "available").length;
                  const profileDescription = profileDetails.map(({ label, state }) => `${label}: ${copy.detailState[state]}`).join(" · ");
                  return <tr key={guest.id} role="row">
                    <td className="roster-person-cell" role="cell">
                      <div className="roster-guest">
                        <div className="roster-guest__name"><strong>{fullName(guest) || copy.unnamed}</strong>{guest.linkedin ? <a className="roster-profile-link" href={linkedinHref(guest.linkedin)} rel="noreferrer noopener" target="_blank" aria-label={t(copy.linkedinProfile, { name: fullName(guest) || copy.unnamedShort })}><ExternalLinkIcon height="14" width="14" /></a> : null}</div>
                        <span className={flags.email === "invalid" ? "roster-contact-warning" : ""} title={guest.email || undefined}>{guest.email || copy.noEmail}{flags.email === "invalid" ? ` · ${copy.checkFormat}` : ""}</span>
                        {guest.phone ? flags.phone === "invalid" ? <span className="roster-contact-warning">{guest.phone} · {copy.checkFormat}</span> : <a className="roster-phone" href={`tel:${guest.phone.replace(/[^+\d]/g, "")}`}>{guest.phone}</a> : <span className="roster-contact-missing">{copy.noPhone}</span>}
                        {linkedCount ? <span className="attendee-linked-label">{plural(copy.linkedWith, linkedCount)}</span> : null}
                      </div>
                    </td>
                    <td className="roster-company-cell" role="cell" data-label={copy.company}><div className="roster-company"><strong title={guest.company || undefined}>{guest.company || <span className="table-empty">{copy.notAdded}</span>}</strong>{guest.position ? <span title={guest.position}>{guest.position}</span> : null}</div></td>
                    <td className="roster-profile-cell" role="cell" data-label={copy.profile}>
                      <div className="roster-profile">
                        <span>{guest.profileType || <span className="table-empty">{copy.notSet}</span>}</span>
                        {event.attendees.canManage ? <button className="roster-profile__summary" title={profileDescription} aria-label={t(copy.editProfile, { name: fullName(guest) || copy.unnamedShort, available: availableDetails, description: profileDescription })} onClick={() => setPanel({ kind: "profile", guestId: guest.id })} type="button">
                          <span>{t(copy.detailsSummary, { available: availableDetails })}</span><ArrowRightIcon height="12" width="12" />
                        </button> : null}
                      </div>
                    </td>
                    <td className="roster-type-cell" role="cell">
                      <div className="roster-badges">
                      <span className={`status-pill guest-pill guest-pill--${guest.guestType.toLowerCase()}`}>
                        {dict.events.guestTypes[guest.guestType]}
                      </span>
                      {event.attendees.canManage ? <span className={`status-pill networking-pill networking-pill--${guest.networking.status}`} title={guest.networking.reason ? dict.attendees.exclusionReasons[guest.networking.reason] : undefined}>{guest.networking.status === "excluded" ? copy.statusExcluded : copy.statusIncluded}</span> : null}
                      </div>
                    </td>
                    {event.attendees.canManage ? <td className="attendee-actions-cell" role="cell">
                      <AttendeeRecordActions canManage={event.attendees.canManage} eventId={event.id} guest={guest} guests={guests} onSaved={onRosterChanged} onEditProfile={() => setPanel({ kind: "profile", guestId: guest.id })} onNetworking={() => setPanel({ kind: "networking", guestId: guest.id })} />
                    </td> : null}
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>
              {t(copy.showingRange, { from: number(currentPage * PAGE_SIZE + 1), to: number(currentPage * PAGE_SIZE + visible.length), total: number(filtered.length) })}
              {filtersActive ? t(copy.showingMatching, { total: number(guests.length) }) : ""}
            </span>
            {pageCount > 1 ? (
              <nav aria-label={copy.pagination} className="pagination">
                <TactileButton
                  aria-label={copy.previous}
                  className="page-button"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ArrowLeftIcon height="15" width="15" />
                </TactileButton>
                <span className="roster-page-count">{t(copy.pageOf, { page: currentPage + 1, count: pageCount })}</span>
                <TactileButton
                  aria-label={copy.next}
                  className="page-button"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ArrowRightIcon height="15" width="15" />
                </TactileButton>
              </nav>
            ) : null}
          </div>
        </>
      )}
      <ImportHistory event={event} />
    </Surface>
  );
}
