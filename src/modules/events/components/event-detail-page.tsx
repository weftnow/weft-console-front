"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type ReactNode,
  type ComponentType,
  type CSSProperties,
  type SVGProps,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useI18n } from "@/shared/i18n/I18nProvider";
import { CityArtwork } from "@/shared/ui/city-artwork";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  DocumentIcon,
  EditIcon,
  LinkIcon,
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
import { EventLanguagePanel } from "./event-language-panel";
import { EventSettingsPanel } from "./event-settings-panel";
import { EventWeftersPanel } from "./event-wefters-panel";
import { MatchesPanel } from "@/modules/network/components/matches-panel";
import { MatchingStatusPanel } from "@/modules/network/components/matching-status-panel";
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

const tabs: { icon: Icon; id: EventDetailTab }[] = [
  { id: "overview", icon: CalendarIcon },
  { id: "attendees", icon: PeopleIcon },
  { id: "matches", icon: LinkIcon },
  { id: "kami", icon: SparklesIcon },
  { id: "staff", icon: StaffIcon },
  { id: "settings", icon: EditIcon },
  { id: "insights", icon: OutcomesIcon },
];

export function MissingEvent() {
  const { dict } = useI18n();
  return (
        <main className="dashboard-main event-detail-main">
          <Surface className="event-detail-missing" depth="raised">
            <span className="event-detail-missing__icon"><CalendarIcon height="24" width="24" /></span>
            <h1>{dict.events.detail.missing.title}</h1>
            <p>{dict.events.detail.missing.description}</p>
            <Link className="tactile-button tactile-button--graphite event-detail-missing__action" href="/events">
              <ArrowLeftIcon height="15" width="15" /> {dict.events.access.back}
            </Link>
          </Surface>
        </main>
  );
}

function EventTabs({
  activeTab,
  canSeeMatches,
  eventId,
  onSelect,
}: {
  activeTab: EventDetailTab;
  canSeeMatches: boolean;
  eventId: string;
  onSelect: (tab: EventDetailTab) => void;
}) {
  const { dict } = useI18n();
  return (
    <nav aria-label={dict.events.detail.tabsLabel} className="event-detail-tabs surface-inset">
      {tabs.filter(({ id }) => id !== "matches" || canSeeMatches).map(({ icon: IconComponent, id }) => (
        <Link
          aria-current={activeTab === id ? "page" : undefined}
          className="event-detail-tab"
          href={`/events/${eventId}?tab=${id}`}
          key={id}
          onClick={() => onSelect(id)}
        >
          <IconComponent height="15" width="15" />
          <span>{dict.events.detail.tabs[id]}</span>
        </Link>
      ))}
    </nav>
  );
}

function MetricCard({ icon: IconComponent, label, value }: { icon: Icon; label: string; value: number }) {
  const { number } = useI18n();
  return (
    <Surface as="article" className="event-detail-metric" depth="raised">
      <Surface className="event-detail-metric__icon" depth="inset">
        <IconComponent height="18" width="18" />
      </Surface>
      <div>
        <strong className="event-detail-metric__value" key={value}>{number(value)}</strong>
        <span>{label}</span>
      </div>
    </Surface>
  );
}

function EmptyChips({ children }: { children: string }) {
  return <span className="event-detail-empty-copy">{children}</span>;
}

