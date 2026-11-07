"use server";

import { revalidatePath } from "next/cache";

import { getInstitutionContext } from "@/lib/institution/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gradingKeySchema, type ActionResult } from "@/lib/validation/schemas";

function validationErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1])),
  );
}

export async function saveGradingKey(input: unknown): Promise<ActionResult> {
  const parsed = gradingKeySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Review the highlighted grading key fields.",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  const context = await getInstitutionContext();
  if (!context || !["principal", "owner"].includes(context.role)) {
    return { success: false, message: "Only a principal or owner can change grading keys." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_grading_key", {
    p_institution_id: context.institutionId,
    p_term_id: parsed.data.termId,
    p_subject: parsed.data.subject,
    p_class_id: parsed.data.classId ?? null,
    p_components: {
      continuous_assessment_weight: Math.round(parsed.data.continuousAssessmentWeight * 100) / 100,
      exam_weight: Math.round(parsed.data.examWeight * 100) / 100,
      grade_bands: parsed.data.gradeBands.map((band) => ({ minimum: band.minimum, label: band.label })),
    },
  });

  if (error) return { success: false, message: "The grading key could not be saved. Check the term and class, then try again." };
  revalidatePath("/settings");
  revalidatePath("/results");
  return { success: true, message: "Grading key saved." };
}
