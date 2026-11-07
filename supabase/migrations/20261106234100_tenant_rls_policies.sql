create or replace function public.has_institution_membership(p_institution_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.institution_id = p_institution_id
      and coalesce(m.active, true)
  );
$$;

create or replace function public.has_institution_role(
  p_institution_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = auth.uid()
      and m.institution_id = p_institution_id
      and coalesce(m.active, true)
      and lower(m.role) = any (p_roles)
  );
$$;

create or replace function public.is_assigned_staff(
  p_institution_id uuid,
  p_class_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.staff s
    join public.class_assignments ca
      on ca.staff_id = s.id
     and ca.institution_id = s.institution_id
    where s.user_id = auth.uid()
      and s.institution_id = p_institution_id
      and s.status = 'active'
      and ca.class_id = p_class_id
  );
$$;

revoke all on function public.has_institution_membership(uuid) from public, anon;
revoke all on function public.has_institution_role(uuid, text[]) from public, anon;
revoke all on function public.is_assigned_staff(uuid, uuid) from public, anon;
grant execute on function public.has_institution_membership(uuid) to authenticated;
grant execute on function public.has_institution_role(uuid, text[]) to authenticated;
grant execute on function public.is_assigned_staff(uuid, uuid) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'institutions', 'memberships', 'classes', 'class_assignments', 'assessments',
    'assessment_scores', 'grading_keys', 'results', 'students', 'staff', 'terms',
    'student_enrollments', 'student_attendance', 'institution_settings',
    'staff_checkins', 'checkin_stations', 'fees', 'insights', 'newsletters',
    'report_cards', 'audit_log'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

do $$
declare
  policy record;
begin
  for policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'institutions', 'memberships', 'classes', 'class_assignments', 'assessments',
        'assessment_scores', 'grading_keys', 'results', 'students', 'staff', 'terms',
        'student_enrollments', 'student_attendance', 'institution_settings',
        'staff_checkins', 'checkin_stations', 'fees', 'insights', 'newsletters',
        'report_cards', 'audit_log'
      ])
  loop
    execute format('drop policy %I on %I.%I', policy.policyname, policy.schemaname, policy.tablename);
  end loop;
end;
$$;

create policy institutions_member_read on public.institutions
  for select to authenticated
  using (public.has_institution_membership(id));
create policy institutions_owner_update on public.institutions
  for update to authenticated
  using (public.has_institution_role(id, array['owner', 'principal']))
  with check (public.has_institution_role(id, array['owner', 'principal']));

create policy memberships_self_or_manager_read on public.memberships
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_institution_role(institution_id, array['owner', 'principal'])
  );
create policy memberships_manager_insert on public.memberships
  for insert to authenticated
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));
create policy memberships_manager_update on public.memberships
  for update to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy classes_member_read on public.classes
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy classes_manager_write on public.classes
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy class_assignments_member_read on public.class_assignments
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy class_assignments_manager_write on public.class_assignments
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy assessments_member_read on public.assessments
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy assessments_manager_write on public.assessments
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy assessment_scores_member_read on public.assessment_scores
  for select to authenticated
  using (public.has_institution_membership(institution_id));

create policy grading_keys_member_read on public.grading_keys
  for select to authenticated
  using (public.has_institution_membership(institution_id));

create policy results_member_read on public.results
  for select to authenticated
  using (public.has_institution_membership(institution_id));

create policy students_member_read on public.students
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy students_manager_write on public.students
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy staff_member_read on public.staff
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy staff_manager_write on public.staff
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy terms_member_read on public.terms
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy terms_manager_write on public.terms
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy student_enrollments_member_read on public.student_enrollments
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy student_enrollments_manager_write on public.student_enrollments
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy student_attendance_member_read on public.student_attendance
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy student_attendance_staff_insert on public.student_attendance
  for insert to authenticated
  with check (
    public.has_institution_role(institution_id, array['staff'])
    and public.is_assigned_staff(institution_id, class_id)
    and recorded_by = auth.uid()
    and exists (
      select 1 from public.student_enrollments e
      where e.institution_id = student_attendance.institution_id
        and e.student_id = student_attendance.student_id
        and e.class_id = student_attendance.class_id
        and e.term_id = student_attendance.term_id
        and e.ended_at is null
    )
  );
create policy student_attendance_manager_insert on public.student_attendance
  for insert to authenticated
  with check (
    public.has_institution_role(institution_id, array['owner', 'principal'])
    and recorded_by = auth.uid()
    and exists (
      select 1 from public.student_enrollments e
      where e.institution_id = student_attendance.institution_id
        and e.student_id = student_attendance.student_id
        and e.class_id = student_attendance.class_id
        and e.term_id = student_attendance.term_id
        and e.ended_at is null
    )
  );
create policy student_attendance_manager_update on public.student_attendance
  for update to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (
    public.has_institution_role(institution_id, array['owner', 'principal'])
    and exists (
      select 1 from public.student_enrollments e
      where e.institution_id = student_attendance.institution_id
        and e.student_id = student_attendance.student_id
        and e.class_id = student_attendance.class_id
        and e.term_id = student_attendance.term_id
        and e.ended_at is null
    )
  );

create policy institution_settings_member_read on public.institution_settings
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy institution_settings_manager_write on public.institution_settings
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (
    public.has_institution_role(institution_id, array['owner', 'principal'])
    and (updated_by is null or updated_by = auth.uid())
  );

create policy staff_checkins_member_read on public.staff_checkins
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy staff_checkins_authority_insert on public.staff_checkins
  for insert to authenticated
  with check (
    public.has_institution_role(institution_id, array['authority'])
    and recorded_by = auth.uid()
  );

create policy checkin_stations_member_read on public.checkin_stations
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy checkin_stations_manager_write on public.checkin_stations
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy fees_member_read on public.fees
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy fees_manager_write on public.fees
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy insights_member_read on public.insights
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy insights_manager_update on public.insights
  for update to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal', 'staff', 'authority']))
  with check (
    public.has_institution_role(institution_id, array['owner', 'principal', 'staff', 'authority'])
    and status in ('open', 'actioned', 'dismissed')
  );

create policy newsletters_member_read on public.newsletters
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy newsletters_manager_write on public.newsletters
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy report_cards_member_read on public.report_cards
  for select to authenticated
  using (public.has_institution_membership(institution_id));
create policy report_cards_manager_write on public.report_cards
  for all to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']))
  with check (public.has_institution_role(institution_id, array['owner', 'principal']));

create policy audit_log_manager_read on public.audit_log
  for select to authenticated
  using (public.has_institution_role(institution_id, array['owner', 'principal']));
