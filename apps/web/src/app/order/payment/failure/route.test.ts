import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function postRequest(url: string, form: Record<string, string>): NextRequest {
  const body = new URLSearchParams(form).toString();
  return new NextRequest(url, {
    method: "POST",
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
}

describe("POST /order/payment/failure (PayU browser return)", () => {
  it("redirects to the non-authoritative result page with status=failure", async () => {
    const res = await POST(postRequest("https://storefront.example.com/order/payment/failure", { txnid: "PAY-000789-1a2b3c4d5e", udf1: "9", status: "failure" }));
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/order/payment/result");
    expect(location.searchParams.get("status")).toBe("failure");
    expect(location.searchParams.get("txnid")).toBe("PAY-000789-1a2b3c4d5e");
    expect(location.searchParams.get("orderId")).toBe("9");
  });

  it("never sets status to anything but 'failure' regardless of PayU's own posted status field", async () => {
    const res = await POST(postRequest("https://storefront.example.com/order/payment/failure", { txnid: "PAY-000789-1a2b3c4d5e", udf1: "9", status: "success" }));
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("status")).toBe("failure");
  });

  it("drops an old-format pure-digit txnid — generatePayuTxnId always appends a random hex suffix now", async () => {
    const res = await POST(postRequest("https://storefront.example.com/order/payment/failure", { txnid: "PAY-000789", udf1: "9", status: "failure" }));
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("txnid")).toBeNull();
  });
});
