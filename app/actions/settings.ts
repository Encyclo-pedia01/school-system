"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { getInstitutionContext } from "@/lib/institution/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { institutionSelectionSchema, schoolSettingsSchema, type ActionResult } from "@/lib/validation/schemas";

function validationErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1])),
  );
}

export async function saveSchoolSettings(input: unknown): Promise<ActionResult> {
  const parsed = schoolSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Review the school time and timezone.", fieldErrors: validationErrors(parsed.error) };
  }

  const context = await getInstitutionContext();
  if (!context || !["owner", "principal"].includes(context.role)) {
    return { success: false, message: "Only a principal or owner can change school settings." };
  }

  try {
    new Intl.DateTimeFormat("en", { timeZone: parsed.data.timezone }).format(new Date());
  } catch {
    return {
      success: false,
      message: "Use a valid IANA timezone, such as Africa/Accra.",
      fieldErrors: { timezone: ["Use a valid IANA timezone."] },
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("institution_settings").upsert({
    institution_id: context.institutionId,
    school_start_time: parsed.data.schoolStartTime,
    timezone: parsed.data.timezone,
    updated_by: context.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "institution_id" });

  if (error) return { success: false, message: "School settings could not be saved." };
  revalidatePath("/settings");
  revalidatePath("/attendance");
  return { success: true, message: "School settings saved." };
}

export async function selectInstitution(input: unknown): Promise<ActionResult> {
  const parsed = institutionSelectionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Choose a valid institution." };

  const context = await getInstitutionContext();
  if (!context?.memberships.some((membership) => membership.institutionId === parsed.data.institutionId)) {
    return { success: false, message: "This institution is not available to your account." };
  }

  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const secure = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim() === "https";
  cookieStore.set("active-institution", parsed.data.institutionId, {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/");
  return { success: true, message: "Institution changed." };
}
