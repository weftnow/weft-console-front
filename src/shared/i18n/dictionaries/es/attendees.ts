import type { Dictionary } from "../types";

export const attendees = {
  profile: {
    fieldLabels: {
      summary: "Resumen para compartir", goals: "Objetivos", offers: "Lo que ofrece", desiredConnections: "Conexiones deseadas",
      avoid: "Personas o situaciones que evitar", background: "Trayectoria relevante", linkedinDetails: "Datos de LinkedIn", missingDetails: "Datos faltantes",
    },
    completenessLabels: { goals: "Objetivos", background: "Trayectoria", linkedin: "Datos de LinkedIn", offers: "Ofertas", desiredConnections: "Conexiones deseadas" },
    completenessStates: { available: "Disponible", missing: "Falta", url_only: "Solo URL, sin datos" },
    noneSaved: "Aún no hay un perfil guardado.",
    lastSaved: "Última versión guardada: v{version}{by}{at}.", savedBy: " por {name}", savedAt: " el {date}",
    loadFailed: "No se pudo cargar el perfil. Inténtalo de nuevo.", saveFailed: "No se pudo guardar el perfil. Inténtalo de nuevo.",
    saved: "Perfil guardado. El emparejamiento usará esta versión.", savedRefresh: "Guardado; actualiza para cargar la lista actualizada.",
    stale: "Otra persona cambió este perfil.", rebased: "Tus ediciones ahora se basan en la versión más reciente. Guarda para aplicarlas.",
    title: "Perfil de {name}", description: "La información faltante se mantiene como desconocida. Los datos guardados estarán disponibles para los próximos emparejamientos.",
    close: "Cerrar el panel de perfil", loading: "Cargando el perfil…", completeness: "Completitud del perfil",
    organizerOnly: "Solo organizadores: no aparece en el resumen para compartir, pero se usa para emparejar",
    preview: "Vista previa del resumen para compartir", nothingToShare: "Aún no hay nada para compartir.", organizerOnlyList: "Solo organizadores: {fields}.",
    save: "Guardar perfil", saving: "Guardando…", discard: "Descartar cambios",
    latest: "Última versión guardada", organizerOnlySuffix: " (solo organizadores)", loadLatest: "Cargar la última versión en el formulario", keepMine: "Conservar mis ediciones sobre ella",
  },
  networking: {
    unnamed: "Invitado sin nombre", unknownGuest: "Invitado desconocido", guestFallback: "invitado",
    excluded: "Excluido", included: "Incluido", excludedReason: "Excluido: {reason}",
    savedRefresh: "Guardado; actualiza para cargar la lista actualizada.",
    stale: "Otra persona cambió a este invitado.", failed: "No se pudo guardar el cambio. Inténtalo de nuevo.",
    restored: "El invitado volvió al grupo de emparejamiento.", excludedNotice: "El invitado fue excluido del emparejamiento.",
    title: "Networking de {name}", description: "Los invitados excluidos permanecen en la lista pero no se emparejan. Los cambios guardados se aplican a los próximos emparejamientos.",
    close: "Cerrar el panel de networking", participation: "Participación", saving: "Guardando…", restore: "Volver a incluir en el emparejamiento",
    reasonLabel: "Motivo de la exclusión", chooseReason: "Elige un motivo…", exclude: "Excluir del emparejamiento",
    blocks: "No emparejar con", noBlocks: "Este invitado no tiene restricciones.", removeFor: "Quitar la restricción con {name}", removed: "Restricción eliminada.",
    searchLabel: "Buscar invitados para agregar una restricción", searchPlaceholder: "Busca invitados con los que evitar el emparejamiento…", add: "Agregar",
    wontMatch: "{other} no se emparejará con {guest}.", noSearchResults: "Ningún otro invitado coincide con esta búsqueda.", latest: " Último estado guardado: {state}.",
  },
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
