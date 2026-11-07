create extension if not exists pgcrypto;

alter table public.assessment_scores alter column id set default gen_random_uuid();
alter table public.grading_keys alter column id set default gen_random_uuid();
alter table public.results alter column id set default gen_random_uuid();
alter table public.insights alter column id set default gen_random_uuid();
alter table public.audit_log
  alter column id set default gen_random_uuid(),
  alter column created_at set default now();

create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name text not null,
  academic_year text not null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (institution_id, name, academic_year),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  admission_number text not null,
  first_name text not null,
  last_name text not null,
  class_id uuid references public.classes(id) on delete set null,
  date_of_birth date,
  status text not null default 'active' check (status in ('active', 'inactive', 'graduated', 'transferred')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, admission_number)
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  employee_number text not null,
  first_name text not null,
  last_name text not null,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, employee_number),
  unique (institution_id, user_id)
);

create table if not exists public.student_enrollments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  term_id uuid not null references public.terms(id) on delete restrict,
  enrolled_at date not null default current_date,
  ended_at date,
  created_at timestamptz not null default now(),
  unique (institution_id, student_id, term_id),
  check (ended_at is null or ended_at >= enrolled_at)
);

create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  term_id uuid not null references public.terms(id) on delete restrict,
  attendance_date date not null default current_date,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (institution_id, student_id, attendance_date)
);

create table if not exists public.institution_settings (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  school_start_time time not null default time '08:00',
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.staff_checkins (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete restrict,
  station_id uuid references public.checkin_stations(id) on delete set null,
  time_in timestamptz not null default clock_timestamp(),
  status text not null default 'on-time' check (status in ('on-time', 'late')),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  checkin_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (institution_id, staff_id, checkin_date)
);

alter table public.results
  add column if not exists continuous_assessment_score numeric(6, 2),
  add column if not exists exam_score numeric(6, 2),
  add column if not exists final_grade numeric(6, 2),
  add column if not exists grade_label text,
  add column if not exists grading_key_id uuid references public.grading_keys(id) on delete set null,
  add column if not exists recorded_by uuid references auth.users(id) on delete set null,
  add column if not exists calculated_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.grading_keys
  alter column components set default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists students_institution_class_idx
  on public.students (institution_id, class_id, status);
create index if not exists staff_institution_user_idx
  on public.staff (institution_id, user_id) where user_id is not null;
create index if not exists student_enrollments_class_term_idx
  on public.student_enrollments (institution_id, class_id, term_id);
create index if not exists student_attendance_consecutive_absence_idx
  on public.student_attendance (institution_id, student_id, attendance_date desc)
  where status = 'absent';
create index if not exists staff_checkins_institution_date_idx
  on public.staff_checkins (institution_id, checkin_date desc);
create index if not exists results_institution_term_class_idx
  on public.results (institution_id, term_id, class_id);
