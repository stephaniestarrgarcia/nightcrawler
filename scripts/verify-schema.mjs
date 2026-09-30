/**
 * Runs supabase/schema.sql against a real Postgres (PGlite, WASM) and exercises
 * the parts that only exist in SQL: the version triggers, next_order_number,
 * rsvp_event's upsert-and-count, add_subscriber's array merge, the CHECK
 * constraints, and the seed. Nothing here touches a hosted project.
 *
 *   node scripts/verify-schema.mjs
 */
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
// Supabase ships pgcrypto enabled; PGlite needs it loaded explicitly.
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

let failures = 0
const pass = (name, detail = '') => console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`)
const fail = (name, detail) => { failures++; console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`) }

function check(name, cond, detail) {
  if (cond) pass(name, detail)
  else fail(name, detail)
}

/** Asserts a statement is rejected by the database. */
async function rejects(db, name, sql, params = []) {
  try {
    await db.query(sql, params)
    fail(name, 'was accepted but should have been rejected')
  } catch (err) {
    pass(name, String(err.message).split('\n')[0].slice(0, 70))
  }
}

const db = new PGlite({ extensions: { pgcrypto } })
const schema = await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8')

console.log('\n── schema.sql ───────────────────────────────────────────────')
try {
  await db.exec(schema)
  pass('runs end to end against Postgres', `${schema.split('\n').length} lines`)
} catch (err) {
  fail('runs end to end against Postgres', err.message)
  console.log('\n' + err.message + '\n')
  process.exit(1)
}

// Running it twice must be safe — this is the script people paste after edits.
try {
  await db.exec(schema)
  pass('is idempotent (safe to re-run)')
} catch (err) {
  fail('is idempotent (safe to re-run)', err.message.split('\n')[0])
}

const one = async (sql, params = []) => (await db.query(sql, params)).rows[0]
const all = async (sql, params = []) => (await db.query(sql, params)).rows

console.log('\n── seed ─────────────────────────────────────────────────────')
const counts = await one(`select
  (select count(*)::int from locations)      as locations,
  (select count(*)::int from products)       as products,
  (select count(*)::int from product_status) as statuses,
  (select count(*)::int from events)         as events`)
check('locations', counts.locations === 4, `${counts.locations}`)
check('products', counts.products === 14, `${counts.products} (6 flower + 8 merch)`)
check('one status row per product per room', counts.statuses === 14 * 4, `${counts.statuses}`)
check('events', counts.events === 4, `${counts.events}`)

const seeded = await one(`select status from product_status ps
  join products p on p.id = ps.product_id
  where p.name = 'Ghost Tiger' and ps.location_id = 'ny'`)
check('Ghost Tiger seeds Sold out', seeded.status === 'Sold out', seeded.status)

const hidden = await one(`select count(*)::int as n from product_status ps
  join products p on p.id = ps.product_id
  where p.slot >= 5 and ps.location_id = 'ny' and ps.status = 'Hidden'`)
check('merch slots 5–8 seed Hidden', hidden.n === 4, `${hidden.n} of 4`)

console.log('\n── constraints ──────────────────────────────────────────────')
await rejects(db, 'flower must carry a type',
  `insert into products (kind, name, type, price_cents) values ('flower','No type',null,100)`)
await rejects(db, 'merch must not carry a type',
  `insert into products (kind, name, type, price_cents) values ('merch','Typed',$1,100)`, ['Indica'])
await rejects(db, 'delivery order must have an address',
  `insert into orders (number, location_id, fulfillment, customer_name, phone)
   values ('NC-0001','ny','delivery','Ada','+15550000000')`)
await rejects(db, 'stage is bounded to 0–3',
  `insert into orders (number, location_id, fulfillment, customer_name, phone, stage)
   values ('NC-0002','ny','pickup','Ada','+15550000000',9)`)
await rejects(db, 'status is a closed set',
  `update product_status set status = 'Maybe' where location_id = 'ny'`)

console.log('\n── next_order_number ────────────────────────────────────────')
const n1 = (await one(`select next_order_number() as n`)).n
const n2 = (await one(`select next_order_number() as n`)).n
check('formats as NC-nnnn', /^NC-\d{4}$/.test(n1), n1)
check('increments', n1 !== n2, `${n1} → ${n2}`)

