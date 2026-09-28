-- ===========================================================================
-- Nightcrawler — schema, policies and seed.
-- Run once against a fresh Supabase project:
--   psql "$DATABASE_URL" -f supabase/schema.sql
-- or paste into the SQL editor.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- --- tables ----------------------------------------------------------------

create table if not exists locations (
  id       text primary key,
  name     text not null,
  address  text not null,
  hours    text not null default '',
  is_open  boolean not null default true,
  sort     int not null default 0
);

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('flower', 'merch')),
  name        text not null,
  type        text check (type in ('Indica', 'Sativa', 'Hybrid', 'Pre-rolls')),
  price_cents int not null default 0 check (price_cents >= 0),
  thc         text,
  weight      text,
  sizes       text[] not null default '{}',
  description text,
  photo_url   text,
  slot        int,
  -- The site renders a star row; these back it.
  rating      numeric(2,1) not null default 5 check (rating between 0 and 5),
  reviews     int not null default 0 check (reviews >= 0),
  created_at  timestamptz not null default now()
);

-- Flower carries a type; merch does not. Enforced rather than assumed.
alter table products drop constraint if exists products_type_matches_kind;
alter table products add constraint products_type_matches_kind
  check ((kind = 'flower' and type is not null) or (kind = 'merch' and type is null));

create index if not exists products_kind_slot_idx on products (kind, slot, created_at);

create table if not exists product_status (
  product_id  uuid not null references products (id) on delete cascade,
  location_id text not null references locations (id) on delete cascade,
  status      text not null default 'Hidden' check (status in ('Available', 'Sold out', 'Hidden')),
  primary key (product_id, location_id)
);

create index if not exists product_status_location_idx on product_status (location_id);

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  number        text not null unique,
  location_id   text not null references locations (id),
  fulfillment   text not null check (fulfillment in ('pickup', 'delivery')),
  customer_name text not null,
  phone         text not null,
  email         text,
  address       text,
  total_cents   int not null default 0 check (total_cents >= 0),
  stage         int not null default 0 check (stage between 0 and 3),
  seen          boolean not null default false,
  created_at    timestamptz not null default now(),
  -- Delivery orders must say where to.
  constraint orders_delivery_needs_address
    check (fulfillment = 'pickup' or coalesce(btrim(address), '') <> '')
);

create index if not exists orders_location_created_idx on orders (location_id, created_at desc);

create table if not exists order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders (id) on delete cascade,
  product_id  uuid references products (id) on delete set null,
  name        text not null,
  -- Chosen merch size. Null for one-size items and for flower.
  size        text,
  price_cents int not null check (price_cents >= 0),
  qty         int not null default 1 check (qty > 0)
);

alter table order_items add column if not exists size text;

create index if not exists order_items_order_idx on order_items (order_id);

create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  day         text not null,
  month       text not null default '',
  title       text not null,
  "where"     text not null default 'All rooms',
  location_id text references locations (id) on delete set null,
  rsvps       int not null default 0 check (rsvps >= 0),
  sort        int not null default 0
);

