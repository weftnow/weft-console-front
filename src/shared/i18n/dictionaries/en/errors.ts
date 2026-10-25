export const errors = {
  INVALID_JSON: "The request could not be read.",
  UNAUTHORIZED: "Sign in to continue.",
  FORBIDDEN: "You don’t have access to this.",
  NOT_FOUND: "We couldn’t find that.",
  PAYLOAD_TOO_LARGE: "That file or request is too large.",
  UNSUPPORTED_MEDIA_TYPE: "That file type isn’t supported.",
  VALIDATION_ERROR: "Check the highlighted fields and try again.",
  INTERNAL_ERROR: "Something went wrong. Try again.",
  CONFLICT: "This changed while you were working. Refresh and try again.",
} as const;
