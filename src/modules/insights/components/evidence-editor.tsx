"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  connectionKinds, demandReasons, goalResults, reportingEvidenceSchema, sponsorMeasures,
  type EvidenceDocument, type ReportEvent,
} from "../reporting-contract";
import { TactileButton } from "@/shared/ui/tactile-button";
import { Surface } from "@/shared/ui/surface";
import { evidenceEditorCopy, evidenceExamples } from "./evidence-editor-copy";
import styles from "./evidence-editor.module.css";

type Feedback = { message: string; fields?: string[]; kind: "error" | "conflict" | "saved" };

const fieldOptions = {
  series: [],
  goalSurveyWindow: [],
  participants: [...connectionKinds, ...goalResults],
  requests: [...connectionKinds, ...demandReasons],
  followUps: [],
  reconnections: [],
  sponsors: [...sponsorMeasures],
};

export function EvidenceEditor({ event, initial, locale, readOnly }: {
  event: Pick<ReportEvent, "id" | "people" | "matches">;
  initial: EvidenceDocument;
  locale: keyof typeof evidenceEditorCopy;
  readOnly: boolean;
}) {
  const copy = evidenceEditorCopy[locale];
  const router = useRouter();
  const url = `/api/events/${event.id}/reporting-evidence`;
  const [revision, setRevision] = useState(initial.revision);
  const [text, setText] = useState(() => JSON.stringify(initial.evidence, null, 2));
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const names = new Map(event.people.map((person) => [person.personId, person.name]));

  function updateDocument(document: EvidenceDocument) {
    setRevision(document.revision);
    setText(JSON.stringify(document.evidence, null, 2));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || readOnly || feedback?.kind === "conflict") return;
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      setFeedback({ kind: "error", message: copy.invalid });
      return;
    }
    const result = reportingEvidenceSchema.safeParse(input);
    if (!result.success) {
      setFeedback({ kind: "error", message: copy.invalid, fields: result.error.issues.map(({ path }) => path.join(".") || copy.document) });
      return;
    }
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedRevision: revision, evidence: result.data }),
      });
      if (response.status === 409) {
        const { error } = await response.json();
        setFeedback(error?.details?.kind === "SIMULATION_ACTIVE"
          ? { kind: "error", message: copy.simulation }
          : { kind: "conflict", message: copy.conflict });
        return;
      }
      const { data, error } = await response.json();
      if (!response.ok) {
        const validation = response.status === 422;
        setFeedback({
          kind: "error",
          message: validation ? copy.invalid : response.status === 413 ? copy.large : copy.failed,
          fields: validation && error?.fields ? Object.keys(error.fields) : undefined,
        });
        return;
      }
      updateDocument(data);
      setFeedback({ kind: "saved", message: copy.saved });
      router.refresh();
    } catch {
      setFeedback({ kind: "error", message: copy.failed });
    } finally {
      setPending(false);
    }
  }

  async function reload() {
    setPending(true);
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        setFeedback({ kind: "conflict", message: `${copy.failed} ${copy.conflict}` });
        return;
      }
      const { data } = await response.json();
      updateDocument(data);
      setFeedback(null);
      router.refresh();
    } catch {
      setFeedback({ kind: "conflict", message: `${copy.failed} ${copy.conflict}` });
    } finally {
      setPending(false);
    }
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (file.size >= 3 * 1024 * 1024) {
      setFeedback({ kind: "error", message: copy.large });
      return;
    }
    setPending(true);
    try {
      setText(await file.text());
      setFeedback(null);
    } catch {
      setFeedback({ kind: "error", message: copy.failed });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Surface as="section" className={`panel ${styles.panel}`} depth="raised">
        <form className={styles.actions} onSubmit={save}>
          <label htmlFor="event-evidence"><strong>{copy.document}</strong></label>
          <p className="panel-subtitle" id="event-evidence-help">{readOnly ? copy.simulation : copy.documentHelp}</p>
          <textarea
            aria-describedby="event-evidence-help"
            className={styles.editor}
            id="event-evidence"
            onChange={({ currentTarget }) => setText(currentTarget.value)}
            readOnly={readOnly || pending}
            spellCheck={false}
            value={text}
          />
          {!readOnly && (
            <>
              <TactileButton disabled={pending || feedback?.kind === "conflict"} type="submit" variant="primary">
                {pending ? copy.saving : copy.save}
              </TactileButton>
              {feedback?.kind === "conflict" ? (
                <TactileButton disabled={pending} onClick={reload} type="button">{copy.reload}</TactileButton>
              ) : (
                <label className={styles.actions}>
                  {copy.openFile}
                  <input accept=".json,application/json" disabled={pending} onChange={({ currentTarget }) => void loadFile(currentTarget.files?.[0])} type="file" />
                </label>
              )}
            </>
          )}
        </form>
        {feedback && (
          <div role={feedback.kind === "saved" ? "status" : "alert"} className={feedback.kind === "saved" ? undefined : styles.error}>
            <p>{feedback.message}</p>
            {feedback.fields && feedback.fields.length > 0 && <ul>{[...new Set(feedback.fields)].slice(0, 12).map((field) => <li key={field}>{field}</li>)}</ul>}
          </div>
        )}
      </Surface>
      <Surface as="section" className={`panel ${styles.panel}`} depth="raised">
        <details>
          <summary>{copy.guide}</summary>
          <dl className={styles.reference}>
            {(Object.keys(copy.fields) as (keyof typeof copy.fields)[]).map((field) => (
              <div key={field}>
                <dt><code>{field}</code></dt>
                <dd>{copy.fields[field]}</dd>
                <dd><code>{evidenceExamples[field]}</code></dd>
                {fieldOptions[field].length > 0 && <dd><code>{fieldOptions[field].join(", ")}</code></dd>}
              </div>
            ))}
          </dl>
        </details>
        <details>
          <summary>{copy.roster}</summary>
          {event.people.length === 0 ? <p>{copy.noPeople}</p> : (
            <ul className={styles.reference}>
              {event.people.map((person) => <li key={person.personId}><strong>{person.name}</strong><code>{person.personId}</code></li>)}
            </ul>
          )}
        </details>
        <details>
          <summary>{copy.matches}</summary>
          {event.matches.length === 0 ? <p>{copy.noMatches}</p> : (
            <ul className={styles.reference}>
              {event.matches.map((match) => <li key={match.id}>
                <strong>{match.personIds.map((id) => names.get(id) ?? id).join(" · ")}</strong>
                <span>{match.completedAt ? copy.confirmed : copy.pending}</span>
                <code>{match.id}</code>
              </li>)}
            </ul>
          )}
        </details>
      </Surface>
    </>
  );
}
