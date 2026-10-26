"use client";

import { useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { localizeErrorCode, localizeFieldMessage } from "@/shared/i18n/field-messages";
import { CheckIcon, CloseIcon, DocumentIcon, TrashIcon, UploadIcon } from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import { ApplicationError } from "@/shared/lib/application-error";
import { GuestCsvError } from "../guest-csv-core";
import { parseGuestCsv } from "../guest-csv";
import { downloadGuestCsvTemplate } from "../guest-csv-template";
import { importSuccessMessage, refreshAfterImport, submitAttendeeImport, submitImportOnce } from "../mutations/import-attendees";
import type { SavedEventGuestRecord } from "../event-record";

type Props = {
  eventId: string;
  existingGuests: SavedEventGuestRecord[];
  hasActiveFilters: boolean;
  onCancel: () => void;
  onClearFilters: () => void;
  onSaved: () => void | Promise<void>;
};

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}

export function AttendeeImportPanel({ eventId, existingGuests, hasActiveFilters, onCancel, onClearFilters, onSaved }: Props) {
  const i18n = useI18n();
  const { dict, number } = i18n;
  const copy = dict.events.import;
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseGuestCsv> | null>(null);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resultMessage, setResultMessage] = useState("");
  const [savedWithFilters, setSavedWithFilters] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  const existingEmails = useMemo(() => new Set(existingGuests.map((guest) => guest.email.trim().toLowerCase()).filter(Boolean)), [existingGuests]);
  const previewDuplicates = preview?.guests.filter((guest) => guest.email && existingEmails.has(guest.email)).length ?? 0;

  const localizeFields = (fields: Record<string, string>) => Object.fromEntries(Object.entries(fields).map(([field, message]) => [field, localizeFieldMessage(i18n, message)]));

  async function acceptFile(nextFile: File | undefined) {
    if (!nextFile) return;
    setFile(nextFile);
    if (fileInput.current) fileInput.current.value = "";
    setCsvText("");
    setPreview(null);
    setErrorMessage("");
    setFieldErrors({});
    setResultMessage("");
    if (!nextFile.name.toLowerCase().endsWith(".csv") && !nextFile.type.includes("csv")) {
      setErrorMessage(copy.errors.notCsv);
      return;
    }
    if (nextFile.size > 1024 * 1024) {
      setErrorMessage(copy.errors.tooLarge);
      return;
    }
    try {
      const text = await nextFile.text();
      const parsed = parseGuestCsv(text);
      setCsvText(text);
      setPreview(parsed);
    } catch (error) {
      setErrorMessage(error instanceof GuestCsvError ? localizeFieldMessage(i18n, error.message) : copy.errors.unreadable);
      if (error instanceof GuestCsvError && error.fields) setFieldErrors(localizeFields(error.fields));
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    void acceptFile(event.dataTransfer.files[0]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitImportOnce(submitting, async () => {
      if (!file || !csvText || !preview) return;
      setPending(true);
      setErrorMessage("");
      setFieldErrors({});
      setResultMessage("");
      try {
        const result = await submitAttendeeImport(eventId, { fileName: file.name, csvText });
        setResultMessage(importSuccessMessage(i18n, result, hasActiveFilters));
        setSavedWithFilters(hasActiveFilters);
        setFile(null);
        setCsvText("");
        setPreview(null);
        if (fileInput.current) fileInput.current.value = "";
        const refreshFailure = await refreshAfterImport(i18n, onSaved);
        if (refreshFailure) setResultMessage(refreshFailure);
      } catch (error) {
        if (error instanceof ApplicationError) {
          setErrorMessage(error.code === "INTERNAL_ERROR" ? copy.errors.failed : localizeErrorCode(dict, error.code));
          setFieldErrors(localizeFields(error.fields ?? {}));
        } else setErrorMessage(copy.errors.failed);
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <Surface className="attendee-import-panel" depth="inset" aria-labelledby="attendee-import-title">
      <div className="attendee-import-panel__heading">
        <div>
          <h3 id="attendee-import-title">{copy.heading}</h3>
          <p>{copy.description}</p>
        </div>
        <TactileButton aria-label={copy.close} disabled={pending} iconOnly onClick={onCancel}><CloseIcon height="15" width="15" /></TactileButton>
      </div>

      <form onSubmit={submit}>
        <div className="attendee-import-layout">
          <div>
            <input
              accept=".csv,text/csv"
              className="visually-hidden"
              disabled={pending}
              onChange={(event) => void acceptFile(event.target.files?.[0])}
              ref={fileInput}
              type="file"
            />
            {file ? (
              <div className="csv-complete">
                <span className="csv-complete__icon"><DocumentIcon height="23" width="23" /></span>
                <div className="csv-complete__copy">
                  {preview ? <span className="upload-success"><CheckIcon height="14" width="14" /></span> : null}
                  <div><strong>{file.name}</strong><span>{formatFileSize(file.size)} · {preview ? copy.previewReady : copy.needsAttention}</span></div>
                </div>
                {preview ? (
                  <div className="csv-results">
                    <strong>{number(preview.rows)}<span>{copy.rows}</span></strong>
                    <strong>{number(Math.max(0, preview.rows - previewDuplicates))}<span>{copy.likelyAdded}</span></strong>
                    <strong>{number(previewDuplicates)}<span>{copy.likelySkipped}</span></strong>
                  </div>
                ) : null}
                <div className="upload-actions csv-complete__actions">
                  <button disabled={pending} onClick={() => fileInput.current?.click()} type="button">{copy.replace}</button>
                  <button aria-label={copy.remove} disabled={pending} onClick={() => { setFile(null); setCsvText(""); setPreview(null); setErrorMessage(""); setFieldErrors({}); if (fileInput.current) fileInput.current.value = ""; }} type="button"><TrashIcon height="15" width="15" /></button>
                </div>
              </div>
            ) : (
              <div
                aria-label={copy.upload}
                className={`csv-dropzone ${dragging ? "csv-dropzone--dragging" : ""}`}
                onClick={() => fileInput.current?.click()}
                onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.current?.click(); } }}
                role="button"
                tabIndex={0}
              >
                <span className="dropzone-icon"><DocumentIcon height="21" width="21" /></span>
                <strong>{copy.drop}</strong>
                <span>{copy.orBrowse}</span>
              </div>
            )}
            {errorMessage ? <p className="upload-error" role="alert">{errorMessage}</p> : null}
            {Object.keys(fieldErrors).length ? (
              <ul className="attendee-import-errors" aria-label={copy.fieldErrors}>
                {Object.entries(fieldErrors).slice(0, 20).map(([field, message]) => <li key={field}><span>{field}</span> {message}</li>)}
              </ul>
            ) : null}
          </div>
          <div className="csv-requirements">
            <strong>{copy.requirements}</strong>
            <p>{copy.req1}</p>
            <p>{copy.req2}</p>
            <p>{copy.req3}</p>
            <p>{copy.req4}</p>
            <button className="template-action" disabled={pending} onClick={downloadGuestCsvTemplate} type="button"><UploadIcon className="rotate-180" height="15" width="15" /> {copy.template}</button>
          </div>
        </div>
        {preview ? (
          <p className="attendee-import-preview-note" role="note">
            {copy.previewNote} {preview.skipped ? i18n.plural(copy.blankIgnored, preview.skipped) : ""}
          </p>
        ) : null}
        {resultMessage ? (
          <div aria-live="polite" className="roster-notice attendee-import-result" role="status">
            <CheckIcon height="15" width="15" /> <span>{resultMessage}</span>
            {hasActiveFilters && savedWithFilters ? <button onClick={onClearFilters} type="button">{copy.clearFilters}</button> : null}
          </div>
        ) : null}
        <div className="attendee-import-panel__actions">
          <TactileButton disabled={pending} onClick={onCancel}>{copy.cancel}</TactileButton>
          <TactileButton disabled={pending || !file || !preview || !csvText} type="submit" variant="primary">
            {pending ? copy.importing : copy.importCsv}
          </TactileButton>
        </div>
      </form>
    </Surface>
  );
}
