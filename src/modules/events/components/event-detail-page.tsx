"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ComponentType,
  type CSSProperties,
  type SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CityArtwork } from "@/shared/ui/city-artwork";
import { ConsoleSidebar } from "@/shared/ui/console-sidebar";
import type { ConsoleContext } from "@/modules/organizations/types";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  DocumentIcon,
  EditIcon,
  LocationIcon,
  OutcomesIcon,
  PeopleIcon,
  SparklesIcon,
  StaffIcon,
  StarIcon,
} from "@/shared/ui/icons";
import { Surface } from "@/shared/ui/surface";
import { AttendeeRoster } from "./attendee-roster";
import { KamiWorkspace } from "./kami-workspace";
import type { EventDetailDto } from "../event-dto";
import {
  EVENT_COVER_PLACEHOLDER_ART,
  deriveEventMetrics,
  deriveEventStatus,
  type EventDetailTab,
  type EventRecord,
  formatEventDateRange,
  formatRelativeActivity,
} from "../event-record";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const tabs: { icon: Icon; id: EventDetailTab; label: string }[] = [
  { id: "overview", label: "Overview", icon: CalendarIcon },
  { id: "attendees", label: "Attendees", icon: PeopleIcon },
  { id: "kami", label: "Kami", icon: SparklesIcon },
  { id: "staff", label: "Staff", icon: StaffIcon },
  { id: "insights", label: "Insights", icon: OutcomesIcon },
];

const tabDescriptions = {
  insights: "Event insights appear once introductions start.",
  staff: "Staff coordination arrives in a future release.",
} as const;

const statusLabels = {
  completed: "Completed",
  live: "Live",
  upcoming: "Upcoming",
} as const;

