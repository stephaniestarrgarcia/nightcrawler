# Nightcrawler — shop + back of house

Implementation of the `design_handoff_nightcrawler` package: a customer storefront
and a phone-first admin panel for a four-room cannabis brand. No online payment —
customers pay at pickup or on delivery.

Stack: **Next.js 15 (App Router) + TypeScript** and **Supabase** (Postgres,
Storage, Realtime), deployable on Vercel. Customer contact is manual by
default — see *Reaching the customer* below — with optional **Resend** (email)
and **Twilio** (SMS) hooks already wired if they're ever wanted.

---

## Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000> for the shop and <http://localhost:3000/admin> for
back of house. The dev PIN is **4242**.

Nothing else is required. With no Supabase credentials the app runs on a bundled
JSON store under `.data/`, seeded with the lineup from the handoff — the whole
flow (order → admin advances it → customer tracker moves) works out of the box.

| Command | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run verify:schema` | runs `supabase/schema.sql` against a real Postgres and checks it |
| `npm run verify` | all three |
| `npm run setup` | builds the Supabase database from `.env.local` (see [DEPLOY.md](DEPLOY.md)) |

To reset the demo shop to its seed state: `rm -rf .data public/uploads`.

---

## Verifying the database

`npm run verify:schema` runs `supabase/schema.sql` against a real Postgres
(PGlite — Postgres compiled to WASM, a dev dependency, no server to install) and
then exercises it: the seed, every CHECK constraint, `next_order_number`, the
version triggers the live-update poll depends on, `rsvp_event`'s
upsert-and-count, `add_subscriber`'s array merge, and RLS — including asserting
that orders, the RSVP door list and subscribers are **not** readable with the
anon key.

It also checks the Supabase driver against that schema: every table, function,
rpc argument name and written column it references must exist, plus the FK that
`select('*, items:order_items(*)')` needs and the composite key
`product_status` upserts on. A rename on one side and not the other fails here
rather than in production.

The suite is mutation-tested — dropping a column, leaking orders to `anon` and
renaming an rpc argument were each confirmed to make it fail.

## Going live

**[DEPLOY.md](DEPLOY.md)** is the checklist: make a Supabase project, run
`npm run setup`, import to Vercel. The details below are for reference.

## Going live on Supabase

`npm run setup` does steps 1 and 2 for you, and verifies the result against the
live database. By hand:

1. Create a project, then run `supabase/schema.sql` against it (SQL editor, or
   `psql "$DATABASE_URL" -f supabase/schema.sql`). It creates the tables, the
   RLS policies, the helper functions and the seed lineup.
2. Create a **public** Storage bucket named `products`.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=…
   NEXT_PUBLIC_SUPABASE_ANON_KEY=…
   SUPABASE_SERVICE_ROLE_KEY=…
   ADMIN_PIN=…                  # 4 digits
   ADMIN_SESSION_SECRET=…       # openssl rand -hex 32
   NEXT_PUBLIC_SITE_URL=https://…
   ```

The app switches drivers on the presence of those variables — no code change.
`ADMIN_PIN` and `ADMIN_SESSION_SECRET` are **required** in production; the app
refuses to start a session without them.

`RESEND_API_KEY` / `TWILIO_*` are optional. Unset, every message is logged to the
server console with its full text instead of being sent, so you can watch the
notification flow locally without credentials.

---

## How it fits together

```
src/
  app/
    page.tsx                  customer site (server-rendered, then live)
    track/[number]/page.tsx   tracker deep link from the SMS/email
    admin/page.tsx            back of house
    api/…                     public + admin route handlers
  components/site/            storefront
  components/admin/           back of house
  lib/
    db/                       the data layer (see below)
    tokens.ts                 the palette, verbatim from the handoff
    session.ts                admin PIN → signed httpOnly cookie
    notify.ts                 Twilio + Resend
    useLive.ts                keeps a screen in sync
supabase/schema.sql           tables, RLS, functions, seed
```

### The data layer

`lib/db/types.ts` defines one `Driver` interface. Two implementations satisfy it:

- **`local.ts`** — one JSON file, writes serialised through a promise chain.
  Zero-config, single-process; it exists so the app is demonstrable before
  anyone provisions infrastructure.
- **`supabase.ts`** — the real one. All queries go through the service-role key
  from server-only modules; RLS is a second line of defence, not the only one.

`lib/db/index.ts` picks between them. No component or route handler knows which
is in use.

### Staying live

Two mechanisms, deliberately:

- **Supabase Realtime** pushes a refetch the moment a row changes.
- **A version-guarded poll** runs underneath it. Each screen sends the version it
  already holds; the server answers `304` when nothing moved. In Postgres the
  version is a single integer bumped by triggers, so the steady-state cost of a
  live screen is one cheap read and an empty response.

The poll means the screen still converges if the socket drops, the tab sleeps, or
the app is running on the local driver. Polling pauses while a tab is hidden and
catches up on wake.

### Money

