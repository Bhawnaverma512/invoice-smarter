-- Expenses for the Ledgerly Expenses page.
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text not null,
  description text,
  amount numeric(12, 2) not null check (amount >= 0),
  expense_date date not null default current_date,
  payment_method text not null default 'other',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists expenses_business_date_idx on public.expenses (business_id, expense_date desc);

alter table public.expenses enable row level security;

drop policy if exists "Members can view expenses" on public.expenses;
create policy "Members can view expenses"
  on public.expenses for select
  using (public.is_business_member(business_id));

drop policy if exists "Members can add expenses" on public.expenses;
create policy "Members can add expenses"
  on public.expenses for insert
  with check (public.is_business_member(business_id));

drop policy if exists "Members can edit expenses" on public.expenses;
create policy "Members can edit expenses"
  on public.expenses for update
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

drop policy if exists "Admins can delete expenses" on public.expenses;
create policy "Admins can delete expenses"
  on public.expenses for delete
  using (public.is_business_admin(business_id));
