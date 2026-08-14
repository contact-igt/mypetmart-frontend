// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OrderApi } from "./order-api";
import { AuthTokenStore } from "./auth/auth-api";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

describe("OrderApi Helper Tests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. OrderApi.create preserves guest session credentials (credentials: include)", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 101,
          orderNumber: "ORD-000101",
          status: "pending",
          paymentStatus: "pending",
          fulfilmentStatus: "unfulfilled",
          subtotal: "499.00",
          shippingFee: "0.00",
          total: "499.00",
          shippingAddress: {
            recipientName: "Guest User",
            phone: "+91 98765 43210",
            line1: "123 Street",
            line2: null,
            city: "Mumbai",
            state: "MH",
            postalCode: "400001",
            country: "IN",
            latitude: null,
            longitude: null,
          },
          items: [],
          createdAt: "2026-08-13T00:00:00Z",
          updatedAt: "2026-08-13T00:00:00Z",
        },
      }),
    } as any);

    const result = await OrderApi.create({
      shippingAddress: {
        recipientName: "Guest User",
        phone: "+91 98765 43210",
        line1: "123 Street",
        city: "Mumbai",
        state: "MH",
        postalCode: "400001",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:5000/api/v1/storefront/orders");
    expect(options?.credentials).toBe("include");
    expect(result.orderNumber).toBe("ORD-000101");
  });

  it("2. OrderApi.create attaches Bearer token for authenticated customer", async () => {
    AuthTokenStore.setAccessToken("customer-jwt-token");

    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 102,
          orderNumber: "ORD-000102",
          status: "pending",
          paymentStatus: "pending",
          fulfilmentStatus: "unfulfilled",
          subtotal: "999.00",
          shippingFee: "0.00",
          total: "999.00",
          shippingAddress: {
            recipientName: "Customer User",
            phone: "+91 98765 43210",
            line1: "456 Avenue",
            line2: null,
            city: "Pune",
            state: "MH",
            postalCode: "411001",
            country: "IN",
            latitude: null,
            longitude: null,
          },
          items: [],
          createdAt: "2026-08-13T00:00:00Z",
          updatedAt: "2026-08-13T00:00:00Z",
        },
      }),
    } as any);

    const result = await OrderApi.create({ savedAddressId: 42 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer customer-jwt-token");
    expect(result.orderNumber).toBe("ORD-000102");
  });

  it("3. OrderApi.list calls GET /storefront/orders with query parameters and auth header", async () => {
    AuthTokenStore.setAccessToken("customer-jwt-token");

    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          items: [
            {
              id: 101,
              orderNumber: "ORD-000101",
              status: "pending",
              paymentStatus: "pending",
              fulfilmentStatus: "unfulfilled",
              subtotal: "499.00",
              shippingFee: "0.00",
              total: "499.00",
              currency: "INR",
              itemCount: 2,
              placedAt: "2026-08-13T00:00:00Z",
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        },
      }),
    } as any);

    const result = await OrderApi.list({ page: 1, pageSize: 10 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:5000/api/v1/storefront/orders?page=1&pageSize=10");
    const headers = options?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer customer-jwt-token");
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("4. OrderApi.getOrder calls GET /storefront/orders/:id and unwraps order detail", async () => {
    AuthTokenStore.setAccessToken("customer-jwt-token");

    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 202,
          orderNumber: "ORD-000202",
          status: "confirmed",
          paymentStatus: "paid",
          fulfilmentStatus: "processing",
          subtotal: "1200.00",
          shippingFee: "50.00",
          total: "1250.00",
          currency: "INR",
          itemCount: 1,
          placedAt: "2026-08-13T00:00:00Z",
          createdAt: "2026-08-13T00:00:00Z",
          updatedAt: "2026-08-13T00:00:00Z",
          cancelledAt: null,
          shippingAddress: {
            recipientName: "Jane Doe",
            phone: "+91 98765 00000",
            line1: "789 High St",
            line2: null,
            city: "Bangalore",
            state: "KA",
            postalCode: "560001",
            country: "IN",
            latitude: null,
            longitude: null,
          },
          items: [
            {
              id: 1,
              productId: 10,
              variantId: 20,
              productName: "Premium Dog Kibble",
              productSku: "KIB-001",
              variantName: "5kg Pack",
              variantSku: "KIB-5KG",
              productImage: "https://example.com/kibble.jpg",
              quantity: 1,
              unitPrice: "1200.00",
              lineTotal: "1200.00",
            },
          ],
        },
      }),
    } as any);

    const result = await OrderApi.getOrder(202);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:5000/api/v1/storefront/orders/202");
    expect(result.id).toBe(202);
    expect(result.items[0].variantName).toBe("5kg Pack");
  });

  it("5. OrderApi handles API errors by throwing AppAuthError", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        error: {
          code: "ORDER_NOT_FOUND",
          message: "Order '999' was not found.",
        },
      }),
    } as any);

    await expect(OrderApi.getOrder(999)).rejects.toThrow("Order '999' was not found.");
  });
});