console.log('\n── version counter (the poll depends on this) ───────────────')
const v0 = Number((await one(`select value from meta where key='version'`)).value)
await db.query(`update locations set hours = '11a — 1a' where id = 'ny'`)
const v1 = Number((await one(`select value from meta where key='version'`)).value)
await db.query(`update product_status set status = 'Sold out'
  where location_id = 'ny' and product_id = (select id from products where name = 'Blue Hour')`)
const v2 = Number((await one(`select value from meta where key='version'`)).value)
check('bumps on a locations write', v1 > v0, `${v0} → ${v1}`)
check('bumps on a product_status write', v2 > v1, `${v1} → ${v2}`)

console.log('\n── rsvp_event ───────────────────────────────────────────────')
const ev = await one(`select id, rsvps from events order by sort limit 1`)
const before = ev.rsvps
const r1 = (await all(`select * from rsvp_event($1,$2,$3)`, [ev.id, 'Marisol R.', 'Marisol@Example.com']))[0]
check('a new seat increments the count', r1.rsvps === before + 1, `${before} → ${r1.rsvps}`)

const r2 = (await all(`select * from rsvp_event($1,$2,$3)`, [ev.id, 'Marisol Reyes', 'marisol@example.com']))[0]
check('the same address does not double-count', r2.rsvps === before + 1, `still ${r2.rsvps}`)

const guest = await one(`select name, email from event_rsvps where event_id = $1`, [ev.id])
check('the repeat RSVP updated the name', guest.name === 'Marisol Reyes', guest.name)
check('the email was lowercased', guest.email === 'marisol@example.com', guest.email)

const r3 = (await all(`select * from rsvp_event($1,$2,$3)`, [ev.id, 'Dre W.', 'dre@example.com']))[0]
check('a second guest increments again', r3.rsvps === before + 2, `${r3.rsvps}`)

await db.query(`delete from events where id = $1`, [ev.id])
const orphans = await one(`select count(*)::int as n from event_rsvps where event_id = $1`, [ev.id])
check('guests cascade when the event is deleted', orphans.n === 0, `${orphans.n} orphans`)

console.log('\n── add_subscriber ───────────────────────────────────────────')
const prod = await one(`select id from products where name = 'Ghost Tiger'`)
await db.query(`select add_subscriber($1, null)`, ['Kat@Example.com'])
await db.query(`select add_subscriber($1, $2)`, ['kat@example.com', prod.id])
await db.query(`select add_subscriber($1, $2)`, ['kat@example.com', prod.id])
const sub = await one(`select email, interest from subscribers`)
check('upserts on email, lowercased', sub.email === 'kat@example.com', sub.email)
check('merges interests without duplicating', sub.interest.length === 1, JSON.stringify(sub.interest))

console.log('\n── row-level security ───────────────────────────────────────')
const rls = await all(`select tablename, rowsecurity from pg_tables
  where schemaname = 'public' order by tablename`)
const unprotected = rls.filter(t => !t.rowsecurity).map(t => t.tablename)
check('every public table has RLS enabled', unprotected.length === 0,
  unprotected.length ? `missing on: ${unprotected.join(', ')}` : `${rls.length} tables`)

const pol = await all(`select tablename, cmd from pg_policies where schemaname='public'`)
const readable = pol.filter(p => p.cmd === 'SELECT').map(p => p.tablename)
check('orders are NOT anon-readable', !readable.includes('orders'),
  `selectable: ${readable.join(', ')}`)
check('the door list is NOT anon-readable', !readable.includes('event_rsvps'))
check('subscribers are NOT anon-readable', !readable.includes('subscribers'))


// ---------------------------------------------------------------------------
// The driver is PostgREST-facing, so it cannot be executed against PGlite. What
// can be checked is the contract it assumes: every table, function, argument
// name and column it references must exist in the schema above. A rename on one
// side and not the other fails here instead of at runtime in production.
// ---------------------------------------------------------------------------
console.log('\n── supabase driver ↔ schema contract ────────────────────────')
const driver = await readFile(new URL('../src/lib/db/supabase.ts', import.meta.url), 'utf8')

