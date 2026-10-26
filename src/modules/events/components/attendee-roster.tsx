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
import { EmptyState } from "@/shared/ui/empty-state";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { ConsoleDialog } from "@/shared/ui/console-dialog";
import { NetworkingPanel } from "@/modules/attendees/components/networking-panel";
import { ProfilePanel } from "@/modules/attendees/components/profile-panel";
import { EXCLUSION_REASON_LABELS } from "@/modules/attendees/networking-schemas";
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

const SORT_LABELS: Record<SortKey, string> = {
  company: "Company",
  name: "Attendee",
  profileType: "Profile type",
};

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
  return (
    <th aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"} scope="col">
      <button
        className="sortable roster-sort"
        data-active={active}
        onClick={() => onSort(sortKey)}
        tabIndex={compact ? -1 : undefined}
        type="button"
      >
        {SORT_LABELS[sortKey]}
        <SortIcon height="11" width="11" />
      </button>
    </th>
  );
}

function ImportHistory({ event }: { event: EventRecord }) {
  if (!event.attendees.importCount) return null;
  return <details className="attendee-import-history">
    <summary><span><strong>Import history</strong><span>{event.attendees.importCount} {event.attendees.importCount === 1 ? "import" : "imports"}</span></span><ChevronDownIcon height="15" width="15" /></summary>
    <ul aria-label="Latest attendee imports">{event.attendees.imports.map((batch) => <li key={batch.id}>
      <span className="attendee-import-history__file" title={batch.fileName}>{batch.fileName}</span>
      <time dateTime={batch.importedAt}>{new Date(batch.importedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</time>
      <span>{batch.storedCount.toLocaleString()} added · {batch.duplicateCount.toLocaleString()} skipped</span>
    </li>)}</ul>
    {event.attendees.importCount > event.attendees.imports.length ? <p>Showing the latest {event.attendees.imports.length} imports.</p> : null}
  </details>;
}

export function AttendeeRoster({ event, onRosterChanged }: { event: EventRecord; onRosterChanged: () => void | Promise<void> }) {
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
            <h2 className="panel-title" id="roster-title">Attendees</h2>
            <p className="panel-subtitle">
              {guests.length === 0
                ? "Your event’s guest list."
                : peopleCount === guests.length
                  ? `${peopleCount.toLocaleString()} ${peopleCount === 1 ? "attendee" : "attendees"}`
                  : `${peopleCount.toLocaleString()} ${peopleCount === 1 ? "person" : "people"} · ${guests.length.toLocaleString()} attendee records`}
              {guests.length ? <span className="roster-networking-counts">{guests.length - excludedCount} included · {excludedCount} excluded</span> : null}
            </p>
          </div>
        </div>
        {event.attendees.canManage && guests.length > 0 ? <TactileButton className="roster-import-action" aria-expanded={importOpen} onClick={() => setImportOpen(true)} variant="primary">Import CSV</TactileButton> : null}
      </div>

      {guests.length > 0 ? <div className="roster-toolbar" role="search" aria-label="Filter attendees">
            <label className="search-field search-field--compact">
              <SearchIcon height="15" width="15" />
              <input
                aria-label="Search attendees"
                onChange={(input) => {
                  setQuery(input.target.value);
                  setPage(0);
                }}
                placeholder="Search attendees…"
                type="search"
                value={query}
              />
            </label>
            <div className="roster-toolbar__filters"><label className="roster-filter">
              <span className="sr-only">Filter by guest type</span>
              <select
                onChange={(input) => {
                  setGuestType(input.target.value as EventGuestType | "all");
                  setPage(0);
                }}
                value={guestType}
              >
                <option value="all">All guest types</option>
                {GUEST_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <ChevronDownIcon className="roster-filter__chevron" />
            </label>
            {profileTypes.length > 0 ? (
              <label className="roster-filter">
                <span className="sr-only">Filter by profile type</span>
                <select
                  onChange={(input) => {
                    setProfileType(input.target.value);
                    setPage(0);
                  }}
                  value={profileType}
                >
                  <option value="all">All profiles</option>
                  {profileTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <ChevronDownIcon className="roster-filter__chevron" />
              </label>
            ) : null}
            <label className="roster-filter">
              <span className="sr-only">Filter by networking status</span>
              <select value={networking} onChange={(input) => { setNetworking(input.target.value as typeof networking); setPage(0); }}>
                <option value="all">All networking</option><option value="included">Included</option><option value="excluded">Excluded</option>
              </select><ChevronDownIcon className="roster-filter__chevron" />
            </label>
            <label className="roster-filter roster-filter--details">
              <span className="sr-only">Filter by missing profile information</span>
              <select value={missingProfile} onChange={(input) => { setMissingProfile(input.target.value as typeof missingProfile); setPage(0); }}>
                <option value="all">All profile details</option><option value="goals">Missing goals</option><option value="background">Missing background</option><option value="linkedin">Missing LinkedIn details</option>
              </select><ChevronDownIcon className="roster-filter__chevron" />
            </label>
            <label className="roster-filter roster-mobile-sort">
              <span className="sr-only">Sort attendees</span>
              <select value={`${sortKey}:${direction}`} onChange={(input) => {
                const [key, order] = input.target.value.split(":") as [SortKey, "asc" | "desc"];
                setSortKey(key); setDirection(order); setPage(0);
              }}>
                <option value="name:asc">Last name: A–Z</option><option value="name:desc">Last name: Z–A</option>
                <option value="company:asc">Company: A–Z</option><option value="company:desc">Company: Z–A</option>
                <option value="profileType:asc">Profile: A–Z</option><option value="profileType:desc">Profile: Z–A</option>
              </select>
              <ChevronDownIcon className="roster-filter__chevron" />
            </label>
            {filtersActive ? <button className="event-text-action" type="button" onClick={clearFilters}>Clear filters</button> : null}</div>
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

      {event.attendees.canManage ? <ConsoleDialog open={!!panelGuest} busy={panelBusy} onClose={() => setPanel(null)} title={panel?.kind === "profile" ? "Attendee profile" : "Networking"} description={panelGuest ? fullName(panelGuest) : undefined}>
        {panelGuest ? panel?.kind === "profile" ? <ProfilePanel key={panelGuest.id} eventId={event.id} guest={panelGuest} onBusyChange={setPanelBusy} onChanged={onRosterChanged} onClose={() => setPanel(null)} /> : <NetworkingPanel key={panelGuest.id} eventId={event.id} guest={panelGuest} onBusyChange={setPanelBusy} guests={guests} blocks={event.attendees.matchBlocks} onChanged={onRosterChanged} onClose={() => setPanel(null)} /> : null}
      </ConsoleDialog> : null}

      {guests.length === 0 ? (
        <EmptyState
          action={event.attendees.canManage && !importOpen ? <TactileButton onClick={() => setImportOpen(true)} variant="primary">Import CSV</TactileButton> : undefined}
          description={event.attendees.canManage ? "Upload a CSV file to add attendees to this event." : "The event organizers haven’t added attendees yet."}
          icon={PeopleIcon}
          title="No attendees yet"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          action={<TactileButton onClick={clearFilters}>Show all attendees</TactileButton>}
          description="No guest on this roster matches the current search and filters."
          icon={PeopleIcon}
          title="No matching attendees"
        />
      ) : (
        <>
          <div className="table-scroll">
            <table className={`event-table roster-table ${event.attendees.canManage ? "" : "roster-table--readonly"}`} role="table">
              <caption className="sr-only">Attendees for {event.name}</caption>
              <colgroup><col className="roster-col-person" /><col className="roster-col-company" /><col className="roster-col-profile" /><col className="roster-col-type" />{event.attendees.canManage ? <col className="roster-col-actions" /> : null}</colgroup>
              <thead>
                <tr>
                  <SortableHeader compact={compact} active={sortKey === "name"} direction={direction} onSort={onSort} sortKey="name" />
                  <SortableHeader compact={compact} active={sortKey === "company"} direction={direction} onSort={onSort} sortKey="company" />
                  <SortableHeader compact={compact} active={sortKey === "profileType"} direction={direction} onSort={onSort} sortKey="profileType" />
                  <th scope="col">Guest type</th>
                  {event.attendees.canManage ? <th className="roster-actions-heading" scope="col">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="table-body-well" role="rowgroup" data-depth="inset">
                {visible.map((guest) => {
                  const flags = attendeeContactFlags(guest.email, guest.phone);
                  const linkedCount = (identityCounts.get(guest.personId) ?? 1) - 1;
                  const profileDetails = ([['goals', 'Goals'], ['background', 'Background'], ['linkedin', 'LinkedIn']] as const)
                    .map(([key, label]) => ({ label, state: guest.profile.completeness[key] }));
                  const availableDetails = profileDetails.filter((detail) => detail.state === "available").length;
                  const profileDescription = profileDetails.map(({ label, state }) => `${label}: ${state === "url_only" ? "URL only, details not supplied" : state}`).join(" · ");
                  return <tr key={guest.id} role="row">
                    <td className="roster-person-cell" role="cell">
                      <div className="roster-guest">
                        <div className="roster-guest__name"><strong>{fullName(guest) || "Unnamed attendee"}</strong>{guest.linkedin ? <a className="roster-profile-link" href={linkedinHref(guest.linkedin)} rel="noreferrer noopener" target="_blank" aria-label={`LinkedIn profile for ${fullName(guest) || "attendee"}`}><ExternalLinkIcon height="14" width="14" /></a> : null}</div>
                        <span className={flags.email === "invalid" ? "roster-contact-warning" : ""} title={guest.email || undefined}>{guest.email || "No email"}{flags.email === "invalid" ? " · Check format" : ""}</span>
                        {guest.phone ? flags.phone === "invalid" ? <span className="roster-contact-warning">{guest.phone} · Check format</span> : <a className="roster-phone" href={`tel:${guest.phone.replace(/[^+\d]/g, "")}`}>{guest.phone}</a> : <span className="roster-contact-missing">No phone</span>}
                        {linkedCount ? <span className="attendee-linked-label">Linked with {linkedCount} {linkedCount === 1 ? "other record" : "other records"}</span> : null}
                      </div>
                    </td>
                    <td className="roster-company-cell" role="cell" data-label="Company"><div className="roster-company"><strong title={guest.company || undefined}>{guest.company || <span className="table-empty">Not added</span>}</strong>{guest.position ? <span title={guest.position}>{guest.position}</span> : null}</div></td>
                    <td className="roster-profile-cell" role="cell" data-label="Profile">
                      <div className="roster-profile">
                        <span>{guest.profileType || <span className="table-empty">Not set</span>}</span>
                        {event.attendees.canManage ? <button className="roster-profile__summary" title={profileDescription} aria-label={`Edit profile for ${fullName(guest) || "attendee"}: ${availableDetails} of 3 details available. ${profileDescription}`} onClick={() => setPanel({ kind: "profile", guestId: guest.id })} type="button">
                          <span>{availableDetails} of 3 details</span><ArrowRightIcon height="12" width="12" />
                        </button> : null}
                      </div>
                    </td>
                    <td className="roster-type-cell" role="cell">
                      <div className="roster-badges">
                      <span className={`status-pill guest-pill guest-pill--${guest.guestType.toLowerCase()}`}>
                        {guest.guestType}
                      </span>
                      {event.attendees.canManage ? <span className={`status-pill networking-pill networking-pill--${guest.networking.status}`} title={guest.networking.reason ? EXCLUSION_REASON_LABELS[guest.networking.reason] : undefined}>{guest.networking.status === "excluded" ? "Excluded" : "Included"}</span> : null}
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
              Showing {(currentPage * PAGE_SIZE + 1).toLocaleString()}–
              {(currentPage * PAGE_SIZE + visible.length).toLocaleString()} of{" "}
              {filtered.length.toLocaleString()}
              {filtersActive ? ` matching ${guests.length.toLocaleString()}` : ""}
            </span>
            {pageCount > 1 ? (
              <nav aria-label="Attendee pagination" className="pagination">
                <TactileButton
                  aria-label="Previous page"
                  className="page-button"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ArrowLeftIcon height="15" width="15" />
                </TactileButton>
                <span className="roster-page-count">Page {currentPage + 1} of {pageCount}</span>
                <TactileButton
                  aria-label="Next page"
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
