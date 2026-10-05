"use client";

import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { ConsoleContext } from "@/modules/organizations/types";
import type { EventQueryScope } from "../queries/event-detail-query";
import { EventAccessState } from "./event-access-state";

const ScopeContext = createContext<EventQueryScope | null>(null);
const SessionEndContext = createContext<(() => void) | null>(null);

function ScopedQueryProvider({ scope, children }: { scope: EventQueryScope; children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  const [ended, setEnded] = useState(false);
  useEffect(() => () => {
    void client.cancelQueries();
    client.clear();
  }, [client]);

  if (ended) return <EventAccessState title="Sign in required" description="Sign in again to view this event." />;
  return (
    <ScopeContext.Provider value={scope}>
      <SessionEndContext.Provider value={() => {
        setEnded(true);
        void client.cancelQueries();
        client.clear();
      }}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </SessionEndContext.Provider>
    </ScopeContext.Provider>
  );
}

export function EventsQueryProvider({ context, clerkSubject, children }: {
  context: ConsoleContext; clerkSubject: string; children: ReactNode;
}) {
  const auth = useAuth({ treatPendingAsSignedOut: true });
  if (!auth.isLoaded || !auth.isSignedIn || auth.userId !== clerkSubject || !auth.sessionId) {
    return <EventAccessState title="Verifying access" description="Waiting for your active session." />;
  }
  const scope: EventQueryScope = {
    actorId: context.user.id, sessionId: auth.sessionId, activeOrganizationId: context.organization.id,
  };
  return <ScopedQueryProvider key={JSON.stringify([scope.actorId, scope.sessionId, scope.activeOrganizationId])} scope={scope}>{children}</ScopedQueryProvider>;
}

export function useEventQueryScope(): EventQueryScope {
  const scope = useContext(ScopeContext);
  if (!scope) throw new Error("Event queries require the Events provider.");
  return scope;
}

export function useEndEventSession(): () => void {
  const end = useContext(SessionEndContext);
  if (!end) throw new Error("Event queries require the Events provider.");
  return end;
}
