"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CloseIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { ApplicationError } from "@/shared/lib/application-error";
import type { SavedEventGuestRecord } from "@/modules/events/event-record";
import { StaleProfileError, submitGuestProfile } from "../mutations/update-profile";
import { profileCompleteness, profilePresence, shareableSummary } from "../profile-completeness";
import { ORGANIZER_ONLY_FIELDS, PROFILE_FIELDS, PROFILE_FIELD_LABELS, PROFILE_FIELD_LIMITS, normalizeOrganizerOnly } from "../profile-schemas";
import type { OrganizerOnlyFieldKey, ProfileCompleteness, ProfileDto, ProfileFieldKey, ProfileFields } from "../profile-schemas";
import { fetchGuestProfile } from "../queries/guest-profile";

type Props = {
  eventId: string;
  guest: SavedEventGuestRecord;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
};

type Draft = { fields: Record<ProfileFieldKey, string>; organizerOnly: OrganizerOnlyFieldKey[] };

const COMPLETENESS_LABELS: { key: keyof ProfileCompleteness; label: string }[] = [
  { key: "goals", label: "Goals" },
  { key: "background", label: "Background" },
  { key: "linkedin", label: "LinkedIn details" },
  { key: "offers", label: "Offers" },
  { key: "desiredConnections", label: "Desired connections" },
];

const COMPLETENESS_STATE: Record<ProfileCompleteness[keyof ProfileCompleteness], string> = {
  available: "Available",
  missing: "Missing",
  url_only: "URL only, details not supplied",
};

function guestName(guest: Pick<SavedEventGuestRecord, "firstName" | "lastName">) {
  return `${guest.firstName} ${guest.lastName}`.trim() || "Unnamed guest";
}

function toDraft(profile: ProfileDto): Draft {
  return {
    fields: Object.fromEntries(PROFILE_FIELDS.map((key) => [key, profile.fields[key] ?? ""])) as Draft["fields"],
    organizerOnly: [...profile.organizerOnly],
  };
}

/** What the server would store for this draft: trimmed text, blank as unknown. */
function toFields(draft: Draft): ProfileFields {
  return Object.fromEntries(PROFILE_FIELDS.map((key) => [key, draft.fields[key].trim() || null])) as ProfileFields;
}

function describeSaved(profile: ProfileDto) {
  return profile.version === 0 ? "No profile saved yet." : `Last saved v${profile.version}${profile.savedBy ? ` by ${profile.savedBy}` : ""}${profile.savedAt ? ` on ${new Date(profile.savedAt).toLocaleString()}` : ""}.`;
}

