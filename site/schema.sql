-- Overmaster: database setup for accounts, saved games, unlocks and alpha feedback.
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run. Safe to run again.

-- Saved games: one row per player per slot. Autosaves use slots that start with "a".
create table if not exists public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  slot text not null check (char_length(slot) between 1 and 40),
  name text not null default '' check (char_length(name) <= 80),
  meta jsonb not null default '{}'::jsonb,
  state jsonb not null,
  game_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot),
  constraint saves_state_size check (pg_column_size(state) < 3000000)
);
create index if not exists saves_user_updated on public.saves (user_id, updated_at desc);

alter table public.saves enable row level security;
drop policy if exists "Players read their own saves" on public.saves;
drop policy if exists "Players add their own saves" on public.saves;
drop policy if exists "Players change their own saves" on public.saves;
drop policy if exists "Players delete their own saves" on public.saves;
create policy "Players read their own saves" on public.saves for select to authenticated using (auth.uid() = user_id);
create policy "Players add their own saves" on public.saves for insert to authenticated with check (auth.uid() = user_id);
create policy "Players change their own saves" on public.saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Players delete their own saves" on public.saves for delete to authenticated using (auth.uid() = user_id);

-- Feedback and automatic error reports from testers. Anyone can send; nobody can read them back
-- through the game. You read them in Supabase: Table Editor -> feedback.
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('bug', 'balance', 'idea', 'other', 'error')),
  message text not null check (char_length(message) between 1 and 6000),
  contact text check (char_length(contact) <= 200),
  game_version text,
  context jsonb,
  save_state jsonb,
  constraint feedback_save_size check (save_state is null or pg_column_size(save_state) < 3000000)
);
create index if not exists feedback_created on public.feedback (created_at desc);

alter table public.feedback enable row level security;
drop policy if exists "Anyone can send feedback" on public.feedback;
create policy "Anyone can send feedback" on public.feedback for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- A quick view for reading feedback in the dashboard, newest first, without the big save column.
create or replace view public.feedback_inbox with (security_invoker = true) as
  select f.id, f.created_at, f.kind, f.message, f.contact, u.email as account_email,
         f.game_version, f.context ->> 'screen' as screen, f.context -> 'game' as game,
         (f.save_state is not null) as has_save
  from public.feedback f left join auth.users u on u.id = f.user_id
  order by f.created_at desc;
revoke all on public.feedback_inbox from anon, authenticated;

-- Unlocks (0.22): what each player owns. Players can read their own; only the server writes them
-- (the stripe-webhook function, or you in the SQL Editor). There are no insert, update or delete
-- policies on purpose: the game can never grant itself anything.
create table if not exists public.entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  sku text not null check (char_length(sku) between 1 and 60),
  source text not null default 'stripe' check (source in ('stripe', 'steam', 'gift', 'promo')),
  ref text,                       -- the Stripe Checkout Session that paid for it
  created_at timestamptz not null default now(),
  primary key (user_id, sku)
);
create index if not exists entitlements_ref on public.entitlements (ref);
alter table public.entitlements enable row level security;
drop policy if exists "Players read their own unlocks" on public.entitlements;
create policy "Players read their own unlocks" on public.entitlements for select to authenticated using (auth.uid() = user_id);

-- Every Stripe checkout, for your records. Written only by the checkout and stripe-webhook functions.
create table if not exists public.purchases (
  id text primary key,            -- Stripe Checkout Session id (cs_...)
  user_id uuid references auth.users (id) on delete set null,
  sku text not null,
  amount integer,                 -- in cents
  currency text,
  status text not null default 'open' check (status in ('open', 'paid', 'refunded', 'expired')),
  payment_intent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists purchases_user on public.purchases (user_id, created_at desc);
create index if not exists purchases_intent on public.purchases (payment_intent);
alter table public.purchases enable row level security;
drop policy if exists "Players read their own purchases" on public.purchases;
create policy "Players read their own purchases" on public.purchases for select to authenticated using (auth.uid() = user_id);

-- A tidy list of sales for the dashboard, newest first.
create or replace view public.sales with (security_invoker = true) as
  select p.created_at, p.status, p.sku, round(p.amount / 100.0, 2) as amount, p.currency, u.email, p.id as checkout_session
  from public.purchases p left join auth.users u on u.id = p.user_id
  order by p.created_at desc;
revoke all on public.sales from anon, authenticated;

-- To give someone an unlock for free (a tester, a streamer, a support case), run for example:
--   insert into public.entitlements (user_id, sku, source)
--   select id, 'villain-vampire', 'gift' from auth.users where email = 'player@example.com';
-- A bundle's sku ('bundle-dark-court') unlocks everything in the bundle. To take a gift back:
--   delete from public.entitlements where sku = 'villain-vampire'
--     and user_id = (select id from auth.users where email = 'player@example.com');

