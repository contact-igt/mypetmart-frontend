import type { NextRequest } from "next/server";

// Only the txnid PayU's own docs describe as its merchant-generated
// transaction reference (see backend buildBusinessReference("payment", id) —
// "PAY-000123") and the numeric orderId this app itself put in udf1 at
// initiation time. Both are treated as display hints only, never as proof of
// anything — this file's whole job is reading PayU's raw, untrusted return
// payload without ever trusting it.
const TXNID_PATTERN = /^PAY-\d{6,}$/;
const ORDER_ID_PATTERN = /^\d{1,15}$/;

export type PayuReturnFields = {
  txnid: string | null;
  orderId: string | null;
};

function extractField(source: URLSearchParams | FormData, key: string): string | null {
  const value = source.get(key);
  return typeof value === "string" ? value : null;
}

export async function readPayuReturnFields(request: NextRequest): Promise<PayuReturnFields> {
  let txnidRaw: string | null = null;
  let orderIdRaw: string | null = null;

  if (request.method === "POST") {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        txnidRaw = extractField(formData, "txnid");
        orderIdRaw = extractField(formData, "udf1");
      }
    } catch {
      // Malformed body from an untrusted caller — fall through with nothing
      // extracted rather than failing the redirect.
    }
  }

  if (!txnidRaw) {
    txnidRaw = request.nextUrl.searchParams.get("txnid");
  }
  if (!orderIdRaw) {
    orderIdRaw = request.nextUrl.searchParams.get("udf1") ?? request.nextUrl.searchParams.get("orderId");
  }

  return {
    txnid: txnidRaw && TXNID_PATTERN.test(txnidRaw) ? txnidRaw : null,
    orderId: orderIdRaw && ORDER_ID_PATTERN.test(orderIdRaw) ? orderIdRaw : null
  };
}

export function buildPaymentResultRedirectUrl(request: NextRequest, status: "success" | "failure", fields: PayuReturnFields): URL {
  const url = new URL("/order/payment/result", request.nextUrl.origin);
  url.searchParams.set("status", status);
  if (fields.txnid) {
    url.searchParams.set("txnid", fields.txnid);
  }
  if (fields.orderId) {
    url.searchParams.set("orderId", fields.orderId);
  }
  return url;
}
