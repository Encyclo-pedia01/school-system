import type { Metadata } from "next";

import { getInstitutionContext } from "@/lib/institution/context";
import { institutionPageMetadata } from "@/lib/institution/metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return institutionPageMetadata("Students", "View student records for the active institution.");
}

export default async function StudentsPage() {
  const context = await getInstitutionContext();
  if (!context) return <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">No active institution is linked to this account.</p>;

  const supabase = await createSupabaseServerClient();
  const { data: students, error } = await supabase
    .from("students")
    .select("id, admission_number, first_name, last_name, class_id, status")
    .eq("institution_id", context.institutionId)
    .order("last_name", { ascending: true })
    .limit(200);

  const classIds = [...new Set((students ?? []).map((student) => student.class_id).filter(Boolean))];
  const { data: classes } = classIds.length
    ? await supabase.from("classes").select("id, name").eq("institution_id", context.institutionId).in("id", classIds)
    : { data: [] as { id: string; name: string }[] };
  const classNames = new Map((classes ?? []).map((schoolClass) => [schoolClass.id, schoolClass.name]));

  return (
    <section aria-labelledby="students-heading" className="mx-auto max-w-6xl space-y-5">
      <header>
        <p className="text-sm font-medium text-blue-800">Directory</p>
        <h1 id="students-heading" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Students</h1>
        <p className="mt-2 text-sm text-slate-600">Student records within the active institution.</p>
      </header>
      {error ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Student records are unavailable. Confirm the latest database migrations have been applied.</p> : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <caption className="sr-only">Students for the active institution</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Admission number</th>
                <th scope="col" className="px-5 py-3 font-semibold">Student</th>
                <th scope="col" className="px-5 py-3 font-semibold">Class</th>
                <th scope="col" className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students?.map((student) => (
                <tr key={student.id}>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-700">{student.admission_number}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900">{student.first_name} {student.last_name}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{student.class_id ? classNames.get(student.class_id) ?? "Unassigned" : "Unassigned"}</td>
                  <td className="whitespace-nowrap px-5 py-3.5"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{student.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!error && !students?.length ? <p className="px-5 py-8 text-center text-sm text-slate-500">No student records are available yet.</p> : null}
      </div>
    </section>
  );
}