-- The door list behind events.rsvps. One seat per address per event.
create table if not exists event_rsvps (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events (id) on delete cascade,
  name       text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

create index if not exists event_rsvps_event_idx on event_rsvps (event_id, created_at desc);

create table if not exists subscribers (
  email      text primary key,
  interest   text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- --- change counter --------------------------------------------------------
-- One integer the app polls to answer "has anything moved?" in a single cheap
-- read, so a live screen costs a 304 rather than a full re-query.

create table if not exists meta (
  key   text primary key,
  value bigint not null default 0
);

insert into meta (key, value) values ('version', 1) on conflict (key) do nothing;

create or replace function bump_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update meta set value = value + 1 where key = 'version';
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['locations', 'products', 'product_status', 'orders', 'order_items', 'events', 'event_rsvps']
  loop
    execute format('drop trigger if exists %I on %I', 'bump_version_' || t, t);
    execute format(
      'create trigger %I after insert or update or delete on %I for each statement execute function bump_version()',
      'bump_version_' || t, t);
  end loop;
end $$;

-- --- functions -------------------------------------------------------------

create sequence if not exists order_number_seq start 4313;

-- 'NC-' + a 4-digit sequence, as the design specifies.
create or replace function next_order_number() returns text
language sql security definer set search_path = public as $$
  select 'NC-' || lpad((nextval('order_number_seq') % 10000)::text, 4, '0');
$$;

-- Records the guest, then keeps events.rsvps equal to the number of seats.
-- A repeat RSVP from the same address updates the name and does not re-count.
create or replace function rsvp_event(p_id uuid, p_name text, p_email text)
returns setof events
language plpgsql security definer set search_path = public as $$
declare
  v_inserted boolean;
begin
  -- `xmax = 0` distinguishes a fresh insert from an upserted update.
  insert into event_rsvps (event_id, name, email)
  values (p_id, btrim(p_name), lower(btrim(p_email)))
  on conflict (event_id, email) do update set name = excluded.name
  returning (xmax = 0) into v_inserted;

  -- Only a genuinely new seat moves the counter, so counts carried over from
  -- before this table existed are preserved rather than recomputed away.
  if v_inserted then
    update events set rsvps = rsvps + 1 where id = p_id;
  end if;

  return query select * from events where id = p_id;
end $$;

drop function if exists rsvp_event(uuid);

create or replace function add_subscriber(p_email text, p_interest text) returns void
language sql security definer set search_path = public as $$
  insert into subscribers (email, interest)
  values (lower(btrim(p_email)), case when p_interest is null then '{}' else array[p_interest] end)
  on conflict (email) do update
    set interest = (
      select array(select distinct unnest(subscribers.interest || excluded.interest))
    );
$$;

-- --- row-level security ----------------------------------------------------
-- The app's own writes go through the service-role key, which bypasses RLS.
-- These policies are what protects the database if the anon key ever leaks or
-- someone queries it directly from a browser.

alter table locations      enable row level security;
alter table products       enable row level security;
alter table product_status enable row level security;
alter table orders         enable row level security;
alter table order_items    enable row level security;
alter table events         enable row level security;
alter table event_rsvps    enable row level security;
alter table subscribers    enable row level security;
alter table meta           enable row level security;

drop policy if exists "read locations" on locations;
create policy "read locations" on locations for select to anon, authenticated using (true);

drop policy if exists "read products" on products;
create policy "read products" on products for select to anon, authenticated using (true);

drop policy if exists "read status" on product_status;
create policy "read status" on product_status for select to anon, authenticated using (true);

drop policy if exists "read events" on events;
create policy "read events" on events for select to anon, authenticated using (true);

drop policy if exists "read version" on meta;
create policy "read version" on meta for select to anon, authenticated using (key = 'version');

-- Orders are never readable by anon: the tracker reads them server-side, after
-- checking the order number against the last four digits of the phone.
drop policy if exists "insert orders" on orders;
create policy "insert orders" on orders for insert to anon, authenticated with check (true);

drop policy if exists "insert order items" on order_items;
create policy "insert order items" on order_items for insert to anon, authenticated with check (true);

-- RSVPs go in through rsvp_event (security definer); the guest list itself is
-- never readable with the anon key, only server-side by the admin.
drop policy if exists "insert subscribers" on subscribers;
create policy "insert subscribers" on subscribers for insert to anon, authenticated with check (true);

-- Realtime needs to be able to announce changes to these tables.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table products;
    alter publication supabase_realtime add table product_status;
    alter publication supabase_realtime add table locations;
    alter publication supabase_realtime add table events;
    alter publication supabase_realtime add table orders;
  end if;
exception when duplicate_object then null;
end $$;

-- --- seed ------------------------------------------------------------------

insert into locations (id, name, address, hours, is_open, sort) values
  ('ny',     'New York',    E'000 Address TBD\nNew York, NY',    '10a — 12a', true,  1),
  ('nj',     'New Jersey',  E'000 Address TBD\nJersey City, NJ', '10a — 10p', true,  2),
  ('la',     'Los Angeles', E'000 Address TBD\nLos Angeles, CA', '9a — 10p',  true,  3),
  ('valley', 'The Valley',  E'000 Address TBD\nSherman Oaks, CA','10a — 11p', false, 4)
on conflict (id) do nothing;

with seed (name, kind, type, price_cents, thc, weight, sizes, slot, rating, reviews, description, status) as (
  values
    ('Velvet Static',                 'flower', 'Indica',    5200, '27.4%', '3.5 g',                '{}'::text[],                  null::int, 5.0, 128, 'Heavy velvet body, static hum in the ears. A midnight-only cultivar.',        'Available'),
    ('Sodium Halo',                   'flower', 'Sativa',    5400, '29.1%', '3.5 g',                '{}'::text[],                  null,      5.0,  94, 'Streetlight glow. Bright citrus lift for long nights in motion.',            'Available'),
    ('Blue Hour',                     'flower', 'Hybrid',    5000, '25.8%', '3.5 g',                '{}'::text[],                  null,      4.0,  76, 'The hour between dusk and dark, in flower form. Balanced, cinematic.',       'Available'),
    ('Ghost Tiger',                   'flower', 'Sativa',    5800, '30.2%', '3.5 g',                '{}'::text[],                  null,      5.0, 151, 'The reserve cut. Feral, electric, unmistakably ours.',                       'Sold out'),
    ('Ink Rose',                      'flower', 'Indica',    4800, '24.6%', '3.5 g',                '{}'::text[],                  null,      4.0,  63, 'Rose garden after rain, pressed in black ink. Soft landing.',                'Available'),
    ('Night Shift',                   'flower', 'Pre-rolls', 3600, '23%',   '5 × 0.7 g · assorted', '{}'::text[],                  null,      5.0, 210, 'Five rolled hours of dark. The whole lineup in one tin.',                    'Available'),
    ('Script Tee — washed black',     'merch',  null,        3800, null,    null,  '{S,M,L,XL}'::text[],                           1,         5.0,   0, 'Heavyweight cotton, vermilion script across the chest.',                     'Available'),
    ('Ghost Tiger Tee — back print',  'merch',  null,        4200, null,    null,  '{S,M,L,XL,XXL}'::text[],                       2,         5.0,   0, 'Tribal tiger back print, small script on front.',                            'Sold out'),
    ('After Dark Cap',                'merch',  null,        3200, null,    null,  '{}'::text[],                                   3,         5.0,   0, 'Unstructured six-panel, bone embroidery.',                                   'Available'),
    ('Die-cut Sticker Sheet',         'merch',  null,         800, null,    null,  '{}'::text[],                                   4,         5.0,   0, 'Eight die-cuts on one sheet. Weatherproof vinyl.',                           'Available'),
    ('Hoodie — vermilion embroidery', 'merch',  null,        8800, null,    null,  '{S,M,L,XL}'::text[],                           5,         5.0,   0, 'Next drop. 450gsm fleece, chain-stitch script.',                             'Hidden'),
    ('Grinder — engraved Nc',         'merch',  null,        4500, null,    null,  '{}'::text[],                                   6,         5.0,   0, 'Four-piece anodised aluminium, engraved monogram.',                          'Hidden'),
    ('Ash Tray — bone ceramic',       'merch',  null,        3600, null,    null,  '{}'::text[],                                   7,         5.0,   0, 'Hand-glazed bone ceramic, vermilion underside.',                             'Hidden'),
    ('Lighter Sleeve — leather',      'merch',  null,        2200, null,    null,  '{}'::text[],                                   8,         5.0,   0, 'Vegetable-tanned leather, debossed script.',                                 'Hidden')
),
inserted as (
  insert into products (kind, name, type, price_cents, thc, weight, sizes, slot, rating, reviews, description)
  select kind, name, type, price_cents, thc, weight, sizes, slot, rating, reviews, description
  from seed
  where not exists (select 1 from products)
  returning id, name
)
insert into product_status (product_id, location_id, status)
select inserted.id, locations.id, seed.status
from inserted
join seed on seed.name = inserted.name
cross join locations
on conflict (product_id, location_id) do nothing;

insert into events (day, month, title, "where", location_id, rsvps, sort)
select * from (values
  ('17', 'Jul', 'Ghost Tiger reserve drop',               'New York — doors 8p',       'ny',            84, 1),
  ('24', 'Jul', 'Rooftop listening session',              'Los Angeles — 9p, RSVP only','la',            51, 2),
  ('02', 'Aug', 'Ink night — flash tattoos in the shop',  'The Valley — 7p',           'valley',       129, 3),
  ('15', 'Aug', 'Harvest preview: fall cultivars',        'All rooms — all day',       null::text,       0, 4)
) as v
where not exists (select 1 from events);
