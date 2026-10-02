export type ApplicationErrorCode =
  | "INVALID_JSON" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND"
  | "PAYLOAD_TOO_LARGE" | "UNSUPPORTED_MEDIA_TYPE" | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
