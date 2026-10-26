export const wefter = {
  shell: { brand: "Weft Console", yourEvents: "Your events" },
  operator: {
    heading: "Attendees",
    summary: { one: "{count} attendee record · View only", other: "{count} attendee records · View only" },
    empty: "No guests have been added to this event.",
  },
  hours: {
    heading: "Your availability hours",
    description: "Managed by the event organizers.",
    empty: "No hours added yet. Ask an event organizer to set your availability.",
  },
} as const;
