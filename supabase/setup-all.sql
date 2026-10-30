-- Smart Invoice & Follow-Up: full database setup (schema + expenses).
-- Paste this whole file into the Supabase SQL editor and run it once.

-- Smart Invoice & Follow-Up: database schema.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query), then run the expenses file.
-- It is written to be safe to read top to bottom: types, tables, functions, triggers, then row level security.


-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin create type public.app_member_role as enum ('owner', 'admin', 'member'); exception when duplicate_object then null; end $$;
do $$ begin create type public.invoice_status as enum ('draft', 'sent', 'partially_paid', 'paid', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.reminder_status as enum ('scheduled', 'sent', 'failed', 'skipped', 'demo', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.rule_action as enum ('send_email', 'create_task', 'flag_review'); exception when duplicate_object then null; end $$;
do $$ begin
  create type public.activity_type as enum (
    'email_sent', 'email_demo', 'call', 'note', 'status_change', 'promise', 'snooze',
    'pause', 'resume', 'dispute', 'payment', 'task', 'flag'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address text,
  tax_id text,
  logo_url text,
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  default_payment_terms integer not null default 14 check (default_payment_terms >= 0),
  default_tax_rate numeric(5, 2) not null default 0 check (default_tax_rate between 0 and 100),
  invoice_prefix text not null default 'INV-',
  invoice_next_number integer not null default 1 check (invoice_next_number >= 1),
  invoice_notes text,
  payment_instructions text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_member_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  company text,
  email text not null,
  phone text,
  billing_address text,
  tax_id text,
  currency text,
  payment_terms integer,
  internal_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  unit text not null default 'unit',
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  invoice_number text not null,
  status public.invoice_status not null default 'draft',
  currency text not null default 'USD',
  issue_date date not null default current_date,
  due_date date not null,
  payment_terms integer not null default 14,
  subtotal numeric(12, 2) not null default 0,
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  discount_type text not null default 'none' check (discount_type in ('none', 'percentage', 'fixed')),
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  total numeric(12, 2) not null default 0,
  paid_amount numeric(12, 2) not null default 0 check (paid_amount >= 0),
  notes text,
  payment_instructions text,
  sent_at timestamptz,
  cancelled_at timestamptz,
  reminder_paused boolean not null default false,
  followup_hold_until date,
  promise_to_pay_date date,
  is_disputed boolean not null default false,
  dispute_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, invoice_number)
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(12, 3) not null default 1 check (quantity >= 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  tax_rate numeric(5, 2) not null default 0 check (tax_rate between 0 and 100),
  position integer not null default 0
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD',
  method text not null default 'bank_transfer',
  payment_date date not null default current_date,
  reference text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  template_key text not null,
  subject text not null,
  body text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, template_key)
);

create table if not exists public.reminder_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  trigger_type text not null check (trigger_type in ('before_due', 'on_due', 'after_due')),
  offset_days integer not null default 0 check (offset_days >= 0),
  action public.rule_action not null default 'send_email',
  template_key text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  rule_id uuid references public.reminder_rules (id) on delete set null,
  template_key text,
  channel text not null default 'email',
  scheduled_at timestamptz not null,
  sent_at timestamptz,
  status public.reminder_status not null default 'scheduled',
  delivery_status text,
  error_details text,
  created_at timestamptz not null default now()
);

