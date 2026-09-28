/**
 * One-shot Supabase setup: creates the tables, the storage bucket, and checks
 * the result against the live database.
 *
 *   npm run setup
 *
 * Reads .env.local. Safe to re-run — the schema is idempotent and an existing
 * bucket is left alone.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import pg from 'pg'

const dim = s => `\x1b[2m${s}\x1b[0m`
const green = s => `\x1b[32m${s}\x1b[0m`
const red = s => `\x1b[31m${s}\x1b[0m`
const bold = s => `\x1b[1m${s}\x1b[0m`

function die(message, hint) {
  console.error(`\n${red('✗')} ${message}`)
  if (hint) console.error(`\n${hint}\n`)
  process.exit(1)
}

// --- read .env.local -------------------------------------------------------
if (!existsSync('.env.local')) {
  die('No .env.local file here.', `Create one with these four lines, from your Supabase project:

  ${dim('# Project Settings → Database → Connection string → URI')}
  SUPABASE_DB_URL=postgresql://postgres:YOUR-PASSWORD@db.xxxx.supabase.co:5432/postgres

  ${dim('# Project Settings → API')}
  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  SUPABASE_SERVICE_ROLE_KEY=eyJ...

then run ${bold('npm run setup')} again.`)
}

const env = Object.fromEntries(
  (await readFile('.env.local', 'utf8'))
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]
    })
    .filter(([k, v]) => k && v),
)

const missing = ['SUPABASE_DB_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
  .filter(k => !env[k])
if (missing.length) {
  die(`.env.local is missing: ${missing.join(', ')}`,
      'Copy them from your Supabase project under Settings → Database and Settings → API.')
}

if (env.SUPABASE_DB_URL.includes('YOUR-PASSWORD') || env.SUPABASE_DB_URL.includes('[YOUR-PASSWORD]')) {
  die('SUPABASE_DB_URL still has the placeholder password in it.',
      'Replace [YOUR-PASSWORD] with the database password you set when you created the project.')
}

// --- 1. schema -------------------------------------------------------------
console.log(`\n${bold('Setting up Supabase')}\n`)
process.stdout.write('  creating tables… ')

const client = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: process.env.NC_NO_SSL ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
})

try {
  await client.connect()
} catch (err) {
  console.log(red('failed'))
  die(`Could not connect to the database: ${err.message}`,
      `Check SUPABASE_DB_URL. In Supabase it is under ${bold('Settings → Database → Connection string → URI')},
and you must swap [YOUR-PASSWORD] for your real database password.`)
}

try {
  await client.query(await readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'))
  console.log(green('done'))
} catch (err) {
  console.log(red('failed'))
  await client.end()
  die(`The schema did not apply: ${err.message}`,
      'Nothing was half-applied — Postgres rolled the whole file back. Send me this error.')
}

// --- 2. storage bucket -----------------------------------------------------
process.stdout.write('  creating the photo bucket… ')
const bucket = env.SUPABASE_STORAGE_BUCKET || 'products'
let storage
try {
  storage = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    signal: AbortSignal.timeout(20000),
  })
} catch (err) {
  console.log(red('failed'))
  await client.end()
  const cause = err?.cause?.code === 'ENOTFOUND' ? 'that web address does not exist' : err.message
  die(`Could not reach your Supabase project: ${cause}`,
      `Check ${bold('NEXT_PUBLIC_SUPABASE_URL')} in .env.local. It should look like
  ${dim('https://abcdefghijkl.supabase.co')}
and is shown under ${bold('Settings → API → Project URL')}.`)
}
if (storage.ok) {
  console.log(green('done'))
} else {
  const body = await storage.json().catch(() => ({}))
  const exists = storage.status === 409 || /already exists/i.test(body.message ?? '')
  console.log(exists ? green('already there') : red('failed'))
  if (!exists) {
    await client.end()
    die(`Could not create the storage bucket: ${body.message ?? storage.status}`,
        'Check SUPABASE_SERVICE_ROLE_KEY, or create a public bucket named "products" by hand under Storage.')
  }
}

// --- 3. check it actually worked ------------------------------------------
process.stdout.write('  checking… ')
const { rows } = await client.query(`select
  (select count(*)::int from locations) as locations,
  (select count(*)::int from products)  as products,
  (select count(*)::int from events)    as events,
  (select count(*)::int from pg_tables where schemaname='public' and not rowsecurity) as unprotected`)
const r = rows[0]
await client.end()

const problems = []
if (r.locations !== 4) problems.push(`expected 4 rooms, found ${r.locations}`)
if (r.products !== 14) problems.push(`expected 14 products, found ${r.products}`)
if (r.unprotected > 0) problems.push(`${r.unprotected} table(s) without row-level security`)

if (problems.length) {
  console.log(red('problems found'))
  die(problems.join('\n  '), 'Send me this and I will sort it out.')
}
console.log(green('all good'))

console.log(`
${green('Supabase is ready.')} ${dim(`${r.products} products · ${r.locations} rooms · ${r.events} events`)}

${bold('Next:')} paste these into Vercel (Settings → Environment Variables):

  NEXT_PUBLIC_SUPABASE_URL      ${env.NEXT_PUBLIC_SUPABASE_URL}
  NEXT_PUBLIC_SUPABASE_ANON_KEY ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? dim('(from Settings → API)')}
  SUPABASE_SERVICE_ROLE_KEY     ${dim('(the service_role key — do not paste it anywhere public)')}
  SUPABASE_STORAGE_BUCKET       ${bucket}
  ADMIN_PIN                     ${dim('4 digits of your choosing')}
  ADMIN_SESSION_SECRET          ${dim('see DEPLOY.md')}
  NEXT_PUBLIC_SITE_URL          ${dim('your final web address')}
`)
