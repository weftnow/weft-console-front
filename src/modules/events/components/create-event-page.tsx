"use client";

import Image from "next/image";
import Link from "next/link";
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

import { CityArtwork } from "@/shared/ui/city-artwork";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
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
  name: "",
  profiles: [],
  startDate: "",
  startTime: "",
  venue: "",
};

function formatDate(value: string) {
  if (!value) return "Choose dates";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "Choose dates";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatDateRange(start: string, end: string) {
  if (!start && !end) return "Choose dates";
  if (!end || start === end) return formatDate(start || end);

  const startDate = formatDate(start);
  const endDate = formatDate(end);
  const startYear = start.slice(0, 4);
  if (startYear && startYear === end.slice(0, 4)) {
    return `${startDate.replace(`, ${startYear}`, "")} – ${endDate}`;
  }
  return `${startDate} – ${endDate}`;
}

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
  onChange,
  options,
  selected,
}: {
  label: string;
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
            <span>{option}</span>
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
  return (
    <span className="event-avatar" style={{ height: size, width: size }}>
      {src ? <Image alt={`Portrait of ${name}`} height={size} src={src} width={size} unoptimized /> : <span aria-label={name}>{name.trim().slice(0, 1).toUpperCase()}</span>}
    </span>
  );
}

export function CreateEventPage({ context }: { context: CreateEventContext }) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(context.organizations[0]?.id ?? "");
  const [form, setForm] = useState<EventForm>(INITIAL_FORM);
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
  const ORGANIZER = { name: context.organizer.name, avatar: context.organizer.avatar, role: "Organizer" };
  const selectedStaff = STAFF.filter((person) => selectedStaffIds.includes(person.id));
  const nameError = fieldErrors.name ?? (showValidation && !form.name.trim() ? "Add an event name." : undefined);
  const cityError = fieldErrors.city ?? (showValidation && !form.city ? "Choose a city." : undefined);
  const startError = fieldErrors.startDate ?? (showValidation && !form.startDate ? "Choose a start date." : undefined);
  const endError = fieldErrors.endDate ?? (showValidation && !form.endDate ? "Choose an end date." : undefined);

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
        detail: "Choose a JPG, PNG, or WebP image.",
        title: "That file is not an image",
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
      setCsvError("Choose a .csv file to import attendees.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setCsvImport(null);
      setCsvError("The file must be 1 MiB or smaller.");
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
          ? `${error.message}. Check that the first row names the columns.`
          : "We could not read attendee rows from this file.",
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
        detail: "Add a valid first name and email, and keep the guest list under 2,000 people.",
        title: "Guest details need attention",
        tone: "neutral",
      });
      return;
    }
    setManualGuests((current) => [...current, manualGuest]);
    showToast({
      detail: `${manualGuest.firstName} was added to this form's guest list.`,
      title: "Guest added",
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
        detail: "Complete the highlighted fields before creating the event.",
        title: "A few details are missing",
        tone: "neutral",
      });
      requestAnimationFrame(() => document.querySelector<HTMLInputElement | HTMLTextAreaElement>(".create-event-form [aria-invalid='true']")?.focus());
      return;
    }
    setActionState("creating");
    try {
      let coverImage: string | null = null;
      if (coverFile) {
        try { coverImage = await normalizeCoverImage(coverFile); }
        catch { throw new ApplicationError("VALIDATION_ERROR", "The selected cover could not be processed.", { coverImage: "Choose a valid JPG, PNG or WebP image." }); }
      }
      let csvText: string | null = null;
      if (csvImport) {
        try { csvText = await csvImport.file.text(); }
        catch { throw new ApplicationError("VALIDATION_ERROR", "The CSV could not be read.", { "attendeeImport.csvText": "Choose the CSV file again." }); }
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
        throw new ApplicationError("VALIDATION_ERROR", "Check the highlighted fields.", zodFieldErrors(validated.error));
      }
      setFieldErrors({});
      const created = await submitCreateEvent(validated.data);
      router.push(`/events/${created.id}`);
    } catch (error) {
      submitGuardRef.current = false;
      setActionState("idle");
      const appError = error instanceof ApplicationError ? error : new ApplicationError("INTERNAL_ERROR", "The event could not be created. Your form is still here; try again.");
      setFieldErrors(appError.fields ?? {});
      if (Object.keys(appError.fields ?? {}).some((field) => field.startsWith("attendeeImport"))) setAttendeeMode("csv");
      else if (Object.keys(appError.fields ?? {}).some((field) => field.startsWith("manualGuests"))) setAttendeeMode("manual");
      showToast({
        detail: appError.message,
        title: appError.code === "UNAUTHORIZED" ? "Authentication required" : appError.code === "FORBIDDEN" ? "Access required" : "Event could not be created",
        tone: "neutral",
      });
      if (appError.fields) requestAnimationFrame(() => {
        const first = Object.keys(appError.fields ?? {})[0];
        const id = ({ organizationId: "event-organization", name: "event-name", city: "event-city", venue: "event-venue", expectedAttendees: "event-attendees", startDate: "event-start-date", startTime: "event-start-time", endDate: "event-end-date", endTime: "event-end-time", description: "event-description", categories: "event-categories" } as Record<string, string>)[first];
        (id ? document.getElementById(id) : document.querySelector<HTMLElement>(".create-event-form [aria-invalid='true']"))?.focus();
      });
    }
  }

  function saveDraft() {
    showToast({
      detail: "This form remains in this tab. It will be lost if you refresh or leave the page.",
      title: "Draft kept in this tab",
      tone: "neutral",
    });
  }

  const coverUpload = (
    <div
      aria-label="Upload event cover image"
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
      <strong>Upload cover</strong>
      <span>JPG, PNG or WebP · 16:9 works best</span>
    </div>
  );

  return (
    <div className="overview-shell create-event-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="events" />
        <main className="dashboard-main create-event-main">
          <header className="create-event-header">
            <Link className="create-back-link" href="/events">
              <ArrowLeftIcon height="15" width="15" /> Events
            </Link>
            <h1>Create event</h1>
            <p>Set up a new We Are One experience.</p>
          </header>

          <div className="create-event-layout">
            <form aria-busy={actionState !== "idle"} className="create-event-form" inert={actionState !== "idle"} noValidate onSubmit={createEvent}>
              <Surface as="section" className="create-section" depth="raised" aria-labelledby="event-basics-title">
                <SectionHeading
                  description="The essentials guests and staff will see."
                  icon={<CalendarIcon height="20" width="20" />}
                  id="event-basics-title"
                >
                  Event basics
                </SectionHeading>

                <div className="event-basics-grid">
                  {context.organizations.length > 1 ? <FormField error={fieldErrors.organizationId} id="event-organization" label="Organization" required>
                    <select aria-describedby={fieldErrors.organizationId ? "event-organization-error" : undefined} aria-invalid={Boolean(fieldErrors.organizationId)} className="event-control" id="event-organization" onChange={(event) => { setOrganizationId(event.target.value); setSelectedStaffIds([]); }} value={organizationId}>
                      {context.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
                    </select>
                  </FormField> : null}
                  <FormField error={nameError} id="event-name" label="Event name" required>
                    <input
                      aria-describedby={nameError ? "event-name-error" : undefined}
                      aria-invalid={Boolean(nameError)}
                      className="event-control"
                      data-filled={Boolean(form.name)}
                      id="event-name"
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder="Name your event"
                      value={form.name}
                    />
                  </FormField>
                  <FormField error={cityError} id="event-city" label="City" required>
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
                        <option value="">Choose a city</option>
                        <option>Las Vegas, USA</option>
                        <option>Singapore</option>
                        <option>Davos, Switzerland</option>
                        <option>Aspen, USA</option>
                        <option>Monaco</option>
                      </select>
                    </span>
                  </FormField>
                  <FormField error={fieldErrors.venue} id="event-venue" label="Venue">
                    <input
                      aria-describedby={fieldErrors.venue ? "event-venue-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.venue)}
                      className="event-control"
                      data-filled={Boolean(form.venue)}
                      id="event-venue"
                      onChange={(event) => updateField("venue", event.target.value)}
                      placeholder="Add a venue"
                      value={form.venue}
                    />
                  </FormField>
                  <FormField error={fieldErrors.expectedAttendees} id="event-attendees" label="Expected attendees">
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
                  <FormField error={startError} id="event-start-date" label="Start date" required>
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
                  <FormField error={fieldErrors.startTime} id="event-start-time" label="Start time">
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
                  <FormField error={endError} id="event-end-date" label="End date" required>
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
                  <FormField error={fieldErrors.endTime} id="event-end-time" label="End time">
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
                  <span className="cover-field__label">Cover image</span>
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
                        <Image alt={`Cover preview for ${form.name || "new event"}`} fill sizes="(max-width: 620px) 100vw, 540px" src={coverUrl} unoptimized />
                      </div>
                      <div className="cover-complete__details">
                        <span className="upload-success"><CheckIcon height="15" width="15" /></span>
                        <div>
                          <strong>{coverFile.name}</strong>
                          <span>{formatBytes(coverFile.size)} · Ready in the event preview</span>
                        </div>
                        <div className="upload-actions">
                          <button onClick={() => coverInputRef.current?.click()} type="button">Replace</button>
                          <button aria-label="Remove cover image" onClick={removeCover} type="button"><TrashIcon height="15" width="15" /></button>
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
                  description="Give Weft enough signal to understand the room."
                  icon={<SparklesIcon height="20" width="20" />}
                  id="event-context-title"
                >
                  Event context
                </SectionHeading>
                <FormField error={fieldErrors.description ?? (showValidation && !form.description.trim() ? "Add a description." : undefined)} id="event-description" label="Event description" required>
                  <div className="textarea-wrap">
                    <textarea
                      aria-describedby={fieldErrors.description || (showValidation && !form.description.trim()) ? "event-description-error" : undefined}
                      aria-invalid={Boolean(fieldErrors.description || (showValidation && !form.description.trim()))}
                      className="event-control event-textarea"
                      data-filled={Boolean(form.description)}
                      id="event-description"
                      maxLength={500}
                      onChange={(event) => updateField("description", event.target.value)}
                      placeholder="Describe the gathering and who it brings together"
                      rows={4}
                      value={form.description}
                    />
                    <span>{form.description.length}/500</span>
                  </div>
                </FormField>
                <div className="selector-field">
                  <div className="selector-field__heading">
                    <strong>Event categories <span aria-hidden="true">*</span></strong>
                    <small>Select the signals that best describe the event.</small>
                  </div>
                  <div id="event-categories" tabIndex={-1} aria-invalid={Boolean(fieldErrors.categories || (showValidation && !form.categories.length))} aria-describedby={fieldErrors.categories || (showValidation && !form.categories.length) ? "event-categories-error" : undefined}>
                  <ChipSelector
                    label="Event categories"
                    onChange={(categories) => updateField("categories", categories)}
                    options={CATEGORY_OPTIONS}
                    selected={form.categories}
                  />
                  </div>
                  {fieldErrors.categories || (showValidation && !form.categories.length) ? <small className="event-field__error" id="event-categories-error" role="alert">{fieldErrors.categories ?? "Choose at least one category."}</small> : null}
                </div>
              </Surface>

              <Surface as="section" className="create-section" depth="raised" aria-labelledby="expected-audience-title">
                <SectionHeading
                  description="Who do you expect to be in the room?"
                  icon={<PeopleIcon height="20" width="20" />}
                  id="expected-audience-title"
                >
                  Expected audience
                </SectionHeading>
                <ChipSelector
                  label="Expected audience profiles"
                  onChange={(profiles) => updateField("profiles", profiles)}
                  options={AUDIENCE_OPTIONS}
                  selected={form.profiles}
                />
              </Surface>

              <Surface as="section" className="create-section attendee-section" depth="raised" aria-labelledby="attendees-title">
                <SectionHeading
                  description="Import your guest list or add people manually."
                  icon={<UploadIcon height="20" width="20" />}
                  id="attendees-title"
                >
                  Attendees
                </SectionHeading>
                <div className="attendee-tabs" role="tablist" aria-label="Attendee entry method">
                  <button aria-selected={attendeeMode === "csv"} onClick={() => setAttendeeMode("csv")} role="tab" type="button">Import CSV</button>
                  <button aria-selected={attendeeMode === "manual"} onClick={() => setAttendeeMode("manual")} role="tab" type="button">Add manually</button>
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
                              <span>{formatBytes(csvImport.file.size)} · Ready to import</span>
                            </div>
                          </div>
                          <div className="csv-results">
                            <strong>{csvImport.attendees.toLocaleString()}<span>attendees</span></strong>
                            <strong>{csvImport.vips.toLocaleString()}<span>VIPs</span></strong>
                            <strong>{csvImport.sponsors.toLocaleString()}<span>sponsors</span></strong>
                          </div>
                          {csvImport.skipped > 0 ? (
                            <p className="csv-complete__note">
                              {`${csvImport.skipped.toLocaleString()} empty ${csvImport.skipped === 1 ? "row" : "rows"} skipped.`}
                            </p>
                          ) : null}
                          <div className="upload-actions csv-complete__actions">
                            <button onClick={() => csvInputRef.current?.click()} type="button">Replace file</button>
                            <button
                              aria-label="Remove CSV file"
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
                          aria-label="Upload attendee CSV"
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
                          <strong>Drop your CSV here</strong>
                          <span>or click to browse · maximum 1 MiB</span>
                        </div>
                      )}
                      {csvError || getGuestCsvFieldError(fieldErrors) ? <p className="upload-error" role="alert">{csvError || getGuestCsvFieldError(fieldErrors)}</p> : null}
                    </div>
                    <div className="csv-requirements">
                      <strong>CSV requirements</strong>
                      <p>Required: at least one name column and a name for each guest.</p>
                      <p>Email is optional for CSV guests.</p>
                      <p>Optional: phone, company, position, LinkedIn, profile type, guest type</p>
                      <p>Guest type accepts Attendee, VIP, or Sponsor.</p>
                      <button className="template-action" onClick={downloadGuestCsvTemplate} type="button">
                        <UploadIcon className="rotate-180" height="15" width="15" /> Download template
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="manual-attendee-panel" role="tabpanel">
                    <div className="manual-attendee-grid" role="form">
                      <FormField id="guest-first-name" label="First name">
                        <input className="event-control" data-filled={Boolean(manualGuest.firstName)} id="guest-first-name" onChange={(event) => setManualGuest((current) => ({ ...current, firstName: event.target.value }))} placeholder="First name" value={manualGuest.firstName} />
                      </FormField>
                      <FormField id="guest-last-name" label="Last name">
                        <input className="event-control" data-filled={Boolean(manualGuest.lastName)} id="guest-last-name" onChange={(event) => setManualGuest((current) => ({ ...current, lastName: event.target.value }))} placeholder="Last name" value={manualGuest.lastName} />
                      </FormField>
                      <FormField id="guest-email" label="Email">
                        <input className="event-control" data-filled={Boolean(manualGuest.email)} id="guest-email" onChange={(event) => setManualGuest((current) => ({ ...current, email: event.target.value }))} placeholder="name@company.com" type="email" value={manualGuest.email} />
                      </FormField>
                      <FormField id="guest-phone" label="Phone">
                        <input className="event-control" data-filled={Boolean(manualGuest.phone)} id="guest-phone" onChange={(event) => setManualGuest((current) => ({ ...current, phone: event.target.value }))} placeholder="+1 702 555 0100" type="tel" value={manualGuest.phone} />
                      </FormField>
                      <FormField id="guest-type" label="Guest type">
                        <select className="event-control" data-filled id="guest-type" onChange={(event) => setManualGuest((current) => ({ ...current, guestType: event.target.value as ManualGuest["guestType"] }))} value={manualGuest.guestType}>
                          <option>Attendee</option>
                          <option>VIP</option>
                          <option>Sponsor</option>
                        </select>
                      </FormField>
                      <FormField id="guest-linkedin" label="LinkedIn">
                        <input className="event-control" data-filled={Boolean(manualGuest.linkedin)} id="guest-linkedin" onChange={(event) => setManualGuest((current) => ({ ...current, linkedin: event.target.value }))} placeholder="linkedin.com/in/profile" type="url" value={manualGuest.linkedin} />
                      </FormField>
                      <FormField id="guest-position" label="Position">
                        <input className="event-control" data-filled={Boolean(manualGuest.position)} id="guest-position" onChange={(event) => setManualGuest((current) => ({ ...current, position: event.target.value }))} placeholder="Founder & CEO" value={manualGuest.position} />
                      </FormField>
                      <FormField id="guest-company" label="Company">
                        <input className="event-control" data-filled={Boolean(manualGuest.company)} id="guest-company" onChange={(event) => setManualGuest((current) => ({ ...current, company: event.target.value }))} placeholder="Company name" value={manualGuest.company} />
                      </FormField>
                      <FormField id="guest-profile-type" label="Profile type">
                        <select className="event-control" data-filled={Boolean(manualGuest.profileType)} id="guest-profile-type" onChange={(event) => setManualGuest((current) => ({ ...current, profileType: event.target.value }))} value={manualGuest.profileType}>
                          <option value="">Not set</option>
                          {AUDIENCE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </FormField>
                      <TactileButton className="manual-add-action" onClick={addManualGuest} variant="graphite">
                        <PlusIcon height="15" width="15" /> Add guest
                      </TactileButton>
                    </div>
                    {manualGuests.length ? (
                      <p className="manual-attendee-result"><CheckIcon height="14" width="14" /> {manualGuests.length} {manualGuests.length === 1 ? "guest" : "guests"} added in this session</p>
                    ) : null}
                    {Object.entries(fieldErrors).filter(([field]) => field.startsWith("manualGuests.")).map(([field, message]) => <p className="upload-error" key={field} role="alert">Guest {Number(field.split(".")[1]) + 1}: {message}</p>)}
                  </div>
                )}
              </Surface>

              <Surface as="section" className="create-section team-section" depth="raised" aria-labelledby="event-team-title">
                <SectionHeading
                  description="Assign the people who will help run the room."
                  icon={<StaffIcon height="20" width="20" />}
                  id="event-team-title"
                >
                  Event team
                </SectionHeading>
                <div className="team-layout">
                  <div className="organizer-block">
                    <span className="team-label">Organizer</span>
                    <div className="team-person">
                      <Avatar name={ORGANIZER.name} size={42} src={ORGANIZER.avatar} />
                      <div><strong>{ORGANIZER.name}</strong><span>{ORGANIZER.role}</span></div>
                    </div>
                  </div>
                  <div className="staff-block">
                    <span className="team-label">Staff / Wefters</span>
                    <div className="staff-list">
                      {selectedStaff.map((person) => (
                        <div className="staff-pill" key={person.id}>
                          <Avatar name={person.name} size={36} src={person.avatar} />
                          <div><strong>{person.name.split(" ")[0]}</strong><span>{person.role}</span></div>
                          <button aria-label={`Remove ${person.name}`} onClick={() => toggleStaff(person.id)} type="button"><CloseIcon height="14" width="14" /></button>
                        </div>
                      ))}
                      <div className="staff-picker">
                        <TactileButton aria-expanded={staffOpen} className="assign-staff-action" onClick={() => setStaffOpen((current) => !current)}>
                          <PlusIcon height="15" width="15" /> Assign staff
                        </TactileButton>
                        {staffOpen ? (
                          <Surface className="staff-popover" depth="floating">
                            <div className="staff-popover__head"><strong>Assign staff</strong><span>{selectedStaff.length} selected</span></div>
                            {STAFF.map((person) => {
                              const selected = selectedStaffIds.includes(person.id);
                              return (
                                <button aria-pressed={selected} key={person.id} onClick={() => toggleStaff(person.id)} type="button">
                                  <Avatar name={person.name} size={34} src={person.avatar} />
                                  <span><strong>{person.name}</strong><small>{person.role}</small></span>
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

            <aside className="event-summary-column" aria-label="Live event summary">
              <Surface className="event-summary-card" depth="raised">
                <div className="event-summary-heading">
                  <DocumentIcon height="20" width="20" />
                  <h2>Event summary</h2>
                  <span className="summary-live-dot">Live</span>
                </div>
                <div className="summary-cover">
                  {coverUrl ? (
                    <Image alt={`Cover for ${form.name || "new event"}`} fill sizes="320px" src={coverUrl} unoptimized />
                  ) : (
                    <CityArtwork art={EVENT_COVER_PLACEHOLDER_ART} className="city-art--photo summary-city-art">
                      <span className="summary-art-label">ADD A COVER IMAGE</span>
                    </CityArtwork>
                  )}
                </div>
                <h3 className="summary-transition" key={form.name}>{form.name || "Untitled event"}</h3>
                <div className="summary-meta">
                  <span><CalendarIcon height="15" width="15" /><span className="summary-transition" key={`${form.startDate}-${form.endDate}`}>{formatDateRange(form.startDate, form.endDate)}</span></span>
                  <span><LocationIcon height="15" width="15" /><span className="summary-transition" key={form.city}>{form.city || "Choose a city"}</span></span>
                  <span><PeopleIcon height="15" width="15" /><span className="summary-transition" key={form.attendees}>{form.attendees ? `${form.attendees} expected attendees` : "Add an attendee estimate"}</span></span>
                </div>

                <div className="summary-group">
                  <strong>Context</strong>
                  <div className="summary-chips summary-transition" key={form.categories.join("-")}>
                    {form.categories.length ? form.categories.map((category) => <span key={category}>{category}</span>) : <small>Add event categories</small>}
                  </div>
                </div>
                <div className="summary-group">
                  <strong>Expected audience</strong>
                  <div className="summary-chips summary-transition" key={form.profiles.join("-")}>
                    {form.profiles.length ? (
                      <>
                        {form.profiles.slice(0, 4).map((profile) => <span key={profile}>{profile}</span>)}
                        {form.profiles.length > 4 ? <span>+{form.profiles.length - 4} more</span> : null}
                      </>
                    ) : <small>Add audience profiles</small>}
                  </div>
                </div>
                <div className="summary-group summary-team">
                  <strong>Team</strong>
                  <div className="summary-team__row summary-transition" key={selectedStaffIds.join("-")}>
                    <div className="summary-avatars">
                      {selectedStaff.slice(0, 4).map((person) => <Avatar key={person.id} name={person.name} size={30} src={person.avatar} />)}
                    </div>
                    <span>{selectedStaff.length ? `${selectedStaff.length} staff assigned` : "Assign event staff"}</span>
                  </div>
                </div>

                <div className="summary-actions">
                  <TactileButton className="create-event-action" disabled={actionState !== "idle"} onClick={() => document.querySelector<HTMLFormElement>(".create-event-form")?.requestSubmit()} variant="graphite">
                    {actionState === "creating" ? "Creating…" : "Create event"}
                    {actionState !== "creating" ? <ArrowRightIcon height="15" width="15" /> : null}
                  </TactileButton>
                  <TactileButton className="save-draft-action" disabled={actionState !== "idle"} onClick={saveDraft}>
                    Keep draft in this tab
                  </TactileButton>
                </div>
              </Surface>
            </aside>
          </div>

          {toast ? (
            <Surface aria-live="polite" className={`event-toast event-toast--${toast.tone}`} depth="floating" role="status">
              <span>{toast.tone === "success" ? <CheckIcon height="17" width="17" /> : <ImageIcon height="17" width="17" />}</span>
              <div><strong>{toast.title}</strong><p>{toast.detail}</p></div>
              <button aria-label="Dismiss notification" onClick={() => setToast(null)} type="button"><CloseIcon height="15" width="15" /></button>
            </Surface>
          ) : null}
        </main>
      </div>
    </div>
  );
}
