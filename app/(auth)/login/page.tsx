import type { Metadata } from "next";
import { Suspense } from "react";

import { LegalFooter } from "@/components/legal-footer";
import { LoginForm } from "@/app/(auth)/login/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to the School Manager operations workspace.",
};

type LoginPageProps = {
  searchParams: Promise<{ setup?: string }>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginContent({ searchParams }: LoginPageProps) {
  const { setup } = await searchParams;

  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <section aria-labelledby="login-heading" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-lg bg-blue-800 font-semibold text-white">S</span>
          <div>
            <p className="font-semibold tracking-tight text-blue-950">School Manager</p>
            <p className="text-xs text-slate-500">Operations workspace</p>
          </div>
        </div>
        <h1 id="login-heading" className="text-2xl font-semibold tracking-tight text-slate-950">Sign in</h1>
        <p className="mb-7 mt-2 text-sm leading-6 text-slate-600">Use your school account to continue.</p>
        <LoginForm setupError={setup === "supabase"} />
      </section>
      <div className="w-full max-w-md"><LegalFooter /></div>
    </main>
  );
}

function LoginFallback() {
  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <section role="status" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Loading secure sign-in…</p>
      </section>
      <div className="w-full max-w-md"><LegalFooter /></div>
    </main>
  );
}
