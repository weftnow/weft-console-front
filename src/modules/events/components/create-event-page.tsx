"use client";

import Image from "next/image";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useEventQueryScope } from "./events-query-provider";
import { seedEventDetail } from "../queries/event-detail-query";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { useI18n } from "@/shared/i18n/I18nProvider";
import { localizeFieldMessage } from "@/shared/i18n/field-messages";
import { LOCALES, localeSchema, type Locale } from "@/shared/i18n/locales";
import { CityArtwork } from "@/shared/ui/city-artwork";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  DocumentIcon,
  ImageIcon,
  LocationIcon,
  PeopleIcon,
  PlusIcon,
  SparklesIcon,
  StaffIcon,
  TrashIcon,
  UploadIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { TactileButton } from "@/shared/ui/tactile-button";
import {
  EVENT_COVER_PLACEHOLDER_ART,
  type EventGuestRecord,
  formatEventDateRange,
  normalizeCoverImage,
} from "../event-record";
import { EVENT_AUDIENCE_OPTIONS, EVENT_CATEGORIES } from "../event-options";
import { createEventSchema, manualGuestSchema, zodFieldErrors } from "../event-schemas";
import { submitCreateEvent } from "../mutations/create-event";
import { ApplicationError } from "@/shared/lib/application-error";
import type { CreateEventContext } from "@/modules/organizations/types";
import { getGuestCsvFieldError, GuestCsvError, parseGuestCsv } from "../guest-csv";
import { downloadGuestCsvTemplate } from "../guest-csv-template";

const CATEGORY_OPTIONS = EVENT_CATEGORIES;
const AUDIENCE_OPTIONS = EVENT_AUDIENCE_OPTIONS;

type EventForm = {
  attendees: string;
  categories: string[];
  city: string;
  description: string;
  endDate: string;
  endTime: string;
  language: Locale;
  name: string;
  profiles: string[];
  startDate: string;
  startTime: string;
  venue: string;
};

type CsvImport = {
  attendees: number;
  file: File;
  guests: EventGuestRecord[];
  skipped: number;
  sponsors: number;
  truncated: boolean;
  vips: number;
};

type ManualGuest = EventGuestRecord;

type Toast = {
  detail: string;
  title: string;
  tone: "neutral" | "success";
};

const INITIAL_FORM: EventForm = {
  attendees: "",
  categories: [],
  city: "",
  description: "",
  endDate: "",
  endTime: "",
  language: "en",
  name: "",
  profiles: [],
  startDate: "",
  startTime: "",
  venue: "",
};

const queryElement = (selector: string) => document.querySelector(selector) as HTMLElement | null;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FormField({
  children,
  error,
  id,
  label,
  required = false,
}: {
  children: ReactNode;
  error?: string;
  id: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="event-field">
      <label htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true">*</span> : null}
      </label>
      {children}
      {error ? <small className="event-field__error" id={`${id}-error`} role="alert">{error}</small> : null}
    </div>
  );
}

