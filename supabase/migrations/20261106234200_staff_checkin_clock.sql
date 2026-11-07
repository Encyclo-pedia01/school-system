create or replace function public.stamp_staff_checkin()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_start_time time;
  v_timezone text;
  v_station_authority uuid;
begin
  if auth.uid() is null
     or new.recorded_by is distinct from auth.uid()
     or not public.has_institution_role(new.institution_id, array['authority']) then
    raise exception 'Only an active authority member may record a staff check-in';
  end if;

  if not exists (
    select 1
    from public.staff s
    where s.id = new.staff_id
      and s.institution_id = new.institution_id
      and s.status = 'active'
  ) then
    raise exception 'Staff member is not active in this institution';
  end if;

  if new.station_id is not null and not exists (
    select 1
    from public.checkin_stations cs
    where cs.id = new.station_id
      and cs.institution_id = new.institution_id
      and coalesce(cs.active, true)
  ) then
    raise exception 'Check-in station is not active in this institution';
  end if;

  if new.station_id is not null then
    select cs.assigned_authority_staff_id
      into v_station_authority
    from public.checkin_stations cs
    where cs.id = new.station_id
      and cs.institution_id = new.institution_id;

    if v_station_authority is not null and not exists (
      select 1 from public.staff s
      where s.id = v_station_authority
        and s.institution_id = new.institution_id
        and s.user_id = auth.uid()
    ) then
      raise exception 'This station is assigned to another authority member';
    end if;
  end if;

  select coalesce(settings.school_start_time, time '08:00'),
         coalesce(settings.timezone, 'UTC')
    into v_start_time, v_timezone
  from public.institution_settings settings
  where settings.institution_id = new.institution_id;

  v_start_time := coalesce(v_start_time, time '08:00');
  v_timezone := coalesce(v_timezone, 'UTC');
  new.time_in := now();
  new.checkin_date := (timezone(v_timezone, new.time_in))::date;
  new.status := case
    when (timezone(v_timezone, new.time_in))::time > v_start_time then 'late'
    else 'on-time'
  end;
  new.created_at := now();

  return new;
end;
$$;

revoke all on function public.stamp_staff_checkin() from public, anon, authenticated;

create trigger staff_checkins_stamp_before_insert
before insert on public.staff_checkins
for each row execute function public.stamp_staff_checkin();

create or replace function public.validate_institution_settings_timezone()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.timezone is null or length(trim(new.timezone)) = 0 then
    raise exception 'Timezone is required';
  end if;

  begin
    perform timezone(new.timezone, now());
  exception when invalid_parameter_value then
    raise exception 'Timezone must be a valid PostgreSQL timezone';
  end;

  new.timezone := trim(new.timezone);
  return new;
end;
$$;

create trigger institution_settings_validate_timezone
before insert or update of timezone on public.institution_settings
for each row execute function public.validate_institution_settings_timezone();
