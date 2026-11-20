import type { ReactNode } from "react";

import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { OutcomesShell } from "@/modules/insights/components/outcomes-shell";

export default async function OutcomesLayout({ children }: { children: ReactNode }) {
  const context = await requireOrganizerPageContext();
  return <OutcomesShell context={context}>{children}</OutcomesShell>;
}
