create index if not exists grading_keys_scope_idx
  on public.grading_keys (
    institution_id,
    term_id,
    coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(coalesce(subject, ''))
  );

create index if not exists assessment_scores_natural_key_idx
  on public.assessment_scores (institution_id, assessment_id, student_id)
  where institution_id is not null
    and assessment_id is not null
    and student_id is not null;

create index if not exists results_student_class_term_subject_idx
  on public.results (institution_id, student_id, class_id, term_id, subject)
  where institution_id is not null
    and student_id is not null
    and class_id is not null
    and term_id is not null;

create or replace function public.validate_grading_key()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_ca_weight numeric;
  v_exam_weight numeric;
  v_band jsonb;
  v_minimum numeric;
  v_band_count integer;
  v_distinct_band_count integer;
  v_has_zero_band boolean := false;
begin
  if jsonb_typeof(new.components) <> 'object' then
    raise exception 'Grading key components must be a JSON object';
  end if;

  begin
    v_ca_weight := (new.components ->> 'continuous_assessment_weight')::numeric;
    v_exam_weight := (new.components ->> 'exam_weight')::numeric;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Grading weights must be numeric';
  end;

  if v_ca_weight is null or v_exam_weight is null
     or v_ca_weight < 0 or v_exam_weight < 0
     or v_ca_weight + v_exam_weight <> 100 then
    raise exception 'Continuous assessment and exam weights must total 100';
  end if;

  if jsonb_typeof(new.components -> 'grade_bands') is distinct from 'array' then
    raise exception 'At least one grade band is required';
  end if;
  if jsonb_array_length(new.components -> 'grade_bands') = 0 then
    raise exception 'At least one grade band is required';
  end if;

  for v_band in select value from jsonb_array_elements(new.components -> 'grade_bands') loop
    if jsonb_typeof(v_band) <> 'object'
       or coalesce(nullif(trim(v_band ->> 'label'), ''), '') = '' then
      raise exception 'Each grade band needs a label and minimum score';
    end if;

    begin
      v_minimum := (v_band ->> 'minimum')::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Grade band minimums must be numeric';
    end;

    if v_minimum is null or v_minimum < 0 or v_minimum > 100 then
      raise exception 'Grade band minimums must be between 0 and 100';
    end if;
    v_has_zero_band := v_has_zero_band or v_minimum = 0;
  end loop;

  select count(*), count(distinct (value ->> 'minimum')::numeric)
    into v_band_count, v_distinct_band_count
  from jsonb_array_elements(new.components -> 'grade_bands');

  if v_band_count <> v_distinct_band_count then
    raise exception 'Grade band minimum scores must be unique';
  end if;

  if not v_has_zero_band then
    raise exception 'A grade band starting at 0 is required';
  end if;

  return new;
end;
$$;

create trigger grading_keys_validate_components
before insert or update of components on public.grading_keys
for each row execute function public.validate_grading_key();

create or replace function public.validate_assessment_score()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_max_score numeric;
begin
  select a.max_score
    into v_max_score
  from public.assessments a
  where a.id = new.assessment_id
    and a.institution_id = new.institution_id
    and a.max_score is not null;

  if v_max_score is null then
    raise exception 'Assessment does not have a valid maximum score';
  end if;

  if new.score is null or new.score < 0 or new.score > v_max_score then
    raise exception 'Score cannot exceed the assessment maximum';
  end if;

  if not exists (
    select 1
    from public.student_enrollments e
    join public.assessments a
      on a.id = new.assessment_id
     and a.institution_id = e.institution_id
    where e.institution_id = new.institution_id
      and e.student_id = new.student_id
      and e.class_id = a.class_id
      and e.term_id = a.term_id
      and e.ended_at is null
  ) then
    raise exception 'Student is not enrolled in the assessment class and term';
  end if;

  return new;
end;
$$;

create trigger assessment_scores_validate
before insert or update on public.assessment_scores
for each row execute function public.validate_assessment_score();

