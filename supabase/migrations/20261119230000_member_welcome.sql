create table public.member_welcome_receipts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now()
);
alter table public.member_welcome_receipts enable row level security;
revoke all on public.member_welcome_receipts from public, anon, authenticated;
grant select, insert on public.member_welcome_receipts to service_role;
