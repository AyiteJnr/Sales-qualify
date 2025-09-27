-- 1) Create user_invitations table for inviting sales execs/admins
create table if not exists public.user_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role user_role not null default 'rep',
  token text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.user_invitations enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Admins can manage invitations" on public.user_invitations;
drop policy if exists "Creators can view their invitations" on public.user_invitations;

-- Policies: Admins can manage all invitations
create policy "Admins can manage invitations"
  on public.user_invitations
  as permissive
  for all
  to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

-- Policy: Invite creators can view their own invitations
create policy "Creators can view their invitations"
  on public.user_invitations
  as permissive
  for select
  to authenticated
  using (invited_by = auth.uid());

-- Drop existing trigger if it exists
drop trigger if exists trg_user_invitations_updated_at on public.user_invitations;

-- Updated_at trigger
create trigger trg_user_invitations_updated_at
  before update on public.user_invitations
  for each row execute function public.update_updated_at_column();