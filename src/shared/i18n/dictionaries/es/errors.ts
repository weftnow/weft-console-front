import type { Dictionary } from "../types";

export const errors = {
  INVALID_JSON: "No se pudo leer la solicitud.",
  UNAUTHORIZED: "Inicia sesión para continuar.",
  FORBIDDEN: "No tienes acceso a esto.",
  NOT_FOUND: "No encontramos lo que buscas.",
  PAYLOAD_TOO_LARGE: "El archivo o la solicitud es demasiado grande.",
  UNSUPPORTED_MEDIA_TYPE: "Ese tipo de archivo no es compatible.",
  VALIDATION_ERROR: "Revisa los campos marcados e inténtalo de nuevo.",
  INTERNAL_ERROR: "Algo salió mal. Inténtalo de nuevo.",
  CONFLICT: "Esto cambió mientras trabajabas. Actualiza e inténtalo de nuevo.",
} satisfies Dictionary["errors"];
