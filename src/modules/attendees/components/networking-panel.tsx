"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon, CloseIcon, SearchIcon, TrashIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { ApplicationError } from "@/shared/lib/application-error";
import type { SavedEventGuestRecord } from "@/modules/events/event-record";
import { deleteMatchBlock, submitMatchBlock } from "../mutations/match-blocks";
import { StaleParticipationError, submitGuestNetworking } from "../mutations/update-networking";
import { EXCLUSION_REASONS, EXCLUSION_REASON_LABELS } from "../networking-schemas";
import type { ExclusionReason, MatchBlockDto, ParticipationDto } from "../networking-schemas";

const MAX_SUGGESTIONS = 6;

type Props = {
  eventId: string;
  guest: SavedEventGuestRecord;
  guests: SavedEventGuestRecord[];
  blocks: MatchBlockDto[];
  onClose: () => void;
  onBusyChange?: (busy: boolean) => void;
  onChanged: () => void | Promise<void>;
};

function guestName(guest: Pick<SavedEventGuestRecord, "firstName" | "lastName">) {
  return `${guest.firstName} ${guest.lastName}`.trim() || "Unnamed guest";
}

function describeState(state: Pick<ParticipationDto, "status" | "reason">) {
  return state.status === "excluded" && state.reason
    ? `Excluded: ${EXCLUSION_REASON_LABELS[state.reason]}`
    : state.status === "excluded" ? "Excluded" : "Included";
}

export function NetworkingPanel({ eventId, guest, guests, blocks, onClose, onChanged, onBusyChange }: Props) {
  const [reason, setReason] = useState<ExclusionReason | "">("");
  const [pending, setPending] = useState(false);
  useEffect(() => { onBusyChange?.(pending); }, [pending, onBusyChange]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [latest, setLatest] = useState<ParticipationDto | null>(null);
  const [search, setSearch] = useState("");

  const byId = useMemo(() => new Map(guests.map((entry) => [entry.id, entry])), [guests]);
  const guestBlocks = blocks.filter((block) => block.guestIds.includes(guest.id));
  const blockedIds = new Set(guestBlocks.flatMap((block) => block.guestIds));
  const needle = search.trim().toLowerCase();
  const suggestions = needle
    ? guests.filter((entry) => entry.id !== guest.id && !blockedIds.has(entry.id)
      && [guestName(entry), entry.email, entry.company].join(" ").toLowerCase().includes(needle)).slice(0, MAX_SUGGESTIONS)
    : [];
  const excluded = guest.networking.status === "excluded";

  async function run(operation: () => Promise<string>) {
    if (pending) return;
    setPending(true);
    setError("");
    setNotice("");
    setLatest(null);
    try {
      setNotice(await operation());
      try { await onChanged(); }
      catch { setNotice("Saved; refresh to load the updated roster."); }
    } catch (failure) {
      if (failure instanceof StaleParticipationError) {
        setLatest(failure.latest);
        setError("Someone else changed this guest.");
        try { await onChanged(); } catch { /* the notice below still shows the saved state */ }
      } else if (failure instanceof ApplicationError) {
        setError(failure.fields ? Object.values(failure.fields)[0] ?? failure.message : failure.message);
      } else setError("The change could not be saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  const changeParticipation = () => run(async () => {
    const next = excluded
      ? { status: "included" as const, expectedVersion: guest.networking.version }
      : { status: "excluded" as const, reason: reason as ExclusionReason, expectedVersion: guest.networking.version };
    await submitGuestNetworking(eventId, guest.id, next);
    setReason("");
    return excluded ? "Guest restored to the matching pool." : "Guest excluded from matching.";
  });

  return (
    <Surface className="attendee-import-panel networking-panel" depth="inset" aria-labelledby="networking-panel-title">
      <div className="attendee-import-panel__heading">
        <div>
          <h3 id="networking-panel-title">Networking for {guestName(guest)}</h3>
          <p>Excluded guests stay on the roster but are not matched. Saved changes apply to future matching.</p>
        </div>
        <TactileButton aria-label="Close networking panel" iconOnly disabled={pending} onClick={onClose}><CloseIcon height="15" width="15" /></TactileButton>
      </div>

      <div className="networking-panel__section">
        <strong>Participation</strong>
        <p>{describeState(guest.networking)}</p>
        {excluded ? (
          <TactileButton disabled={pending} onClick={() => void changeParticipation()}>{pending ? "Saving…" : "Restore to matching"}</TactileButton>
        ) : (
          <div className="networking-panel__row">
            <label className="roster-filter">
              <span className="sr-only">Exclusion reason</span>
              <select disabled={pending} onChange={(input) => setReason(input.target.value as ExclusionReason | "")} value={reason}>
                <option value="">Choose a reason…</option>
                {EXCLUSION_REASONS.map((value) => <option key={value} value={value}>{EXCLUSION_REASON_LABELS[value]}</option>)}
              </select><ChevronDownIcon className="roster-filter__chevron" />
            </label>
            <TactileButton disabled={pending || !reason} onClick={() => void changeParticipation()}>{pending ? "Saving…" : "Exclude from matching"}</TactileButton>
          </div>
        )}
      </div>

      <div className="networking-panel__section">
        <strong>Do not match with</strong>
        {guestBlocks.length === 0 ? <p>No restrictions for this guest.</p> : (
          <ul className="networking-panel__list">
            {guestBlocks.map((block) => {
              const otherId = block.guestIds.find((id) => id !== guest.id) ?? block.guestIds[0];
              const other = byId.get(otherId);
              return (
                <li key={block.id}>
                  <span>{other ? guestName(other) : "Unknown guest"}{other?.company ? ` · ${other.company}` : ""}</span>
                  <button aria-label={`Remove restriction with ${other ? guestName(other) : "guest"}`} disabled={pending} onClick={() => void run(async () => { await deleteMatchBlock(eventId, block.id); return "Restriction removed."; })} type="button">
                    <TrashIcon height="14" width="14" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <label className="search-field search-field--compact">
          <SearchIcon height="15" width="15" />
          <input aria-label="Search guests to add a restriction" disabled={pending} onChange={(input) => setSearch(input.target.value)} placeholder="Search guests to avoid matching…" type="search" value={search} />
        </label>
        {suggestions.length > 0 ? (
          <ul className="networking-panel__list">
            {suggestions.map((entry) => (
              <li key={entry.id}>
                <span>{guestName(entry)}{entry.company ? ` · ${entry.company}` : ""}</span>
                <TactileButton disabled={pending} onClick={() => void run(async () => {
                  await submitMatchBlock(eventId, { guestIds: [guest.id, entry.id] });
                  setSearch("");
                  return `${guestName(entry)} will not be matched with ${guestName(guest)}.`;
                })}>Add</TactileButton>
              </li>
            ))}
          </ul>
        ) : needle ? <p>No other guests match this search.</p> : null}
      </div>

      {error ? <p className="upload-error" role="alert">{error}{latest ? ` Latest saved state: ${describeState(latest)}.` : ""}</p> : null}
      {notice ? <div aria-live="polite" className="roster-notice" role="status"><CheckIcon height="15" width="15" /> <span>{notice}</span></div> : null}
    </Surface>
  );
}
