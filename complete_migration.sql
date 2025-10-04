-- Complete Database Migration for Sales Qualification App
-- Run this in your Supabase SQL Editor

-- =============================================
-- MESSAGES TABLE
-- =============================================
create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  is_draft boolean default false,
  reply_to uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Messages RLS
alter table public.messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_read_policy') then
    create policy messages_read_policy on public.messages
      for select using (
        auth.uid() = sender_id or auth.uid() = recipient_id
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_insert_policy') then
    create policy messages_insert_policy on public.messages
      for insert with check (
        auth.uid() = sender_id
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'messages' and policyname = 'messages_update_policy') then
    create policy messages_update_policy on public.messages
      for update using (
        auth.uid() = recipient_id
      );
  end if;
end $$;

-- =============================================
-- CRM TABLES
-- =============================================

-- Companies/Organizations table
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  industry varchar(100),
  website varchar(255),
  phone varchar(50),
  email varchar(255),
  address text,
  city varchar(100),
  state varchar(100),
  country varchar(100),
  postal_code varchar(20),
  description text,
  annual_revenue decimal(15,2),
  employee_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null
);

-- Contacts table
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  email varchar(255),
  phone varchar(50),
  mobile varchar(50),
  job_title varchar(100),
  department varchar(100),
  address text,
  city varchar(100),
  state varchar(100),
  country varchar(100),
  postal_code varchar(20),
  notes text,
  lead_source varchar(100),
  status varchar(50) default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null
);

-- Deals/Opportunities table
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  company_id uuid references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  value decimal(15,2) not null,
  currency varchar(3) default 'USD',
  stage varchar(50) not null,
  probability integer default 0,
  close_date date,
  description text,
  notes text,
  source varchar(100),
  status varchar(50) default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null
);

-- Activities table
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  type varchar(50) not null,
  subject varchar(255) not null,
  description text,
  company_id uuid references public.companies(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  due_date timestamptz,
  completed_at timestamptz,
  status varchar(50) default 'pending',
  priority varchar(20) default 'medium',
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null
);

