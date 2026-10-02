import { handleCreateEvent } from "@/infrastructure/http/create-event-handler";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  return handleCreateEvent(request);
}
