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
| `ADMIN_PIN` | `<choose 4 digits>` (or any 4 digits you like) |
| `ADMIN_SESSION_SECRET` | `<generate-your-own-see-below>` |
| `NEXT_PUBLIC_SITE_URL` | your web address, e.g. `https://nightcrawler.com` |

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

## Text messages and email (later)

Order confirmations work without this — they just get written to the server log
instead of sent. When you're ready, add `RESEND_API_KEY` for email and the
`TWILIO_*` keys for texts.

> **Start the Twilio paperwork early.** US carriers treat cannabis as a
> restricted category, so getting a texting number approved takes days to weeks.
> Nothing else waits on it.
