import type { Dictionary } from "../types";

export const wefter = {
  shell: { brand: "Weft Console", yourEvents: "Tus eventos" },
  operator: {
    heading: "Asistentes",
    summary: { one: "{count} registro de asistente · Solo lectura", other: "{count} registros de asistentes · Solo lectura" },
    empty: "Aún no se han agregado invitados a este evento.",
  },
  hours: {
    heading: "Tus horarios de disponibilidad",
    description: "Los administran los organizadores del evento.",
    empty: "Aún no hay horarios. Pide a un organizador del evento que defina tu disponibilidad.",
  },
} satisfies Dictionary["wefter"];
