create or replace function public.write_school_audit_log()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_row jsonb;
begin
  if tg_op = 'INSERT' then
    v_after := to_jsonb(new);
    v_row := v_after;
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_row := v_after;
  else
    v_before := to_jsonb(old);
    v_row := v_before;
  end if;

  insert into public.audit_log (
    institution_id,
    user_id,
    action,
    table_affected,
    record_id,
    before_json,
    after_json,
    created_at
  ) values (
    nullif(v_row ->> 'institution_id', '')::uuid,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    nullif(v_row ->> 'id', '')::uuid,
    v_before,
    v_after,
    now()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.write_school_audit_log() from public, anon, authenticated;

create trigger students_audit_log
  after insert or update or delete on public.students
  for each row execute function public.write_school_audit_log();
create trigger staff_audit_log
  after insert or update or delete on public.staff
  for each row execute function public.write_school_audit_log();
create trigger results_audit_log
  after insert or update or delete on public.results
  for each row execute function public.write_school_audit_log();
