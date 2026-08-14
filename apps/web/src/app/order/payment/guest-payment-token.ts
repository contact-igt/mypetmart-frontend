// Bridges a guest's Order recovery token across the PayU Hosted Checkout
// round trip (MyPetMart -> PayU -> MyPetMart browser return). The token
// itself already exists server-side (orders.guest_access_token_hash) and is
// never sent to PayU — surl/furl only ever echo txnid/orderId (see
// payu-return.util.ts). sessionStorage is scoped to this tab and cleared
// when it closes, which is the right lifetime for "get this guest back to
// their own payment result after a same-tab redirect", without persisting a
// recovery credential indefinitely the way localStorage would.
const STORAGE_KEY = "mypetmart_pending_guest_payment_token";

export function storeGuestPaymentToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Storage can throw in locked-down/private-browsing contexts — the
    // result page simply falls back to its no-token state in that case.
  }
}

export function readGuestPaymentToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearGuestPaymentToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}