create table if not exists public.followup_activities (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  user_id uuid default auth.uid(),
  type public.activity_type not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.followup_tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'open',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid default auth.uid(),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Written only by server-side jobs (service role). No client access.
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  source text not null,
  event_type text not null,
  payload jsonb,
  processed boolean not null default false,
  error_details text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists business_members_user_idx on public.business_members (user_id);
create index if not exists customers_business_idx on public.customers (business_id);
create index if not exists products_business_idx on public.products (business_id);
create index if not exists invoices_business_due_idx on public.invoices (business_id, due_date);
create index if not exists invoices_customer_idx on public.invoices (customer_id);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id);
create index if not exists payments_invoice_idx on public.payments (invoice_id);
create index if not exists payments_business_date_idx on public.payments (business_id, payment_date desc);
create index if not exists reminder_rules_business_idx on public.reminder_rules (business_id);
create index if not exists reminder_logs_invoice_idx on public.reminder_logs (invoice_id, status);
create index if not exists reminder_logs_business_sched_idx on public.reminder_logs (business_id, scheduled_at);
create index if not exists followup_activities_invoice_idx on public.followup_activities (invoice_id, created_at desc);
create index if not exists followup_tasks_invoice_idx on public.followup_tasks (invoice_id);
create index if not exists audit_logs_business_idx on public.audit_logs (business_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Access helper functions (security definer, so they can read membership without recursing into RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_business_member(_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = _business_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_business_admin(_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = _business_id and m.user_id = auth.uid() and m.role in ('owner', 'admin')
  );
$$;

-- Next invoice number for a business, e.g. INV-0007. Increments the counter atomically.
create or replace function public.generate_invoice_number(_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  p text;
  n integer;
begin
  if not public.is_business_member(_business_id) then
    raise exception 'Not allowed';
  end if;
  update public.businesses
     set invoice_next_number = invoice_next_number + 1
   where id = _business_id
  returning invoice_prefix, invoice_next_number - 1 into p, n;
  if not found then
    raise exception 'Business not found';
  end if;
  return p || lpad(n::text, 4, '0');
end;
$$;

-- Loads sample customers, invoices and payments so a new account has something to look at.
create or replace function public.seed_demo_data(_business_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur text;
  c_acme uuid;
  c_bright uuid;
  c_nova uuid;
  c_leaf uuid;
  cust uuid;
  spec jsonb;
  inv uuid;
  sub numeric;
  tot numeric;
  paid numeric;
  issue date;
  due date;
  st public.invoice_status;
begin
  if not public.is_business_admin(_business_id) then
    raise exception 'Not allowed';
  end if;
  select currency into cur from public.businesses where id = _business_id;

  insert into public.customers (business_id, name, company, email, phone, billing_address)
  values (_business_id, 'Priya Sharma', 'Acme Studios', 'accounts@acme-studios.example', '+91 98765 43210', '12 MG Road, Bengaluru')
  returning id into c_acme;
  insert into public.customers (business_id, name, company, email, phone, billing_address)
  values (_business_id, 'Rahul Mehta', 'Bright Media', 'billing@bright-media.example', '+91 91234 56780', '45 Linking Road, Mumbai')
  returning id into c_bright;
  insert into public.customers (business_id, name, company, email, phone, billing_address)
  values (_business_id, 'Ananya Rao', 'Nova Digital', 'finance@nova-digital.example', '+91 99887 76655', '8 Park Street, Kolkata')
  returning id into c_nova;
  insert into public.customers (business_id, name, company, email, phone, billing_address)
  values (_business_id, 'Karan Singh', 'Leaf & Co.', 'hello@leaf-co.example', '+91 90000 11122', '21 Sector 18, Noida')
  returning id into c_leaf;

  for spec in
    select * from jsonb_array_elements('[
      {"cust":"acme","desc":"Website design","price":30000,"tax":18,"issue":-120,"due":-106,"status":"paid","paid":1},
      {"cust":"bright","desc":"Brand identity package","price":18000,"tax":18,"issue":-90,"due":-76,"status":"paid","paid":1},
      {"cust":"acme","desc":"Mobile app development","price":48000,"tax":18,"issue":-62,"due":-48,"status":"paid","paid":1},
      {"cust":"nova","desc":"Monthly retainer","price":25000,"tax":18,"issue":-35,"due":-21,"status":"partially_paid","paid":0.5},
      {"cust":"leaf","desc":"SEO audit","price":12000,"tax":18,"issue":-28,"due":-14,"status":"paid","paid":1},
      {"cust":"nova","desc":"Hosting and support","price":12400,"tax":0,"issue":-20,"due":-6,"status":"sent","paid":0},
      {"cust":"bright","desc":"Video production","price":32500,"tax":18,"issue":-11,"due":3,"status":"sent","paid":0},
      {"cust":"leaf","desc":"Content writing","price":28000,"tax":18,"issue":-14,"due":0,"status":"sent","paid":0},
      {"cust":"acme","desc":"Maintenance plan","price":15000,"tax":18,"issue":0,"due":14,"status":"draft","paid":0}
    ]'::jsonb)
  loop
    cust := case spec->>'cust' when 'acme' then c_acme when 'bright' then c_bright when 'nova' then c_nova else c_leaf end;
    sub := (spec->>'price')::numeric;
    tot := round(sub * (1 + (spec->>'tax')::numeric / 100), 2);
    paid := round(tot * (spec->>'paid')::numeric, 2);
    issue := current_date + (spec->>'issue')::integer;
    due := current_date + (spec->>'due')::integer;
    st := (spec->>'status')::public.invoice_status;

    insert into public.invoices (
      business_id, customer_id, invoice_number, status, currency, issue_date, due_date, payment_terms,
      subtotal, tax_rate, total, paid_amount, sent_at
    ) values (
      _business_id, cust, public.generate_invoice_number(_business_id), st, cur, issue, due, (due - issue),
      sub, (spec->>'tax')::numeric, tot, paid, case when st = 'draft' then null else issue::timestamptz end
    ) returning id into inv;

    insert into public.invoice_items (invoice_id, description, quantity, unit_price, tax_rate, position)
    values (inv, spec->>'desc', 1, sub, 0, 0);

    if paid > 0 then
      insert into public.payments (business_id, invoice_id, amount, currency, method, payment_date)
      values (_business_id, inv, paid, cur, 'bank_transfer', least(current_date, issue + 7));
    end if;
  end loop;

  update public.businesses set is_demo = true where id = _business_id;
end;
$$;

revoke all on function public.generate_invoice_number(uuid) from public, anon;
revoke all on function public.seed_demo_data(uuid) from public, anon;
revoke all on function public.is_business_member(uuid) from public, anon;
revoke all on function public.is_business_admin(uuid) from public, anon;
grant execute on function public.generate_invoice_number(uuid) to authenticated;
grant execute on function public.seed_demo_data(uuid) to authenticated;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.is_business_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- Create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for anyone who signed up before this ran.
insert into public.profiles (id, email, full_name)
select u.id, coalesce(u.email, ''), nullif(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row level security: each person only sees and changes data for businesses they belong to.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.email_templates enable row level security;
alter table public.reminder_rules enable row level security;
alter table public.reminder_logs enable row level security;
alter table public.followup_activities enable row level security;
alter table public.followup_tasks enable row level security;
alter table public.audit_logs enable row level security;
alter table public.webhook_events enable row level security; -- no policies: only the service role can use it

-- profiles: your own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- businesses: owners can create and (see their business before their membership row exists); admins edit
drop policy if exists "businesses_select" on public.businesses;
create policy "businesses_select" on public.businesses for select to authenticated
  using (owner_id = auth.uid() or public.is_business_member(id));
drop policy if exists "businesses_insert" on public.businesses;
create policy "businesses_insert" on public.businesses for insert to authenticated
  with check (owner_id = auth.uid());
drop policy if exists "businesses_update" on public.businesses;
create policy "businesses_update" on public.businesses for update to authenticated
  using (public.is_business_admin(id)) with check (public.is_business_admin(id));
drop policy if exists "businesses_delete" on public.businesses;
create policy "businesses_delete" on public.businesses for delete to authenticated
  using (owner_id = auth.uid());

-- business_members: you see your own memberships and your teammates; the owner adds themselves first, then admins add others
drop policy if exists "members_select" on public.business_members;
create policy "members_select" on public.business_members for select to authenticated
  using (user_id = auth.uid() or public.is_business_member(business_id));
drop policy if exists "members_insert" on public.business_members;
create policy "members_insert" on public.business_members for insert to authenticated
  with check (
    public.is_business_admin(business_id)
    or (
      user_id = auth.uid() and role = 'owner'
      and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
    )
  );
drop policy if exists "members_update" on public.business_members;
create policy "members_update" on public.business_members for update to authenticated
  using (public.is_business_admin(business_id)) with check (public.is_business_admin(business_id));
drop policy if exists "members_delete" on public.business_members;
create policy "members_delete" on public.business_members for delete to authenticated
  using (public.is_business_admin(business_id));

-- Tables that carry business_id: members can read and write their own business's rows.
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers', 'products', 'payments', 'email_templates', 'reminder_rules',
    'reminder_logs', 'followup_activities', 'followup_tasks'
  ]
  loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$s', t);
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (public.is_business_member(business_id))', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert to authenticated with check (public.is_business_member(business_id))', t);
    execute format('create policy "%1$s_update" on public.%1$s for update to authenticated using (public.is_business_member(business_id)) with check (public.is_business_member(business_id))', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete to authenticated using (public.is_business_member(business_id))', t);
  end loop;
end $$;

-- invoices: same, and the customer must belong to the same business
drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices for select to authenticated using (public.is_business_member(business_id));
drop policy if exists "invoices_insert" on public.invoices;
create policy "invoices_insert" on public.invoices for insert to authenticated
  with check (
    public.is_business_member(business_id)
    and exists (select 1 from public.customers c where c.id = customer_id and c.business_id = invoices.business_id)
  );
drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices for update to authenticated
  using (public.is_business_member(business_id))
  with check (
    public.is_business_member(business_id)
    and exists (select 1 from public.customers c where c.id = customer_id and c.business_id = invoices.business_id)
  );
drop policy if exists "invoices_delete" on public.invoices;
create policy "invoices_delete" on public.invoices for delete to authenticated using (public.is_business_member(business_id));

-- invoice_items: access follows the parent invoice
drop policy if exists "invoice_items_select" on public.invoice_items;
create policy "invoice_items_select" on public.invoice_items for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_business_member(i.business_id)));
drop policy if exists "invoice_items_insert" on public.invoice_items;
create policy "invoice_items_insert" on public.invoice_items for insert to authenticated
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_business_member(i.business_id)));
drop policy if exists "invoice_items_update" on public.invoice_items;
create policy "invoice_items_update" on public.invoice_items for update to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_business_member(i.business_id)))
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_business_member(i.business_id)));
drop policy if exists "invoice_items_delete" on public.invoice_items;
create policy "invoice_items_delete" on public.invoice_items for delete to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id and public.is_business_member(i.business_id)));

-- audit_logs: members can read and add entries; nobody edits or deletes them
drop policy if exists "audit_logs_select" on public.audit_logs;
create policy "audit_logs_select" on public.audit_logs for select to authenticated using (public.is_business_member(business_id));
drop policy if exists "audit_logs_insert" on public.audit_logs;
create policy "audit_logs_insert" on public.audit_logs for insert to authenticated with check (public.is_business_member(business_id));

-- Live updates for the sidebar's invoice counts.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'invoices'
     )
  then
    alter publication supabase_realtime add table public.invoices;
  end if;
end $$;


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
