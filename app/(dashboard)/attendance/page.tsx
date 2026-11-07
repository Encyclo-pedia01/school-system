import type { Metadata } from "next";
import { Clock3 } from "lucide-react";

import { StudentAttendanceForm, StaffCheckinForm } from "@/components/forms/attendance-forms";
import type { AttendanceStudentOption, SelectOption } from "@/components/forms/attendance-forms";
import { getInstitutionContext } from "@/lib/institution/context";
import { institutionPageMetadata } from "@/lib/institution/metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return institutionPageMetadata("Attendance", "Record school attendance and staff check-ins.");
}

function todayInTimezone(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export default async function AttendancePage() {
  const context = await getInstitutionContext();
  if (!context) return <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">No active institution is linked to this account.</p>;

  const supabase = await createSupabaseServerClient();
  const [{ data: settings }, { data: staffRows }] = await Promise.all([
    supabase.from("institution_settings").select("school_start_time, timezone").eq("institution_id", context.institutionId).maybeSingle(),
    supabase.from("staff").select("id, user_id, first_name, last_name, status").eq("institution_id", context.institutionId).eq("status", "active").order("last_name"),
  ]);
  const timezone = settings?.timezone || "UTC";
  const staffOptions: SelectOption[] = (staffRows ?? []).map((member) => ({
    id: member.id,
    label: `${member.first_name} ${member.last_name}`,
  }));

  const authorityStaffId = staffRows?.find((member) => member.user_id === context.userId)?.id;
  const stationQuery = supabase
    .from("checkin_stations")
    .select("id, name")
    .eq("institution_id", context.institutionId)
    .eq("active", true);
  const { data: stations } = context.role === "authority"
    ? await (authorityStaffId
      ? stationQuery.or(`assigned_authority_staff_id.is.null,assigned_authority_staff_id.eq.${authorityStaffId}`).order("name")
      : stationQuery.is("assigned_authority_staff_id", null).order("name"))
    : { data: [] as { id: string; name: string }[] };
  const stationOptions: SelectOption[] = (stations ?? []).map((station) => ({ id: station.id, label: station.name }));

  const { data: recentCheckins } = context.role === "authority"
    ? await supabase.from("staff_checkins").select("id, staff_id, time_in, status").eq("institution_id", context.institutionId).eq("checkin_date", todayInTimezone(timezone)).order("time_in", { ascending: false }).limit(40)
    : { data: [] as { id: string; staff_id: string; time_in: string; status: string }[] };
  const staffNames = new Map((staffRows ?? []).map((member) => [member.id, `${member.first_name} ${member.last_name}`]));

  let classOptions: SelectOption[] = [];
  let termOptions: SelectOption[] = [];
  let studentOptions: AttendanceStudentOption[] = [];

  if (["staff", "principal", "owner"].includes(context.role)) {
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
    classOptions = (classRows ?? []).map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name }));

    const { data: terms } = await supabase.from("terms").select("id, name, academic_year, is_current").eq("institution_id", context.institutionId).order("start_date", { ascending: false });
    termOptions = (terms ?? []).map((term) => ({ id: term.id, label: `${term.name} · ${term.academic_year}${term.is_current ? " · Current" : ""}` }));

    const classIds = classOptions.map((schoolClass) => schoolClass.id);
    const { data: enrollments } = classIds.length
      ? await supabase.from("student_enrollments").select("student_id, class_id, term_id").eq("institution_id", context.institutionId).is("ended_at", null).in("class_id", classIds)
      : { data: [] as { student_id: string; class_id: string; term_id: string }[] };
    const studentIds = [...new Set((enrollments ?? []).map((enrollment) => enrollment.student_id))];
    const { data: students } = studentIds.length
      ? await supabase.from("students").select("id, first_name, last_name, status").eq("institution_id", context.institutionId).eq("status", "active").in("id", studentIds)
      : { data: [] as { id: string; first_name: string; last_name: string; status: string }[] };
    const studentNames = new Map((students ?? []).map((student) => [student.id, `${student.first_name} ${student.last_name}`]));
    studentOptions = (enrollments ?? []).flatMap((enrollment) => {
      const name = studentNames.get(enrollment.student_id);
      return name ? [{ id: enrollment.student_id, label: name, classId: enrollment.class_id, termId: enrollment.term_id }] : [];
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header>
        <p className="text-sm font-medium text-blue-800">Daily records</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Attendance</h1>
        <p className="mt-2 text-sm text-slate-600">Attendance records are restricted to the active institution.</p>
      </header>

      {context.role === "authority" ? (
        <>
          <section aria-labelledby="staff-checkin-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="rounded-lg bg-blue-50 p-2.5 text-blue-800"><Clock3 size={19} aria-hidden="true" /></span>
              <div>
                <h2 id="staff-checkin-heading" className="text-base font-semibold text-slate-950">Staff check-in</h2>
                <p className="mt-1 text-sm text-slate-600">School start: {settings?.school_start_time?.slice(0, 5) ?? "08:00"} ({timezone}). Time and status are set by the database.</p>
              </div>
            </div>
            {staffOptions.length ? <StaffCheckinForm staff={staffOptions} stations={stationOptions} /> : <p className="text-sm text-slate-500">Add active staff records before recording check-ins.</p>}
          </section>
          <section aria-labelledby="today-checkins-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 id="today-checkins-heading" className="text-base font-semibold">Today’s check-ins</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="sr-only">Staff check-ins for today</caption>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-5 py-3">Staff member</th><th scope="col" className="px-5 py-3">Time in</th><th scope="col" className="px-5 py-3">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {recentCheckins?.map((checkin) => <tr key={checkin.id}><td className="px-5 py-3.5 font-medium">{staffNames.get(checkin.staff_id) ?? "Staff record"}</td><td className="px-5 py-3.5 text-slate-600">{new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(checkin.time_in))}</td><td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${checkin.status === "late" ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"}`}>{checkin.status}</span></td></tr>)}
                </tbody>
              </table>
            </div>
            {!recentCheckins?.length ? <p className="px-5 py-6 text-center text-sm text-slate-500">No staff check-ins recorded today.</p> : null}
          </section>
        </>
      ) : ["staff", "principal", "owner"].includes(context.role) ? (
        <section aria-labelledby="student-attendance-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 id="student-attendance-heading" className="text-base font-semibold text-slate-950">Record student attendance</h2>
          <p className="mb-5 mt-1 text-sm text-slate-600">Staff can submit attendance only for their assigned classes.</p>
          {classOptions.length && termOptions.length && studentOptions.length ? (
            <StudentAttendanceForm classes={classOptions} terms={termOptions} students={studentOptions} date={todayInTimezone(timezone)} />
          ) : (
            <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">No assigned class roster is available. Add current terms, class assignments, and student enrolments to continue.</p>
          )}
        </section>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">Your role does not have access to attendance entry.</p>
      )}
    </div>
  );
}
