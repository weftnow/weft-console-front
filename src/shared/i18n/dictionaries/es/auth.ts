import type { Dictionary } from "../types";

export const auth = {
  eventsUnavailable: {
    title: "Eventos no disponibles",
    description: "No se pudieron cargar tus eventos. Inténtalo de nuevo.",
  },
  eventUnavailable: {
    title: "Evento no disponible",
    description: "No se pudo cargar el evento. Inténtalo de nuevo.",
  },
  joinOrganization: {
    title: "Únete a tu organización",
    description: "Inicia sesión con la cuenta que recibió esta invitación o crea tu cuenta para continuar.",
  },
  accessRequired: {
    title: "Se requiere acceso a Weft Console",
    description: "Tu cuenta no tiene una configuración de organización que Weft Console pueda abrir.",
    refresh: "Actualizar la sesión de la cuenta",
  },
  selectOrganization: {
    noAccessDescription: "Tu cuenta no tiene una organización ni un evento que Weft Console pueda abrir.",
    chooseTitle: "Elige tu espacio de trabajo",
    eventsTitle: "Tus eventos",
    chooseDescription: "Elige una organización o un evento para continuar.",
    eventsDescription: "Abre un evento al que tengas acceso.",
    eventAccess: "Tu acceso a eventos",
    rosterAccess: "Acceso a la lista",
    wefter: "Wefter",
  },
  onboarding: {
    title: "Termina la configuración de la invitación",
    description: "Verificaremos las invitaciones aceptadas antes de abrir una organización.",
  },
} satisfies Dictionary["auth"];
