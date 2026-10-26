"use client";

import { useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
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
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseGuestCsv> | null>(null);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [resultMessage, setResultMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);

  const existingEmails = useMemo(() => new Set(existingGuests.map((guest) => guest.email.trim().toLowerCase()).filter(Boolean)), [existingGuests]);
  const previewDuplicates = preview?.guests.filter((guest) => guest.email && existingEmails.has(guest.email)).length ?? 0;

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
      setErrorMessage("Choose a .csv file to import attendees.");
      return;
    }
    if (nextFile.size > 1024 * 1024) {
      setErrorMessage("The file must be 1 MiB or smaller.");
      return;
    }
    try {
      const text = await nextFile.text();
      const parsed = parseGuestCsv(text);
      setCsvText(text);
      setPreview(parsed);
    } catch (error) {
      setErrorMessage(error instanceof GuestCsvError ? error.message : "We could not read attendee rows from this file.");
      if (error instanceof GuestCsvError && error.fields) setFieldErrors(error.fields);
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
        setResultMessage(importSuccessMessage(result, hasActiveFilters));
        setFile(null);
        setCsvText("");
        setPreview(null);
        if (fileInput.current) fileInput.current.value = "";
        const refreshFailure = await refreshAfterImport(onSaved);
        if (refreshFailure) setResultMessage(refreshFailure);
      } catch (error) {
        if (error instanceof ApplicationError) {
          setErrorMessage(error.message);
          setFieldErrors(error.fields ?? {});
        } else setErrorMessage("The CSV could not be imported. Your file is still selected; try again.");
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <Surface className="attendee-import-panel" depth="inset" aria-labelledby="attendee-import-title">
      <div className="attendee-import-panel__heading">
        <div>
          <h3 id="attendee-import-title">Import attendees from CSV</h3>
          <p>New attendees are appended. Emails already on this event are skipped, and existing records stay as they are.</p>
        </div>
        <TactileButton aria-label="Close CSV import" disabled={pending} iconOnly onClick={onCancel}><CloseIcon height="15" width="15" /></TactileButton>
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
                  <div><strong>{file.name}</strong><span>{formatFileSize(file.size)} · {preview ? "Preview ready" : "Needs attention"}</span></div>
                </div>
                {preview ? (
                  <div className="csv-results">
                    <strong>{preview.rows.toLocaleString()}<span>rows</span></strong>
                    <strong>{Math.max(0, preview.rows - previewDuplicates).toLocaleString()}<span>likely added</span></strong>
                    <strong>{previewDuplicates.toLocaleString()}<span>likely skipped</span></strong>
                  </div>
                ) : null}
                <div className="upload-actions csv-complete__actions">
                  <button disabled={pending} onClick={() => fileInput.current?.click()} type="button">Replace file</button>
                  <button aria-label="Remove CSV file" disabled={pending} onClick={() => { setFile(null); setCsvText(""); setPreview(null); setErrorMessage(""); setFieldErrors({}); if (fileInput.current) fileInput.current.value = ""; }} type="button"><TrashIcon height="15" width="15" /></button>
                </div>
              </div>
            ) : (
              <div
                aria-label="Upload attendee CSV"
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
                <strong>Drop your CSV here</strong>
                <span>or click to browse · maximum 1 MiB</span>
              </div>
            )}
            {errorMessage ? <p className="upload-error" role="alert">{errorMessage}</p> : null}
            {Object.keys(fieldErrors).length ? (
              <ul className="attendee-import-errors" aria-label="CSV field errors">
                {Object.entries(fieldErrors).slice(0, 20).map(([field, message]) => <li key={field}><span>{field}</span> {message}</li>)}
              </ul>
            ) : null}
          </div>
          <div className="csv-requirements">
            <strong>CSV requirements</strong>
            <p>Use the downloaded template. At least one name column and a name for each row are required.</p>
            <p>Email is optional. Duplicate emails inside the file reject the whole import.</p>
            <p>Maximum 2,000 attendees per event. Blank rows are ignored.</p>
            <p>No-email guests stay distinct. An exact file retry is safe; changed or reordered files can add them again.</p>
            <button className="template-action" disabled={pending} onClick={downloadGuestCsvTemplate} type="button"><UploadIcon className="rotate-180" height="15" width="15" /> Download template</button>
          </div>
        </div>
        {preview ? (
          <p className="attendee-import-preview-note" role="note">
            Preview is advisory; the server checks the current roster again when saving. {preview.skipped ? `${preview.skipped} blank ${preview.skipped === 1 ? "row is" : "rows are"} ignored.` : ""}
          </p>
        ) : null}
        {resultMessage ? (
          <div aria-live="polite" className="roster-notice attendee-import-result" role="status">
            <CheckIcon height="15" width="15" /> <span>{resultMessage}</span>
            {hasActiveFilters && resultMessage.startsWith("Import saved:") ? <button onClick={onClearFilters} type="button">Clear filters</button> : null}
          </div>
        ) : null}
        <div className="attendee-import-panel__actions">
          <TactileButton disabled={pending} onClick={onCancel}>Cancel</TactileButton>
          <TactileButton disabled={pending || !file || !preview || !csvText} type="submit" variant="primary">
            {pending ? "Importing…" : "Import CSV"}
          </TactileButton>
        </div>
      </form>
    </Surface>
  );
}
