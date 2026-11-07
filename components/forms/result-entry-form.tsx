"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { submitStudentResult } from "@/app/actions/results";
import { resultSubmissionSchema } from "@/lib/validation/schemas";

export type ResultClassOption = { id: string; label: string };
export type ResultTermOption = { id: string; label: string };
export type ResultStudentOption = { id: string; label: string; classId: string; termId: string };
export type ResultAssessmentOption = {
  id: string;
  label: string;
  classId: string;
  termId: string;
  subject: string;
  maxScore: number;
};

export function ResultEntryForm({
  classes,
  terms,
  students,
  assessments,
}: {
  classes: ResultClassOption[];
  terms: ResultTermOption[];
  students: ResultStudentOption[];
  assessments: ResultAssessmentOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [maximumError, setMaximumError] = useState<string | null>(null);
  const [classId, termId] = [classes[0]?.id ?? "", terms[0]?.id ?? ""];
  const [defaultSubject] = useState(assessments.find((item) => item.classId === classId && item.termId === termId)?.subject ?? "");

  const schema = useMemo(() => resultSubmissionSchema.superRefine((data, context) => {
    data.assessmentScores.forEach((entry, index) => {
      const assessment = assessments.find((item) => item.id === entry.assessmentId);
      if (!assessment) {
        context.addIssue({ code: "custom", message: "Choose an assessment in the selected class and term.", path: ["assessmentScores", index, "assessmentId"] });
      } else if (entry.score > Math.min(assessment.maxScore, 100)) {
        context.addIssue({ code: "custom", message: `Score cannot exceed ${Math.min(assessment.maxScore, 100)}.`, path: ["assessmentScores", index, "score"] });
      }
    });
  }), [assessments]);

  const form = useForm<z.input<typeof resultSubmissionSchema>, unknown, z.output<typeof resultSubmissionSchema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: "",
      classId,
      termId,
      subject: defaultSubject,
      assessmentScores: assessments
        .filter((item) => item.classId === classId && item.termId === termId && item.subject === defaultSubject)
        .map((item) => ({ assessmentId: item.id, score: 0 })),
      examScore: 0,
    },
  });
  const selectedClass = useWatch({ control: form.control, name: "classId" });
  const selectedTerm = useWatch({ control: form.control, name: "termId" });
  const selectedSubject = useWatch({ control: form.control, name: "subject" });
  const eligibleStudents = students.filter((student) => student.classId === selectedClass && student.termId === selectedTerm);
  const availableSubjects = useMemo(() => [...new Set(assessments
    .filter((assessment) => assessment.classId === selectedClass && assessment.termId === selectedTerm)
    .map((assessment) => assessment.subject))], [assessments, selectedClass, selectedTerm]);
  const selectedAssessments = useMemo(() => assessments.filter((assessment) =>
    assessment.classId === selectedClass && assessment.termId === selectedTerm && assessment.subject === selectedSubject,
  ), [assessments, selectedClass, selectedTerm, selectedSubject]);

  useEffect(() => {
    if (!availableSubjects.includes(form.getValues("subject"))) {
      form.setValue("subject", availableSubjects[0] ?? "", { shouldValidate: true });
    }
  }, [availableSubjects, form]);

  useEffect(() => {
    const nextScores = selectedAssessments.map((assessment) => ({ assessmentId: assessment.id, score: 0 }));
    form.setValue("assessmentScores", nextScores, { shouldValidate: false });
  }, [selectedClass, selectedTerm, selectedSubject, form, selectedAssessments]);

  useEffect(() => {
    if (!eligibleStudents.some((student) => student.id === form.getValues("studentId"))) {
      form.setValue("studentId", eligibleStudents[0]?.id ?? "", { shouldValidate: true });
    }
  }, [eligibleStudents, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    setMaximumError(null);
    const result = await submitStudentResult(values);
    if (!result.success) {
      setServerError(result.message);
      setMaximumError(result.fieldErrors?.assessmentScores?.[0] ?? null);
      if (result.fieldErrors?.examScore?.[0]) {
        form.setError("examScore", { message: result.fieldErrors.examScore[0] });
      }
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    form.reset({ ...values, assessmentScores: values.assessmentScores.map((entry) => ({ ...entry, score: 0 })), examScore: 0 });
    router.refresh();
  });

  const errorText = (name: keyof typeof form.formState.errors) => form.formState.errors[name]?.message?.toString();

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="result-class" className="mb-1.5 block text-sm font-medium text-slate-700">Class</label>
          <select id="result-class" {...form.register("classId")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          {errorText("classId") ? <p className="mt-1 text-sm text-red-700">{errorText("classId")}</p> : null}
        </div>
        <div>
          <label htmlFor="result-term" className="mb-1.5 block text-sm font-medium text-slate-700">Term</label>
          <select id="result-term" {...form.register("termId")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Select term</option>{terms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          {errorText("termId") ? <p className="mt-1 text-sm text-red-700">{errorText("termId")}</p> : null}
        </div>
        <div>
          <label htmlFor="result-student" className="mb-1.5 block text-sm font-medium text-slate-700">Student</label>
          <select id="result-student" {...form.register("studentId")} disabled={!eligibleStudents.length} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50"><option value="">Select student</option>{eligibleStudents.map((student) => <option key={student.id} value={student.id}>{student.label}</option>)}</select>
          {errorText("studentId") ? <p className="mt-1 text-sm text-red-700">{errorText("studentId")}</p> : null}
        </div>
        <div>
          <label htmlFor="result-subject" className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
          <select id="result-subject" {...form.register("subject")} disabled={!availableSubjects.length} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50"><option value="">Select subject</option>{availableSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select>
          {errorText("subject") ? <p className="mt-1 text-sm text-red-700">{errorText("subject")}</p> : null}
        </div>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">Assessment scores</legend>
        {selectedAssessments.length ? selectedAssessments.map((assessment, index) => (
          <div key={assessment.id} className="grid gap-2 sm:grid-cols-[1fr_10rem] sm:items-center">
            <label htmlFor={`assessment-score-${assessment.id}`} className="text-sm text-slate-700">{assessment.label} <span className="text-xs text-slate-500">(max {Math.min(assessment.maxScore, 100)})</span></label>
            <div>
              <input type="hidden" {...form.register(`assessmentScores.${index}.assessmentId`)} value={assessment.id} />
              <input id={`assessment-score-${assessment.id}`} type="number" min="0" max={Math.min(assessment.maxScore, 100)} step="0.01" inputMode="decimal" {...form.register(`assessmentScores.${index}.score`, { setValueAs: (value) => value === "" ? undefined : Number(value) })} aria-invalid={Boolean(form.formState.errors.assessmentScores?.[index]?.score)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm tabular-nums" />
              {form.formState.errors.assessmentScores?.[index]?.score?.message ? <p className="mt-1 text-sm text-red-700">{form.formState.errors.assessmentScores[index]?.score?.message}</p> : null}
            </div>
          </div>
        )) : <p className="text-sm text-slate-500">No assessments are configured for this class, subject, and term.</p>}
      </fieldset>

      <div className="max-w-xs">
        <label htmlFor="exam-score" className="mb-1.5 block text-sm font-medium text-slate-700">Exam score <span className="text-xs text-slate-500">(out of 100)</span></label>
        <input id="exam-score" type="number" min="0" max="100" step="0.01" inputMode="decimal" {...form.register("examScore", { setValueAs: (value) => value === "" ? undefined : Number(value) })} aria-invalid={Boolean(form.formState.errors.examScore)} aria-describedby={form.formState.errors.examScore ? "exam-score-error" : undefined} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm tabular-nums" />
        {form.formState.errors.examScore ? <p id="exam-score-error" className="mt-1 text-sm text-red-700">{form.formState.errors.examScore.message}</p> : null}
      </div>
      {maximumError ? <p role="alert" className="text-sm text-red-700">{maximumError}</p> : null}
      {serverError ? <p role="alert" className="text-sm text-red-700">{serverError}</p> : null}
      <button type="submit" disabled={form.formState.isSubmitting || !selectedAssessments.length || !eligibleStudents.length} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">
        {form.formState.isSubmitting ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : null}
        {form.formState.isSubmitting ? "Calculating…" : "Save scores and calculate grade"}
      </button>
    </form>
  );
}
