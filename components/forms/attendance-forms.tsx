"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { recordStudentAttendance } from "@/app/actions/attendance";
import { recordStaffCheckin } from "@/app/actions/checkins";
import { attendanceRecordSchema, staffCheckinSchema } from "@/lib/validation/schemas";

export type SelectOption = { id: string; label: string };
export type AttendanceStudentOption = SelectOption & { classId: string; termId: string };

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-1 text-sm text-red-700">{message}</p> : null;
}

export function StaffCheckinForm({
  staff,
  stations,
}: {
  staff: SelectOption[];
  stations: SelectOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof staffCheckinSchema>>({
    resolver: zodResolver(staffCheckinSchema),
    defaultValues: { staffId: "", stationId: null },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await recordStaffCheckin(values);
    if (!result.success) {
      setServerError(result.message);
      Object.entries(result.fieldErrors ?? {}).forEach(([name, messages]) => {
        form.setError(name as keyof z.infer<typeof staffCheckinSchema>, { message: messages[0] });
      });
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    form.reset({ staffId: "", stationId: null });
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="checkin-staff" className="mb-1.5 block text-sm font-medium text-slate-700">Staff member</label>
        <select id="checkin-staff" aria-invalid={Boolean(form.formState.errors.staffId)} aria-describedby={form.formState.errors.staffId ? "checkin-staff-error" : undefined} {...form.register("staffId")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Select staff</option>
          {staff.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
        </select>
        <FieldError id="checkin-staff-error" message={form.formState.errors.staffId?.message} />
      </div>
      <div>
        <label htmlFor="checkin-station" className="mb-1.5 block text-sm font-medium text-slate-700">Station <span className="font-normal text-slate-500">(optional)</span></label>
        <select id="checkin-station" {...form.register("stationId", { setValueAs: (value) => value || null })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">No station selected</option>
          {stations.map((station) => <option key={station.id} value={station.id}>{station.label}</option>)}
        </select>
      </div>
      {serverError ? <p role="alert" className="text-sm text-red-700">{serverError}</p> : null}
      <p className="text-xs leading-5 text-slate-500">The database stamps the current time and determines whether the check-in is late.</p>
      <button type="submit" disabled={form.formState.isSubmitting || staff.length === 0} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">
        {form.formState.isSubmitting ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : null}
        {form.formState.isSubmitting ? "Recording…" : "Record check-in"}
      </button>
    </form>
  );
}

export function StudentAttendanceForm({
  classes,
  terms,
  students,
  date,
}: {
  classes: SelectOption[];
  terms: SelectOption[];
  students: AttendanceStudentOption[];
  date: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof attendanceRecordSchema>>({
    resolver: zodResolver(attendanceRecordSchema),
    defaultValues: { classId: "", termId: "", studentId: "", attendanceDate: date, status: "present" },
  });
  const selectedClass = useWatch({ control: form.control, name: "classId" });
  const selectedTerm = useWatch({ control: form.control, name: "termId" });
  const eligibleStudents = students.filter((student) => student.classId === selectedClass && student.termId === selectedTerm);

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null);
    const result = await recordStudentAttendance(values);
    if (!result.success) {
      setServerError(result.message);
      Object.entries(result.fieldErrors ?? {}).forEach(([name, messages]) => {
        form.setError(name as keyof z.infer<typeof attendanceRecordSchema>, { message: messages[0] });
      });
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    form.reset({ ...values, studentId: "", status: "present" });
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="attendance-class" className="mb-1.5 block text-sm font-medium text-slate-700">Class</label>
        <select id="attendance-class" {...form.register("classId")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Select class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <FieldError id="attendance-class-error" message={form.formState.errors.classId?.message} />
      </div>
      <div>
        <label htmlFor="attendance-term" className="mb-1.5 block text-sm font-medium text-slate-700">Term</label>
        <select id="attendance-term" {...form.register("termId")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Select term</option>{terms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <FieldError id="attendance-term-error" message={form.formState.errors.termId?.message} />
      </div>
      <div>
        <label htmlFor="attendance-student" className="mb-1.5 block text-sm font-medium text-slate-700">Student</label>
        <select id="attendance-student" {...form.register("studentId")} disabled={!eligibleStudents.length} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-50"><option value="">Select student</option>{eligibleStudents.map((student) => <option key={student.id} value={student.id}>{student.label}</option>)}</select>
        <FieldError id="attendance-student-error" message={form.formState.errors.studentId?.message} />
      </div>
      <div>
        <label htmlFor="attendance-date" className="mb-1.5 block text-sm font-medium text-slate-700">Date</label>
        <input id="attendance-date" type="date" {...form.register("attendanceDate")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" />
        <FieldError id="attendance-date-error" message={form.formState.errors.attendanceDate?.message} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="attendance-status" className="mb-1.5 block text-sm font-medium text-slate-700">Status</label>
        <select id="attendance-status" {...form.register("status")} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm sm:max-w-xs">
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="excused">Excused</option>
        </select>
      </div>
      {serverError ? <p role="alert" className="text-sm text-red-700 sm:col-span-2">{serverError}</p> : null}
      <div className="sm:col-span-2">
        <button type="submit" disabled={form.formState.isSubmitting || !classes.length || !terms.length || !students.length} className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">
          {form.formState.isSubmitting ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : null}
          {form.formState.isSubmitting ? "Saving…" : "Save attendance"}
        </button>
      </div>
    </form>
  );
}