function EventSummary({ event }: { event: EventRecord }) {
  const i18n = useI18n();
  const { dict } = i18n;
  const copy = dict.events.detail.summary;
  return (
    <Surface as="section" className="event-detail-panel event-detail-summary" depth="raised" aria-labelledby="event-summary-title">
      <div className="event-detail-panel__heading">
        <DocumentIcon height="20" width="20" />
        <h2 id="event-summary-title">{copy.heading}</h2>
      </div>
      <Surface className="event-detail-summary__well" depth="inset">
        <div className="event-detail-summary__topline">
          <div className="event-detail-summary__item">
            <CalendarIcon height="18" width="18" />
            <div><span>{copy.date}</span><strong>{formatEventDateRange(i18n, event.startDate, event.endDate)}</strong></div>
          </div>
          <div className="event-detail-summary__item">
            <LocationIcon height="18" width="18" />
            <div>
              <span>{copy.venue}</span>
              <strong>{event.venue || copy.noVenue}</strong>
              <small>{event.city ? (dict.events.options.cities[event.city as keyof typeof dict.events.options.cities] ?? event.city) : copy.noCity}</small>
              </div>
          </div>
          <div className="event-detail-summary__item">
            <PeopleIcon height="18" width="18" />
            <div>
              <span>{copy.expected}</span>
              <strong>{event.expectedAttendees === null ? copy.noEstimate : i18n.number(event.expectedAttendees)}</strong>
            </div>
          </div>
        </div>
        <div className="event-detail-summary__row">
          <DocumentIcon height="18" width="18" />
          <span>{copy.description}</span>
          <p>{event.description || copy.noDescription}</p>
        </div>
        <div className="event-detail-summary__row event-detail-summary__row--chips">
          <SparklesIcon height="18" width="18" />
          <span>{copy.categories}</span>
          <div className="event-detail-chips">
            {event.categories.length
              ? event.categories.map((category) => <span key={category}>{dict.events.options.categories[category as keyof typeof dict.events.options.categories] ?? category}</span>)
              : <EmptyChips>{copy.noCategories}</EmptyChips>}
          </div>
        </div>
        <div className="event-detail-summary__row event-detail-summary__row--chips">
          <PeopleIcon height="18" width="18" />
          <span>{copy.audience}</span>
          <div className="event-detail-chips">
            {event.expectedAudience.length
              ? event.expectedAudience.map((profile) => <span key={profile}>{dict.events.options.audiences[profile as keyof typeof dict.events.options.audiences] ?? profile}</span>)
              : <EmptyChips>{copy.noAudience}</EmptyChips>}
          </div>
        </div>
      </Surface>
    </Surface>
  );
}

