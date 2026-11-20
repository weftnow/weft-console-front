"use client";

import { OutcomesErrorState } from "@/modules/insights/components/outcomes-states";

export default function OutcomesErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <OutcomesErrorState onRetry={retry} />;
}
