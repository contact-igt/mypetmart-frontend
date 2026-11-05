# Breeze Nested Close Message Design

## Intent

Recognize Breeze's trusted nested callbackEvent postMessage close payload so Cancel purchase executes the existing safe close path.

## Scope

- Modify apps/web/src/components/payment/breeze-cart-checkout-button.tsx to decode nested JSON payload strings from an already trusted browser message.
- Add one regression test using Breeze's observed app.breeze.in callbackEvent / processResult / backPressed envelope.
- Do not treat hide-loader, URL changes, DOM changes, timeouts, or untrusted origins as checkout closure.

## Approach

Decode at most the known outer envelope and its nested payload JSON string; return only the inner payload object to the existing close-signal matcher. The existing trusted-origin check, close routine, URL cleanup, SDK termination, and button state reset remain unchanged.
