import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Add the public URL and anon key to the environment.");
  }

  return { url, anonKey };
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const { url, anonKey } = getSupabaseConfig();
  const publicProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  const secureCookies = publicProtocol === "https";

  return createServerClient(url, anonKey, {
    cookieOptions: {
      sameSite: secureCookies ? "none" : "lax",
      secure: secureCookies,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies; Proxy refreshes sessions for requests.
        }
      },
    },
  });
}
