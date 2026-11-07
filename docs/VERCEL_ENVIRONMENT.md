# Vercel deployment and environment variables

The Next.js project is linked to the GitHub repository `Encyclo-pedia01/school-system`. Configure the Vercel project from **Project → Settings → Environment Variables**. Values prefixed with `NEXT_PUBLIC_` are intentionally exposed to browser code at build time; never put a service-role key in one of them.

## Production variables

Add these variables to the **Production** target:

| Name | Value | Required |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | The project API URL from Supabase → Project Settings → API. For the current `school-system` project: `https://mmdfatudjxxlgypikpvs.supabase.co`. | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The legacy public `anon` JWT key from Supabase → Project Settings → API Keys. Do not use a `service_role` key. | Yes |
| `NEXT_PUBLIC_SITE_URL` | The stable production origin, such as `https://<your-production-domain>`. The app derives the request origin when this is unset. | Optional |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | A Google Analytics measurement ID. Leave unset to disable analytics. The script is loaded only after the user opts in. | Optional |

The application currently uses the Supabase SSR client with an `anonKey` parameter. Use the project's legacy public `anon` key for this variable. Although the anon key is safe to include in a browser application when RLS is correctly configured, Vercel's encrypted setting can reduce accidental display in the dashboard; it does not make a `NEXT_PUBLIC_` value secret after the app is built.

For each required variable, use Vercel's **Encrypted** value type and select **Production**. After changing a `NEXT_PUBLIC_` variable, trigger a new deployment because Next.js embeds it during the build.

## Preview and local development

Do not point Preview or Development deployments at a production school database by default. Use a separate Supabase staging project and add its URL and anon key to the **Preview** target. For local development, copy `.env.example` to `.env.local` and use development or staging credentials; do not commit `.env.local`.

Never add `SUPABASE_SERVICE_ROLE_KEY` to this project for browser use, and never prefix a privileged key with `NEXT_PUBLIC_`. Keep database access behind Supabase Auth, RLS policies, and the validated server/database functions.

## Verify the deployment and connection

After deploying the production branch, confirm the Vercel deployment status is **Ready**, then check `/login`, `/privacy`, `/terms`, `/robots.txt`, and `/sitemap.xml` on the production domain. This app uses Next.js Server Actions for mutations and does not define standalone `app/api/*` route handlers.

**Current access restriction:** the `school-system` Vercel project has Vercel SSO protection enabled for every default `vercel.app` domain. Unauthenticated probes of all five routes returned HTTP 302 to Vercel SSO, so the `Ready` deployment is not publicly reachable from those domains. Before inviting external schools, either attach a custom domain (the current protection excludes custom domains) or explicitly review and disable SSO protection. Supabase Auth and RLS still need to protect school data independently.

The following read-only requests verify Supabase Auth and PostgREST without returning school records. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in your shell first:

```sh
curl --fail --silent --show-error \
  -H "apikey: $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/auth/v1/health"

curl --fail --silent --show-error \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/institutions?select=id&limit=0"
```

A successful REST response should be an empty JSON array (`[]`); `limit=0` prevents returning institution identifiers. Do not run write tests against production school data.

## Database schema readiness

A healthy API response confirms the network and project key, not that every school workflow is ready. The current `school-system` database has no recorded repository migrations, and its inspected schema is missing some columns/tables expected by the committed migration set. In particular, `student_enrollments` and `institution_settings` are not present in the inspected schema, and the existing attendance/staff column names differ from those assumed by the migrations. Do **not** apply the migrations to this live project as-is. Reconcile the migrations against the live schema, test them in staging, and review the RLS policy replacement before any production schema change.