Prices are integer cents everywhere. `lib/money.ts` is the only place they become
strings. **Order totals are computed server-side from the database** — the price
in the browser's bag is display only, and `POST /api/orders` re-reads every line,
rejects anything that has sold out or vanished, and rejects a closed room.

### Auth

The PIN is verified on the server (`timingSafeEqual`), never compared in the
browser, and exchanged for an HMAC-signed httpOnly cookie. Every authenticated
request slides a 15-minute idle window; the panel notices expiry and returns to
the keypad.

### The tracker link

`/track/NC-1234?p=<last-4-of-phone>`. An order number alone is guessable, so the
last four digits of the phone on the order are required to read it — on the page
and on the API. Orders are never readable through the anon key.

### Photos

The admin downscales to 1200px in the browser (canvas) before uploading, so a
12 MP phone photo becomes a ~200 KB JPEG on shop wifi. The server checks type and
size, then hands it to Storage (or `public/uploads/` on the local driver).

---

## Reaching the customer

Nothing is sent automatically. The live tracker is the mechanism: the customer's
page moves the moment staff advance a stage, and they're given the link on screen
with a copy button rather than being mailed it.

Each order in the back office carries `tel:`, `sms:` and `mailto:` actions, with
the message pre-written for the stage the order is actually at, plus the tracker
link. Staff contact people from their own phone, on their own judgement.

A live order is reachable three ways, which matters more when nothing is texted:
it opens in the drawer the moment it is placed, the link is shown there with a
copy button, and a vermilion pill in the nav carries the order number and its
current stage until it is collected — `localStorage` remembers it across
visits.

`lib/notify.ts` still holds working Resend and Twilio paths for when automatic
messaging is wanted. With no keys set they log what they would have sent instead
of sending it, so the flow is visible without credentials. Note that US carriers
restrict cannabis SMS regardless of state law, which is why manual is the
default rather than a fallback.

## Back of house

Six tabs. **Orders** splits into a working queue and a collapsed "fulfilled"
section so tonight's work isn't buried by closing time. **Flower** and **Merch**
are the same card + inline editor, with per-room status buttons and photo upload
or removal. **Events** files each night under a room and opens the door list
behind its RSVP count. **Rooms** is hours and open/closed. **List** is the
mailing list — footer sign-ups plus everyone who tapped "notify me", with the
product they are waiting on resolved to a name.

The handoff specifies five tabs; **List** is a sixth. Without it the newsletter
sign-ups and every "notify me" tap are captured and then invisible, which makes
both features decorative. The tab row is a six-column grid and the labels still
fit at 430px.

## Sizes

Merch that comes in sizes cannot be bagged without one — staff have to pick
something off a shelf. The size travels with the cart line (two sizes of one tee
are two lines), onto `order_items.size`, and through to the tracker and the
admin's item line. `POST /api/orders` re-checks it against the product's current
size list, so a stale tab cannot order an XXL that was dropped an hour ago.

## RSVPs

An RSVP is free but named: the site asks for a name and email, `event_rsvps`
records one seat per address per event, and the admin can open the door list or
BCC everyone. A repeat RSVP from the same address updates the name and does not
double-count.

The seeded counts from the design (84, 51, 129) have no guest rows behind them —
they are carried forward as a starting number, and only new seats move the
counter.

## What is per-room and what is shared

This is the one modelling decision worth knowing:

- **Per room** (`product_status`): Available / Sold out / Hidden. Selling Ghost
  Tiger out in New York leaves it live in Los Angeles.
- **Shared** (`products`): name, price, type, THC, weight, sizes, description,
  photo. Renaming a strain renames it everywhere.
- **Per room** (`locations`): tonight's hours and open/closed. A closed room
  disappears from checkout and shows "Closed" on the Locations section.

Hidden products are filtered out **on the server** — they never reach the browser.

---

## Notes on the handoff

- **Fidelity.** Colours, type, spacing and copy follow the reference files. Radius
  is 0 everywhere and there are no shadows outside the hero glow; both are in
  `globals.css` rather than left to chance.
- **Photography** is not supplied. Every product slot renders an unmistakable
  dashed placeholder naming the shot it wants, and the admin has real upload.
- **The keypad** is 76px keys on a 3-column grid, matching the Admin prototype.
  (The handoff prose says 64px — the prototype is what was built to.)
- **Stars and review counts** are not in the handoff's schema but the menu card
  renders them, so `products` carries `rating` and `reviews`.
- **The prototype's 7-second auto-advance is gone.** Stage changes come from the
  admin, as specified.
- **Testimonials** are fixed brand copy, so they live in the component rather than
  the database.

## If this repo lives in iCloud Drive

`node_modules` is marked `com.apple.fileprovider.ignore#P` so iCloud does not
evict files mid-build. If you move or recreate the folder, re-apply it:

```bash
rm -rf node_modules && mkdir node_modules
xattr -w 'com.apple.fileprovider.ignore#P' 1 node_modules
npm install
```
