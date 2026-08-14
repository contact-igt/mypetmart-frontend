import { NextResponse, type NextRequest } from "next/server";
import { buildPaymentResultRedirectUrl, readPayuReturnFields } from "../payu-return.util";

// PayU's Hosted Checkout browser return (furl). See success/route.ts for the
// full explanation — this route is identically non-authoritative. A browser
// landing on furl is NOT proof the payment definitively failed (PayU's own
// server-side result can still disagree), so this never performs
// finalization and never claims a definitive outcome — only that the
// browser was sent back here.
async function handlePayuReturn(request: NextRequest): Promise<NextResponse> {
  const fields = await readPayuReturnFields(request);
  const url = buildPaymentResultRedirectUrl(request, "failure", fields);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handlePayuReturn(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handlePayuReturn(request);
}
