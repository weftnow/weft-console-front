import "server-only";
import { ApplicationError } from "@/shared/lib/application-error";

const MAX_BYTES = 3 * 1024 * 1024;

export async function readBoundedJson(request: Request, resource = "event creation"): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) throw new ApplicationError("UNSUPPORTED_MEDIA_TYPE", `Use application/json for ${resource}.`);
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BYTES) throw new ApplicationError("PAYLOAD_TOO_LARGE", `The ${resource} request is too large.`);
  if (!request.body) throw new ApplicationError("INVALID_JSON", `Enter ${resource} data as JSON.`);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new ApplicationError("PAYLOAD_TOO_LARGE", `The ${resource} request is too large.`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApplicationError("INVALID_JSON", `Enter valid JSON ${resource} data.`);
  }
}
