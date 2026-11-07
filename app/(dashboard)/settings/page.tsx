import type { Metadata } from "next";
import { CalendarClock, Settings2 } from "lucide-react";

import { GradingKeyForm, SchoolSettingsForm } from "@/components/forms/settings-forms";
import type { SettingsOption } from "@/components/forms/settings-forms";
import { getInstitutionContext } from "@/lib/institution/context";
import { institutionPageMetadata } from "@/lib/institution/metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return institutionPageMetadata("Settings", "Configure school hours, timezones, and grading keys.");
}

export default async function SettingsPage() {
  const context = await getInstitutionContext();
  if (!context) return <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">No active institution is linked to this account.</p>;

  const supabase = await createSupabaseServerClient();
  const [{ data: settings, error: settingsError }, { data: terms, error: termsError }, { data: classes, error: classesError }] = await Promise.all([
    supabase.from("institution_settings").select("school_start_time, timezone").eq("institution_id", context.institutionId).maybeSingle(),
    supabase.from("terms").select("id, name, academic_year").eq("institution_id", context.institutionId).order("start_date", { ascending: false }),
    supabase.from("classes").select("id, name").eq("institution_id", context.institutionId).order("name"),
  ]);
  const termOptions: SettingsOption[] = (terms ?? []).map((term) => ({ id: term.id, label: `${term.name} · ${term.academic_year}` }));
  const classOptions: SettingsOption[] = (classes ?? []).map((schoolClass) => ({ id: schoolClass.id, label: schoolClass.name }));
  const canEdit = ["owner", "principal"].includes(context.role);

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header>
        <p className="text-sm font-medium text-blue-800">Configuration</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-2 text-sm text-slate-600">Settings apply only to {context.institutionName.trim() || "the active institution"}.</p>
      </header>

      {settingsError || termsError || classesError ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Some settings data is unavailable. Confirm that the latest database migrations have been applied.</p> : null}
      {!canEdit ? <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Your role can view this page but cannot change institution settings.</p> : null}

      <section aria-labelledby="hours-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="rounded-lg bg-blue-50 p-2.5 text-blue-800"><CalendarClock size={19} aria-hidden="true" /></span>
          <div>
            <h2 id="hours-heading" className="text-base font-semibold text-slate-950">School hours</h2>
            <p className="mt-1 text-sm text-slate-600">Staff check-ins after the configured start time are marked late.</p>
          </div>
        </div>
        {canEdit ? <SchoolSettingsForm schoolStartTime={settings?.school_start_time ?? "08:00:00"} timezone={settings?.timezone ?? "UTC"} /> : <p className="text-sm text-slate-700">Start time: {settings?.school_start_time?.slice(0, 5) ?? "08:00"} · Timezone: {settings?.timezone ?? "UTC"}</p>}
      </section>

      <section aria-labelledby="grading-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="rounded-lg bg-blue-50 p-2.5 text-blue-800"><Settings2 size={19} aria-hidden="true" /></span>
          <div>
            <h2 id="grading-heading" className="text-base font-semibold text-slate-950">Grading keys</h2>
            <p className="mt-1 text-sm text-slate-600">Set continuous-assessment and exam weights, then map final scores to grade labels.</p>
          </div>
        </div>
        {canEdit ? (
          termOptions.length ? <GradingKeyForm terms={termOptions} classes={classOptions} /> : <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">Add an academic term before configuring grading keys.</p>
        ) : <p className="text-sm text-slate-700">Grading keys are managed by an institution principal or owner.</p>}
      </section>
    </div>
  );
}
