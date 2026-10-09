-- Momentum MVP schema. Run in Supabase → SQL Editor (or `supabase db push`).
-- Every table is owner-only via RLS. `day` is the user's local calendar date,
-- computed from their timezone at write time, so "today" queries are a simple equality.

-- Profiles -------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  calorie_goal integer not null default 2200,
  protein_goal_g integer not null default 140,
  carbs_goal_g integer not null default 250,
  fat_goal_g integer not null default 70,
  steps_goal integer not null default 10000,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: owner update" on public.profiles
  for update using (auth.uid() = id);

-- Create a profile row automatically on sign-up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Daily activity (steps, burned calories) -----------------------------------
create table public.daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  steps integer,
  active_calories integer,
  distance_m integer,
  active_minutes integer,
  source text not null default 'manual',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Workouts --------------------------------------------------------------------
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  started_at timestamptz not null,
  sport text not null default 'other',
  title text,
  duration_s integer,
  distance_m numeric,
  calories integer,
  avg_hr integer,
  max_hr integer,
  source text not null default 'manual', -- manual | fit | gpx
  notes text,
  created_at timestamptz not null default now()
);
create index workouts_user_day on public.workouts (user_id, day desc);

-- Meals -----------------------------------------------------------------------
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  eaten_at timestamptz not null default now(),
  meal_type text not null default 'snack', -- breakfast | lunch | dinner | snack
  title text not null,
  photo_path text,
  items jsonb not null default '[]'::jsonb, -- [{name, portion, calories, protein_g, carbs_g, fat_g}]
  calories integer not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  ai_notes text,
  created_at timestamptz not null default now()
);
create index meals_user_day on public.meals (user_id, day desc);

-- Owner-only RLS for the data tables.
do $$
declare t text;
begin
  foreach t in array array['daily_activity', 'workouts', 'meals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: owner all" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
  end loop;
end $$;

-- Meal photo storage: private bucket, files live under "<user_id>/..." -------
insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', false);

create policy "meal photos: owner read" on storage.objects
  for select using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "meal photos: owner insert" on storage.objects
  for insert with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "meal photos: owner delete" on storage.objects
  for delete using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
