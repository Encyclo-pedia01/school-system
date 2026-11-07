import type { Metadata } from "next";

import { getInstitutionContext } from "@/lib/institution/context";

export async function institutionPageMetadata(title: string, description: string): Promise<Metadata> {
  let institutionName = "School Manager";
  try {
    const context = await getInstitutionContext();
    if (context?.institutionName.trim()) institutionName = context.institutionName.trim();
  } catch {
    institutionName = "School Manager";
  }

  return {
    title: { absolute: `${title} - ${institutionName}` },
    description,
  };
}
