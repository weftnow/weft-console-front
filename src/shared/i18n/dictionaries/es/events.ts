import type { Dictionary } from "../types";

export const events = {
  language: {
    heading: "Idioma de las coincidencias",
    description: "Los motivos de coincidencia de este evento se escriben en este idioma. Al cambiarlo, el emparejamiento se ejecuta de nuevo.",
    label: "Idioma de los motivos",
    save: "Guardar idioma",
    saving: "Guardando…",
    saved: "Idioma guardado. El emparejamiento se ejecutará de nuevo.",
    unchanged: "El idioma ya está configurado.",
    failed: "No se pudo guardar el idioma. Inténtalo de nuevo.",
  },
} satisfies Dictionary["events"];
