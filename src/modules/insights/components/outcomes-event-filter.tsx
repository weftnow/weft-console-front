"use client";

import Form from "next/form";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { ChevronDownIcon } from "@/shared/ui/icons";

export interface OutcomesEventOption {
  eventId: string;
  eventName: string;
}

export function OutcomesEventFilter({
  eventOptions,
  selectedEventId,
}: {
  eventOptions: OutcomesEventOption[];
  selectedEventId: string | null;
}) {
  const { dict } = useI18n();
  const copy = dict.insights.outcomes;

  return (
    <Form action="/outcomes" className="outcomes-filter">
      <label className="outcomes-filter__label" htmlFor="outcomes-event-filter">
        {copy.filterLabel}
      </label>
      <div className="outcomes-filter__control">
        <div className="outcomes-filter__select-wrap">
          <select
            className="event-control outcomes-filter__select"
            defaultValue={selectedEventId ?? ""}
            id="outcomes-event-filter"
            key={selectedEventId ?? "all"}
            name="eventId"
          >
            <option value="">{copy.allEventsOption}</option>
            {eventOptions.map((option) => (
              <option key={option.eventId} value={option.eventId}>
                {option.eventName}
              </option>
            ))}
          </select>
          <ChevronDownIcon aria-hidden="true" className="outcomes-filter__chevron" height="15" width="15" />
        </div>
        <button className="tactile-button tactile-button--neutral outcomes-filter__submit" type="submit">
          {copy.applyFilter}
        </button>
      </div>
    </Form>
  );
}
