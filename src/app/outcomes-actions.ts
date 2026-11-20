"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { requireOrganizerPageContext } from "@/infrastructure/auth/console-page-context";
import { uuidSchema } from "@/modules/events/event-schemas";
import { startOutcomesTracking } from "@/modules/insights/server/outcomes-service";
import { ApplicationError } from "@/shared/lib/application-error";

export async function startOutcomesTrackingAction(formData: FormData): Promise<void> {
  const context = await requireOrganizerPageContext();
  const values = formData.getAll("eventId");
  const eventId = uuidSchema.safeParse(values.length === 1 ? values[0] : undefined);
  if (!eventId.success) notFound();
  try {
    await startOutcomesTracking({ userId: context.user.id, organizationId: context.organization.id, eventId: eventId.data });
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "FORBIDDEN") redirect("/access-required");
    if (error instanceof ApplicationError && error.code === "NOT_FOUND") notFound();
    throw error;
  }
  revalidatePath("/");
  revalidatePath("/outcomes");
  redirect(`/outcomes?eventId=${eventId.data}`);
}
