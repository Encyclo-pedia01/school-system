"use server";

import { revalidatePath } from "next/cache";

import { getInstitutionContext } from "@/lib/institution/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { attendanceRecordSchema, type ActionResult } from "@/lib/validation/schemas";

function validationErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter((entry): entry is [string, string[]] => Boolean(entry[1])),
  );
}

export async function recordStudentAttendance(input: unknown): Promise<ActionResult> {
  const parsed = attendanceRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Review the attendance details.", fieldErrors: validationErrors(parsed.error) };
  }

  const context = await getInstitutionContext();
  if (!context) return { success: false, message: "Your account is not linked to an institution." };
  if (!["staff", "principal", "owner"].includes(context.role)) {
    return { success: false, message: "Your role cannot record student attendance." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("student_attendance").insert({
    institution_id: context.institutionId,
    student_id: parsed.data.studentId,
    class_id: parsed.data.classId,
    term_id: parsed.data.termId,
    attendance_date: parsed.data.attendanceDate,
    status: parsed.data.status,
    recorded_by: context.userId,
  });

  if (error) {
    const message = error.message.toLowerCase().includes("duplicate")
      ? "Attendance has already been recorded for this student and date."
      : "Attendance could not be recorded. Confirm the student, class, and term.";
    return { success: false, message };
  }

  await supabase.rpc("generate_institution_insights", { p_institution_id: context.institutionId });
  revalidatePath("/attendance");
  revalidatePath("/");
  return { success: true, message: "Attendance recorded." };
}
