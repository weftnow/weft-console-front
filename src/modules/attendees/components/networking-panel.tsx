"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { localizeErrorCode, localizeFieldMessage } from "@/shared/i18n/field-messages";
import { CheckIcon, ChevronDownIcon, CloseIcon, SearchIcon, TrashIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { ApplicationError } from "@/shared/lib/application-error";
import type { SavedEventGuestRecord } from "@/modules/events/event-record";
import { deleteMatchBlock, submitMatchBlock } from "../mutations/match-blocks";
import { StaleParticipationError, submitGuestNetworking } from "../mutations/update-networking";
import { EXCLUSION_REASONS } from "../networking-schemas";
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


export function NetworkingPanel({ eventId, guest, guests, blocks, onClose, onChanged, onBusyChange }: Props) {
  const i18n = useI18n();
  const { dict, t } = i18n;
  const copy = dict.attendees.networking;
  const guestName = (entry: Pick<SavedEventGuestRecord, "firstName" | "lastName">) => `${entry.firstName} ${entry.lastName}`.trim() || copy.unnamed;
  const describeState = (state: Pick<ParticipationDto, "status" | "reason">) => state.status === "excluded" && state.reason
    ? t(copy.excludedReason, { reason: dict.attendees.exclusionReasons[state.reason] })
    : state.status === "excluded" ? copy.excluded : copy.included;
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
      catch { setNotice(copy.savedRefresh); }
    } catch (failure) {
      if (failure instanceof StaleParticipationError) {
        setLatest(failure.latest);
        setError(copy.stale);
        try { await onChanged(); } catch { /* the notice below still shows the saved state */ }
      } else if (failure instanceof ApplicationError) {
        setError(failure.fields ? localizeFieldMessage(i18n, Object.values(failure.fields)[0] ?? "") || localizeErrorCode(dict, failure.code) : localizeErrorCode(dict, failure.code));
      } else setError(copy.failed);
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
    return excluded ? copy.restored : copy.excludedNotice;
  });

  return (
    <Surface className="attendee-import-panel networking-panel" depth="inset" aria-labelledby="networking-panel-title">
      <div className="attendee-import-panel__heading">
        <div>
          <h3 id="networking-panel-title">{t(copy.title, { name: guestName(guest) })}</h3>
          <p>{copy.description}</p>
        </div>
        <TactileButton aria-label={copy.close} iconOnly disabled={pending} onClick={onClose}><CloseIcon height="15" width="15" /></TactileButton>
      </div>

      <div className="networking-panel__section">
        <strong>{copy.participation}</strong>
        <p>{describeState(guest.networking)}</p>
        {excluded ? (
          <TactileButton disabled={pending} onClick={() => void changeParticipation()}>{pending ? copy.saving : copy.restore}</TactileButton>
        ) : (
          <div className="networking-panel__row">
            <label className="roster-filter">
              <span className="sr-only">{copy.reasonLabel}</span>
              <select disabled={pending} onChange={(input) => setReason(input.target.value as ExclusionReason | "")} value={reason}>
                <option value="">{copy.chooseReason}</option>
                {EXCLUSION_REASONS.map((value) => <option key={value} value={value}>{dict.attendees.exclusionReasons[value]}</option>)}
              </select><ChevronDownIcon className="roster-filter__chevron" />
            </label>
            <TactileButton disabled={pending || !reason} onClick={() => void changeParticipation()}>{pending ? copy.saving : copy.exclude}</TactileButton>
          </div>
        )}
      </div>

      <div className="networking-panel__section">
        <strong>{copy.blocks}</strong>
        {guestBlocks.length === 0 ? <p>{copy.noBlocks}</p> : (
          <ul className="networking-panel__list">
            {guestBlocks.map((block) => {
              const otherId = block.guestIds.find((id) => id !== guest.id) ?? block.guestIds[0];
              const other = byId.get(otherId);
              return (
                <li key={block.id}>
                  <span>{other ? guestName(other) : copy.unknownGuest}{other?.company ? ` · ${other.company}` : ""}</span>
                  <button aria-label={t(copy.removeFor, { name: other ? guestName(other) : copy.guestFallback })} disabled={pending} onClick={() => void run(async () => { await deleteMatchBlock(eventId, block.id); return copy.removed; })} type="button">
                    <TrashIcon height="14" width="14" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <label className="search-field search-field--compact">
          <SearchIcon height="15" width="15" />
          <input aria-label={copy.searchLabel} disabled={pending} onChange={(input) => setSearch(input.target.value)} placeholder={copy.searchPlaceholder} type="search" value={search} />
        </label>
        {suggestions.length > 0 ? (
          <ul className="networking-panel__list">
            {suggestions.map((entry) => (
              <li key={entry.id}>
                <span>{guestName(entry)}{entry.company ? ` · ${entry.company}` : ""}</span>
                <TactileButton disabled={pending} onClick={() => void run(async () => {
                  await submitMatchBlock(eventId, { guestIds: [guest.id, entry.id] });
                  setSearch("");
                  return t(copy.wontMatch, { other: guestName(entry), guest: guestName(guest) });
                })}>{copy.add}</TactileButton>
              </li>
            ))}
          </ul>
        ) : needle ? <p>{copy.noSearchResults}</p> : null}
      </div>

      {error ? <p className="upload-error" role="alert">{error}{latest ? t(copy.latest, { state: describeState(latest) }) : ""}</p> : null}
      {notice ? <div aria-live="polite" className="roster-notice" role="status"><CheckIcon height="15" width="15" /> <span>{notice}</span></div> : null}
    </Surface>
  );
}
