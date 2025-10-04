-- Messages table for admin/rep communications
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

-- Basic RLS: users can see messages where they are sender or recipient
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


