# MyPetMart Breeze Checkout Handoff

## Purpose

This document explains the Breeze by Juspay full checkout (1CCO) implementation in MyPetMart: where it is wired, what the intended behavior is, what has changed, and which live issues still require validation.

Do not put Breeze API keys, private keys, test OTPs, payment details, or customer data in this file.

## Current architecture

MyPetMart does not calculate a Breeze total in the browser. The browser asks the backend for a server-authoritative, signed checkout session. The backend validates the live cart and returns the Breeze cart, signature, key ID, merchant ID, shop URL, and environment. The browser passes those values to the Breeze SDK.

The Breeze SDK drawer is a payment UI only. A Breeze success callback is not proof that an order is paid. The app polls the backend session status and only treats the order as confirmed after the server/webhook confirms it.

## Main frontend files

| File | Responsibility |
| --- | --- |
| `apps/web/src/components/payment/breeze-cart-checkout-button.tsx` | Shared Breeze launcher, capability check, signed session start/resume, drawer close handling, server-status polling, and fallback behavior. |
| `apps/web/src/app/cart/cart-client.tsx` | Cart-page Buy it now surface and stale Breeze URL cleanup on normal Cart navigation. |
| `apps/web/src/app/products/[slug]/product-detail.tsx` | Product-page Buy it now: add/reuse product in cart, then launch Breeze. |
| `apps/web/src/components/site-header.tsx` | Header Cart links; cleans stale Breeze URL state before navigating to Cart. |
| `apps/web/src/lib/payment-api.ts` | Frontend calls to Breeze config, create-session, resume-session, and status endpoints. |
| `apps/web/src/lib/breeze/blaze-sdk.ts` | Thin SDK wrapper, `atomsSt` URL cleanup, startCheckout call, and termination. |