export function EventDetailSkeleton() {
  return (
    <div className="overview-shell event-detail-shell" aria-busy="true">
      <div className="dashboard-layout">
        <main className="dashboard-main event-detail-main">
          <div className="event-detail-skeleton event-detail-skeleton--header" />
          <div className="event-detail-skeleton event-detail-skeleton--hero" />
          <div className="event-detail-skeleton event-detail-skeleton--tabs" />
          <div className="event-detail-metrics">
            {[0, 1, 2, 3].map((item) => (
              <div className="event-detail-skeleton event-detail-skeleton--metric" key={item} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export function MissingEvent() {
  return (
    <div className="overview-shell event-detail-shell">
      <div className="dashboard-layout">
        <main className="dashboard-main event-detail-main">
          <Surface className="event-detail-missing" depth="raised">
            <span className="event-detail-missing__icon"><CalendarIcon height="24" width="24" /></span>
            <h1>Event not found</h1>
            <p>This event is unavailable.</p>
            <Link className="tactile-button tactile-button--graphite event-detail-missing__action" href="/events">
              <ArrowLeftIcon height="15" width="15" /> Back to events
            </Link>
          </Surface>
        </main>
      </div>
    </div>
  );
}

function EventTabs({
  activeTab,
  eventId,
  onSelect,
}: {
  activeTab: EventDetailTab;
  eventId: string;
  onSelect: (tab: EventDetailTab) => void;
}) {
  return (
    <nav aria-label="Event sections" className="event-detail-tabs surface-inset">
      {tabs.map(({ icon: IconComponent, id, label }) => (
        <Link
          aria-current={activeTab === id ? "page" : undefined}
          className="event-detail-tab"
          href={`/events/${eventId}?tab=${id}`}
          key={id}
          onClick={() => onSelect(id)}
        >
          <IconComponent height="15" width="15" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MetricCard({ icon: IconComponent, label, value }: { icon: Icon; label: string; value: number }) {
  return (
    <Surface as="article" className="event-detail-metric" depth="raised">
      <Surface className="event-detail-metric__icon" depth="inset">
        <IconComponent height="18" width="18" />
      </Surface>
      <div>
        <strong className="event-detail-metric__value" key={value}>{value.toLocaleString()}</strong>
        <span>{label}</span>
      </div>
    </Surface>
  );
}

function EmptyChips({ children }: { children: string }) {
  return <span className="event-detail-empty-copy">{children}</span>;
}

function EventSummary({ event }: { event: EventRecord }) {
  return (
    <Surface as="section" className="event-detail-panel event-detail-summary" depth="raised" aria-labelledby="event-summary-title">
      <div className="event-detail-panel__heading">
        <DocumentIcon height="20" width="20" />
        <h2 id="event-summary-title">Event summary</h2>
      </div>
      <Surface className="event-detail-summary__well" depth="inset">
        <div className="event-detail-summary__topline">
          <div className="event-detail-summary__item">
            <CalendarIcon height="18" width="18" />
            <div><span>Date</span><strong>{formatEventDateRange(event.startDate, event.endDate)}</strong></div>
          </div>
          <div className="event-detail-summary__item">
            <LocationIcon height="18" width="18" />
            <div>
              <span>Venue</span>
              <strong>{event.venue || "No venue added"}</strong>
              <small>{event.city || "No city added"}</small>
              </div>
          </div>
          <div className="event-detail-summary__item">
            <PeopleIcon height="18" width="18" />
            <div>
              <span>Expected attendees</span>
              <strong>{event.expectedAttendees === null ? "No estimate added" : event.expectedAttendees.toLocaleString()}</strong>
            </div>
          </div>
        </div>
        <div className="event-detail-summary__row">
          <DocumentIcon height="18" width="18" />
          <span>Description</span>
          <p>{event.description || "No description added."}</p>
        </div>
        <div className="event-detail-summary__row event-detail-summary__row--chips">
          <SparklesIcon height="18" width="18" />
          <span>Categories</span>
          <div className="event-detail-chips">
            {event.categories.length
              ? event.categories.map((category) => <span key={category}>{category}</span>)
              : <EmptyChips>No categories selected</EmptyChips>}
          </div>
        </div>
        <div className="event-detail-summary__row event-detail-summary__row--chips">
          <PeopleIcon height="18" width="18" />
          <span>Expected audience</span>
          <div className="event-detail-chips">
            {event.expectedAudience.length
              ? event.expectedAudience.map((profile) => <span key={profile}>{profile}</span>)
              : <EmptyChips>No audience profiles selected</EmptyChips>}
          </div>
        </div>
      </Surface>
    </Surface>
  );
}

function ReadinessCard({ event }: { event: EventRecord }) {
  const metrics = deriveEventMetrics(event);
  const readiness = [
    {
      detail: "Complete",
      label: "Event details",
      ready: Boolean(event.name && event.city && event.startDate && event.endDate),
    },
    {
      detail: "Complete",
      label: "Event context",
      ready: Boolean(event.description && event.categories.length),
    },
    { detail: "Complete", label: "Attendees imported", ready: metrics.attendees > 0 },
    { detail: "Complete", label: "Staff assigned", ready: metrics.staff > 0 },
  ];

  return (
    <Surface as="section" className="event-detail-panel event-readiness" depth="raised" aria-labelledby="event-readiness-title">
      <div className="event-detail-panel__heading">
        <CheckIcon height="20" width="20" />
        <h2 id="event-readiness-title">Event readiness</h2>
      </div>
      <ul>
        {readiness.map((item, index) => (
          <li className={item.ready ? "event-readiness__item event-readiness__item--ready" : "event-readiness__item"} key={item.label} style={{ "--readiness-index": index } as CSSProperties}>
            <span className="event-readiness__check"><CheckIcon height="13" width="13" /></span>
            <strong>{item.label}</strong>
            <span>{item.ready ? item.detail : "Needs attention"}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function QuickActions({ eventId, onSelect }: { eventId: string; onSelect: (tab: EventDetailTab) => void }) {
  const actions: { icon: Icon; label: string; tab: EventDetailTab }[] = [
    { icon: PeopleIcon, label: "Manage attendees", tab: "attendees" },
    { icon: DocumentIcon, label: "View attendee list", tab: "attendees" },
    { icon: StaffIcon, label: "Manage staff", tab: "staff" },
    { icon: OutcomesIcon, label: "View event insights", tab: "insights" },
  ];

  return (
    <Surface as="section" className="event-detail-panel event-quick-actions" depth="raised" aria-labelledby="event-quick-actions-title">
      <div className="event-detail-panel__heading">
        <SparklesIcon height="20" width="20" />
        <h2 id="event-quick-actions-title">Quick actions</h2>
      </div>
      <div className="event-quick-actions__list">
        {actions.map(({ icon: IconComponent, label, tab }) => (
          <Link className="tactile-button event-quick-action" href={`/events/${eventId}?tab=${tab}`} key={label} onClick={() => onSelect(tab)}>
            <IconComponent height="16" width="16" />
            <span>{label}</span>
            <ArrowRightIcon height="14" width="14" />
          </Link>
        ))}
      </div>
    </Surface>
  );
}

function RecentActivity({ event }: { event: EventRecord }) {
  const actualAttendees = deriveEventMetrics(event).attendees;
  const activities: { detail: string; icon: Icon; label: string; timestamp: string }[] = [];

  if (actualAttendees > 0) {
    activities.push({
      detail: `${actualAttendees.toLocaleString()} attendees added to the event`,
      icon: DocumentIcon,
      label: "Attendee list imported",
      timestamp: event.updatedAt,
    });
  }
  if (event.staff.length) {
    activities.push({
      detail: event.staff.length === 1
        ? `${event.staff[0].name} assigned`
        : `${event.staff[0].name} and ${event.staff.length - 1} more assigned`,
      icon: StaffIcon,
      label: "Staff assigned",
      timestamp: event.updatedAt,
    });
  }
  if (event.name && event.city && event.startDate && event.endDate) {
    activities.push({
      detail: "Dates and location confirmed",
      icon: EditIcon,
      label: "Event details updated",
      timestamp: event.updatedAt,
    });
  }
  activities.push({
    detail: event.name,
    icon: CalendarIcon,
    label: "Event created",
    timestamp: event.createdAt,
  });

  return (
    <Surface as="section" className="event-detail-panel event-activity" depth="raised" aria-labelledby="event-activity-title">
      <div className="event-detail-panel__heading">
        <ClockIcon height="20" width="20" />
        <h2 id="event-activity-title">Recent activity</h2>
      </div>
      <ul>
        {activities.slice(0, 4).map(({ detail, icon: IconComponent, label, timestamp }) => (
          <li key={`${label}-${timestamp}`}>
            <span className="event-activity__icon"><IconComponent height="15" width="15" /></span>
            <div><strong>{label}</strong><span>{detail}</span></div>
            <time dateTime={timestamp}>{formatRelativeActivity(timestamp)}</time>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function KamiCard({ eventId, onSelect }: { eventId: string; onSelect: (tab: EventDetailTab) => void }) {
  return (
    <Surface as="section" className="event-detail-panel event-kami-card" depth="raised" aria-labelledby="event-kami-title">
      <Surface className="event-kami-card__mark" depth="inset"><SparklesIcon height="25" width="25" /></Surface>
      <h2 id="event-kami-title">Kami is ready</h2>
      <p>Kami will be active for this event using the default configuration.</p>
      <Link className="tactile-button event-kami-card__action" href={`/events/${eventId}?tab=kami`} onClick={() => onSelect("kami")}>
        View Kami settings <ArrowRightIcon height="14" width="14" />
      </Link>
    </Surface>
  );
}

function EventTabPlaceholder({ activeTab, eventId, onSelect }: { activeTab: Exclude<EventDetailTab, "overview" | "attendees" | "kami">; eventId: string; onSelect: (tab: EventDetailTab) => void }) {
  const tab = tabs.find((item) => item.id === activeTab)!;
  const IconComponent = tab.icon;

  return (
    <Surface className="event-tab-placeholder" depth="raised">
      <Surface aria-label={tab.label} className="event-tab-placeholder__icon" depth="inset"><IconComponent height="24" width="24" /></Surface>
      <h2>Coming soon</h2>
      <p>{tabDescriptions[activeTab]}</p>
      <Link className="tactile-button tactile-button--graphite event-tab-placeholder__action" href={`/events/${eventId}?tab=overview`} onClick={() => onSelect("overview")}>
        Return to overview <ArrowRightIcon height="15" width="15" />
      </Link>
    </Surface>
  );
}

export function EventDetailPage({ event, initialTab, context }: { event: EventDetailDto; initialTab: EventDetailTab; context: ConsoleContext }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EventDetailTab>(initialTab);
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
  }, []);

  const showNotice = (message: string) => {
    setNotice(message);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(""), 3000);
  };

  const metrics = useMemo(() => deriveEventMetrics(event), [event]);

  const status = deriveEventStatus(event);
  const art = event.coverImage ? { ...EVENT_COVER_PLACEHOLDER_ART, image: event.coverImage } : EVENT_COVER_PLACEHOLDER_ART;

  const copyEventLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showNotice("Event link copied.");
    } catch {
      showNotice("The event link could not be copied in this browser.");
    }
  };

  return (
    <div className="overview-shell event-detail-shell">
      <div className="dashboard-layout">
        <ConsoleSidebar active="events" context={context} />
        <main className="dashboard-main event-detail-main">
          <header className="event-detail-header">
            <div className="event-detail-header__copy">
              <Link className="create-back-link" href="/events"><ArrowLeftIcon height="15" width="15" /> Events</Link>
              <div className="event-detail-title-row">
                <h1>{event.name}</h1>
                <span className={`event-detail-status event-detail-status--${status}`}>{statusLabels[status]}</span>
              </div>
              <p className="event-detail-header__meta">
                <span>{formatEventDateRange(event.startDate, event.endDate)}</span>
                <span>{event.venue || "Venue not added"}</span>
                <span>{event.city || "City not added"}</span>
              </p>
            </div>
            <div className="event-detail-header__actions">
              <details className="event-detail-more">
                <summary className="tactile-button event-detail-header__action">More <ChevronDownIcon height="15" width="15" /></summary>
                <Surface className="event-detail-more__menu" depth="floating">
                  <button aria-label="Copy event link" onClick={() => void copyEventLink()} type="button">Copy event link</button>
                </Surface>
              </details>
            </div>
          </header>

          <Surface className="event-detail-hero" depth="raised">
            {event.coverImage ? (
              <Image alt={`Cover for ${event.name}`} fill priority sizes="(max-width: 760px) 100vw, calc(100vw - 260px)" src={event.coverImage} unoptimized />
            ) : (
              <CityArtwork art={art} className="city-art--photo event-detail-hero__art" eager>
                <span className="event-detail-hero__scrim" />
                <span className="event-detail-hero__fallback-label">No cover image</span>
              </CityArtwork>
            )}
          </Surface>

          <EventTabs activeTab={activeTab} eventId={event.id} onSelect={setActiveTab} />

          {activeTab === "overview" ? (
            <div className="event-detail-tab-content" key="overview">
              <div className="event-detail-metrics">
                <MetricCard icon={PeopleIcon} label={metrics.attendeesAreExpected ? "Expected attendees" : "Attendees"} value={metrics.attendees} />
                <MetricCard icon={StarIcon} label="VIPs" value={metrics.vips} />
                <MetricCard icon={OutcomesIcon} label="Sponsors" value={metrics.sponsors} />
                <MetricCard icon={StaffIcon} label="Staff assigned" value={metrics.staff} />
              </div>
              <div className="event-detail-overview-grid">
                <div className="event-detail-primary-column">
                  <EventSummary event={event} />
                  <RecentActivity event={event} />
                </div>
                <aside className="event-detail-rail" aria-label="Event operations">
                  <ReadinessCard event={event} />
                  <QuickActions eventId={event.id} onSelect={setActiveTab} />
                  <KamiCard eventId={event.id} onSelect={setActiveTab} />
                </aside>
              </div>
            </div>
          ) : activeTab === "attendees" ? (
            <div className="event-detail-tab-content" key={activeTab}>
              <AttendeeRoster event={event} onImportSaved={() => router.refresh()} />
            </div>
          ) : activeTab === "kami" ? (
            <div className="event-detail-tab-content" key={activeTab}>
              <KamiWorkspace art={art} event={event} onNotice={showNotice} />
            </div>
          ) : (
            <div className="event-detail-tab-content" key={activeTab}>
              <EventTabPlaceholder activeTab={activeTab} eventId={event.id} onSelect={setActiveTab} />
            </div>
          )}

          {notice ? (
            <Surface aria-live="polite" className="event-detail-notice" depth="floating" role="status">
              <CheckIcon height="16" width="16" /> {notice}
            </Surface>
          ) : null}
        </main>
      </div>
    </div>
  );
}