create or replace function public.guard_computed_result_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_setting('app.trusted_grade_write', true) = 'on'
     and current_user = (
       select pg_catalog.pg_get_userbyid(p.proowner)
       from pg_catalog.pg_proc p
       where p.oid = 'public.submit_student_result(uuid,uuid,uuid,text,jsonb,numeric)'::pg_catalog.regprocedure
     ) then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.continuous_assessment_score is not null
       or new.exam_score is not null
       or new.final_grade is not null
       or new.grade_label is not null
       or new.grading_key_id is not null
       or new.calculated_at is not null then
      raise exception 'Computed result fields can only be written by the grading action';
    end if;
  elsif row(
    new.continuous_assessment_score,
    new.exam_score,
    new.final_grade,
    new.grade_label,
    new.grading_key_id,
    new.calculated_at
  ) is distinct from row(
    old.continuous_assessment_score,
    old.exam_score,
    old.final_grade,
    old.grade_label,
    old.grading_key_id,
    old.calculated_at
  ) then
    raise exception 'Computed result fields can only be changed by the grading action';
  end if;

  return new;
end;
$$;

create trigger results_guard_computed_fields
before insert or update on public.results
for each row execute function public.guard_computed_result_fields();

create or replace function public.save_grading_key(
  p_institution_id uuid,
  p_term_id uuid,
  p_subject text,
  p_class_id uuid,
  p_components jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_key_id uuid;
  v_key_count integer;
begin
  if auth.uid() is null
     or not public.has_institution_role(p_institution_id, array['owner', 'principal']) then
    raise exception 'Only a principal or owner may configure grading keys';
  end if;

  if p_subject is null or length(trim(p_subject)) = 0 or length(trim(p_subject)) > 120 then
    raise exception 'Subject must contain between 1 and 120 characters';
  end if;
  if not exists (
    select 1 from public.terms t
    where t.id = p_term_id and t.institution_id = p_institution_id
  ) then
    raise exception 'Term does not belong to this institution';
  end if;
  if p_class_id is not null and not exists (
    select 1 from public.classes c
    where c.id = p_class_id and c.institution_id = p_institution_id
  ) then
    raise exception 'Class does not belong to this institution';
  end if;

  perform pg_advisory_xact_lock(hashtext(concat_ws(
    '|', p_institution_id::text, p_term_id::text,
    coalesce(p_class_id::text, 'institution'), lower(trim(p_subject))
  ))::bigint);

  select count(*)
    into v_key_count
  from public.grading_keys g
  where g.institution_id = p_institution_id
    and g.term_id = p_term_id
    and g.class_id is not distinct from p_class_id
    and lower(coalesce(g.subject, '')) = lower(trim(p_subject));

  if v_key_count = 0 then
    insert into public.grading_keys (
      institution_id, term_id, scope, class_id, subject, components, set_by, created_at, updated_at
    ) values (
      p_institution_id, p_term_id,
      case when p_class_id is null then 'institution' else 'class' end,
      p_class_id, trim(p_subject), p_components, auth.uid(), now(), now()
    ) returning id into v_key_id;
  else
    update public.grading_keys
    set components = p_components,
        set_by = auth.uid(),
        updated_at = now()
    where institution_id = p_institution_id
      and term_id = p_term_id
      and class_id is not distinct from p_class_id
      and lower(coalesce(subject, '')) = lower(trim(p_subject));
  end if;

  select g.id
    into v_key_id
  from public.grading_keys g
  where g.institution_id = p_institution_id
    and g.term_id = p_term_id
    and g.class_id is not distinct from p_class_id
    and lower(coalesce(g.subject, '')) = lower(trim(p_subject))
  order by g.created_at desc
  limit 1;

  return v_key_id;
end;
$$;

revoke all on function public.save_grading_key(uuid, uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.save_grading_key(uuid, uuid, text, uuid, jsonb) to authenticated;

create or replace function public.submit_student_result(
  p_student_id uuid,
  p_class_id uuid,
  p_term_id uuid,
  p_subject text,
  p_assessment_scores jsonb,
  p_exam_score numeric
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_institution_id uuid;
  v_key public.grading_keys%rowtype;
  v_ca_weight numeric;
  v_exam_weight numeric;
  v_assessment_weighted numeric := 0;
  v_assessment_weight_total numeric := 0;
  v_continuous_score numeric(6, 2);
  v_final_grade numeric(6, 2);
  v_grade_label text;
  v_result_id uuid;
  v_score_id uuid;
  v_result_count integer;
  v_item jsonb;
  v_assessment_id uuid;
  v_score numeric;
  v_max_score numeric;
  v_assessment_weight numeric;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_subject is null or length(trim(p_subject)) = 0 or length(trim(p_subject)) > 120 then
    raise exception 'Subject must contain between 1 and 120 characters';
  end if;

  if jsonb_typeof(p_assessment_scores) is distinct from 'array' then
    raise exception 'Assessment scores must be a JSON array';
  end if;
  if jsonb_array_length(p_assessment_scores) = 0 then
    raise exception 'At least one assessment score is required';
  end if;

  if (select count(distinct value ->> 'assessment_id') from jsonb_array_elements(p_assessment_scores))
     <> jsonb_array_length(p_assessment_scores) then
    raise exception 'An assessment may only be entered once';
  end if;

  if p_exam_score is null or p_exam_score < 0 or p_exam_score > 100 then
    raise exception 'Score cannot exceed 100 or be below 0';
  end if;

  select c.institution_id
    into v_institution_id
  from public.classes c
  where c.id = p_class_id;

  if v_institution_id is null then
    raise exception 'Class not found';
  end if;

  if not public.has_institution_membership(v_institution_id) then
    raise exception 'Institution access denied';
  end if;

  if not (
    public.has_institution_role(v_institution_id, array['owner', 'principal'])
    or (
      public.has_institution_role(v_institution_id, array['staff'])
      and public.is_assigned_staff(v_institution_id, p_class_id)
    )
  ) then
    raise exception 'You are not assigned to this class';
  end if;

  if not exists (
    select 1
    from public.student_enrollments e
    join public.students s
      on s.id = e.student_id
     and s.institution_id = e.institution_id
    where e.institution_id = v_institution_id
      and e.student_id = p_student_id
      and e.class_id = p_class_id
      and e.term_id = p_term_id
      and e.ended_at is null
      and s.status = 'active'
  ) then
    raise exception 'Student is not actively enrolled in this class and term';
  end if;

  perform set_config('app.trusted_grade_write', 'on', true);

  for v_item in select value from jsonb_array_elements(p_assessment_scores) loop
    begin
      v_assessment_id := (v_item ->> 'assessment_id')::uuid;
      v_score := (v_item ->> 'score')::numeric;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Assessment identifiers and scores must be valid';
    end;

    select a.max_score, coalesce(nullif(a.weight, 0), 1)
      into v_max_score, v_assessment_weight
    from public.assessments a
    where a.id = v_assessment_id
      and a.institution_id = v_institution_id
      and a.class_id = p_class_id
      and a.term_id = p_term_id
      and lower(a.subject) = lower(trim(p_subject));

    if not found or v_max_score is null or v_max_score <= 0 then
      raise exception 'Assessment is not part of this class, subject, and term';
    end if;
    if v_assessment_weight <= 0 then
      raise exception 'Assessment weight must be greater than zero';
    end if;
    if v_score is null or v_score < 0 or v_score > v_max_score then
      raise exception 'Score cannot exceed the assessment maximum';
    end if;

    v_assessment_weighted := v_assessment_weighted
      + ((v_score / v_max_score) * 100 * v_assessment_weight);
    v_assessment_weight_total := v_assessment_weight_total + v_assessment_weight;

    perform pg_advisory_xact_lock(hashtext(concat_ws(
      '|', v_institution_id::text, v_assessment_id::text, p_student_id::text
    ))::bigint);

    select scores.id
      into v_score_id
    from public.assessment_scores scores
    where scores.institution_id = v_institution_id
      and scores.assessment_id = v_assessment_id
      and scores.student_id = p_student_id
    order by scores.id
    limit 1
    for update;

    if v_score_id is null then
      insert into public.assessment_scores (
        institution_id, assessment_id, student_id, score
      ) values (
        v_institution_id, v_assessment_id, p_student_id, v_score
      ) returning id into v_score_id;
    else
      update public.assessment_scores
      set score = v_score
      where id = v_score_id;
    end if;
    v_score_id := null;
  end loop;

  v_continuous_score := round(v_assessment_weighted / v_assessment_weight_total, 2);

  select g.*
    into v_key
  from public.grading_keys g
  where g.institution_id = v_institution_id
    and g.term_id = p_term_id
    and lower(g.subject) = lower(trim(p_subject))
    and (g.class_id is null or g.class_id = p_class_id)
  order by (g.class_id is not null) desc, g.created_at desc
  limit 1;

  if v_key.id is null then
    raise exception 'No grading key is configured for this subject and term';
  end if;

  v_ca_weight := (v_key.components ->> 'continuous_assessment_weight')::numeric;
  v_exam_weight := (v_key.components ->> 'exam_weight')::numeric;
  if v_ca_weight + v_exam_weight <> 100 then
    raise exception 'The active grading key has invalid weights';
  end if;

  v_final_grade := round(
    v_continuous_score * v_ca_weight / 100
    + p_exam_score * v_exam_weight / 100,
    2
  );

  select band ->> 'label'
    into v_grade_label
  from jsonb_array_elements(v_key.components -> 'grade_bands') as band
  where v_final_grade >= (band ->> 'minimum')::numeric
  order by (band ->> 'minimum')::numeric desc
  limit 1;

  if v_grade_label is null then
    raise exception 'No grade band covers the calculated score';
  end if;

  perform pg_advisory_xact_lock(hashtext(concat_ws(
    '|', v_institution_id::text, p_student_id::text, p_class_id::text,
    p_term_id::text, lower(trim(p_subject))
  ))::bigint);

  select count(*)
    into v_result_count
  from public.results r
  where r.institution_id = v_institution_id
    and r.student_id = p_student_id
    and r.class_id = p_class_id
    and r.term_id = p_term_id
    and lower(r.subject) = lower(trim(p_subject));

  if v_result_count > 1 then
    raise exception 'Multiple existing results were found for this student and subject';
  elsif v_result_count = 0 then
    insert into public.results (
      institution_id, student_id, class_id, subject, term_id,
      continuous_assessment_score, exam_score, final_grade, grade_label,
      grading_key_id, recorded_by, calculated_at, updated_at
    ) values (
      v_institution_id, p_student_id, p_class_id, trim(p_subject), p_term_id,
      v_continuous_score, p_exam_score, v_final_grade, v_grade_label,
      v_key.id, auth.uid(), now(), now()
    ) returning id into v_result_id;
  else
    select r.id
      into v_result_id
    from public.results r
    where r.institution_id = v_institution_id
      and r.student_id = p_student_id
      and r.class_id = p_class_id
      and r.term_id = p_term_id
      and lower(r.subject) = lower(trim(p_subject))
    order by r.id
    limit 1
    for update;

    update public.results
    set continuous_assessment_score = v_continuous_score,
        exam_score = p_exam_score,
        final_grade = v_final_grade,
        grade_label = v_grade_label,
        grading_key_id = v_key.id,
        recorded_by = auth.uid(),
        calculated_at = now(),
        updated_at = now()
    where id = v_result_id;
  end if;

  update public.insights i
  set status = 'actioned'
  where i.institution_id = v_institution_id
    and i.type = 'missing_result'
    and i.status = 'open'
    and i.related_record_json ->> 'student_id' = p_student_id::text
    and i.related_record_json ->> 'class_id' = p_class_id::text
    and i.related_record_json ->> 'term_id' = p_term_id::text
    and lower(i.related_record_json ->> 'subject') = lower(trim(p_subject));

  return v_result_id;
end;
$$;

revoke all on function public.submit_student_result(uuid, uuid, uuid, text, jsonb, numeric)
  from public, anon;
grant execute on function public.submit_student_result(uuid, uuid, uuid, text, jsonb, numeric)
  to authenticated;