## Backend endpoints used by frontend

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/storefront/payments/breeze/checkout-config` | Public capability probe. Returns whether full Breeze checkout is enabled. |
| `POST /api/v1/storefront/payments/breeze/checkout-session` | Creates a server-authoritative signed Breeze session from the current cart. |
| `POST /api/v1/storefront/payments/breeze/checkout-session/resume` | Returns the signed payload for an existing pending session. |
| `POST /api/v1/storefront/payments/breeze/checkout-session/status` | Returns server-confirmed payment/order state. |
| `POST /api/v1/payments/breeze/order-create-webhook` | Provider-facing order creation/payment bridge. |
| `POST /api/v1/payments/breeze/abandoned-checkout-webhook` | Provider-facing abandoned-checkout callback. |

## Intended customer flows

### Cart navigation

Clicking the header Cart icon must open `/cart` only. It must not open a Breeze drawer automatically during ordinary navigation.

### Cart Buy it now

Clicking Buy it now on Cart launches Breeze using the current cart. If a valid pending Breeze session exists, the Cart flow may resume it. The backend remains responsible for rejecting unsafe duplicate attempts.

### Product Buy it now

Product Buy it now adds the chosen product/variant to the cart if needed, then launches Breeze.

The product path must create a fresh session from the latest server cart; it must not resume an older pending Breeze session. This prevents a previously paid or abandoned cart snapshot appearing with a new product.

### Drawer close and retry

Closing/cancelling the drawer terminates the SDK and removes `atomsSt`, but retains the opaque pending-session pointer until the backend reports a terminal result. Closing a drawer is not proof that payment failed.

For an unchanged cart, the correct retry is to resume the same known Breeze session/order ID, not create another checkout session. A first product Buy it now must still start fresh so it cannot reopen an unrelated old session. This close-and-retry behavior is pending live webhook verification.

### Browser refresh

If a real browser refresh occurs while a valid session is pending, the app may resume that session. Ordinary navigation to Cart must not be treated as a refresh.

### Successful payment

On a Breeze success event, the browser clears pending client state and asks the backend for session status. The user is sent to the payment result/order page only after a server-confirmed order/payment result. The cart must refresh/clear after finalization.

## Implemented frontend changes

1. Product Buy it now no longer redirects to legacy `/checkout` when Breeze is enabled.
2. The shared launcher supports product-triggered automatic launch with `autoStart` and an `autoStartKey` for explicit retry attempts.
3. Product Buy it now passes `resumePending={false}` so it creates a fresh signed session based on the latest cart.
4. Cart navigation attempts to remove stale Breeze `atomsSt` query state; header Cart links also call `cleanUrlAtomsState` before navigation.
5. Automatic session recovery is limited to browser reloads; normal Cart navigation should not auto-open the drawer.
6. Only documented Breeze SDK callbacks drive close handling. Arbitrary browser `message` events are ignored because they cannot be safely attributed to the active checkout.
7. Refresh recovery asks the ownership-protected status endpoint before restoring the SDK; only an `awaiting_webhook` session is eligible to reopen.
8. The authenticated abandoned-checkout webhook no longer releases an unresolved payment attempt. Only authoritative payment processing or audited administrative release can do that.

## Important Breeze state

### Local storage

`mpm_breeze_pending_session` stores only the opaque Breeze session ID for recovery/status checks. It is removed only after the backend reports a final confirmed/failed result, a missing session, or an explicit server-authorized resolution. Drawer close alone retains it for recovery.

### URL parameter

Breeze uses `atomsSt` in the browser URL. It can cause the SDK to restore an old drawer independently of application state.

Example problematic URL:

```text
/cart?atomsSt=...
```

When this parameter survives after a previous payment/close, Breeze can display old items even when the MyPetMart Cart page shows newer items. Always remove it before ordinary Cart navigation or a fresh product checkout.

## Breeze abandoned-checkout guidance

Breeze has stated that its Abandoned Checkout payload identifies the merchant checkout through `cartDetails.orderId`. MyPetMart sends its opaque `BreezeCheckoutSession.public_id` as that order ID, so the callback can identify the original signed session.

The provider-recommended retry flow is:

```text
Customer closes drawer
→ Breeze sends authenticated abandoned-checkout callback with cartDetails.orderId
→ MyPetMart finds the matching session
→ MyPetMart retains that session
→ the customer retries with the same order ID/session, not a new checkout session
```

The callback is provider-to-merchant: MyPetMart must not call it itself. It is not proof that payment failed, so it must not release, delete, expire, or replace the session. It may be logged and acknowledged with `200 { status: "RECEIVED" }`.

Before enabling the close-and-retry customer flow, verify a real Breeze sandbox/live callback. Do not assume a fixed delivery delay or that every drawer close has the same delivery timing.

## Issues observed during testing

### 1. Cart opens an old Breeze drawer automatically

Observed evidence: Cart URL contains `?atomsSt=...` and the drawer opens without pressing Cart Buy it now.

Cause: stale Breeze SDK URL state is restoring a previous drawer.

Expected fix/validation: deploy the header/Cart URL-cleanup changes, open `/cart` without a query string, and verify Cart navigation does not create a Breeze drawer.

### 2. Product Buy it now works once, then does not reopen after close

Cause: an SDK close must release the frontend lock and notify the product launcher; accepting arbitrary browser messages to do this is unsafe.

Implemented mitigation: accept only the SDK callback contract and use a new `autoStartKey` for each product Buy it now attempt. A provider-origin/message contract must be obtained from Breeze before adding message-based close handling.

### 3. Previous paid/old product appears in a new Breeze drawer

Observed evidence: MyPetMart Cart shows one product while Breeze drawer shows an older product or an old total.

Cause: old pending session or `atomsSt` SDK state is resumed instead of creating a new session from the current cart.

Implemented mitigation: Product Buy it now uses `resumePending={false}` and clears stale client SDK state before requesting a fresh backend session.

### 4. Live site may be running an older frontend bundle

If `www.mypetmart.in` still shows `atomsSt` in Cart URLs or old drawer behavior after source changes, the latest frontend code is not deployed or the browser is using stale cached JavaScript. Use a fresh/private browser after deployment.

## Current test evidence

Focused frontend tests currently pass:

- `apps/web/src/app/products/[slug]/product-detail.test.tsx`: 76 tests passed.
- `apps/web/src/components/payment/breeze-cart-checkout-button.test.tsx`: 15 tests passed, including close/retry persistence, untrusted-message rejection, and reload-only recovery.

The backend abandoned-webhook test was updated but not run here because its integration setup connects to the configured database; run it only against the approved test database.

## Audit findings still requiring product/provider validation

### Guest result recovery is not yet demonstrable

The full-checkout status endpoint returns an ownership-protected session status, but its backend implementation intentionally does not mint or return a guest order-recovery token. The Breeze launcher therefore cannot safely construct a guest payment-result route after finalization. Do not add an unauthorised public order lookup or put a recovery credential in a URL merely to make this appear to work. Decide the approved guest recovery design, then add backend and frontend tests for it.

### Breeze browser-message contract is unverified

The SDK callback path is covered. The provider did not supply a documented, origin-validated `postMessage` close contract, so this implementation deliberately ignores arbitrary browser messages. If a production Breeze bundle only reports close via `postMessage`, obtain the exact event schema, source, origin and active-session correlation from Breeze before supporting it.

### Real-provider payment and webhook paths are not executed

No dedicated sandbox customer/payment method or safe test database was supplied in this environment. The frontend/browser tests mock the SDK and network boundaries; they are not evidence of a real Breeze payment, webhook delivery, inventory mutation, guest recovery, or order finalization.

Full-suite/typecheck verification was limited by the current environment's Node memory ceiling. A CI or developer machine run is still required before production release.

## Required end-to-end sandbox test matrix

Use a dedicated Breeze test customer and test payment method. Never use a real customer/cart.

1. Add an item and open Cart. Expected: no drawer opens automatically.
2. Click Cart Buy it now. Expected: drawer opens once with current cart lines/quantities/total.
3. Click Product Buy it now with an empty cart. Expected: item is added once and a Breeze drawer opens; legacy `/checkout` does not appear.
4. Keep one cart item, add another product, then Product Buy it now. Expected: drawer shows both current cart items only.
5. Close drawer without payment. Expected: no order; cart unchanged; second Buy it now works.
   - After the provider callback has been verified, expected: the second click resumes the same Breeze session/order ID for an unchanged cart; it does not create a new session or show a `409`.
6. Start a Breeze session, navigate to Cart, then explicitly click Cart Buy it now. Expected: valid pending session resumes; no second session/order.
7. Refresh during a valid pending session. Expected: same session resumes once.
8. Expire/invalidate a pending session. Expected: next explicit Buy it now creates a fresh session.
9. Complete a sandbox payment. Expected: one server-confirmed order, one payment, cart cleared/refreshed, result page shown, no drawer reopen.
10. Refresh after payment success before result completion. Expected: backend status is checked; drawer does not reopen.
11. Double-click Buy it now or try another tab while payment is pending. Expected: backend blocks duplicate session/order/payment.

For every test, collect: browser recording, Breeze session/order ID, backend request ID/webhook result, MyPetMart order ID, and final cart count.

### Abandoned-checkout live verification

Use a dedicated test customer and a checkout that is never paid:

1. Record the MyPetMart Breeze session ID/order ID when the drawer opens.
2. Close the drawer.
3. Confirm Breeze sends `POST /api/v1/payments/breeze/abandoned-checkout-webhook` with an authenticated request and `cartDetails.orderId` equal to the recorded ID.
4. Confirm MyPetMart returns `200 { status: "RECEIVED" }`, finds the matching session, and creates no Order or Payment.
5. Confirm the session is not released/expired only because of this event.
6. Click Buy it now again without changing the cart. Confirm the same session/order ID resumes and no second session is created.
7. Repeat after changing the cart. Confirm the old signed checkout is not resumed and no unsafe second checkout is created while payment state is unresolved.

## Deployment checklist

1. Commit and deploy the frontend changes.
2. Verify production `checkout-config` returns `{ enabled: true }`.
3. Use a new private/incognito browser session to avoid old `atomsSt` URLs and cached JavaScript.
4. Run the sandbox matrix above.
5. Confirm webhook delivery and backend order finalization before allowing real customer payments.