-- Products/Services table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  description text,
  category varchar(100),
  price decimal(10,2),
  cost decimal(10,2),
  sku varchar(100),
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deal Products table
create table if not exists public.deal_products (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  quantity integer default 1,
  unit_price decimal(10,2),
  discount_percent decimal(5,2) default 0,
  created_at timestamptz not null default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.activities enable row level security;
alter table public.products enable row level security;
alter table public.deal_products enable row level security;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Companies policies
create policy companies_read_policy on public.companies
  for select using (
    auth.uid() = created_by or 
    auth.uid() = assigned_to or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy companies_insert_policy on public.companies
  for insert with check (auth.uid() = created_by);

create policy companies_update_policy on public.companies
  for update using (
    auth.uid() = created_by or 
    auth.uid() = assigned_to or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy companies_delete_policy on public.companies
  for delete using (
    auth.uid() = created_by or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Contacts policies
create policy contacts_read_policy on public.contacts
  for select using (
    auth.uid() = created_by or 
    auth.uid() = assigned_to or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy contacts_insert_policy on public.contacts
  for insert with check (auth.uid() = created_by);

create policy contacts_update_policy on public.contacts
  for update using (
    auth.uid() = created_by or 
    auth.uid() = assigned_to or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy contacts_delete_policy on public.contacts
  for delete using (
    auth.uid() = created_by or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Deals policies
create policy deals_read_policy on public.deals
  for select using (
    auth.uid() = created_by or 
    auth.uid() = assigned_to or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy deals_insert_policy on public.deals
  for insert with check (auth.uid() = created_by);

create policy deals_update_policy on public.deals
  for update using (
    auth.uid() = created_by or 
    auth.uid() = assigned_to or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy deals_delete_policy on public.deals
  for delete using (
    auth.uid() = created_by or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Activities policies
create policy activities_read_policy on public.activities
  for select using (
    auth.uid() = created_by or 
    auth.uid() = assigned_to or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy activities_insert_policy on public.activities
  for insert with check (auth.uid() = created_by);

create policy activities_update_policy on public.activities
  for update using (
    auth.uid() = created_by or 
    auth.uid() = assigned_to or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy activities_delete_policy on public.activities
  for delete using (
    auth.uid() = created_by or
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Products policies (admin only)
create policy products_read_policy on public.products
  for select using (true);

create policy products_insert_policy on public.products
  for insert with check (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy products_update_policy on public.products
  for update using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

create policy products_delete_policy on public.products
  for delete using (
    exists (
      select 1 from public.profiles 
      where id = auth.uid() and role = 'admin'
    )
  );

-- Deal Products policies
create policy deal_products_read_policy on public.deal_products
  for select using (
    exists (
      select 1 from public.deals 
      where id = deal_id and (
        created_by = auth.uid() or 
        assigned_to = auth.uid() or
        exists (
          select 1 from public.profiles 
          where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

create policy deal_products_insert_policy on public.deal_products
  for insert with check (
    exists (
      select 1 from public.deals 
      where id = deal_id and (
        created_by = auth.uid() or 
        assigned_to = auth.uid() or
        exists (
          select 1 from public.profiles 
          where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

create policy deal_products_update_policy on public.deal_products
  for update using (
    exists (
      select 1 from public.deals 
      where id = deal_id and (
        created_by = auth.uid() or 
        assigned_to = auth.uid() or
        exists (
          select 1 from public.profiles 
          where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

create policy deal_products_delete_policy on public.deal_products
  for delete using (
    exists (
      select 1 from public.deals 
      where id = deal_id and (
        created_by = auth.uid() or 
        assigned_to = auth.uid() or
        exists (
          select 1 from public.profiles 
          where id = auth.uid() and role = 'admin'
        )
      )
    )
  );

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

create index if not exists idx_companies_assigned_to on public.companies(assigned_to);
create index if not exists idx_companies_created_by on public.companies(created_by);
create index if not exists idx_companies_name on public.companies(name);

create index if not exists idx_contacts_company_id on public.contacts(company_id);
create index if not exists idx_contacts_assigned_to on public.contacts(assigned_to);
create index if not exists idx_contacts_created_by on public.contacts(created_by);
create index if not exists idx_contacts_email on public.contacts(email);
create index if not exists idx_contacts_status on public.contacts(status);

create index if not exists idx_deals_company_id on public.deals(company_id);
create index if not exists idx_deals_contact_id on public.deals(contact_id);
create index if not exists idx_deals_assigned_to on public.deals(assigned_to);
create index if not exists idx_deals_created_by on public.deals(created_by);
create index if not exists idx_deals_stage on public.deals(stage);
create index if not exists idx_deals_status on public.deals(status);
create index if not exists idx_deals_close_date on public.deals(close_date);

create index if not exists idx_activities_company_id on public.activities(company_id);
create index if not exists idx_activities_contact_id on public.activities(contact_id);
create index if not exists idx_activities_deal_id on public.activities(deal_id);
create index if not exists idx_activities_assigned_to on public.activities(assigned_to);
create index if not exists idx_activities_created_by on public.activities(created_by);
create index if not exists idx_activities_type on public.activities(type);
create index if not exists idx_activities_status on public.activities(status);
create index if not exists idx_activities_due_date on public.activities(due_date);

create index if not exists idx_deal_products_deal_id on public.deal_products(deal_id);
create index if not exists idx_deal_products_product_id on public.deal_products(product_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_companies_updated_at before update on public.companies
  for each row execute function update_updated_at_column();

create trigger update_contacts_updated_at before update on public.contacts
  for each row execute function update_updated_at_column();

create trigger update_deals_updated_at before update on public.deals
  for each row execute function update_updated_at_column();

create trigger update_activities_updated_at before update on public.activities
  for each row execute function update_updated_at_column();

create trigger update_products_updated_at before update on public.products
  for each row execute function update_updated_at_column();

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample products
insert into public.products (name, description, category, price, cost, sku) values
('Basic Plan', 'Basic CRM features for small teams', 'Software', 29.99, 15.00, 'BASIC-001'),
('Professional Plan', 'Advanced CRM features for growing businesses', 'Software', 79.99, 35.00, 'PRO-001'),
('Enterprise Plan', 'Full-featured CRM for large organizations', 'Software', 199.99, 75.00, 'ENT-001'),
('Consulting Services', 'Custom CRM implementation and training', 'Services', 150.00, 75.00, 'CONS-001'),
('Support Package', '24/7 technical support and maintenance', 'Services', 50.00, 25.00, 'SUPP-001')
on conflict (sku) do nothing;

-- =============================================
-- VIEWS FOR REPORTING
-- =============================================

-- Deals pipeline view
create or replace view public.deals_pipeline as
select 
  d.id,
  d.name,
  d.value,
  d.currency,
  d.stage,
  d.probability,
  d.close_date,
  d.status,
  c.name as company_name,
  concat(ct.first_name, ' ', ct.last_name) as contact_name,
  concat(p.first_name, ' ', p.last_name) as assigned_to_name,
  d.created_at,
  d.updated_at
from public.deals d
left join public.companies c on d.company_id = c.id
left join public.contacts ct on d.contact_id = ct.id
left join public.profiles p on d.assigned_to = p.id;

-- Activities summary view
create or replace view public.activities_summary as
select 
  a.id,
  a.type,
  a.subject,
  a.status,
  a.priority,
  a.due_date,
  a.completed_at,
  c.name as company_name,
  concat(ct.first_name, ' ', ct.last_name) as contact_name,
  d.name as deal_name,
  concat(p.first_name, ' ', p.last_name) as assigned_to_name,
  a.created_at
from public.activities a
left join public.companies c on a.company_id = c.id
left join public.contacts ct on a.contact_id = ct.id
left join public.deals d on a.deal_id = d.id
left join public.profiles p on a.assigned_to = p.id;

-- Sales performance view
create or replace view public.sales_performance as
select 
  p.id as user_id,
  concat(p.first_name, ' ', p.last_name) as user_name,
  p.role,
  count(d.id) as total_deals,
  count(case when d.status = 'won' then 1 end) as won_deals,
  count(case when d.status = 'lost' then 1 end) as lost_deals,
  count(case when d.status = 'open' then 1 end) as open_deals,
  coalesce(sum(case when d.status = 'won' then d.value else 0 end), 0) as total_revenue,
  coalesce(sum(case when d.status = 'open' then d.value else 0 end), 0) as pipeline_value,
  coalesce(avg(case when d.status = 'won' then d.value end), 0) as avg_deal_size
from public.profiles p
left join public.deals d on p.id = d.assigned_to
where p.role = 'rep'
group by p.id, p.first_name, p.last_name, p.role;