export function ProfilePanel({ eventId, guest, onClose, onChanged }: Props) {
  const [saved, setSaved] = useState<ProfileDto | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  /** The version the next save is based on. After a conflict the user may rebase onto the latest version. */
  const [baseVersion, setBaseVersion] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [latest, setLatest] = useState<ProfileDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGuestProfile(eventId, guest.id).then((read) => {
      if (cancelled) return;
      setSaved(read.profile);
      setDraft(toDraft(read.profile));
      setBaseVersion(read.profile.version);
    }).catch((failure: unknown) => {
      if (!cancelled) setLoadError(failure instanceof ApplicationError ? failure.message : "The profile could not be loaded. Try again.");
    });
    return () => { cancelled = true; };
  }, [eventId, guest.id]);

  const organizerOnly = draft ? normalizeOrganizerOnly(draft.organizerOnly) : [];
  const fields = draft ? toFields(draft) : null;
  const dirty = Boolean(saved && draft && fields && (
    PROFILE_FIELDS.some((key) => fields[key] !== saved.fields[key])
    || organizerOnly.length !== saved.organizerOnly.length
    || organizerOnly.some((key, index) => key !== saved.organizerOnly[index])
  ));
  const completeness = fields ? profileCompleteness(guest, profilePresence(fields)) : null;
  const preview = fields ? shareableSummary({ fields, organizerOnly }) : null;

  function setField(key: ProfileFieldKey, value: string) {
    setDraft((current) => current && { ...current, fields: { ...current.fields, [key]: value } });
  }

  function setHidden(key: OrganizerOnlyFieldKey, hidden: boolean) {
    setDraft((current) => current && {
      ...current,
      organizerOnly: hidden ? [...current.organizerOnly.filter((entry) => entry !== key), key] : current.organizerOnly.filter((entry) => entry !== key),
    });
  }

  async function save() {
    if (pending || !draft || !fields) return;
    setPending(true);
    setError("");
    setNotice("");
    setLatest(null);
    try {
      const read = await submitGuestProfile(eventId, guest.id, { fields, organizerOnly, expectedVersion: baseVersion });
      setSaved(read.profile);
      setDraft(toDraft(read.profile));
      setBaseVersion(read.profile.version);
      setNotice("Profile saved. Matching will use this version.");
      try { await onChanged(); }
      catch { setNotice("Saved; refresh to load the updated roster."); }
    } catch (failure) {
      if (failure instanceof StaleProfileError) {
        setLatest(failure.latest);
        setError("Someone else changed this profile.");
      } else if (failure instanceof ApplicationError) {
        setError(failure.fields ? Object.values(failure.fields)[0] ?? failure.message : failure.message);
      } else setError("The profile could not be saved. Try again.");
    } finally {
      setPending(false);
    }
  }

  function useLatest() {
    if (!latest) return;
    setSaved(latest);
    setDraft(toDraft(latest));
    setBaseVersion(latest.version);
    setLatest(null);
    setError("");
    void Promise.resolve(onChanged()).catch(() => undefined);
  }

  function keepMine() {
    if (!latest) return;
    setSaved(latest);
    setBaseVersion(latest.version);
    setLatest(null);
    setError("");
    setNotice("Your edits are now based on the latest version. Save to apply them.");
  }

  return (
    <Surface className="attendee-import-panel networking-panel profile-panel" depth="inset" aria-labelledby="profile-panel-title">
      <div className="attendee-import-panel__heading">
        <div>
          <h3 id="profile-panel-title">Profile for {guestName(guest)}</h3>
          <p>Missing information does not stop matching. Saved changes update matching automatically.</p>
        </div>
        <TactileButton aria-label="Close profile panel" iconOnly onClick={onClose}><CloseIcon height="15" width="15" /></TactileButton>
      </div>

      {loadError ? <p className="upload-error" role="alert">{loadError}</p> : null}
      {!draft && !loadError ? <p aria-live="polite">Loading profile…</p> : null}

      {draft && saved && completeness && preview ? (
        <>
          <p className="profile-panel__saved">{describeSaved(saved)}</p>

          <div className="networking-panel__section">
            <strong>What matching has</strong>
            <ul className="networking-panel__list profile-panel__completeness">
              {COMPLETENESS_LABELS.map(({ key, label }) => (
                <li key={key}>
                  <span>{label}</span>
                  <span className={`status-pill profile-pill profile-pill--${completeness[key]}`}>{COMPLETENESS_STATE[completeness[key]]}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="profile-panel__fields">
            {PROFILE_FIELDS.map((key) => {
              const id = `profile-${guest.id}-${key}`;
              const canHide = key !== "summary";
              return (
                <div className="event-field" key={key}>
                  <label htmlFor={id}>{PROFILE_FIELD_LABELS[key]}</label>
                  <div className="textarea-wrap">
                    <textarea
                      className="event-control event-textarea profile-panel__textarea"
                      disabled={pending}
                      id={id}
                      maxLength={PROFILE_FIELD_LIMITS[key]}
                      onChange={(input) => setField(key, input.target.value)}
                      rows={key === "summary" ? 2 : 3}
                      value={draft.fields[key]}
                    />
                    <span>{draft.fields[key].length}/{PROFILE_FIELD_LIMITS[key]}</span>
                  </div>
                  {canHide ? (
                    <label className="profile-panel__private">
                      <input
                        checked={draft.organizerOnly.includes(key)}
                        disabled={pending}
                        onChange={(input) => setHidden(key, input.target.checked)}
                        type="checkbox"
                      />
                      Organizer only: kept out of the shareable summary, still used for matching
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="networking-panel__section">
            <strong>Shareable summary preview</strong>
            {preview.summary || preview.details.length > 0 ? (
              <>
                {preview.summary ? <p>{preview.summary}</p> : null}
                <dl className="profile-panel__summary">
                  {preview.details.map((detail) => (
                    <div key={detail.key}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>
                  ))}
                </dl>
              </>
            ) : <p>Nothing to share yet.</p>}
            {organizerOnly.length > 0 ? <p>Organizer only: {organizerOnly.map((key) => PROFILE_FIELD_LABELS[key]).join(", ")}.</p> : null}
          </div>

          <div className="networking-panel__row">
            <TactileButton disabled={pending || !dirty} onClick={() => void save()} variant="primary">{pending ? "Saving…" : "Save profile"}</TactileButton>
            <TactileButton disabled={pending || !dirty} onClick={() => { setDraft(toDraft(saved)); setError(""); setNotice(""); setLatest(null); }}>Discard changes</TactileButton>
          </div>
        </>
      ) : null}

      {error ? (
        <div role="alert">
          <p className="upload-error">{error}</p>
          {latest ? (
            <div className="networking-panel__section profile-panel__latest">
              <strong>Latest saved version</strong>
              <p>{describeSaved(latest)}</p>
              <dl className="profile-panel__summary">
                {ORGANIZER_ONLY_FIELDS.filter((key) => latest.fields[key]).map((key) => (
                  <div key={key}><dt>{PROFILE_FIELD_LABELS[key]}{latest.organizerOnly.includes(key) ? " (organizer only)" : ""}</dt><dd>{latest.fields[key]}</dd></div>
                ))}
              </dl>
              <div className="networking-panel__row">
                <TactileButton onClick={useLatest}>Load latest into the form</TactileButton>
                <TactileButton onClick={keepMine}>Keep my edits on top of it</TactileButton>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {notice ? <div aria-live="polite" className="roster-notice" role="status"><CheckIcon height="15" width="15" /> <span>{notice}</span></div> : null}
    </Surface>
  );
}
