import type { Dictionary } from "../types";

export const insights = {
  overview: "Resumen",
  title: "La red de tus eventos",
  events: { one: "{count} evento", other: "{count} eventos" },
  cities: { one: "{count} ciudad", other: "{count} ciudades" },
  across: "{events} en {cities}",
  next: "Próximo: {name}, {dates}",
  emptyDescription: "Crea tu primer evento para empezar a medir los resultados de networking.",
  metricsLabel: "Métricas del resumen de la red",
  metrics: { events: "Eventos", guests: "Invitados", upcoming: "Próximos", cities: "Ciudades" },
  outcomesLabel: "Resultados de networking",
  noData: "Aún no hay datos suficientes",
  noDataDescription: "Los resultados aparecerán aquí cuando tus eventos tengan presentaciones.",
  table: { heading: "Tus eventos", event: "Evento", city: "Ciudad", date: "Fecha", guests: "Invitados", open: "Abrir" },
  showing: { one: "Mostrando {shown} de {count} evento", other: "Mostrando {shown} de {count} eventos" },
  viewAll: "Ver todos los eventos",
  upcomingHeading: "Próximos eventos",
  noUpcoming: "No hay eventos próximos",
  guests: { one: "{count} invitado", other: "{count} invitados" },
  openNamed: "Abrir {name}",
} satisfies Dictionary["insights"];
