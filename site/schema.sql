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


-- Codes (0.22): promotional unlocks and gifts for beta testers. Players redeem a code from their
-- account window (or a link ending in ?redeem=CODE). Nobody can read the codes through the game:
-- redeeming goes through redeem_code(), which checks and counts each use.
-- Make codes in the SQL Editor with make_codes() or make_code(); see the examples at the end.
create table if not exists public.codes (
  code text primary key check (code ~ '^[A-Z0-9]{4,40}$'),   -- stored without dashes, upper case
  grants text[] not null check (cardinality(grants) between 1 and 20),
  max_uses integer check (max_uses is null or max_uses > 0),  -- null: no limit
  uses integer not null default 0,
  label text check (char_length(label) <= 120),               -- shown to the player, e.g. 'Beta tester thank-you'
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.redemptions (
  code text not null references public.codes (code) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)
);
-- wrong guesses, so nobody can try codes by the thousand
create table if not exists public.code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  code text,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists code_attempts_user on public.code_attempts (user_id, at desc);
alter table public.codes enable row level security;
alter table public.redemptions enable row level security;
alter table public.code_attempts enable row level security;
-- no policies on purpose: only the functions below and you (in the dashboard) can see these

-- the unlocks that exist; add new ones here when the shop gets them (keep in step with shop.js)
create or replace function public.known_skus() returns text[] language sql immutable as $$
  select array['villain-demon', 'villain-archmage', 'villain-vampire', 'villain-deathknight', 'bundle-dark-court']
$$;
create or replace function public.sku_contents(p_sku text) returns text[] language sql immutable as $$
  select case p_sku
    when 'bundle-dark-court' then array['villain-demon', 'villain-archmage', 'villain-vampire', 'villain-deathknight']
    else array[p_sku] end
$$;

-- players call this from the game
create or replace function public.redeem_code(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  k text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  c public.codes%rowtype;
  fails integer;
  want text[] := '{}';
  g text;
  added text[] := '{}';
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'Sign in to redeem a code.'); end if;
  select count(*) into fails from public.code_attempts where user_id = uid and not ok and at > now() - interval '1 hour';
  if fails >= 10 then return jsonb_build_object('ok', false, 'error', 'Too many codes that didn''t work. Try again in an hour.'); end if;
  if length(k) < 4 then return jsonb_build_object('ok', false, 'error', 'Type the whole code.'); end if;
  select * into c from public.codes where code = k for update;
  if not found or not c.active then
    insert into public.code_attempts (user_id, code, ok) values (uid, left(k, 40), false);
    return jsonb_build_object('ok', false, 'error', 'That code doesn''t exist. Check it and try again.');
  end if;
  if c.expires_at is not null and c.expires_at < now() then return jsonb_build_object('ok', false, 'error', 'That code has expired.'); end if;
  if exists (select 1 from public.redemptions r where r.code = k and r.user_id = uid) then return jsonb_build_object('ok', false, 'error', 'You''ve already redeemed this code.'); end if;
  if c.max_uses is not null and c.uses >= c.max_uses then return jsonb_build_object('ok', false, 'error', 'That code has been used up.'); end if;
  -- what it unlocks, with bundles opened up, minus what they already own
  foreach g in array c.grants loop want := want || public.sku_contents(g); end loop;
  select coalesce(array_agg(distinct w), '{}') into want from unnest(want) w
   where not exists (select 1 from public.entitlements e where e.user_id = uid and (e.sku = w or w = any (public.sku_contents(e.sku))));
  if cardinality(want) = 0 then return jsonb_build_object('ok', false, 'error', 'You already own everything this code unlocks, so it''s still unused. Pass it on to a friend.'); end if;
  insert into public.redemptions (code, user_id) values (k, uid);
  update public.codes set uses = uses + 1 where code = k;
  foreach g in array want loop
    insert into public.entitlements (user_id, sku, source, ref) values (uid, g, 'promo', 'code:' || k) on conflict (user_id, sku) do nothing;
    if found then added := added || g; end if;
  end loop;
  insert into public.code_attempts (user_id, code, ok) values (uid, k, true);
  return jsonb_build_object('ok', true, 'unlocked', to_jsonb(added), 'label', c.label);
end $$;
revoke all on function public.redeem_code(text) from public, anon;
grant execute on function public.redeem_code(text) to authenticated;

-- you call these in the SQL Editor to make codes
-- many random codes like OVM-7KQ2-XH9D, each good for p_uses redemptions (one per player)
create or replace function public.make_codes(p_grants text[], p_count integer default 1, p_uses integer default 1,
                                             p_label text default null, p_expires timestamptz default null, p_prefix text default 'OVM')
returns setof text language plpgsql security definer set search_path = public as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';   -- no 0/O or 1/I to mix up
  pre text := upper(regexp_replace(coalesce(p_prefix, ''), '[^A-Za-z0-9]', '', 'g'));
  bad text;
  i integer; j integer; b bytea; raw text;
