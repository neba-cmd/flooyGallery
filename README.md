# Flooy Photos

Event-photography gallery, ordering, fulfilment, and administration built with
Next.js App Router, React, TypeScript, Prisma/PostgreSQL, Better Auth, Tailwind,
Base UI, and Cloudflare R2-compatible object storage.

## Local setup

1. Install Node.js 20 or newer and PostgreSQL.
2. Copy `.env.example` to `.env.local` and fill in the database, authentication,
   and R2 values. Keep the R2 bucket private. If `R2_PUBLIC_URL` is used, expose
   only the `events/*/previews/*` path through the corresponding bucket/domain
   policy; originals must never be public.
3. Install and prepare the database:

   ```bash
   npm install
   npm run db:migrate
   npx prisma generate
   npm run db:seed
   ```

4. Create the first administrator:

   ```bash
   SEED_ADMIN_EMAIL=admin@example.com \
   SEED_ADMIN_PASSWORD='a-long-unique-password' \
   node --experimental-strip-types prisma/seed-admin.ts
   ```

5. Start the application:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000` for the gallery and `/admin/login` for management.
For an empty production database, use Prisma migration/deployment rather than
the demo seed.

If an existing administrator's configured seed password has changed, reset it
explicitly (this also revokes that administrator's sessions):

```bash
npm run db:admin:reset
```

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## Vercel deployment

1. Import this repository into Vercel.
2. Add every value from `.env.example` in Project Settings → Environment
   Variables. `DATABASE_URL` should be the pooled runtime URL and
   `DATABASE_URL_UNPOOLED` the direct migration URL.
3. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the production HTTPS URL.
4. Configure R2 CORS to allow `PUT` from the production site for
   `image/jpeg`, `image/png`, and `image/webp`. Keep original objects private.
5. Run `npm run db:migrate` against production before deploying application
   code. The checked-in baseline supports fresh databases and the original
   database has been registered against that baseline.
6. Deploy with the default `npm run build` command, then bootstrap the first
   administrator using the seed command from a trusted environment.

R2 presigned upload URLs are issued only to authenticated admins. Browser-side
processing creates compressed, visibly watermarked previews; short-lived
presigned GET URLs for originals are issued only for paid/completed order items.

## SumUp Hosted Checkout

Checkout prices are calculated from PostgreSQL before a pending order and SumUp Hosted Checkout
are created. `SUMUP_API_KEY` is only read by server modules. Both the notification handler and the
customer return page retrieve the checkout directly from SumUp; neither trusts a webhook body or
redirect query parameters as proof of payment.

Configure these variables locally and in Vercel:

```bash
SUMUP_API_KEY="your-server-side-api-key"
SUMUP_MERCHANT_CODE="your-merchant-code"
NEXT_PUBLIC_APP_URL="https://your-production-domain.example"
```

Create a SumUp API key for the configured merchant with the `payments` scope (or
`checkouts.write` and `checkouts.read`) and enable Hosted Checkout for the account. The application
provides these URLs on every checkout; they must be publicly reachable over HTTPS:

- Notification (`return_url`): `https://your-production-domain.example/api/webhooks/sumup`
- Customer return (`redirect_url`): `https://your-production-domain.example/payment-complete`

If SumUp asks for allowlisted callback/redirect URLs, enter those exact URLs. Notifications use the
`CHECKOUT_STATUS_CHANGED` event. The endpoint returns an empty 2xx response and safely handles
SumUp retries.

Apply the additive migration before deploying the application code:

```bash
npm run db:migrate
```

In SumUp's sandbox, test a successful payment, the documented failure amount, an expired session,
and duplicate notification delivery. Refund initiation is not included; when a refund is processed
in SumUp, the local order must also be changed to `REFUNDED` to disable downloads.
