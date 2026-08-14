import { NextResponse, type NextRequest } from "next/server";
import { buildPaymentResultRedirectUrl, readPayuReturnFields } from "../payu-return.util";

// PayU's Hosted Checkout browser return (surl): the customer's browser is
// auto-submitted here as an HTML form POST once PayU has processed the
// payment attempt. This route is NOT authoritative — it never calls any
// backend endpoint and never marks a Payment or Order paid. Its only job is
// to safely extract the non-sensitive txnid/orderId PayU echoes back and
// hand the browser off to a plain, non-authoritative status page. Real
// payment status must always come from a trusted backend verification path
// (webhook / reconciliation) — a future stage, not this one.
async function handlePayuReturn(request: NextRequest): Promise<NextResponse> {
  const fields = await readPayuReturnFields(request);
  const url = buildPaymentResultRedirectUrl(request, "success", fields);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePayuReturn(request);
}

// Defensive fallback only — PayU's documented Hosted Checkout return is a
// POST, but a customer could land here via GET (bookmark, back button,
// manual retry). Handled identically and just as non-authoritatively.
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handlePayuReturn(request);
}
