"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Add the public URL and anon key to the environment.");
  }

  const secureCookies = typeof window !== "undefined" && window.location.protocol === "https:";

  return createBrowserClient(url, anonKey, {
    cookieOptions: {
      sameSite: secureCookies ? "none" : "lax",
      secure: secureCookies,
    },
  });
}
