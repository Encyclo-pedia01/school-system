"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { saveGradingKey } from "@/app/actions/grading-keys";
import { saveSchoolSettings } from "@/app/actions/settings";
import { gradingKeySchema, schoolSettingsSchema } from "@/lib/validation/schemas";

export type SettingsOption = { id: string; label: string };

export function SchoolSettingsForm({ schoolStartTime, timezone }: { schoolStartTime: string; timezone: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<z.infer<typeof schoolSettingsSchema>>({
    resolver: zodResolver(schoolSettingsSchema),
    defaultValues: { schoolStartTime: schoolStartTime.slice(0, 5), timezone },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveSchoolSettings(values);
      if (!result.success) {
        Object.entries(result.fieldErrors ?? {}).forEach(([name, messages]) => {
          form.setError(name as keyof z.infer<typeof schoolSettingsSchema>, { message: messages[0] });
        });
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="school-start-time" className="mb-1.5 block text-sm font-medium text-slate-700">School start time</label>
          <input id="school-start-time" type="time" {...form.register("schoolStartTime")} aria-invalid={Boolean(form.formState.errors.schoolStartTime)} aria-describedby={form.formState.errors.schoolStartTime ? "school-start-error" : undefined} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" />
          {form.formState.errors.schoolStartTime ? <p id="school-start-error" className="mt-1 text-sm text-red-700">{form.formState.errors.schoolStartTime.message}</p> : null}
        </div>
        <div>
          <label htmlFor="school-timezone" className="mb-1.5 block text-sm font-medium text-slate-700">IANA timezone</label>
          <input id="school-timezone" type="text" placeholder="Africa/Accra" {...form.register("timezone")} aria-invalid={Boolean(form.formState.errors.timezone)} aria-describedby={form.formState.errors.timezone ? "school-timezone-error" : "school-timezone-hint"} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" />
          <p id="school-timezone-hint" className="mt-1 text-xs text-slate-500">Use a PostgreSQL timezone name, such as Europe/London.</p>
          {form.formState.errors.timezone ? <p id="school-timezone-error" className="mt-1 text-sm text-red-700">{form.formState.errors.timezone.message}</p> : null}
        </div>
      </div>
      <button type="submit" disabled={pending || form.formState.isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">
        {pending || form.formState.isSubmitting ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : null}
        Save school settings
      </button>
    </form>
  );
}

export function GradingKeyForm({ terms, classes }: { terms: SettingsOption[]; classes: SettingsOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<z.input<typeof gradingKeySchema>, unknown, z.output<typeof gradingKeySchema>>({
    resolver: zodResolver(gradingKeySchema),
    defaultValues: {
      termId: terms[0]?.id ?? "",
      classId: null,
      subject: "",
      continuousAssessmentWeight: 60,
      examWeight: 40,
      gradeBands: [
        { minimum: 80, label: "A" },
        { minimum: 70, label: "B" },
        { minimum: 60, label: "C" },
        { minimum: 50, label: "D" },
        { minimum: 0, label: "F" },
      ],
    },
  });
  const gradeBands = useFieldArray({ control: form.control, name: "gradeBands" });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await saveGradingKey(values);
      if (!result.success) {
        Object.entries(result.fieldErrors ?? {}).forEach(([name, messages]) => {
          form.setError(name as keyof z.infer<typeof gradingKeySchema>, { message: messages[0] });
        });
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="grading-term" className="mb-1.5 block text-sm font-medium text-slate-700">Term</label>
          <select id="grading-term" {...form.register("termId")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Select term</option>{terms.map((term) => <option key={term.id} value={term.id}>{term.label}</option>)}</select>
          {form.formState.errors.termId ? <p className="mt-1 text-sm text-red-700">{form.formState.errors.termId.message}</p> : null}
        </div>
        <div>
          <label htmlFor="grading-class" className="mb-1.5 block text-sm font-medium text-slate-700">Scope</label>
          <select id="grading-class" {...form.register("classId", { setValueAs: (value) => value || null })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Institution-wide</option>{classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.label}</option>)}</select>
        </div>
        <div>
          <label htmlFor="grading-subject" className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
          <input id="grading-subject" type="text" maxLength={120} {...form.register("subject")} aria-invalid={Boolean(form.formState.errors.subject)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" />
          {form.formState.errors.subject ? <p className="mt-1 text-sm text-red-700">{form.formState.errors.subject.message}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ca-weight" className="mb-1.5 block text-sm font-medium text-slate-700">Assessment %</label>
            <input id="ca-weight" type="number" min="0" max="100" step="0.01" {...form.register("continuousAssessmentWeight", { setValueAs: (value) => value === "" ? undefined : Number(value) })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" />
            {form.formState.errors.continuousAssessmentWeight ? <p className="mt-1 text-sm text-red-700">{form.formState.errors.continuousAssessmentWeight.message}</p> : null}
          </div>
          <div>
            <label htmlFor="exam-weight" className="mb-1.5 block text-sm font-medium text-slate-700">Exam %</label>
            <input id="exam-weight" type="number" min="0" max="100" step="0.01" {...form.register("examWeight", { setValueAs: (value) => value === "" ? undefined : Number(value) })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" />
            {form.formState.errors.examWeight ? <p className="mt-1 text-sm text-red-700">{form.formState.errors.examWeight.message}</p> : null}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500">Assessment and exam weights must total 100%.</p>

      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-900">Grade bands</legend>
        {gradeBands.fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-3">
            <div>
              <label htmlFor={`grade-minimum-${index}`} className="sr-only">Minimum score for band {index + 1}</label>
              <input id={`grade-minimum-${index}`} type="number" min="0" max="100" step="0.01" {...form.register(`gradeBands.${index}.minimum`, { setValueAs: (value) => value === "" ? undefined : Number(value) })} aria-label={`Minimum score for grade band ${index + 1}`} placeholder="Minimum" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" />
              {form.formState.errors.gradeBands?.[index]?.minimum ? <p className="mt-1 text-sm text-red-700">{form.formState.errors.gradeBands[index]?.minimum?.message}</p> : null}
            </div>
            <div>
              <label htmlFor={`grade-label-${index}`} className="sr-only">Label for band {index + 1}</label>
              <input id={`grade-label-${index}`} type="text" maxLength={16} {...form.register(`gradeBands.${index}.label`)} aria-label={`Label for grade band ${index + 1}`} placeholder="Grade label" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" />
              {form.formState.errors.gradeBands?.[index]?.label ? <p className="mt-1 text-sm text-red-700">{form.formState.errors.gradeBands[index]?.label?.message}</p> : null}
            </div>
            <button type="button" onClick={() => gradeBands.remove(index)} disabled={gradeBands.fields.length <= 1} aria-label={`Remove grade band ${index + 1}`} className="rounded-md border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"><Trash2 size={17} aria-hidden="true" /></button>
          </div>
        ))}
        {form.formState.errors.gradeBands?.message ? <p className="text-sm text-red-700">{form.formState.errors.gradeBands.message}</p> : null}
        <button type="button" onClick={() => gradeBands.append({ minimum: 0, label: "" })} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-800 hover:text-blue-950"><Plus size={16} aria-hidden="true" /> Add grade band</button>
      </fieldset>

      <button type="submit" disabled={pending || !terms.length || form.formState.isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">
        {pending || form.formState.isSubmitting ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : null}
        Save grading key
      </button>
    </form>
  );
}
