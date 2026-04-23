# Paywall And Manual Activation Plan

## Decision

Transcriptcreep will use:

- free usage with a monthly quota
- paid plans with manual payment
- manual subscription activation by an admin

Transcriptcreep will not use:

- Stripe
- Paystack subscriptions
- Flutterwave subscriptions
- direct card collection on the website
- automatic recurring billing

This keeps payment handling off the app and avoids card-processing compliance scope.

## Product Rules

### Free tier

- each user gets `5` transcript credits per month
- credits reset on a monthly cycle
- a single transcript request consumes `1` credit
- a bulk transcript request consumes `1` credit per video

### Paid plans

- Starter: `$9.99`
- Pro: `$19.99`
- Scale: `$29.99`

Recommended monthly entitlements:

- Starter: `100` credits
- Pro: `300` credits
- Scale: `700` credits

These values can be adjusted later without changing the overall architecture.

## User Flow

### Free user

1. User signs up or signs in
2. User can extract transcripts until they reach `5` credits in the current month
3. When quota is exhausted, the app blocks new transcript jobs and shows the pricing/paywall UI

### Paid user with manual payment

1. User opens the pricing page
2. User selects a plan
3. App shows manual payment instructions
4. User submits proof of payment or a payment reference
5. Admin reviews the request
6. Admin activates the selected plan manually
7. User immediately receives the plan entitlement

### Renewal

1. Before expiry, the app notifies the user that the plan is ending soon
2. User repeats the manual payment process
3. Admin extends or renews the subscription manually

If the plan expires and is not renewed, the user falls back to the free tier.

## Architecture

## 1. Authentication

Auth is required before metering can be enforced properly.

Recommended implementation:

- email and password auth
- passwordless email later if needed
- anonymous usage should not be supported once the paywall launches

Minimum user fields:

- `id`
- `email`
- `password_hash`
- `role`
- `created_at`
- `updated_at`

Roles:

- `user`
- `admin`

## 2. Usage metering

Metering must be server-side, not client-side.

Each transcript-producing endpoint should:

1. identify the current user
2. calculate the requested credit cost
3. check remaining monthly credits
4. reject if quota is exceeded
5. write a usage event after a successful reservation or execution

Recommended model:

### `usage_events`

- `id`
- `user_id`
- `period_key`
- `kind` (`single` or `bulk`)
- `units`
- `metadata_json`
- `created_at`

### `monthly_usage_counters`

- `id`
- `user_id`
- `period_key`
- `used_credits`
- `credit_limit`
- `plan_snapshot`
- `updated_at`

`period_key` should be a stable month identifier such as `2026-04`.

## 3. Subscription and entitlement model

Since billing is manual, the source of truth is admin-managed entitlement, not a payment webhook.

### `plans`

- `id`
- `code` (`starter`, `pro`, `scale`)
- `name`
- `price_usd`
- `monthly_credit_limit`
- `is_active`

### `subscriptions`

- `id`
- `user_id`
- `plan_id`
- `status` (`pending_payment`, `active`, `expired`, `cancelled`, `rejected`)
- `starts_at`
- `ends_at`
- `activated_by`
- `activated_at`
- `notes`
- `created_at`
- `updated_at`

### `payment_requests`

- `id`
- `user_id`
- `plan_id`
- `status` (`pending_review`, `approved`, `rejected`)
- `payment_reference`
- `proof_url`
- `notes`
- `reviewed_by`
- `reviewed_at`
- `created_at`
- `updated_at`

This separates:

- what the user requested
- what payment evidence they submitted
- what entitlement the admin approved

## 4. Manual payment model

The app should not claim that payment is automatic.

The paywall should present:

- the three plan cards
- your payment instructions
- accepted payment method wording
- a form to submit:
  - selected plan
  - payer name
  - payment reference
  - optional screenshot or proof
  - optional note

Recommended wording:

- "Pay manually using the instructions below, then submit your payment reference for activation."

Do not say:

- "Subscribe instantly"
- "Auto-renews"
- "Recurring card billing"

unless that becomes true later.

## 5. Admin operations

An admin dashboard is required because activation is manual.

Minimum admin screens:

- payment requests list
- payment request detail
- approve / reject action
- active subscriptions list
- manual extend / cancel subscription
- user usage lookup

Admin actions:

- approve a payment request and activate a plan
- reject a payment request with a reason
- extend an existing subscription
- downgrade a user back to free
- grant bonus credits manually if needed

## 6. API changes

New endpoints likely needed:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/payment-requests`
- `GET /api/account/usage`
- `GET /api/account/subscription`
- `GET /api/admin/payment-requests`
- `POST /api/admin/payment-requests/:id/approve`
- `POST /api/admin/payment-requests/:id/reject`
- `POST /api/admin/subscriptions/:id/extend`

Existing endpoints to update:

- `POST /api/transcript`
- `POST /api/transcript/bulk`

Both transcript endpoints must enforce credit limits before doing transcript work.

## 7. Frontend additions

New user-facing screens or sections:

- `Pricing`
- `Billing / Subscription`
- `Usage`
- paywall modal or inline block after quota exhaustion

New admin-facing screens:

- `Admin / Payment Requests`
- `Admin / Subscriptions`
- `Admin / Users`

## 8. Quota enforcement rules

### Single transcript

- cost = `1` credit

### Bulk transcript

- cost = number of resolved videos
- if the bulk job has 12 videos, it costs `12` credits
- if the user only has 4 credits left, reject before transcript extraction begins

This avoids partial charging confusion.

## 9. Notifications

Recommended notifications:

- payment request submitted
- payment approved
- payment rejected
- subscription expires in 7 days
- subscription expired
- monthly credits nearly exhausted

Initial implementation can keep notifications simple:

- in-app banners
- database-backed status only

Email can be added later.

## 10. Implementation order

### Phase 1: Auth and identity

- add user accounts
- add session handling
- protect future account and admin routes

### Phase 2: Plans, subscriptions, and usage schema

- add database
- create `plans`, `subscriptions`, `payment_requests`, `usage_events`, `monthly_usage_counters`
- seed default plans

### Phase 3: Quota enforcement

- wire quota checks into transcript APIs
- add remaining-credit calculation
- reject over-limit requests

### Phase 4: Pricing and paywall UI

- add pricing page
- add quota-exceeded UI
- add billing and usage pages

### Phase 5: Manual payment request flow

- add payment request form
- store payment references and proof
- expose user-facing request status

### Phase 6: Admin activation tools

- build admin review screens
- approve and reject payment requests
- activate and extend subscriptions

### Phase 7: Polish and operations

- reminders
- audit trail
- edge-case handling
- basic reporting

## Risks

### Manual operations risk

Manual activation creates operational overhead.

Mitigation:

- keep admin approval tooling minimal and fast
- include status tracking
- add reminder states for pending reviews

### Abuse risk

Users may create multiple free accounts.

Mitigation:

- require verified email later
- rate-limit auth endpoints
- optionally track abuse signals per IP/device later

### Support risk

Users may expect instant activation.

Mitigation:

- clearly say activation is manual
- show expected review time on the pricing and payment pages

## Recommended next build slice

Implement Phase 1 and Phase 2 first:

- auth
- database selection
- core billing and usage schema
- seeded plans

That gives the app a real identity and entitlement backbone before UI or admin workflows are layered on top.
