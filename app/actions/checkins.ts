"use server";

import { revalidatePath } from "next/cache";

import { getInstitutionContext } from "@/lib/institution/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { staffCheckinSchema, type ActionResult } from "@/lib/validation/schemas";

function validationErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1])),
  );
}

export async function recordStaffCheckin(input: unknown): Promise<ActionResult> {
  const parsed = staffCheckinSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Choose a valid staff member and check-in station.",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  const context = await getInstitutionContext();
  if (!context || context.role !== "authority") {
    return { success: false, message: "Only an authority member can record a staff check-in." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("staff_checkins").insert({
    institution_id: context.institutionId,
    staff_id: parsed.data.staffId,
    station_id: parsed.data.stationId ?? null,
    recorded_by: context.userId,
  });

  if (error) {
    const message = error.message.toLowerCase().includes("duplicate")
      ? "This staff member already has a check-in for today."
      : "The check-in could not be recorded. Confirm the staff member and station.";
    return { success: false, message };
  }

  revalidatePath("/attendance");
  return { success: true, message: "Staff check-in recorded." };
}
