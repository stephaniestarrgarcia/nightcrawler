# Putting Nightcrawler online

**Three things to do.** About 20 minutes, most of it waiting.

---

## 1 · Make the database

Go to **<https://supabase.com/dashboard>** → **New project**.

- Name it `nightcrawler`
- **Write down the database password it asks you to set** — you need it in a minute
- Region: `East US` (or `West US` if LA is the busier room)

Wait for it to finish setting up (~2 minutes).

Then collect four values. Two screens:

**Settings → Database → Connection string → URI** — copy that whole line.

**Settings → API** — copy the *Project URL*, the *anon public* key, and the
*service_role secret* key.

Now make a file called `.env.local` in this folder with those four values:

```
SUPABASE_DB_URL=<the connection string, with your password swapped in>
NEXT_PUBLIC_SUPABASE_URL=<Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role secret key>
```

> The connection string has `[YOUR-PASSWORD]` in the middle of it. Replace that
> with the password from earlier, square brackets and all.

## 2 · Run one command

```bash
npm run setup
```

That builds all the tables, creates the photo storage, loads the menu, and
checks its own work. If anything is wrong it tells you exactly what to fix.
Safe to run again.

## 3 · Put it on the web

Go to **<https://vercel.com/new>** and import the `nightcrawler` repository.
Don't change any build settings. Before you hit Deploy, add these under
**Environment Variables**:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | same as in `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as in `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | same as in `.env.local` |
| `SUPABASE_STORAGE_BUCKET` | `products` |
| `ADMIN_PIN` | any 4 digits you'll remember |
| `ADMIN_SESSION_SECRET` | run the command below and paste the result |
| `NEXT_PUBLIC_SITE_URL` | your web address, e.g. `https://nightcrawler.com` |

For the secret, run this and paste what it prints:

```bash
openssl rand -hex 32
```

> Paste that straight into Vercel. Don't save it into a file here — anything in
> this folder can end up on GitHub, and that value is what stops someone forging
> an admin login.

Hit **Deploy**. That's it.

---

## Check it worked

Open your new site and:

1. Place a test order.
2. Open `/admin`, type the PIN — the order should be sitting there.
3. Tap **Mark: Being packed** — the customer's tracker should move on its own.
4. In **Flower**, tap **Edit** on a strain and upload any photo — it should
   appear on the site.

## Still to fill in

These need real information, not code:

- The four room addresses (currently `000 Address TBD`) — edit them in **Rooms**
- Your licence number in the site footer
- Real Instagram and YouTube links
- Product photography — upload through the admin as it arrives

## How customers hear from you

**No texting service required.** Nothing is sent automatically, and nothing
needs approving.

When someone orders, the tracker page updates itself live — every time you tap a
stage in the admin, their page moves within about 5–10 seconds, without them
refreshing anything.

They can always find it again. It opens automatically when they order, the link
is shown with a **Copy link** button, and their browser remembers the order, so
coming back to the site later shows a red **NC-4312 · Ready for pickup** button
in the top bar that reopens the tracker.

On each order in the back office you get:

- **Call (555) 222-3344** — taps straight into your phone's dialler
- **Text** — opens your own Messages app with the message already written,
  including their tracker link
- **Email** — same, if they left an address
- **Copy tracker link** — to paste anywhere you like

So you decide who to contact and when, from your own number. Customers see your
real phone, which is friendlier than an automated shortcode anyway.

## If you ever want it automatic

The code for it is already written and sitting dormant — it just needs keys.

- **Email** is the easy one: sign up at <https://resend.com>, verify your
  domain, and add `RESEND_API_KEY` and `RESEND_FROM` in Vercel. Order
  confirmations start sending. No approval process.
- **Texting** is harder. US carriers restrict cannabis messaging regardless of
  state law, so a texting number can be rejected or messages silently filtered.
  If you want to try, add the `TWILIO_*` keys — but check with them first, and
  don't build your process around it.

Until then every message that *would* have been sent is written to the server
log instead, so nothing breaks and nothing is lost.
