-- Create table for company users (for companies to manage multiple users)
create table if not exists public.company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(company_id, user_id)
);

-- Enable RLS
alter table public.company_users enable row level security;

-- Create policies for company users
create policy "company_users_select_own"
  on public.company_users for select
  using (
    auth.uid() = company_id or 
    auth.uid() = user_id or
    exists (
      select 1 from public.company_users cu 
      where cu.company_id = company_users.company_id 
      and cu.user_id = auth.uid() 
      and cu.role = 'admin'
    )
  );

create policy "company_users_insert_admin"
  on public.company_users for insert
  with check (
    auth.uid() = company_id or
    exists (
      select 1 from public.company_users cu 
      where cu.company_id = company_users.company_id 
      and cu.user_id = auth.uid() 
      and cu.role = 'admin'
    )
  );

create policy "company_users_update_admin"
  on public.company_users for update
  using (
    auth.uid() = company_id or
    exists (
      select 1 from public.company_users cu 
      where cu.company_id = company_users.company_id 
      and cu.user_id = auth.uid() 
      and cu.role = 'admin'
    )
  );

create policy "company_users_delete_admin"
  on public.company_users for delete
  using (
    auth.uid() = company_id or
    exists (
      select 1 from public.company_users cu 
      where cu.company_id = company_users.company_id 
      and cu.user_id = auth.uid() 
      and cu.role = 'admin'
    )
  );