begin
  select g into bad from unnest(p_grants) g where g <> all (public.known_skus()) limit 1;
  if bad is not null then raise exception 'Unknown unlock "%". Known: %', bad, array_to_string(public.known_skus(), ', '); end if;
  if p_count not between 1 and 1000 then raise exception 'Make between 1 and 1000 codes at a time.'; end if;
  if length(pre) > 8 then raise exception 'Keep the prefix to 8 letters or fewer.'; end if;
  for i in 1 .. p_count loop
    loop
      b := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
      raw := '';
      foreach j in array array[0, 1, 2, 3, 4, 5, 10, 11] loop   -- bytes with no fixed UUID bits
        raw := raw || substr(alphabet, (get_byte(b, j) % 32) + 1, 1);
      end loop;
      exit when not exists (select 1 from public.codes x where x.code = pre || raw);
    end loop;
    insert into public.codes (code, grants, max_uses, label, expires_at) values (pre || raw, p_grants, p_uses, p_label, p_expires);
    return next (case when pre = '' then '' else pre || '-' end) || substr(raw, 1, 4) || '-' || substr(raw, 5, 4);
  end loop;
end $$;
-- one code you choose, like BETA2026, often shared with a group (p_uses null: no limit)
create or replace function public.make_code(p_code text, p_grants text[], p_uses integer default null,
                                            p_label text default null, p_expires timestamptz default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  k text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  bad text;
begin
  select g into bad from unnest(p_grants) g where g <> all (public.known_skus()) limit 1;
  if bad is not null then raise exception 'Unknown unlock "%". Known: %', bad, array_to_string(public.known_skus(), ', '); end if;
  if length(k) < 6 then raise exception 'Make the code at least 6 letters or digits, so nobody guesses it.'; end if;
  insert into public.codes (code, grants, max_uses, label, expires_at) values (k, p_grants, p_uses, p_label, p_expires);
  return k;
end $$;
revoke all on function public.make_codes(text[], integer, integer, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.make_code(text, text[], integer, text, timestamptz) from public, anon, authenticated;

-- every code and how it's been used, newest first
create or replace view public.code_report with (security_invoker = true) as
  select c.code, c.label, c.grants, c.uses, c.max_uses, c.expires_at, c.active, c.created_at,
         (select string_agg(u.email, ', ' order by r.redeemed_at) from public.redemptions r join auth.users u on u.id = r.user_id where r.code = c.code) as redeemed_by
  from public.codes c order by c.created_at desc;
revoke all on public.code_report from anon, authenticated;

-- Admins (0.31): accounts that can make and manage codes from inside the game (account window -> Codes).
-- Make yourself one (use the email you sign in with, Google or not):
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- no policies on purpose: the game asks is_admin(), and only you (in the dashboard) can change the list

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- make codes from the game: p_code set makes one code you chose (shared by up to p_uses players), otherwise p_count random ones
create or replace function public.admin_make_codes(p_grants text[], p_count integer default 1, p_uses integer default 1,
                                                   p_label text default null, p_expires timestamptz default null, p_code text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare out text[];
begin
  if not public.is_admin() then raise exception 'Only admins can make codes.'; end if;
  if coalesce(p_code, '') <> '' then
    if exists (select 1 from public.codes where code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'))) then raise exception 'That code already exists. Pick another.'; end if;
    out := array[public.make_code(p_code, p_grants, p_uses, nullif(p_label, ''), p_expires)];
  else
    select array_agg(c) into out from public.make_codes(p_grants, least(greatest(coalesce(p_count, 1), 1), 200), p_uses, nullif(p_label, ''), p_expires) c;
  end if;
  return jsonb_build_object('ok', true, 'codes', to_jsonb(out));
end $$;
revoke all on function public.admin_make_codes(text[], integer, integer, text, timestamptz, text) from public, anon;
grant execute on function public.admin_make_codes(text[], integer, integer, text, timestamptz, text) to authenticated;

-- the newest codes and who redeemed them
create or replace function public.admin_codes(p_limit integer default 60) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can see codes.'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r)) from (
    select c.code, c.label, c.grants, c.uses, c.max_uses, c.expires_at, c.active, c.created_at,
           (select string_agg(u.email, ', ' order by x.redeemed_at) from public.redemptions x join auth.users u on u.id = x.user_id where x.code = c.code) as redeemed_by
    from public.codes c order by c.created_at desc limit least(greatest(coalesce(p_limit, 60), 1), 500)) r), '[]'::jsonb);
end $$;
revoke all on function public.admin_codes(integer) from public, anon;
grant execute on function public.admin_codes(integer) to authenticated;

-- switch a code off (or back on)
create or replace function public.admin_set_code(p_code text, p_active boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if not public.is_admin() then raise exception 'Only admins can change codes.'; end if;
  update public.codes set active = p_active where code = k;
  if not found then raise exception 'No such code.'; end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_set_code(text, boolean) from public, anon;
grant execute on function public.admin_set_code(text, boolean) to authenticated;

-- Examples (run in the SQL Editor):
--   20 single-use codes for the Vampire Lord:
--     select * from make_codes(array['villain-vampire'], 20);
--   50 codes for all four villains, labelled, expiring at New Year:
--     select * from make_codes(array['bundle-dark-court'], 50, 1, 'Beta tester thank-you', '2027-01-01');
--   one shared code for a group of up to 100 players:
--     select make_code('BETA2026', array['bundle-dark-court'], 100, 'Overmaster beta');
--   see them:     select * from code_report;
--   switch one off: update codes set active = false where code = 'BETA2026';
