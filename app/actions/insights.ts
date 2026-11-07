"use server";

import { revalidatePath } from "next/cache";

import { getInstitutionContext } from "@/lib/institution/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insightStatusSchema, type ActionResult } from "@/lib/validation/schemas";

export async function updateInsightStatus(input: unknown): Promise<ActionResult> {
  const parsed = insightStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Choose a valid insight status." };

  const context = await getInstitutionContext();
  if (!context || !["owner", "principal", "staff", "authority"].includes(context.role)) {
    return { success: false, message: "Your role cannot update insights." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("insights")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.insightId)
    .eq("institution_id", context.institutionId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { success: false, message: "The insight could not be updated." };

  revalidatePath("/");
  return { success: true, message: parsed.data.status === "actioned" ? "Insight marked actioned." : "Insight dismissed." };
}

export async function generateInstitutionInsights(): Promise<ActionResult> {
  const context = await getInstitutionContext();
  if (!context || !["owner", "principal", "staff", "authority"].includes(context.role)) {
    return { success: false, message: "Your role cannot generate insights." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("generate_institution_insights", {
    p_institution_id: context.institutionId,
  });

  if (error) return { success: false, message: "Insights could not be refreshed." };

  revalidatePath("/");
  return { success: true, message: "Insights refreshed." };
}
