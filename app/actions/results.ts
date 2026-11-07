"use server";

import { revalidatePath } from "next/cache";

import { getInstitutionContext } from "@/lib/institution/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resultSubmissionSchema, type ActionResult } from "@/lib/validation/schemas";

function validationErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1])),
  );
}

export async function submitStudentResult(input: unknown): Promise<ActionResult> {
  const parsed = resultSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Review the highlighted score fields.",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  const context = await getInstitutionContext();
  if (!context) return { success: false, message: "Your account is not linked to an institution." };

  const supabase = await createSupabaseServerClient();
  const assessmentScores = parsed.data.assessmentScores.map((entry) => ({
    assessment_id: entry.assessmentId,
    score: entry.score,
  }));
  const { error } = await supabase.rpc("submit_student_result", {
    p_student_id: parsed.data.studentId,
    p_class_id: parsed.data.classId,
    p_term_id: parsed.data.termId,
    p_subject: parsed.data.subject,
    p_assessment_scores: assessmentScores,
    p_exam_score: parsed.data.examScore,
  });

  if (error) {
    if (error.message.includes("assessment maximum")) {
      return {
        success: false,
        message: "One or more assessment scores exceed the configured maximum.",
        fieldErrors: { assessmentScores: ["Check the maximum score shown for each assessment."] },
      };
    }
    const message = error.message.includes("Score cannot exceed")
      ? error.message
      : error.message.includes("assigned")
        ? "You can only submit scores for an assigned class."
        : "The result could not be saved. Confirm the student, class, term, and grading key.";
    return { success: false, message };
  }

  await supabase.rpc("generate_institution_insights", { p_institution_id: context.institutionId });
  revalidatePath("/results");
  revalidatePath("/");
  return { success: true, message: "Scores saved and final grade calculated." };
}