const tables = [...new Set([...driver.matchAll(/\.from\('([a-z_]+)'\)/g)].map(m => m[1]))]
  .filter(t => t !== 'products/' )
const rpcs = [...new Set([...driver.matchAll(/\.rpc\('([a-z_]+)'/g)].map(m => m[1]))]

const realTables = (await all(`select tablename from pg_tables where schemaname='public'`)).map(r => r.tablename)
for (const t of tables) {
  check(`table ${t}`, realTables.includes(t), realTables.includes(t) ? 'exists' : 'MISSING from schema.sql')
}

for (const fn of rpcs) {
  const row = await one(
    `select p.proname, pg_get_function_arguments(p.oid) as args
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname = $1`, [fn])
  check(`function ${fn}()`, Boolean(row), row ? row.args || 'no args' : 'MISSING from schema.sql')
}

// supabase-js sends rpc params by name — a mismatch is a silent failure.
// Compare what the driver sends against the ACTUAL catalog signature, not a
// list written here, or a rename on either side sails straight through.
for (const fn of rpcs) {
  const row = await one(
    `select pg_get_function_arguments(p.oid) as args from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.proname = $1`, [fn])
  if (!row) continue

  const declared = (row.args || '')
    .split(',')
    .map(a => a.trim().split(/\s+/)[0])
    .filter(Boolean)

  const call = driver.match(new RegExp(`rpc\\('${fn}'\\s*,\\s*\\{([\\s\\S]*?)\\}\\)`))
  const sent = call ? [...call[1].matchAll(/([a-z_]+)\s*:/g)].map(m => m[1]) : []

  const same = declared.length === sent.length && declared.every(a => sent.includes(a))
  check(`${fn} args match the catalog`, same,
    same ? declared.join(', ') || 'none'
         : `schema declares [${declared}] · driver sends [${sent}]`)
}

// Columns the driver writes must exist, or the insert fails at runtime.
const writes = {
  orders: ['number', 'location_id', 'fulfillment', 'customer_name', 'phone', 'email', 'address', 'total_cents', 'stage', 'seen'],
  order_items: ['order_id', 'product_id', 'name', 'size', 'price_cents', 'qty'],
  products: ['kind', 'name', 'type', 'price_cents', 'weight', 'sizes', 'slot', 'photo_url', 'thc', 'description', 'rating', 'reviews'],
  product_status: ['product_id', 'location_id', 'status'],
  events: ['day', 'month', 'title', 'where', 'location_id', 'sort', 'rsvps'],
  event_rsvps: ['event_id', 'name', 'email', 'created_at'],
  locations: ['hours', 'is_open'],
}
for (const [table, cols] of Object.entries(writes)) {
  const real = (await all(
    `select column_name from information_schema.columns
      where table_schema='public' and table_name=$1`, [table])).map(r => r.column_name)
  const missing = cols.filter(c => !real.includes(c))
  check(`${table} columns`, missing.length === 0,
    missing.length ? `MISSING: ${missing.join(', ')}` : `${cols.length} checked`)
}

// `.select('*, items:order_items(*)')` only resolves if PostgREST can see the FK.
const fk = await one(`select 1 as ok from information_schema.table_constraints tc
  join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
  where tc.table_name='order_items' and tc.constraint_type='FOREIGN KEY' and ccu.table_name='orders'`)
check('order_items → orders FK (embedded select needs it)', Boolean(fk))

// upsert(..., { onConflict: 'product_id,location_id' }) needs that exact key.
const pk = await one(`select string_agg(a.attname, ',' order by k.ord) as cols
  from pg_constraint c
  join lateral unnest(c.conkey) with ordinality as k(attnum, ord) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
  where c.conrelid = 'product_status'::regclass and c.contype = 'p' group by c.oid`)
check('product_status upsert key', pk.cols === 'product_id,location_id', pk.cols)

console.log(`\n${failures === 0 ? '\x1b[32mall checks passed\x1b[0m' : `\x1b[31m${failures} check(s) failed\x1b[0m`}\n`)
await db.close()
process.exit(failures === 0 ? 0 : 1)
