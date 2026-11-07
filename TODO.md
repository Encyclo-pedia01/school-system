# Implementation outcomes

## Database tenancy, role policies, and audit history
- Add Supabase SQL migrations that preserve existing tables and define the missing structures needed by the features: students, staff, terms, attendance, staff check-ins, school start-time settings, and result score/final-grade data.
- Enable row-level security so a user can access data only when `institution_id` matches an active membership.
- Restrict `authority` users to inserting staff check-ins; restrict `staff` score entry to their assigned classes.
- Add database enforcement that prevents teachers from manually editing computed `final_grade`.
- Add PostgreSQL audit triggers for every INSERT, UPDATE, and DELETE on students, staff, and results, storing before and after JSON in `audit_log`.

## Grading keys and result calculation
- Provide a server action through which a principal/owner sets institution grading keys in JSONB.
- Provide a server action that accepts raw assessment and exam scores, reads the active grading key, calculates `final_grade`, and writes the result.
- Validate score bounds and role/class authorization on the server; preserve database enforcement against manual final-grade edits.

## Staff check-in and insights
- Build an authority-role check-in screen that stamps `now()` into `staff_checkins.time_in` and compares it with the institution's `school_start_time` to set `late` or `on-time` status.
- Generate insights including alerts for three or more consecutive absences and missing results, and display them on the dashboard.
- Provide dashboard controls to mark insights actioned or dismissed.

## Branded metadata and crawler protection
- Add a branded custom `not-found.tsx`.
- Use Next.js metadata APIs for appropriate page titles/descriptions, including institution-aware page titles (for example, “Students - Greenfield Academy”).
- Keep a proper favicon in the app folder.
- Create `robots.txt` with `Disallow: /` to block search engines from student PII.
- Generate a dynamic sitemap containing only appropriate public routes.
- Ensure each `<img>` and Next.js `<Image>` has meaningful alt text. The current app contains no image elements; retain the rule when adding any.

## Responsive and accessible dashboard
- Make the dashboard sidebar collapse into a hamburger menu on mobile.
- Ensure tables are horizontally scrollable on narrow screens.
- Add loading spinners/submitting feedback to every data-submitting button and a Next.js `loading.tsx` transition state.
- Use Zod and React Hook Form for strict validation; show inline red errors (including “Score cannot exceed 100” when applicable) and success toast notifications.
- Use semantic HTML5 landmarks and native form/table elements for the page layout.

## Privacy, session notice, analytics, and footer
- Add `app/privacy/page.tsx` and `app/terms/page.tsx` with standard internal-service text and link them in the footer.
- Add a simple cookie consent/notice banner for session authentication without breaking essential Supabase authentication cookies.
- Add a placeholder for Vercel Analytics or Google Analytics in the root layout that does not send data until configured.
- Add a professional semantic footer with `joegady94@gmail.com`; leave the physical-address line omitted until supplied.

## Repository delivery
- Keep the existing initial commit; do not rewrite history. Commit independently deliverable features/checklist groups using professional commit messages, then push the verified changes to the connected GitHub repository.
