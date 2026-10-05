import { isCancelledError, queryOptions, type QueryClient } from "@tanstack/react-query";
import type { EventDetailDto } from "../event-dto";
import type { EventDetailQueryResult } from "./fetch-event-detail";
import { ApplicationError } from "@/shared/lib/application-error";
import { fetchEventDetail, isEventReadCancellation } from "./fetch-event-detail";

export type EventQueryScope = { actorId: string; activeOrganizationId: string; sessionId: string };

export function eventDetailKey(scope: EventQueryScope, eventId: string) {
  return ["events", "detail", scope.actorId, scope.sessionId, scope.activeOrganizationId, eventId] as const;
}

export function eventDetailQueryOptions(scope: EventQueryScope, eventId: string) {
  return queryOptions({
    queryKey: eventDetailKey(scope, eventId),
    queryFn: ({ signal }) => fetchEventDetail(eventId, signal),
    staleTime: 30_000,
    gcTime: 600_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    networkMode: "always",
    retry: (failureCount, error) => failureCount < 1 && !isCancelledError(error) && !isEventReadCancellation(error),
  });
}

export function seedEventDetail(queryClient: QueryClient, scope: EventQueryScope, event: EventDetailDto): void {
  // Build with the inactive retention contract before seeding an unobserved entry.
  const key = eventDetailKey(scope, event.id);
  const ready: EventDetailQueryResult = { kind: "ready", event };
  const query = queryClient.getQueryCache().build(queryClient, {
    queryKey: key, queryFn: async () => ready, gcTime: 600_000,
  });
  query.setData(ready);
}

export async function refreshEventDetail(queryClient: QueryClient, scope: EventQueryScope, eventId: string): Promise<void> {
  const queryKey = eventDetailQueryOptions(scope, eventId).queryKey;
  await queryClient.cancelQueries({ queryKey, exact: true });
  await queryClient.invalidateQueries({ queryKey, exact: true, refetchType: "active" }, { throwOnError: true });
  const result = queryClient.getQueryData(queryKey);
  if (result && result.kind !== "ready") {
    throw new ApplicationError(
      result.kind === "unauthorized" ? "UNAUTHORIZED" : result.kind === "forbidden" ? "FORBIDDEN" : "NOT_FOUND",
      "Import saved; this event is no longer accessible.",
    );
  }
}
