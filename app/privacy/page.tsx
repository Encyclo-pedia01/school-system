import type { Metadata } from "next";

import { LegalFooter } from "@/components/legal-footer";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How School Manager handles account and school records.",
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-medium text-blue-800">School Manager</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Privacy notice</h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: November 2026</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
          <section aria-labelledby="privacy-data">
            <h2 id="privacy-data" className="text-lg font-semibold text-slate-900">Information handled</h2>
            <p className="mt-2">School Manager processes account details and school records entered by an institution, which may include student and staff identifiers, class assignments, attendance, assessment scores, results, and fee records. The institution is responsible for deciding what information to enter and for providing any notices required for its users.</p>
          </section>
          <section aria-labelledby="privacy-use">
            <h2 id="privacy-use" className="text-lg font-semibold text-slate-900">How information is used</h2>
            <p className="mt-2">Information is used to authenticate users, apply institution and role permissions, record school operations, calculate results from configured grading keys, display operational insights, maintain security logs, and respond to support requests. Records are separated by institution membership and role-based database policies.</p>
          </section>
          <section aria-labelledby="privacy-cookies">
            <h2 id="privacy-cookies" className="text-lg font-semibold text-slate-900">Cookies and analytics</h2>
            <p className="mt-2">Essential session cookies keep users signed in and protect authenticated requests. They are required for the service to operate. Optional analytics are loaded only when an administrator configures a Google Analytics measurement ID and the user allows analytics in the cookie choices.</p>
          </section>
          <section aria-labelledby="privacy-retention">
            <h2 id="privacy-retention" className="text-lg font-semibold text-slate-900">Access, retention, and requests</h2>
            <p className="mt-2">Access is limited by the institution’s active memberships and assigned roles. The institution should manage account access and record retention in accordance with its policies and applicable law. For questions about an institution’s records, contact that institution. For service questions, email <a className="font-medium text-blue-800 underline" href="mailto:joegady94@gmail.com">joegady94@gmail.com</a>.</p>
          </section>
          <section aria-labelledby="privacy-security">
            <h2 id="privacy-security" className="text-lg font-semibold text-slate-900">Security</h2>
            <p className="mt-2">The application uses Supabase authentication and PostgreSQL row-level security. Institutions should use individual accounts, assign only necessary roles, keep credentials private, and promptly remove access when it is no longer needed.</p>
          </section>
          <p className="rounded-md bg-slate-50 p-4 text-slate-600">This starter notice describes the application’s intended operation and is not a substitute for institution-specific privacy disclosures or legal review.</p>
        </div>
      </article>
      <LegalFooter />
    </main>
  );
}
