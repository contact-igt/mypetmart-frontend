import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST, GET } from "./route";

function postRequest(url: string, form: Record<string, string>): NextRequest {
  const body = new URLSearchParams(form).toString();
  return new NextRequest(url, {
    method: "POST",
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
}

describe("POST /order/payment/success (PayU browser return)", () => {
  it("redirects to the non-authoritative result page with status=success", async () => {
    const res = await POST(postRequest("https://storefront.example.com/order/payment/success", { txnid: "PAY-000123-1a2b3c4d5e", udf1: "42", status: "success" }));
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/order/payment/result");
    expect(location.searchParams.get("status")).toBe("success");
    expect(location.searchParams.get("txnid")).toBe("PAY-000123-1a2b3c4d5e");
    expect(location.searchParams.get("orderId")).toBe("42");
  });

  it("never sets status to anything but 'success' regardless of PayU's own posted status field", async () => {
    // PayU's posted body is untrusted; this route decides "success" purely
    // by which URL it is (surl), never by echoing PayU's own status field.
    const res = await POST(postRequest("https://storefront.example.com/order/payment/success", { txnid: "PAY-000123-1a2b3c4d5e", udf1: "42", status: "failure" }));
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("status")).toBe("success");
  });

  it("drops a malformed/forged txnid instead of reflecting it verbatim", async () => {
    const res = await POST(postRequest("https://storefront.example.com/order/payment/success", { txnid: "<script>alert(1)</script>", udf1: "42" }));
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("txnid")).toBeNull();
    expect(location.toString()).not.toContain("<script>");
  });

  it("drops a non-numeric orderId(udf1) instead of reflecting it", async () => {
    const res = await POST(postRequest("https://storefront.example.com/order/payment/success", { txnid: "PAY-000123-1a2b3c4d5e", udf1: "not-a-number" }));
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("orderId")).toBeNull();
  });

  it("drops an old-format pure-digit txnid — generatePayuTxnId always appends a random hex suffix now", async () => {
    const res = await POST(postRequest("https://storefront.example.com/order/payment/success", { txnid: "PAY-000123", udf1: "42" }));
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("txnid")).toBeNull();
  });

  it("still redirects safely when the POST body is empty/malformed", async () => {
    const req = new NextRequest("https://storefront.example.com/order/payment/success", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/order/payment/result");
    expect(location.searchParams.get("status")).toBe("success");
  });

  it("also handles a defensive GET fallback, reading fields from the query string", async () => {
    const res = await GET(new NextRequest("https://storefront.example.com/order/payment/success?txnid=PAY-000456-1a2b3c4d5e&udf1=7"));
    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("txnid")).toBe("PAY-000456-1a2b3c4d5e");
    expect(location.searchParams.get("orderId")).toBe("7");
  });
});
