import type { Dictionary } from "../types";

export const attendees = {
  people: {
    title: "Personas",
    subtitle: "Todas las personas que han asistido a tus eventos.",
    emptyTitle: "Aún no hay personas",
    emptyDescription: "Los invitados aparecen aquí cuando los agregas a un evento.",
  },
  exclusionReasons: {
    guest_request: "El invitado pidió no ser emparejado",
    organizer_decision: "Decisión del organizador",
    not_attending: "No asistirá al evento",
    other: "Otro",
  },
} satisfies Dictionary["attendees"];
