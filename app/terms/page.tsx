import type { Metadata } from "next";

import { LegalFooter } from "@/components/legal-footer";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using the School Manager operations workspace.",
};

export default function TermsPage() {
  return (
    <main id="main-content" className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-medium text-blue-800">School Manager</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Terms of use</h1>
        <p className="mt-3 text-sm text-slate-500">Last updated: November 2026</p>
        <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700">
          <section aria-labelledby="terms-access">
            <h2 id="terms-access" className="text-lg font-semibold text-slate-900">Authorized access</h2>
            <p className="mt-2">Use the service only through an account authorized by a participating institution. Keep credentials confidential, use your own account, and report suspected unauthorized access promptly. Access may be limited or removed when an account no longer has an active institutional membership.</p>
          </section>
          <section aria-labelledby="terms-responsibility">
            <h2 id="terms-responsibility" className="text-lg font-semibold text-slate-900">Institution responsibilities</h2>
            <p className="mt-2">Each institution is responsible for the accuracy and lawful use of its records, for assigning appropriate roles, for maintaining its grading keys and school settings, and for meeting its obligations to students, families, staff, and regulators.</p>
          </section>
          <section aria-labelledby="terms-records">
            <h2 id="terms-records" className="text-lg font-semibold text-slate-900">School records and calculations</h2>
            <p className="mt-2">Results are calculated from the assessment scores and grading key configured by the institution. Authorized users should verify inputs and review calculated results before relying on them for formal decisions. Audit entries record changes to selected student, staff, and result records.</p>
          </section>
          <section aria-labelledby="terms-use">
            <h2 id="terms-use" className="text-lg font-semibold text-slate-900">Acceptable use and availability</h2>
            <p className="mt-2">Do not attempt to bypass access controls, interfere with the service, or use it to store information unrelated to school operations. The service may be updated or temporarily unavailable for maintenance. Institutions should maintain any independent records required for continuity.</p>
          </section>
          <section aria-labelledby="terms-contact">
            <h2 id="terms-contact" className="text-lg font-semibold text-slate-900">Questions</h2>
            <p className="mt-2">For questions about these terms or the service, email <a className="font-medium text-blue-800 underline" href="mailto:joegady94@gmail.com">joegady94@gmail.com</a>.</p>
          </section>
          <p className="rounded-md bg-slate-50 p-4 text-slate-600">These starter terms are not jurisdiction-specific and should be reviewed and adapted before commercial launch.</p>
        </div>
      </article>
      <LegalFooter />
    </main>
  );
}
