import { handleRemoveMatchBlock } from "@/infrastructure/http/networking-handlers";

export const runtime = "nodejs";

export async function DELETE(request: Request, context: RouteContext<"/api/events/[eventId]/match-blocks/[blockId]">) {
  const { eventId, blockId } = await context.params;
  return handleRemoveMatchBlock(request, eventId, blockId);
}
