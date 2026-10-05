import { requireClerkSession } from "@/infrastructure/auth/require-session";
import { EventsQueryProvider } from "@/modules/events/components/events-query-provider";
import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { EventsShell } from "@/modules/events/components/events-shell";

export default async function EventsLayout({ children }: LayoutProps<"/events">) {
  const { subject } = await requireClerkSession();
  const context = await requireOrganizerPageContext({ cleanupInvalidSelection: false });
  return <EventsQueryProvider context={context} clerkSubject={subject}><EventsShell context={context}>{children}</EventsShell></EventsQueryProvider>;
}