function SectionHeading({
  children,
  description,
  icon,
  id,
}: {
  children: ReactNode;
  description: string;
  icon: ReactNode;
  id: string;
}) {
  return (
    <div className="create-section-heading">
      <span className="create-section-heading__icon">{icon}</span>
      <div>
        <h2 id={id}>{children}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function ChipSelector({
  label,
  labels,
  onChange,
  options,
  selected,
}: {
  label: string;
  labels: Record<string, string>;
  onChange: (next: string[]) => void;
  options: readonly string[];
  selected: string[];
}) {
  function toggle(option: string) {
    onChange(
      selected.includes(option)
        ? selected.filter((item) => item !== option)
        : [...selected, option],
    );
  }

  return (
    <div aria-label={label} className="chip-selector" role="group">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            aria-pressed={isSelected}
            className="selector-chip"
            key={option}
            onClick={() => toggle(option)}
            type="button"
          >
            <span>{labels[option] ?? option}</span>
            {isSelected ? <CloseIcon height="13" width="13" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function Avatar({
  name,
  size = 38,
  src,
}: {
  name: string;
  size?: number;
  src: string | null;
}) {
  const { t, dict } = useI18n();
  return (
    <span className="event-avatar" style={{ height: size, width: size }}>
      {src ? <Image alt={t(dict.events.create.team.portrait, { name })} height={size} src={src} width={size} unoptimized /> : <span aria-label={name}>{name.trim().slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

export function CreateEventPage({ context, selectedOrganizationId }: { context: CreateEventContext; selectedOrganizationId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scope = useEventQueryScope();
  const [organizationId, setOrganizationId] = useState(selectedOrganizationId ?? context.organizations[0]?.id ?? "");
  const i18n = useI18n();
  const { locale, dict, t } = i18n;
  const copy = dict.events.create;
  const roleLabel = (role: string) => dict.common.roles[role as keyof typeof dict.common.roles] ?? role;
  // New events default to the creator's own language.
  const [form, setForm] = useState<EventForm>({ ...INITIAL_FORM, language: locale });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverDragging, setCoverDragging] = useState(false);
  const [csvImport, setCsvImport] = useState<CsvImport | null>(null);
  const [csvError, setCsvError] = useState("");
  const [csvDragging, setCsvDragging] = useState(false);
  const [attendeeMode, setAttendeeMode] = useState<"csv" | "manual">("csv");
  const [manualGuest, setManualGuest] = useState<ManualGuest>({
    company: "",
    email: "",
    firstName: "",
    guestType: "Attendee",
    lastName: "",
    linkedin: "",
    phone: "",
    position: "",
    profileType: "",
    source: "manual",
  });
  const [manualGuests, setManualGuests] = useState<ManualGuest[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffOpen, setStaffOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<Toast | null>(null);
  const [actionState, setActionState] = useState<"idle" | "creating">("idle");
  const coverInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const coverUrlRef = useRef<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitGuardRef = useRef(false);

  const activeOrganization = context.organizations.find((organization) => organization.id === organizationId);
  const STAFF = activeOrganization?.staff ?? [];
  const ORGANIZER = { name: context.organizer.name, avatar: context.organizer.avatar, role: copy.team.organizer };
  const selectedStaff = STAFF.filter((person) => selectedStaffIds.includes(person.id));
  const nameError = fieldErrors.name ?? (showValidation && !form.name.trim() ? copy.validation.name : undefined);
  const cityError = fieldErrors.city ?? (showValidation && !form.city ? copy.validation.city : undefined);
  const startError = fieldErrors.startDate ?? (showValidation && !form.startDate ? copy.validation.startDate : undefined);
  const endError = fieldErrors.endDate ?? (showValidation && !form.endDate ? copy.validation.endDate : undefined);

  useEffect(() => {
    return () => {
      if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function updateField<Key extends keyof EventForm>(key: Key, value: EventForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    const field = key === "attendees" ? "expectedAttendees" : key === "profiles" ? "expectedAudience" : key;
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function showToast(message: Toast) {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3600);
  }

  function acceptCoverFile(file: File | undefined) {
    setCoverDragging(false);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast({
        detail: copy.toast.notImage.detail,
        title: copy.toast.notImage.title,
        tone: "neutral",
      });
      return;
    }

    if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    coverUrlRef.current = nextUrl;
    setCoverFile(file);
    setCoverUrl(nextUrl);
  }

  function removeCover() {
    if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    coverUrlRef.current = null;
    setCoverFile(null);
    setCoverUrl(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  async function acceptCsvFile(file: File | undefined) {
    setCsvDragging(false);
    setCsvError("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv") && !file.type.includes("csv")) {
      setCsvImport(null);
      setCsvError(dict.events.import.errors.notCsv);
      return;
    }
    if (file.size > 1024 * 1024) {
      setCsvImport(null);
      setCsvError(dict.events.import.errors.tooLarge);
      return;
    }

    try {
      const parsed = parseGuestCsv(await file.text());
      setCsvImport({
        attendees: parsed.rows,
        file,
        guests: parsed.guests,
        skipped: parsed.skipped,
        sponsors: parsed.sponsors,
        truncated: parsed.truncated,
        vips: parsed.vips,
      });
    } catch (error) {
      setCsvImport(null);
      setCsvError(
        error instanceof GuestCsvError
          ? t(copy.csv.readRows, { message: localizeFieldMessage(i18n, error.message) })
          : copy.errors.unreadable,
      );
    }
  }

  function handleDrop(
    event: DragEvent<HTMLElement>,
    accept: (file: File | undefined) => void,
  ) {
    event.preventDefault();
    accept(event.dataTransfer.files[0]);
  }

  function handleDropzoneKey(
    event: KeyboardEvent<HTMLElement>,
    input: HTMLInputElement | null,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input?.click();
    }
  }

  function addManualGuest() {
    if (!manualGuestSchema.safeParse({
      firstName: manualGuest.firstName, lastName: manualGuest.lastName, email: manualGuest.email,
      phone: manualGuest.phone, company: manualGuest.company, position: manualGuest.position,
      profileType: manualGuest.profileType, linkedin: manualGuest.linkedin, guestType: manualGuest.guestType,
    }).success || manualGuests.length + (csvImport?.guests.length ?? 0) >= 2000) {
      showToast({
        detail: copy.toast.guestAttention.detail,
        title: copy.toast.guestAttention.title,
        tone: "neutral",
      });
      return;
    }
    setManualGuests((current) => [...current, manualGuest]);
    showToast({
      detail: t(copy.toast.guestAdded.detail, { name: manualGuest.firstName }),
      title: copy.toast.guestAdded.title,
      tone: "success",
    });
    setManualGuest({
      company: "",
      email: "",
      firstName: "",
      guestType: "Attendee",
      lastName: "",
      linkedin: "",
      phone: "",
      position: "",
      profileType: "",
      source: "manual",
    });
  }

  function toggleStaff(id: string) {
    setSelectedStaffIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function validateRequired() {
    setShowValidation(true);
    return Boolean(form.name.trim() && form.city && form.startDate && form.endDate && form.description.trim() && form.categories.length);
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitGuardRef.current) return;
    submitGuardRef.current = true;
    if (!validateRequired()) {
      submitGuardRef.current = false;
      showToast({
        detail: copy.toast.missing.detail,
        title: copy.toast.missing.title,
        tone: "neutral",
      });
      requestAnimationFrame(() => queryElement(".create-event-form [aria-invalid='true']")?.focus());
      return;
    }
    setActionState("creating");
    try {
      let coverImage: string | null = null;
      if (coverFile) {
        try { coverImage = await normalizeCoverImage(coverFile); }
        catch { throw new ApplicationError("VALIDATION_ERROR", copy.errors.cover, { coverImage: copy.errors.coverField }); }
      }
      let csvText: string | null = null;
      if (csvImport) {
        try { csvText = await csvImport.file.text(); }
        catch { throw new ApplicationError("VALIDATION_ERROR", copy.errors.csvRead, { "attendeeImport.csvText": copy.errors.csvField }); }
      }
      const input = {
        organizationId,
        name: form.name,
        city: form.city,
        venue: form.venue,
        expectedAttendees: form.attendees === "" ? null : Number(form.attendees),
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,
        description: form.description,
        language: form.language,
        categories: form.categories,
        expectedAudience: form.profiles,
        attendeeImport: csvImport && csvText !== null ? { fileName: csvImport.file.name, csvText } : null,
        manualGuests: manualGuests.map((guest) => ({
          firstName: guest.firstName, lastName: guest.lastName, email: guest.email,
          phone: guest.phone, company: guest.company, position: guest.position,
          profileType: guest.profileType, linkedin: guest.linkedin, guestType: guest.guestType,
        })),
        staffMembershipIds: selectedStaffIds,
        coverImage,
      };
      const validated = createEventSchema.safeParse(input);
      if (!validated.success) {
        throw new ApplicationError("VALIDATION_ERROR", copy.errors.highlighted, zodFieldErrors(validated.error));
      }
      setFieldErrors({});
      const created = await submitCreateEvent(validated.data);
      seedEventDetail(queryClient, scope, created);
      router.push(`/events/${created.id}`);
    } catch (error) {
      submitGuardRef.current = false;
      setActionState("idle");
      const appError = error instanceof ApplicationError ? error : new ApplicationError("INTERNAL_ERROR", copy.errors.generic);
      const localizedFields = Object.fromEntries(Object.entries(appError.fields ?? {}).map(([field, message]) => [field, localizeFieldMessage(i18n, message)]));
      setFieldErrors(localizedFields);
      if (Object.keys(appError.fields ?? {}).some((field) => field.startsWith("attendeeImport"))) setAttendeeMode("csv");
      else if (Object.keys(appError.fields ?? {}).some((field) => field.startsWith("manualGuests"))) setAttendeeMode("manual");
      showToast({
        detail: appError.code === "INTERNAL_ERROR" ? copy.errors.generic : localizeFieldMessage(i18n, appError.message),
        title: appError.code === "UNAUTHORIZED" ? copy.toast.authRequired : appError.code === "FORBIDDEN" ? copy.toast.accessRequired : copy.toast.failed,
        tone: "neutral",
      });
      if (appError.fields) requestAnimationFrame(() => {
        const first = Object.keys(appError.fields ?? {})[0];
        const id = ({ organizationId: "event-organization", name: "event-name", city: "event-city", venue: "event-venue", expectedAttendees: "event-attendees", startDate: "event-start-date", startTime: "event-start-time", endDate: "event-end-date", endTime: "event-end-time", description: "event-description", language: "event-language", categories: "event-categories" } as Record<string, string>)[first];
        (id ? document.getElementById(id) : queryElement(".create-event-form [aria-invalid='true']"))?.focus();
      });
    }
  }

  function saveDraft() {
    showToast({
      detail: copy.toast.draft.detail,
      title: copy.toast.draft.title,
      tone: "neutral",
    });
  }

  const coverUpload = (
    <div
      aria-label={copy.cover.uploadLabel}
      className={`cover-dropzone ${coverDragging ? "cover-dropzone--dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setCoverDragging(true);
      }}
      onDragLeave={() => setCoverDragging(false)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => handleDrop(event, acceptCoverFile)}
      onKeyDown={(event) => handleDropzoneKey(event, coverInputRef.current)}
      role="button"
      tabIndex={0}
    >
      <span className="dropzone-icon"><UploadIcon height="21" width="21" /></span>
      <strong>{copy.cover.upload}</strong>
      <span>{copy.cover.hint}</span>
    </div>
  );

  return (
        <main className="dashboard-main create-event-main">
          <header className="create-event-header">
            <Link className="create-back-link" href="/events">
              <ArrowLeftIcon height="15" width="15" /> {copy.back}
            </Link>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </header>

          <div className="create-event-layout">
            <form aria-busy={actionState !== "idle"} className="create-event-form" inert={actionState !== "idle"} noValidate onSubmit={createEvent}>
              <Surface as="section" className="create-section" depth="raised" aria-labelledby="event-basics-title">
                <SectionHeading
                  description={copy.basics.description}
                  icon={<CalendarIcon height="20" width="20" />}
                  id="event-basics-title"
                >
                  {copy.basics.heading}
                </SectionHeading>

                <div className="event-basics-grid">
                  {context.organizations.length > 1 ? <FormField error={fieldErrors.organizationId} id="event-organization" label={copy.fields.organization} required>
                    <select aria-describedby={fieldErrors.organizationId ? "event-organization-error" : undefined} aria-invalid={Boolean(fieldErrors.organizationId)} className="event-control" id="event-organization" onChange={(event) => { setOrganizationId(event.target.value); setSelectedStaffIds([]); }} value={organizationId}>
                      {context.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
                    </select>
                  </FormField> : null}
                  <FormField error={nameError} id="event-name" label={copy.fields.name} required>
                    <input
                      aria-describedby={nameError ? "event-name-error" : undefined}
                      aria-invalid={Boolean(nameError)}
                      className="event-control"
                      data-filled={Boolean(form.name)}
                      id="event-name"
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder={copy.fields.namePlaceholder}
                      value={form.name}
                    />
                  </FormField>
                  <FormField error={cityError} id="event-city" label={copy.fields.city} required>
                    <span className="event-control-wrap">
                      <LocationIcon height="16" width="16" />
                      <select
                        aria-describedby={cityError ? "event-city-error" : undefined}
                        aria-invalid={Boolean(cityError)}
                        className="event-control event-control--with-icon"
                        data-filled={Boolean(form.city)}
                        id="event-city"
                        onChange={(event) => updateField("city", event.target.value)}
                        value={form.city}
                      >
                        <option value="">{copy.fields.chooseCity}</option>
                        {Object.entries(dict.events.options.cities).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </span>
                  </FormField>
                  <FormField error={fieldErrors.venue} id="event-venue" label={copy.fields.venue}>
                    <input
                      aria-describedby={fieldErrors.venue ? "event-venue-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.venue)}
                      className="event-control"
                      data-filled={Boolean(form.venue)}
                      id="event-venue"
                      onChange={(event) => updateField("venue", event.target.value)}
                      placeholder={copy.fields.venuePlaceholder}
                      value={form.venue}
                    />
                  </FormField>
                  <FormField error={fieldErrors.expectedAttendees} id="event-attendees" label={copy.fields.expectedAttendees}>
                    <span className="event-control-wrap">
                      <PeopleIcon height="16" width="16" />
                      <input
                        aria-describedby={fieldErrors.expectedAttendees ? "event-attendees-error" : undefined}
                        aria-invalid={Boolean(fieldErrors.expectedAttendees)}
                        className="event-control event-control--with-icon"
                        data-filled={Boolean(form.attendees)}
                        id="event-attendees"
                        inputMode="numeric"
                        min="0"
                        onChange={(event) => updateField("attendees", event.target.value.replace(/\D/g, ""))}
                        placeholder="0"
                        type="text"
                        value={form.attendees}
                      />
                    </span>
                  </FormField>
                  <FormField error={startError} id="event-start-date" label={copy.fields.startDate} required>
                    <input
                      aria-describedby={startError ? "event-start-date-error" : undefined}
                      aria-invalid={Boolean(startError)}
                      className="event-control"
                      data-filled={Boolean(form.startDate)}
                      id="event-start-date"
                      onChange={(event) => updateField("startDate", event.target.value)}
                      type="date"
                      value={form.startDate}
                    />
                  </FormField>
                  <FormField error={fieldErrors.startTime} id="event-start-time" label={copy.fields.startTime}>
                    <input
                      aria-describedby={fieldErrors.startTime ? "event-start-time-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.startTime)}
                      className="event-control"
                      data-filled={Boolean(form.startTime)}
                      id="event-start-time"
                      onChange={(event) => updateField("startTime", event.target.value)}
                      type="time"
                      value={form.startTime}
                    />
                  </FormField>
                  <FormField error={endError} id="event-end-date" label={copy.fields.endDate} required>
                    <input
                      aria-describedby={endError ? "event-end-date-error" : undefined}
                      aria-invalid={Boolean(endError)}
                      className="event-control"
                      data-filled={Boolean(form.endDate)}
                      id="event-end-date"
                      min={form.startDate}
                      onChange={(event) => updateField("endDate", event.target.value)}
                      type="date"
                      value={form.endDate}
                    />
                  </FormField>
                  <FormField error={fieldErrors.endTime} id="event-end-time" label={copy.fields.endTime}>
                    <input
                      aria-describedby={fieldErrors.endTime ? "event-end-time-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.endTime)}
                      className="event-control"
                      data-filled={Boolean(form.endTime)}
                      id="event-end-time"
                      onChange={(event) => updateField("endTime", event.target.value)}
                      type="time"
                      value={form.endTime}
                    />
                  </FormField>
                </div>

                <div className="cover-field">
                  <span className="cover-field__label">{copy.fields.coverImage}</span>
                  <input
                    accept="image/*"
                    className="visually-hidden"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => acceptCoverFile(event.target.files?.[0])}
                    ref={coverInputRef}
                    type="file"
                  />
                  {coverUrl && coverFile ? (
                    <div className="cover-complete">
                      <div className="cover-complete__preview">
                        <Image alt={t(copy.cover.previewAlt, { name: form.name || copy.cover.newEvent })} fill sizes="(max-width: 620px) 100vw, 540px" src={coverUrl} unoptimized />
                      </div>
                      <div className="cover-complete__details">
                        <span className="upload-success"><CheckIcon height="15" width="15" /></span>
                        <div>
                          <strong>{coverFile.name}</strong>
                          <span>{t(copy.cover.ready, { size: formatBytes(coverFile.size) })}</span>
                        </div>
                        <div className="upload-actions">
                          <button onClick={() => coverInputRef.current?.click()} type="button">{copy.cover.replace}</button>
                          <button aria-label={copy.cover.remove} onClick={removeCover} type="button"><TrashIcon height="15" width="15" /></button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div onClick={() => coverInputRef.current?.click()}>{coverUpload}</div>
                  )}
                  {fieldErrors.coverImage ? <p className="upload-error" role="alert">{fieldErrors.coverImage}</p> : null}
                </div>
              </Surface>

              <Surface as="section" className="create-section" depth="raised" aria-labelledby="event-context-title">
                <SectionHeading
                  description={copy.context.description}
                  icon={<SparklesIcon height="20" width="20" />}
                  id="event-context-title"
                >
                  {copy.context.heading}
                </SectionHeading>
                <FormField error={fieldErrors.description ?? (showValidation && !form.description.trim() ? copy.validation.description : undefined)} id="event-description" label={copy.fields.description} required>
                  <div className="textarea-wrap">
                    <textarea
                      aria-describedby={fieldErrors.description || (showValidation && !form.description.trim()) ? "event-description-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.description || (showValidation && !form.description.trim()))}
                      className="event-control event-textarea"
                      data-filled={Boolean(form.description)}
                      id="event-description"
                      maxLength={500}
                      onChange={(event) => updateField("description", event.target.value)}
                      placeholder={copy.fields.descriptionPlaceholder}
                      rows={4}
                      value={form.description}
                    />
                    <span>{form.description.length}/500</span>
                  </div>
                </FormField>
                <FormField error={fieldErrors.language} id="event-language" label={dict.events.language.label}>
                  <select className="event-control" id="event-language" onChange={(event) => { const next = localeSchema.safeParse(event.target.value); if (next.success) updateField("language", next.data); }} value={form.language}>
                    {LOCALES.map((option) => <option key={option} lang={option} value={option}>{dict.common.language[option]}</option>)}
                  </select>
                </FormField>
                <div className="selector-field">
                  <div className="selector-field__heading">
                    <strong>{copy.fields.categories} <span aria-hidden="true">*</span></strong>
                    <small>{copy.fields.categoriesHint}</small>
                  </div>
                  <div id="event-categories" tabIndex={-1} aria-invalid={Boolean(fieldErrors.categories || (showValidation && !form.categories.length))} aria-describedby={fieldErrors.categories || (showValidation && !form.categories.length) ? "event-categories-error" : undefined}>
                  <ChipSelector
                    label={copy.fields.categories}
                    labels={dict.events.options.categories}
                    onChange={(categories) => updateField("categories", categories)}
                    options={CATEGORY_OPTIONS}
                    selected={form.categories}
                  />
                  </div>
                  {fieldErrors.categories || (showValidation && !form.categories.length) ? <small className="event-field__error" id="event-categories-error" role="alert">{fieldErrors.categories ?? copy.validation.categories}</small> : null}
                </div>
              </Surface>

              <Surface as="section" className="create-section" depth="raised" aria-labelledby="expected-audience-title">
                <SectionHeading
                  description={copy.audience.description}
                  icon={<PeopleIcon height="20" width="20" />}
                  id="expected-audience-title"
                >
                  {copy.audience.heading}
                </SectionHeading>
                <ChipSelector
                  label={copy.audience.label}
                  labels={dict.events.options.audiences}
                  onChange={(profiles) => updateField("profiles", profiles)}
                  options={AUDIENCE_OPTIONS}
                  selected={form.profiles}
                />
              </Surface>

              <Surface as="section" className="create-section attendee-section" depth="raised" aria-labelledby="attendees-title">
                <SectionHeading
                  description={copy.attendees.description}
                  icon={<UploadIcon height="20" width="20" />}
                  id="attendees-title"
                >
                  {copy.attendees.heading}
                </SectionHeading>
                <div className="attendee-tabs" role="tablist" aria-label={copy.attendees.entryMethod}>
                  <button aria-selected={attendeeMode === "csv"} onClick={() => setAttendeeMode("csv")} role="tab" type="button">{copy.attendees.importCsv}</button>
                  <button aria-selected={attendeeMode === "manual"} onClick={() => setAttendeeMode("manual")} role="tab" type="button">{copy.attendees.addManually}</button>
                </div>

                {attendeeMode === "csv" ? (
                  <div className="attendee-import-layout" role="tabpanel">
                    <div>
                      <input
                        accept=".csv,text/csv"
                        className="visually-hidden"
                        onChange={(event) => void acceptCsvFile(event.target.files?.[0])}
                        ref={csvInputRef}
                        type="file"
                      />
                      {csvImport ? (
                        <div className="csv-complete">
                          <span className="csv-complete__icon"><DocumentIcon height="23" width="23" /></span>
                          <div className="csv-complete__copy">
                            <span className="upload-success"><CheckIcon height="14" width="14" /></span>
                            <div>
                              <strong>{csvImport.file.name}</strong>
                              <span>{t(copy.csv.ready, { size: formatBytes(csvImport.file.size) })}</span>
                            </div>
                          </div>
                          <div className="csv-results">
                            <strong>{i18n.number(csvImport.attendees)}<span>{copy.csv.attendees}</span></strong>
                            <strong>{i18n.number(csvImport.vips)}<span>{copy.csv.vips}</span></strong>
                            <strong>{i18n.number(csvImport.sponsors)}<span>{copy.csv.sponsors}</span></strong>
                          </div>
                          {csvImport.skipped > 0 ? (
                            <p className="csv-complete__note">
                              {i18n.plural(copy.csv.skipped, csvImport.skipped, { count: i18n.number(csvImport.skipped) })}
                            </p>
                          ) : null}
                          <div className="upload-actions csv-complete__actions">
                            <button onClick={() => csvInputRef.current?.click()} type="button">{copy.csv.replace}</button>
                            <button
                              aria-label={copy.csv.remove}
                              onClick={() => {
                                setCsvImport(null);
                                if (csvInputRef.current) csvInputRef.current.value = "";
                              }}
                              type="button"
                            >
                              <TrashIcon height="15" width="15" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          aria-label={copy.csv.uploadLabel}
                          className={`csv-dropzone ${csvDragging ? "csv-dropzone--dragging" : ""}`}
                          onClick={() => csvInputRef.current?.click()}
                          onDragEnter={(event) => {
                            event.preventDefault();
                            setCsvDragging(true);
                          }}
                          onDragLeave={() => setCsvDragging(false)}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => handleDrop(event, (file) => void acceptCsvFile(file))}
                          onKeyDown={(event) => handleDropzoneKey(event, csvInputRef.current)}
                          role="button"
                          tabIndex={0}
                        >
                          <span className="dropzone-icon"><DocumentIcon height="21" width="21" /></span>
                          <strong>{copy.csv.drop}</strong>
                          <span>{copy.csv.browse}</span>
                        </div>
                      )}
                      {csvError || getGuestCsvFieldError(fieldErrors) ? <p className="upload-error" role="alert">{csvError || getGuestCsvFieldError(fieldErrors)}</p> : null}
                    </div>
                    <div className="csv-requirements">
                      <strong>{copy.csv.requirements}</strong>
                      <p>{copy.csv.req1}</p>
                      <p>{copy.csv.req2}</p>
                      <p>{copy.csv.req3}</p>
                      <p>{copy.csv.req4}</p>
                      <button className="template-action" onClick={downloadGuestCsvTemplate} type="button">
                        <UploadIcon className="rotate-180" height="15" width="15" /> {copy.csv.template}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="manual-attendee-panel" role="tabpanel">
                    <div className="manual-attendee-grid" role="form">
                      <FormField id="guest-first-name" label={copy.manual.firstName}>
                        <input className="event-control" data-filled={Boolean(manualGuest.firstName)} id="guest-first-name" onChange={(event) => setManualGuest((current) => ({ ...current, firstName: event.target.value }))} placeholder={copy.manual.firstName} value={manualGuest.firstName} />
                      </FormField>
                      <FormField id="guest-last-name" label={copy.manual.lastName}>
                        <input className="event-control" data-filled={Boolean(manualGuest.lastName)} id="guest-last-name" onChange={(event) => setManualGuest((current) => ({ ...current, lastName: event.target.value }))} placeholder={copy.manual.lastName} value={manualGuest.lastName} />
                      </FormField>
                      <FormField id="guest-email" label={copy.manual.email}>
                        <input className="event-control" data-filled={Boolean(manualGuest.email)} id="guest-email" onChange={(event) => setManualGuest((current) => ({ ...current, email: event.target.value }))} placeholder={copy.manual.emailPlaceholder} type="email" value={manualGuest.email} />
                      </FormField>
                      <FormField id="guest-phone" label={copy.manual.phone}>
                        <input className="event-control" data-filled={Boolean(manualGuest.phone)} id="guest-phone" onChange={(event) => setManualGuest((current) => ({ ...current, phone: event.target.value }))} placeholder="+1 702 555 0100" type="tel" value={manualGuest.phone} />
                      </FormField>
                      <FormField id="guest-type" label={copy.manual.guestType}>
                        <select className="event-control" data-filled id="guest-type" onChange={(event) => setManualGuest((current) => ({ ...current, guestType: event.target.value as ManualGuest["guestType"] }))} value={manualGuest.guestType}>
                          <option value="Attendee">{dict.events.guestTypes.Attendee}</option>
                          <option value="VIP">{dict.events.guestTypes.VIP}</option>
                          <option value="Sponsor">{dict.events.guestTypes.Sponsor}</option>
                        </select>
                      </FormField>
                      <FormField id="guest-linkedin" label={copy.manual.linkedin}>
                        <input className="event-control" data-filled={Boolean(manualGuest.linkedin)} id="guest-linkedin" onChange={(event) => setManualGuest((current) => ({ ...current, linkedin: event.target.value }))} placeholder={copy.manual.linkedinPlaceholder} type="url" value={manualGuest.linkedin} />
                      </FormField>
                      <FormField id="guest-position" label={copy.manual.position}>
                        <input className="event-control" data-filled={Boolean(manualGuest.position)} id="guest-position" onChange={(event) => setManualGuest((current) => ({ ...current, position: event.target.value }))} placeholder={copy.manual.positionPlaceholder} value={manualGuest.position} />
                      </FormField>
                      <FormField id="guest-company" label={copy.manual.company}>
                        <input className="event-control" data-filled={Boolean(manualGuest.company)} id="guest-company" onChange={(event) => setManualGuest((current) => ({ ...current, company: event.target.value }))} placeholder={copy.manual.companyPlaceholder} value={manualGuest.company} />
                      </FormField>
                      <FormField id="guest-profile-type" label={copy.manual.profileType}>
                        <select className="event-control" data-filled={Boolean(manualGuest.profileType)} id="guest-profile-type" onChange={(event) => setManualGuest((current) => ({ ...current, profileType: event.target.value }))} value={manualGuest.profileType}>
                          <option value="">{copy.manual.notSet}</option>
                          {AUDIENCE_OPTIONS.map((option) => <option key={option} value={option}>{dict.events.options.audiences[option] ?? option}</option>)}
                        </select>
                      </FormField>
                      <TactileButton className="manual-add-action" onClick={addManualGuest} variant="graphite">
                        <PlusIcon height="15" width="15" /> {copy.manual.add}
                      </TactileButton>
                    </div>
                    {manualGuests.length ? (
                      <p className="manual-attendee-result"><CheckIcon height="14" width="14" /> {i18n.plural(copy.manual.added, manualGuests.length, { count: i18n.number(manualGuests.length) })}</p>
                    ) : null}
                    {Object.entries(fieldErrors).filter(([field]) => field.startsWith("manualGuests.")).map(([field, message]) => <p className="upload-error" key={field} role="alert">{t(copy.manual.guestError, { number: Number(field.split(".")[1]) + 1, message })}</p>)}
                  </div>
                )}
              </Surface>

              <Surface as="section" className="create-section team-section" depth="raised" aria-labelledby="event-team-title">
                <SectionHeading
                  description={copy.team.description}
                  icon={<StaffIcon height="20" width="20" />}
                  id="event-team-title"
                >
                  {copy.team.heading}
                </SectionHeading>
                <div className="team-layout">
                  <div className="organizer-block">
                    <span className="team-label">{copy.team.organizer}</span>
                    <div className="team-person">
                      <Avatar name={ORGANIZER.name} size={42} src={ORGANIZER.avatar} />
                      <div><strong>{ORGANIZER.name}</strong><span>{ORGANIZER.role}</span></div>
                    </div>
                  </div>
                  <div className="staff-block">
                    <span className="team-label">{copy.team.staffWefters}</span>
                    <div className="staff-list">
                      {selectedStaff.map((person) => (
                        <div className="staff-pill" key={person.id}>
                          <Avatar name={person.name} size={36} src={person.avatar} />
                          <div><strong>{person.name.split(" ")[0]}</strong><span>{roleLabel(person.role)}</span></div>
                          <button aria-label={t(copy.team.remove, { name: person.name })} onClick={() => toggleStaff(person.id)} type="button"><CloseIcon height="14" width="14" /></button>
                        </div>
                      ))}
                      <div className="staff-picker">
                        <TactileButton aria-expanded={staffOpen} className="assign-staff-action" onClick={() => setStaffOpen((current) => !current)}>
                          <PlusIcon height="15" width="15" /> {copy.team.assign}
                        </TactileButton>
                        {staffOpen ? (
                          <Surface className="staff-popover" depth="floating">
                            <div className="staff-popover__head"><strong>{copy.team.assign}</strong><span>{t(copy.team.selected, { count: selectedStaff.length })}</span></div>
                            {STAFF.map((person) => {
                              const selected = selectedStaffIds.includes(person.id);
                              return (
                                <button aria-pressed={selected} key={person.id} onClick={() => toggleStaff(person.id)} type="button">
                                  <Avatar name={person.name} size={34} src={person.avatar} />
                                  <span><strong>{person.name}</strong><small>{roleLabel(person.role)}</small></span>
                                  <em>{selected ? <CheckIcon height="14" width="14" /> : <PlusIcon height="14" width="14" />}</em>
                                </button>
                              );
                            })}
                          </Surface>
                        ) : null}
                      </div>
                    </div>
                    {fieldErrors.staffMembershipIds ? <p className="upload-error" role="alert">{fieldErrors.staffMembershipIds}</p> : null}
                  </div>
                </div>
              </Surface>
            </form>

            <aside className="event-summary-column" aria-label={copy.summaryLabel}>
              <Surface className="event-summary-card" depth="raised">
                <div className="event-summary-heading">
                  <DocumentIcon height="20" width="20" />
                  <h2>{copy.summary.heading}</h2>
                  <span className="summary-live-dot">{copy.summary.live}</span>
                </div>
                <div className="summary-cover">
                  {coverUrl ? (
                    <Image alt={t(copy.summary.coverAlt, { name: form.name || copy.cover.newEvent })} fill sizes="320px" src={coverUrl} unoptimized />
                  ) : (
                    <CityArtwork art={EVENT_COVER_PLACEHOLDER_ART} className="city-art--photo summary-city-art">
                      <span className="summary-art-label">{copy.summary.addCover}</span>
                    </CityArtwork>
                  )}
                </div>
                <h3 className="summary-transition" key={form.name}>{form.name || copy.summary.untitled}</h3>
                <div className="summary-meta">
                  <span><CalendarIcon height="15" width="15" /><span className="summary-transition" key={`${form.startDate}-${form.endDate}`}>{form.startDate || form.endDate ? formatEventDateRange(i18n, form.startDate, form.endDate) : dict.events.dates.choose}</span></span>
                  <span><LocationIcon height="15" width="15" /><span className="summary-transition" key={form.city}>{form.city ? dict.events.options.cities[form.city as keyof typeof dict.events.options.cities] ?? form.city : copy.fields.chooseCity}</span></span>
                  <span><PeopleIcon height="15" width="15" /><span className="summary-transition" key={form.attendees}>{form.attendees ? t(copy.summary.expectedAttendees, { count: i18n.number(Number(form.attendees)) }) : copy.summary.addEstimate}</span></span>
                </div>

                <div className="summary-group">
                  <strong>{copy.summary.context}</strong>
                  <div className="summary-chips summary-transition" key={form.categories.join("-")}>
                    {form.categories.length ? form.categories.map((category) => <span key={category}>{dict.events.options.categories[category as keyof typeof dict.events.options.categories] ?? category}</span>) : <small>{copy.summary.addCategories}</small>}
                  </div>
                </div>
                <div className="summary-group">
                  <strong>{copy.summary.audience}</strong>
                  <div className="summary-chips summary-transition" key={form.profiles.join("-")}>
                    {form.profiles.length ? (
                      <>
                        {form.profiles.slice(0, 4).map((profile) => <span key={profile}>{dict.events.options.audiences[profile as keyof typeof dict.events.options.audiences] ?? profile}</span>)}
                        {form.profiles.length > 4 ? <span>{t(copy.summary.more, { count: form.profiles.length - 4 })}</span> : null}
                      </>
                    ) : <small>{copy.summary.addProfiles}</small>}
                  </div>
                </div>
                <div className="summary-group summary-team">
                  <strong>{copy.summary.team}</strong>
                  <div className="summary-team__row summary-transition" key={selectedStaffIds.join("-")}>
                    <div className="summary-avatars">
                      {selectedStaff.slice(0, 4).map((person) => <Avatar key={person.id} name={person.name} size={30} src={person.avatar} />)}
                    </div>
                    <span>{selectedStaff.length ? t(copy.summary.staffAssigned, { count: selectedStaff.length }) : copy.summary.assignStaff}</span>
                  </div>
                </div>

                <div className="summary-actions">
                  <TactileButton className="create-event-action" disabled={actionState !== "idle"} onClick={() => (queryElement(".create-event-form") as HTMLFormElement | null)?.requestSubmit()} variant="graphite">
                    {actionState === "creating" ? copy.actions.creating : copy.actions.create}
                    {actionState !== "creating" ? <ArrowRightIcon height="15" width="15" /> : null}
                  </TactileButton>
                  <TactileButton className="save-draft-action" disabled={actionState !== "idle"} onClick={saveDraft}>
                    {copy.actions.keepDraft}
                  </TactileButton>
                </div>
              </Surface>
            </aside>
          </div>

          {toast ? (
            <Surface aria-live="polite" className={`event-toast event-toast--${toast.tone}`} depth="floating" role="status">
              <span>{toast.tone === "success" ? <CheckIcon height="17" width="17" /> : <ImageIcon height="17" width="17" />}</span>
              <div><strong>{toast.title}</strong><p>{toast.detail}</p></div>
              <button aria-label={copy.toast.dismiss} onClick={() => setToast(null)} type="button"><CloseIcon height="15" width="15" /></button>
            </Surface>
          ) : null}
        </main>
  );
}
