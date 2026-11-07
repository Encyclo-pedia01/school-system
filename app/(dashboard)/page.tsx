import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, GraduationCap, Users, UserSquare } from "lucide-react";

import { InsightRefreshButton, InsightStatusButtons } from "@/components/insight-controls";
import { getInstitutionContext } from "@/lib/institution/context";
import { institutionPageMetadata } from "@/lib/institution/metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return institutionPageMetadata("Overview", "A clear summary of school operations and outstanding actions.");
}

const metrics = [
  { key: "students", label: "Students", href: "/students", icon: Users, color: "text-blue-800" },
  { key: "staff", label: "Staff", href: "/staff", icon: UserSquare, color: "text-teal-800" },
  { key: "insights", label: "Open insights", href: "#insights", icon: AlertTriangle, color: "text-amber-700" },
] as const;

export default async function DashboardPage() {
  const context = await getInstitutionContext();

  if (!context) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6" aria-labelledby="no-institution-heading">
        <h1 id="no-institution-heading" className="text-lg font-semibold">No institution linked</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your account is signed in but does not have an active school membership. Ask an institution administrator to add your account.</p>
      </section>
    );
  }

  const supabase = await createSupabaseServerClient();
  const [students, staff, insights] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", context.institutionId).eq("status", "active"),
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("institution_id", context.institutionId).eq("status", "active"),
    supabase.from("insights").select("id, type, severity, message, status, created_at", { count: "exact" }).eq("institution_id", context.institutionId).eq("status", "open").order("created_at", { ascending: false }).limit(10),
  ]);

  const counts = {
    students: students.count ?? 0,
    staff: staff.count ?? 0,
    insights: insights.count ?? 0,
  };
  const loadError = students.error || staff.error || insights.error;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section aria-labelledby="overview-heading" className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-800">Operations overview</p>
          <h1 id="overview-heading" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{context.institutionName.trim() || "School Manager"}</h1>
          <p className="mt-2 text-sm text-slate-600">Review current records and follow up on items that need attention.</p>
        </div>
        <Link href="/results" className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900">
          <GraduationCap size={17} aria-hidden="true" /> Enter results
        </Link>
      </section>

      {loadError ? (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Some dashboard data is unavailable. Confirm that the latest database migrations have been applied.
        </p>
      ) : null}

      <section aria-label="Institution summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(({ key, label, href, icon: Icon, color }) => (
          <Link key={key} href={href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{label}</p>
                <p className="mt-3 font-mono text-3xl font-semibold tabular-nums text-slate-950">{counts[key]}</p>
              </div>
              <span className={`rounded-lg bg-slate-50 p-2.5 ${color}`}><Icon size={20} aria-hidden="true" /></span>
            </div>
          </Link>
        ))}
      </section>

      <section id="insights" aria-labelledby="insights-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="insights-heading" className="text-base font-semibold text-slate-950">Needs attention</h2>
            <p className="mt-1 text-sm text-slate-600">Attendance and missing-result alerts for your institution.</p>
          </div>
          <InsightRefreshButton />
        </div>
        {insights.data?.length ? (
          <ul className="divide-y divide-slate-100">
            {insights.data.map((insight) => (
              <li key={insight.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${insight.severity === "high" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
                      {insight.severity === "high" ? "High priority" : "Review"}
                    </span>
                    <span className="text-xs text-slate-500">{insight.type.replaceAll("_", " ")}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-800">{insight.message}</p>
                </div>
                <InsightStatusButtons insightId={insight.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No open insights. Use “Check for new insights” to scan recent records.</p>
        )}
      </section>
    </div>
  );
}
