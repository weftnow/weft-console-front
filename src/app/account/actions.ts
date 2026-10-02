"use server";

import { cookies } from "next/headers";

export async function clearOrganizationSelection(): Promise<void> {
  (await cookies()).delete("weft_organization_id");
}
