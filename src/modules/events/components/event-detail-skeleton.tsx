export function EventDetailSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading event" className="dashboard-main event-detail-main">
      <div aria-hidden="true" className="event-detail-skeleton-header">
        <div className="event-detail-skeleton-header__copy">
          <span className="event-detail-skeleton event-detail-skeleton--crumb" />
          <span className="event-detail-skeleton event-detail-skeleton--title" />
          <span className="event-detail-skeleton event-detail-skeleton--meta" />
        </div>
        <span className="event-detail-skeleton event-detail-skeleton--header-action" />
      </div>
      <div aria-hidden="true" className="event-detail-skeleton event-detail-skeleton--hero" />
      <div aria-hidden="true" className="event-detail-skeleton event-detail-skeleton--tabs" />
      <div aria-hidden="true" className="event-detail-metrics">
        {[0, 1, 2, 3].map((item) => (
          <div className="event-detail-skeleton event-detail-skeleton--metric" key={item} />
        ))}
      </div>
      <div aria-hidden="true" className="event-detail-skeleton--overview">
        <div className="event-detail-skeleton event-detail-skeleton--panel" />
        <div className="event-detail-skeleton--rail">
          <div className="event-detail-skeleton event-detail-skeleton--panel" />
          <div className="event-detail-skeleton event-detail-skeleton--panel" />
          <div className="event-detail-skeleton event-detail-skeleton--panel" />
        </div>
      </div>
    </main>
  );
}
