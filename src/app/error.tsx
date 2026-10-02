"use client";
import { EventAccessState } from "@/modules/events/components/event-access-state";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <EventAccessState title="Events unavailable" description="Your events could not be loaded. Please try again." showBackLink={false} action={<button className="tactile-button tactile-button--neutral" onClick={retry} type="button">Try again</button>} />;
}
