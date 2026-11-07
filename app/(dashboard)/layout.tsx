import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard-shell";
import { getInstitutionContext } from "@/lib/institution/context";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50"><main className="mx-auto max-w-3xl p-8" role="status">Loading school workspace…</main></div>}>
      <AuthenticatedDashboard>{children}</AuthenticatedDashboard>
    </Suspense>
  );
}

async function AuthenticatedDashboard({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await getInstitutionContext();
  return <DashboardShell context={context}>{children}</DashboardShell>;
}
