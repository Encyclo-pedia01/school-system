import type { Metadata } from "next";

import { ResultEntryForm } from "@/components/forms/result-entry-form";
import type { ResultAssessmentOption, ResultClassOption, ResultStudentOption, ResultTermOption } from "@/components/forms/result-entry-form";
import { getInstitutionContext } from "@/lib/institution/context";
import { institutionPageMetadata } from "@/lib/institution/metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return institutionPageMetadata("Results", "Enter assessment and exam scores and review calculated results.");
}

export default async function ResultsPage() {
  const context = await getInstitutionContext();
  if (!context) return <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">No active institution is linked to this account.</p>;

  const supabase = await createSupabaseServerClient();
  let assignedClassIds: string[] | null = null;
  if (context.role === "staff") {
    const { data: staffMemberships } = await supabase.from("staff").select("id").eq("institution_id", context.institutionId).eq("user_id", context.userId);
    const staffIds = (staffMemberships ?? []).map((member) => member.id);
    const { data: assignments } = staffIds.length
      ? await supabase.from("class_assignments").select("class_id").eq("institution_id", context.institutionId).in("staff_id", staffIds)
      : { data: [] as { class_id: string | null }[] };
    assignedClassIds = [...new Set((assignments ?? []).map((assignment) => assignment.class_id).filter((id): id is string => Boolean(id)))];
  }

  const classQuery = supabase.from("classes").select("id, name").eq("institution_id", context.institutionId).order("name");
  const { data: classRows } = assignedClassIds === null
    ? await classQuery
    : assignedClassIds.length
      ? await classQuery.in("id", assignedClassIds)
      : { data: [] as { id: string; name: string }[] };
  const classes: ResultClassOption[] = (classRows ?? []).map((item) => ({ id: item.id, label: item.name }));
  const classIds = classes.map((item) => item.id);

  const [{ data: termRows }, { data: resultRows }] = await Promise.all([
    supabase.from("terms").select("id, name, academic_year, is_current").eq("institution_id", context.institutionId).order("start_date", { ascending: false }),
    supabase.from("results").select("id, student_id, class_id, subject, term_id, continuous_assessment_score, exam_score, final_grade, grade_label, updated_at").eq("institution_id", context.institutionId).order("updated_at", { ascending: false }).limit(100),
  ]);
  const terms: ResultTermOption[] = (termRows ?? []).map((term) => ({ id: term.id, label: `${term.name} · ${term.academic_year}${term.is_current ? " · Current" : ""}` }));

  const [{ data: enrollments }, { data: assessmentRows }] = classIds.length
    ? await Promise.all([
      supabase.from("student_enrollments").select("student_id, class_id, term_id").eq("institution_id", context.institutionId).is("ended_at", null).in("class_id", classIds),
      supabase.from("assessments").select("id, class_id, term_id, subject, title, max_score").eq("institution_id", context.institutionId).in("class_id", classIds).order("date", { ascending: false }),
    ])
    : [{ data: [] as { student_id: string; class_id: string; term_id: string }[] }, { data: [] as { id: string; class_id: string | null; term_id: string | null; subject: string; title: string; max_score: number | null }[] }];

  const studentIds = [...new Set([
    ...(enrollments ?? []).map((enrollment) => enrollment.student_id),
    ...(resultRows ?? []).map((result) => result.student_id).filter((id): id is string => Boolean(id)),
  ])];
  const { data: studentRows } = studentIds.length
    ? await supabase.from("students").select("id, first_name, last_name, status").eq("institution_id", context.institutionId).in("id", studentIds)
    : { data: [] as { id: string; first_name: string; last_name: string; status: string }[] };
  const studentNames = new Map((studentRows ?? []).map((student) => [student.id, `${student.first_name} ${student.last_name}`]));
  const activeStudentIds = new Set((studentRows ?? []).filter((student) => student.status === "active").map((student) => student.id));

  const students: ResultStudentOption[] = (enrollments ?? []).flatMap((enrollment) => {
    const name = studentNames.get(enrollment.student_id);
    return name && activeStudentIds.has(enrollment.student_id)
      ? [{ id: enrollment.student_id, label: name, classId: enrollment.class_id, termId: enrollment.term_id }]
      : [];
  });
  const assessments: ResultAssessmentOption[] = (assessmentRows ?? []).flatMap((assessment) => (
    assessment.class_id && assessment.term_id && assessment.max_score && assessment.max_score > 0
      ? [{
        id: assessment.id,
        label: assessment.title,
        classId: assessment.class_id,
        termId: assessment.term_id,
        subject: assessment.subject,
        maxScore: Number(assessment.max_score),
      }]
      : []
  ));
  const classNames = new Map(classes.map((item) => [item.id, item.label]));
  const termNames = new Map(terms.map((item) => [item.id, item.label]));
  const canSubmit = ["staff", "principal", "owner"].includes(context.role);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-medium text-blue-800">Assessment</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Results</h1>
        <p className="mt-2 text-sm text-slate-600">Assessment scores are stored as entered; final grades are calculated from the active grading key.</p>
      </header>

      {canSubmit ? (
        <section aria-labelledby="entry-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 id="entry-heading" className="text-base font-semibold text-slate-950">Enter scores</h2>
          <p className="mb-5 mt-1 text-sm text-slate-600">Staff can submit only for classes assigned to their account.</p>
          {classes.length && terms.length && assessments.length && students.length ? (
            <ResultEntryForm classes={classes} terms={terms} students={students} assessments={assessments} />
          ) : (
            <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">Result entry needs a current class assignment, active student enrolment, term, and at least one assessment with a maximum score.</p>
          )}
        </section>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Your role can view results but cannot submit scores.</p>
      )}

      <section aria-labelledby="results-history-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 id="results-history-heading" className="text-base font-semibold text-slate-950">Recent results</h2>
          <p className="mt-1 text-sm text-slate-600">Most recently calculated results, up to 100 records.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">Recently calculated student results</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-5 py-3">Student</th><th scope="col" className="px-5 py-3">Class</th><th scope="col" className="px-5 py-3">Term</th><th scope="col" className="px-5 py-3">Subject</th><th scope="col" className="px-5 py-3">Assessment</th><th scope="col" className="px-5 py-3">Exam</th><th scope="col" className="px-5 py-3">Final grade</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {resultRows?.map((result) => (
                <tr key={result.id}>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900">{result.student_id ? studentNames.get(result.student_id) ?? "Student record" : "Student record"}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{result.class_id ? classNames.get(result.class_id) ?? "Class" : "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{result.term_id ? termNames.get(result.term_id) ?? "Term" : "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{result.subject}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono tabular-nums text-slate-700">{result.continuous_assessment_score ?? "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono tabular-nums text-slate-700">{result.exam_score ?? "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono font-semibold tabular-nums text-slate-900">{result.final_grade ?? "—"} {result.grade_label ? <span className="font-sans text-xs text-slate-500">{result.grade_label}</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!resultRows?.length ? <p className="px-5 py-7 text-center text-sm text-slate-500">No calculated results are available yet.</p> : null}
      </section>
    </div>
  );
}
