-- Create table for property evaluations
create table if not exists public.property_evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_type text not null,
  bedrooms integer not null,
  bathrooms integer not null,
  parking_spaces integer not null,
  area_sqm integer not null,
  address text not null,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  estimated_value decimal(12, 2),
  value_range_min decimal(12, 2),
  value_range_max decimal(12, 2),
  similar_properties jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.property_evaluations enable row level security;

-- Create policies for property evaluations
create policy "evaluations_select_own"
  on public.property_evaluations for select
  using (auth.uid() = user_id);

create policy "evaluations_insert_own"
  on public.property_evaluations for insert
  with check (auth.uid() = user_id);

create policy "evaluations_update_own"
  on public.property_evaluations for update
  using (auth.uid() = user_id);

create policy "evaluations_delete_own"
  on public.property_evaluations for delete
  using (auth.uid() = user_id);

-- Create index for better performance
create index if not exists idx_property_evaluations_user_id on public.property_evaluations(user_id);
create index if not exists idx_property_evaluations_created_at on public.property_evaluations(created_at desc);
