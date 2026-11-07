import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The requested School Manager page could not be found.",
};

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16">
      <section aria-labelledby="not-found-title" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <p className="font-mono text-sm font-semibold tracking-widest text-blue-800">404</p>
        <h1 id="not-found-title" className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">This page isn’t here</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">The address may be out of date, or the page may have moved. Return to the school workspace to continue.</p>
        <Link href="/" className="mt-6 inline-flex rounded-md bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900">Back to the dashboard</Link>
      </section>
    </main>
  );
}
