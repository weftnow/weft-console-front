import type { Dictionary } from "../types";

export const common = {
  language: {
    label: "Idioma",
    en: "English",
    es: "Español",
  },
  metadata: {
    title: "Weft Console",
    description: "Inteligencia de networking para eventos extraordinarios.",
  },
  roles: {
    owner: "Propietario",
    organizer: "Organizador",
    staff: "Personal",
    sponsor: "Patrocinador",
  },
  poweredBy: "con tecnología de",
  dialog: {
    close: "Cerrar diálogo",
  },
  account: {
    label: "Cuenta",
    options: "Opciones de cuenta",
    manageTeam: "Administrar equipo",
    acceptInvitation: "Aceptar invitación",
    switchOrganization: "Cambiar de organización",
    signOut: "Cerrar sesión",
  },
  actions: {
    save: "Guardar",
    cancel: "Cancelar",
    close: "Cerrar",
    retry: "Reintentar",
  },
} satisfies Dictionary["common"];
