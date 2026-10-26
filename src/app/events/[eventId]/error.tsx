"use client";
import { EventAccessState } from "@/modules/events/components/event-access-state";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <EventAccessState title="Event unavailable" description="The event could not be loaded. Please try again." action={<button className="tactile-button" onClick={reset} type="button">Try again</button>} />;
}
