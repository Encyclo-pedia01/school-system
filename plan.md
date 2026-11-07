# School Management System implementation plan

## Goal and constraints

Extend the existing Next.js App Router and Supabase application in `Encyclo-pedia01/school-system` with tenant isolation, role-aware grading and check-in workflows, insights, auditing, and the requested internal-dashboard production checklist. Preserve current tables and columns, adding only the missing schema required by the approved scope. Keep the existing initial Git commit; make a separate, professional commit for each database/business feature and each requested checklist item. Push the finished commits to the existing `main` branch only after changes pass checks.

The supplied schema contains `assessment_scores`, `assessments`, `audit_log`, `checkin_stations`, `class_assignments`, `classes`, `fees`, `grading_keys`, `insights`, `institutions`, `memberships`, `newsletters`, `report_cards`, and a partial `results` table (the export ends at `term_id`). It has no student/staff/attendance/term/check-in records, no school start-time configuration, and no result score fields. The user authorized creating migrations for those missing structures. Existing fields such as `grading_keys.components`, `class_assignments.type`, and `memberships.role` must be validated in migration/application boundaries rather than silently trusted.

## Implementation approach

1. **Schema and isolation:** Add ordered Supabase migrations that extend `results` with score and audit metadata, define students, staff, terms, enrolments/attendance, `staff_checkins`, and institution settings including `school_start_time`. Add indexes, foreign keys, timestamps and constrained role/status values. Enable RLS on all tenant-owned tables. A narrowly scoped `SECURITY DEFINER` helper will resolve active membership for `auth.uid()` without recursive membership-policy evaluation. Policies will scope reads/writes to active institution membership; role-specific write policies will restrict authority users to check-in inserts, teachers to score entry for assigned classes, and principals/owners to grading-key management. A trigger will reject client-side edits to computed `final_grade`. Audit triggers will append before/after JSON to the existing `audit_log` for students, staff, and results.

2. **Trusted server operations:** Replace the current bare Supabase JS client usage for privileged operations with request-bound Supabase SSR clients and server actions. Validate arguments with Zod, obtain the user and active institution from the authenticated session/membership, and rely on RLS as defense in depth. Principal grading-key changes will validate a documented JSONB component/weight structure. Score submission will fetch the grading key and assigned-class authorization, calculate a normalized final score server-side, and write source scores and computed grade atomically through an RPC/transaction where supported. Check-ins will use a database timestamp, enforce station authorization, and compare against the institution's local school-start time. Insights generation will be an idempotent database function callable by a scheduled job or authorized action; dashboard transitions will be limited to actioned/dismissed.

3. **Dashboard UI:** Build focused role-aware screens for staff check-in and grading/results; display active insights on the dashboard with actioned/dismissed controls. Use Zod with React Hook Form, inline field errors, disabled/submitting states, and toast feedback. Use the repository's existing visual language, add horizontally scrollable tables, and make the sidebar a mobile drawer with a keyboard-accessible hamburger control. Add page-level loading UI and meaningful empty/error states.

4. **Production checklist:** Add a platform-neutral not-found UI, page-level metadata with institution-aware titles/descriptions when the signed-in user's institution is known and a neutral system fallback otherwise, retain/replace the app favicon, disallow all crawler access in `robots.txt`, and generate a sitemap containing only public/legal routes (no authenticated student data). Audit image alternative text. Add privacy and terms routes and semantic footer links. Add an essential-cookie notice without blocking Supabase authentication cookies. Add an analytics integration placeholder that does not load a third-party tracker until configured. Display the verified support email `joegady94@gmail.com`; omit the postal-address line until one is supplied. Use semantic HTML5 landmarks and native form/table elements throughout the page layout.

5. **Quality and Git:** Read the installed Next.js 16 documentation before using route metadata, middleware, and server-action APIs. Install only needed dependencies. Run formatting/lint/type/build checks and inspect the final diff. Commit each completed database/business feature and each requested checklist item separately with conventional messages; retain the existing clean initial commit.

## Project structure

- `supabase/migrations/`: ordered schema, RLS, triggers, and insight-generation SQL.
- `app/`: existing App Router shell plus route-level metadata, loading, not-found, privacy/terms, and dashboard workflows.
- `app/actions/` (or route-local `actions.ts`): authenticated server actions for grading, check-ins, and insight transitions.
- `lib/supabase/`: server/browser client factories and membership authorization helpers.
- `lib/validation/`: shared Zod schemas for forms and server actions.
- `components/`: responsive dashboard navigation, form controls, loading feedback, toast provider, and footer/cookie notice.
- `public/`: robots and route manifest; sitemap generation remains in the App Router metadata API.

## Design direction

Reuse the current dashboard's restrained blue, white, and neutral palette; improve spacing, hierarchy, focus states, and mobile behavior without adding decorative artwork. The three quick directions considered were: **Calm school operations** (<0.10 probability), **Editorial campus ledger** (<0.10), and **Bright student-first admin** (<0.10). Choose **Calm school operations**.

- **Design movement:** Contemporary institutional software with Swiss-grid clarity and subtle civic-service cues.
- **Core principles:** Legibility before density; role context stays visible; destructive/important state changes are explicit; mobile flows remain complete.
- **Color philosophy:** Deep blue signals trusted operations, restrained teal marks successful/active states, warm amber flags attention, and pale stone surfaces reduce long-session fatigue.
- **Layout paradigm:** Persistent desktop rail with a compact mobile drawer; a wide working canvas with slim, clearly grouped metric and task panels.
- **Signature elements:** Fine blue section rules; compact status chips with text labels; a consistent action panel for pending work.
- **Interaction philosophy:** Direct, predictable controls, visible confirmation and inline recovery, no hidden role-sensitive actions.
- **Animation:** Short (120–180 ms) opacity/position transitions for drawer and toast; respect reduced-motion; avoid decorative motion.
- **Typography system:** Keep the project's Inter font. Use tabular numerals for scores and counts, clear 14–16 px body text, and restrained medium-weight headings.
- **Brand essence:** A dependable, configurable operations workspace for school leadership and staff; calm, clear, accountable.
- **Brand voice:** Specific and respectful. Example: “Three attendance records need review.” “Saved for Term 2; final grade calculated from the active key.”
- **Wordmark & logo:** Keep neutral School Manager platform branding rather than a school-specific identity; resolve an institution name from authenticated membership when available.
- **Signature brand color:** Deep blue, retaining the app’s existing blue identity.
