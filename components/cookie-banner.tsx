"use client";

import { setCookieConsent, useCookieConsent } from "@/components/cookie-consent-store";

export function CookieBanner() {
  const consent = useCookieConsent();
  const analyticsConfigured = /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "");

  if (consent) return null;

  return (
    <aside aria-label="Cookie choices" className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-700">
          Supabase session cookies are essential for sign-in. Optional analytics stays off unless it is configured and you allow it.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          {analyticsConfigured ? (
            <>
              <button type="button" onClick={() => setCookieConsent("essential")} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800">
                Essential only
              </button>
              <button type="button" onClick={() => setCookieConsent("analytics")} className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800">
                Allow analytics
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setCookieConsent("essential")} className="rounded-md bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800">
              Continue
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
