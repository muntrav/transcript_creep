# Current Phase

- Phase: Paywall foundation
- Status: Implemented foundation slice
- Current focus: Stabilize auth UX, add payment instructions, and extend admin tooling now that the Supabase backbone is live
- Next expected skill: `sdlc-frontend-implementation` for account, pricing, and admin polish on top of the working backend slice

## Assumptions

- Manual payment requests are the desired billing model.
- The first implementation slice should prioritize identity, entitlements, and admin operations over design polish.
- Supabase is the system of record for users, plans, subscriptions, payment requests, and usage.

## Current risks

- `ADMIN_EMAILS` should be configured in every deployed environment so admin access does not rely on first-user bootstrap behavior.
- Usage enforcement needs to stay server-side on both transcript endpoints.
- The initial manual payment flow should avoid file upload/storage complexity unless required immediately.
