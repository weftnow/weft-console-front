"use client";

import { useMemo, useState } from "react";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  PeopleIcon,
  SearchIcon,
  SortIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { AttendeeImportPanel } from "./attendee-import-panel";
import type { EventGuestRecord, EventGuestType, EventRecord } from "../event-record";

const PAGE_SIZE = 25;
const GUEST_TYPES: EventGuestType[] = ["VIP", "Sponsor", "Attendee"];

type SortKey = "name" | "company" | "profileType";

const SORT_LABELS: Record<SortKey, string> = {
  company: "Company",
  name: "Guest",
  profileType: "Profile type",
};

function fullName(guest: EventGuestRecord) {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

function sortValue(guest: EventGuestRecord, key: SortKey) {
  if (key === "name") return `${guest.lastName} ${guest.firstName}`.trim().toLowerCase();
  return guest[key].toLowerCase();
}

/** Prefix a bare linkedin.com/in/... path so it resolves as an absolute URL. */
function linkedinHref(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function SortableHeader({
  active,
  direction,
  onSort,
  sortKey,
}: {
  active: boolean;
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
        type="button"
      >
        {SORT_LABELS[sortKey]}
        <SortIcon height="11" width="11" />
      </button>
    </th>
  );
}

function RosterEmpty({
  action,
  detail,
  title,
}: {
  action?: { label: string; onClick: () => void };
  detail: string;
  title: string;
}) {
  return (
    <div className="roster-empty">
      <Surface className="roster-empty__icon" depth="inset"><PeopleIcon height="22" width="22" /></Surface>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action ? (
        <TactileButton className="roster-empty__action" onClick={action.onClick}>{action.label}</TactileButton>
      ) : null}
    </div>
  );
}

export function AttendeeRoster({ event, onImportSaved }: { event: EventRecord; onImportSaved: () => void | Promise<void> }) {
  const [query, setQuery] = useState("");
  const [guestType, setGuestType] = useState<EventGuestType | "all">("all");
  const [profileType, setProfileType] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [importOpen, setImportOpen] = useState(false);

  const guests = event.attendees.guests;
  const latestImport = event.attendees.imports[0];

  const profileTypes = useMemo(
    () => [...new Set(guests.map((guest) => guest.profileType).filter(Boolean))].sort(),
    [guests],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = guests.filter((guest) => {
      if (guestType !== "all" && guest.guestType !== guestType) return false;
      if (profileType !== "all" && guest.profileType !== profileType) return false;
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
  }, [direction, guestType, guests, profileType, query, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const filtersActive = query.trim() !== "" || guestType !== "all" || profileType !== "all";

  const clearFilters = () => {
    setQuery("");
    setGuestType("all");
    setProfileType("all");
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
                ? "No guest records on this event yet."
                : `${guests.length.toLocaleString()} ${guests.length === 1 ? "guest" : "guests"} on the roster${latestImport ? ` · latest import ${latestImport.fileName}` : ""}`}
            </p>
          </div>
        </div>
        <div className="panel-controls roster-controls">
            {guests.length > 0 ? <>
            <label className="search-field search-field--compact">
              <SearchIcon height="15" width="15" />
              <input
                aria-label="Search attendees"
                onChange={(input) => {
                  setQuery(input.target.value);
                  setPage(0);
                }}
                placeholder="Search name, company, phone…"
                type="search"
                value={query}
              />
            </label>
            <label className="roster-filter">
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
              </label>
            ) : null}
            </> : null}
            <TactileButton aria-expanded={importOpen} onClick={() => setImportOpen(true)} variant="primary">Import CSV</TactileButton>
        </div>
      </div>

      {importOpen ? (
        <AttendeeImportPanel
          eventId={event.id}
          existingGuests={guests}
          hasActiveFilters={filtersActive}
          onCancel={() => setImportOpen(false)}
          onClearFilters={clearFilters}
          onSaved={onImportSaved}
        />
      ) : null}

      {event.attendees.importCount > 0 ? (
        <section className="attendee-import-history" aria-label="Latest attendee imports">
          <div className="attendee-import-history__heading">
            <strong>Latest imports</strong>
            <span>{event.attendees.importCount > event.attendees.imports.length ? `Showing ${event.attendees.imports.length} of ${event.attendees.importCount}` : `${event.attendees.importCount} total`}</span>
          </div>
          <ul>
            {event.attendees.imports.map((batch) => (
              <li key={batch.id}>
                <span className="attendee-import-history__file">{batch.fileName}</span>
                <time dateTime={batch.importedAt}>{new Date(batch.importedAt).toLocaleString()}</time>
                <span>{batch.storedCount.toLocaleString()} added · {batch.duplicateCount.toLocaleString()} skipped</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {guests.length === 0 ? (
        <RosterEmpty
          action={{ label: "Import CSV", onClick: () => setImportOpen(true) }}
          detail="Append attendees from a CSV. Existing event emails are skipped and their records are preserved."
          title="No attendees yet"
        />
      ) : filtered.length === 0 ? (
        <RosterEmpty
          action={{ label: "Clear filters", onClick: clearFilters }}
          detail="No guest on this roster matches the current search and filters."
          title="No matching attendees"
        />
      ) : (
        <>
          <div className="table-scroll">
            <table className="event-table roster-table">
              <thead>
                <tr>
                  <SortableHeader active={sortKey === "name"} direction={direction} onSort={onSort} sortKey="name" />
                  <th scope="col">Phone</th>
                  <SortableHeader active={sortKey === "company"} direction={direction} onSort={onSort} sortKey="company" />
                  <th scope="col">Position</th>
                  <SortableHeader active={sortKey === "profileType"} direction={direction} onSort={onSort} sortKey="profileType" />
                  <th scope="col">Guest type</th>
                  <th scope="col">LinkedIn</th>
                </tr>
              </thead>
              <tbody className="table-body-well" data-depth="inset">
                {visible.map((guest) => (
                  <tr key={guest.id}>
                    <td>
                      <div className="roster-guest">
                        <strong>{fullName(guest) || "Unnamed guest"}</strong>
                        <span>{guest.email || "No email"}</span>
                      </div>
                    </td>
                    <td>
                      {guest.phone ? (
                        <a className="roster-link" href={`tel:${guest.phone.replace(/[^+\d]/g, "")}`}>
                          {guest.phone}
                        </a>
                      ) : (
                        <span className="table-empty">—</span>
                      )}
                    </td>
                    <td>{guest.company || <span className="table-empty">—</span>}</td>
                    <td className="cell-muted">{guest.position || <span className="table-empty">—</span>}</td>
                    <td>{guest.profileType || <span className="table-empty">—</span>}</td>
                    <td>
                      <span className={`status-pill guest-pill guest-pill--${guest.guestType.toLowerCase()}`}>
                        {guest.guestType}
                      </span>
                    </td>
                    <td>
                      {guest.linkedin ? (
                        <a
                          className="roster-link"
                          href={linkedinHref(guest.linkedin)}
                          rel="noreferrer noopener"
                          target="_blank"
                        >
                          Profile <ExternalLinkIcon height="12" width="12" />
                        </a>
                      ) : (
                        <span className="table-empty">—</span>
                      )}
                    </td>
                  </tr>
                ))}
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
    </Surface>
  );
}
