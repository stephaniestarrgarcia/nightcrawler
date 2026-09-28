# Deploying Nightcrawler

Four steps. Everything that can be checked ahead of time already has been —
`npm run verify` proves the schema runs and the driver matches it.

---

## 1 · Supabase

1. Create a project at <https://supabase.com/dashboard>. Note the region;
   put it near the rooms (`us-east-1` for NY/NJ, `us-west-1` for LA/Valley).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → Run.
   It is idempotent, so re-running it after an edit is safe.
3. **Storage → New bucket** → name it `products`, tick **Public bucket**.
   Product photos are meant to be publicly readable; nothing private goes here.
4. **Project Settings → API** → copy three values:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

> The `service_role` key bypasses every RLS policy. It is only ever read in
> server-only modules here. Never expose it to the browser, and never give it a
> `NEXT_PUBLIC_` prefix.

## 2 · Push to a Git host

```bash
gh repo create nightcrawler --private --source=. --push
```

(or create the repo in the GitHub UI and `git remote add origin … && git push -u origin main`)

## 3 · Vercel

Import the repo at <https://vercel.com/new>. Framework detection is automatic —
no build settings to change. Add these environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 1 |
| `SUPABASE_STORAGE_BUCKET` | `products` |
| `ADMIN_PIN` | 4 digits — suggested: `<choose 4 digits>` |
| `ADMIN_SESSION_SECRET` | generated below |
| `NEXT_PUBLIC_SITE_URL` | your final domain, e.g. `https://nightcrawler.com` |

A session secret generated for this deploy:

```
<generate-your-own-see-below>
```

`NEXT_PUBLIC_SITE_URL` must be the real domain — it builds the tracker links
that go out by SMS and email. Set it again after attaching a custom domain.

The app **refuses to start in production without Supabase credentials** rather
than silently falling back to the local JSON store, which would accept orders
and then lose them. If a deploy 500s, check those three variables first.

## 4 · Notifications (optional, can wait)

Unset, every message is logged server-side instead of sent, and everything else
works. Add them when the brand's sender identity exists:

| Variable | Where from |
|---|---|
| `RESEND_API_KEY`, `RESEND_FROM` | <https://resend.com> — verify the sending domain first |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | <https://twilio.com> — a US 10DLC number needs brand registration, which takes days |

> Cannabis is a restricted category for US A2P SMS. Start the Twilio 10DLC
> registration early and expect it to be the long pole.

---

## After the first deploy

- [ ] Open `/admin`, unlock with `ADMIN_PIN`, confirm all six tabs load.
- [ ] Place a test order on the site; confirm it appears in the admin queue.
- [ ] Advance it a stage; confirm the customer tracker moves without a reload.
- [ ] Upload one product photo; confirm it appears on the site.
- [ ] Replace the four `000 Address TBD` addresses in **Rooms**.
- [ ] Put the real licence number in the footer (`src/components/site/Footer.tsx`).
- [ ] Point the Instagram and YouTube links at the real accounts
      (`src/components/site/Newsletter.tsx`).