function ReadinessCard({ event }: { event: EventRecord }) {
  const { dict } = useI18n();
  const copy = dict.events.detail.readiness;
  const metrics = deriveEventMetrics(event);
  const readiness = [
    {
      detail: copy.complete,
      label: copy.details,
      ready: Boolean(event.name && event.city && event.startDate && event.endDate),
    },
    {
      detail: copy.complete,
      label: copy.context,
      ready: Boolean(event.description && event.categories.length),
    },
    { detail: copy.complete, label: copy.attendeesImported, ready: metrics.attendees > 0 },
    { detail: copy.complete, label: copy.staffAccess, ready: metrics.staff > 0 },
  ];

  return (
    <Surface as="section" className="event-detail-panel event-readiness" depth="raised" aria-labelledby="event-readiness-title">
      <div className="event-detail-panel__heading">
        <CheckIcon height="20" width="20" />
        <h2 id="event-readiness-title">{copy.heading}</h2>
      </div>
      <ul>
        {readiness.map((item, index) => (
          <li className={item.ready ? "event-readiness__item event-readiness__item--ready" : "event-readiness__item"} key={item.label} style={{ "--readiness-index": index } as CSSProperties}>
            <span className="event-readiness__check"><CheckIcon height="13" width="13" /></span>
            <strong>{item.label}</strong>
            <span>{item.ready ? item.detail : copy.needsAttention}</span>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function QuickActions({ eventId, onSelect }: { eventId: string; onSelect: (tab: EventDetailTab) => void }) {
  const { dict } = useI18n();
  const copy = dict.events.detail.quickActions;
  const actions: { icon: Icon; label: string; tab: EventDetailTab }[] = [
    { icon: PeopleIcon, label: copy.manageAttendees, tab: "attendees" },
    { icon: DocumentIcon, label: copy.viewList, tab: "attendees" },
    { icon: StaffIcon, label: copy.manageStaff, tab: "staff" },
    { icon: OutcomesIcon, label: copy.viewInsights, tab: "insights" },
  ];

  return (
    <Surface as="section" className="event-detail-panel event-quick-actions" depth="raised" aria-labelledby="event-quick-actions-title">
      <div className="event-detail-panel__heading">
        <SparklesIcon height="20" width="20" />
        <h2 id="event-quick-actions-title">{copy.heading}</h2>
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
  const i18n = useI18n();
  const copy = i18n.dict.events.detail.activity;
  const activities: { detail: string; icon: Icon; label: string; timestamp: string }[] = [];

  for (const batch of event.attendees.imports) {
    activities.push({
      detail: i18n.plural(copy.recordsAdded, batch.storedCount, { count: i18n.number(batch.storedCount), file: batch.fileName }),
      icon: DocumentIcon,
      label: copy.imported,
      timestamp: batch.importedAt,
    });
  }
  activities.push({
    detail: event.name,
    icon: CalendarIcon,
    label: copy.created,
    timestamp: event.createdAt,
  });

  return (
    <Surface as="section" className="event-detail-panel event-activity" depth="raised" aria-labelledby="event-activity-title">
      <div className="event-detail-panel__heading">
        <ClockIcon height="20" width="20" />
        <h2 id="event-activity-title">{copy.heading}</h2>
      </div>
      <ul>
        {activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 4).map(({ detail, icon: IconComponent, label, timestamp }) => (
          <li key={`${label}-${timestamp}`}>
            <span className="event-activity__icon"><IconComponent height="15" width="15" /></span>
            <div><strong>{label}</strong><span>{detail}</span></div>
            <time dateTime={timestamp}>{formatRelativeActivity(i18n, timestamp)}</time>
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function KamiCard({ eventId, onSelect }: { eventId: string; onSelect: (tab: EventDetailTab) => void }) {
  const copy = useI18n().dict.events.detail.kamiCard;
  return (
    <Surface as="section" className="event-detail-panel event-kami-card" depth="raised" aria-labelledby="event-kami-title">
      <Surface className="event-kami-card__mark" depth="inset"><SparklesIcon height="25" width="25" /></Surface>
      <h2 id="event-kami-title">{copy.heading}</h2>
      <p>{copy.description}</p>
      <Link className="tactile-button event-kami-card__action" href={`/events/${eventId}?tab=kami`} onClick={() => onSelect("kami")}>
        {copy.action} <ArrowRightIcon height="14" width="14" />
      </Link>
    </Surface>
  );
}

function EventTabPlaceholder({ activeTab, eventId, onSelect }: { activeTab: Exclude<EventDetailTab, "overview" | "attendees" | "matches" | "kami">; eventId: string; onSelect: (tab: EventDetailTab) => void }) {
  const { dict } = useI18n();
  const tab = tabs.find((item) => item.id === activeTab)!;
  const IconComponent = tab.icon;

  return (
    <Surface className="event-tab-placeholder" depth="raised">
      <Surface className="event-tab-placeholder__icon" depth="inset"><IconComponent height="24" width="24" /></Surface>
      <h2>{dict.events.detail.placeholder.title}</h2>
      <p>{dict.events.detail.tabDescriptions[activeTab]}</p>
      <Link className="tactile-button tactile-button--graphite event-tab-placeholder__action" href={`/events/${eventId}?tab=overview`} onClick={() => onSelect("overview")}>
        {dict.events.detail.placeholder.back} <ArrowRightIcon height="15" width="15" />
      </Link>
    </Surface>
  );
}

export function EventDetailPage({ event, initialTab, onRosterChanged, refreshNotice }: {
  event: EventDetailDto; initialTab: EventDetailTab; onRosterChanged: () => Promise<void>; refreshNotice?: ReactNode;
}) {
  const i18n = useI18n();
  const { dict } = i18n;
  const header = dict.events.detail.header;
  const [requestedTab, setActiveTab] = useState<EventDetailTab>(initialTab);
  // The Matches tab is for Owners and Organizers; anyone else is shown the overview.
  const activeTab: EventDetailTab = requestedTab === "matches" && !event.attendees.canManage ? "overview" : requestedTab;
  // Synchronize Back/Forward tab changes without remounting the page on data refresh.
  const [previousInitialTab, setPreviousInitialTab] = useState(initialTab);
  if (previousInitialTab !== initialTab) {
    setPreviousInitialTab(initialTab);
    setActiveTab(initialTab);
  }
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
      showNotice(header.linkCopied);
    } catch {
      showNotice(header.linkCopyFailed);
    }
  };

  return (
        <main className="dashboard-main event-detail-main">
          {refreshNotice}
          <header className="event-detail-header">
            <div className="event-detail-header__copy">
              <Link className="create-back-link" href="/events"><ArrowLeftIcon height="15" width="15" /> {header.events}</Link>
              <div className="event-detail-title-row">
                <h1>{event.name}</h1>
                <span className={`event-detail-status event-detail-status--${status}`}>{dict.events.status[status]}</span>
              </div>
              <p className="event-detail-header__meta">
                <span>{formatEventDateRange(i18n, event.startDate, event.endDate)}</span>
                <span>{event.venue || header.venueNotAdded}</span>
                <span>{event.city ? (dict.events.options.cities[event.city as keyof typeof dict.events.options.cities] ?? event.city) : header.cityNotAdded}</span>
              </p>
            </div>
            <div className="event-detail-header__actions">
              <details className="event-detail-more">
                <summary className="tactile-button event-detail-header__action">{header.more} <ChevronDownIcon height="15" width="15" /></summary>
                <Surface className="event-detail-more__menu" depth="floating">
                  <button aria-label={header.copyLink} onClick={() => void copyEventLink()} type="button">{header.copyLink}</button>
                </Surface>
              </details>
            </div>
          </header>

          <Surface className="event-detail-hero" depth="raised">
            {event.coverImage ? (
              <Image alt={i18n.t(header.cover, { name: event.name })} fill priority sizes="(max-width: 760px) 100vw, calc(100vw - 260px)" src={event.coverImage} unoptimized />
            ) : (
              <CityArtwork art={art} className="city-art--photo event-detail-hero__art" eager>
                <span className="event-detail-hero__scrim" />
                <span className="event-detail-hero__fallback-label">{header.noCover}</span>
              </CityArtwork>
            )}
          </Surface>

          <EventTabs activeTab={activeTab} canSeeMatches={event.attendees.canManage} eventId={event.id} onSelect={setActiveTab} />

          {activeTab === "overview" ? (
            <div className="event-detail-tab-content" key="overview">
              <div className="event-detail-metrics">
                <MetricCard icon={PeopleIcon} label={metrics.attendeesAreExpected ? dict.events.detail.metrics.expected : dict.events.detail.metrics.records} value={metrics.attendees} />
                <MetricCard icon={StarIcon} label={dict.events.detail.metrics.vips} value={metrics.vips} />
                <MetricCard icon={OutcomesIcon} label={dict.events.detail.metrics.sponsors} value={metrics.sponsors} />
                <MetricCard icon={StaffIcon} label={dict.events.detail.metrics.staff} value={metrics.staff} />
              </div>
              <div className="event-detail-overview-grid">
                <div className="event-detail-primary-column">
                  <EventSummary event={event} />
                  {event.attendees.canManage ? <MatchingStatusPanel eventId={event.id} /> : null}
                  <RecentActivity event={event} />
                </div>
                <aside className="event-detail-rail" aria-label={header.operations}>
                  <ReadinessCard event={event} />
                  <QuickActions eventId={event.id} onSelect={setActiveTab} />
                  <KamiCard eventId={event.id} onSelect={setActiveTab} />
                </aside>
              </div>
            </div>
          ) : activeTab === "attendees" ? (
            <div className="event-detail-tab-content" key={activeTab}>
              <AttendeeRoster event={event} onRosterChanged={onRosterChanged} />
            </div>
          ) : activeTab === "matches" ? (
            <div className="event-detail-tab-content" key={activeTab}><MatchesPanel eventId={event.id} /></div>
          ) : activeTab === "kami" ? (
            <div className="event-detail-tab-content" key={activeTab}>
              <KamiWorkspace art={art} event={event} onNotice={showNotice} />
            </div>
          ) : activeTab === "staff" ? (
            <div className="event-detail-tab-content" key={activeTab}><EventWeftersPanel eventId={event.id} onSaved={onRosterChanged} /></div>
          ) : activeTab === "settings" ? (
            <div className="event-detail-tab-content" key={activeTab}><EventLanguagePanel eventId={event.id} language={event.language} onSaved={onRosterChanged} /><EventSettingsPanel eventId={event.id} /></div>
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
  );
}
