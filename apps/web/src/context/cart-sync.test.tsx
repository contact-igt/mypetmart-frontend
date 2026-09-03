// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { CartProvider, useCart } from "@/context/cart-context";
import type { Cart } from "@/types/storefront";

let mockAuthStatus = "unauthenticated";
let mockAccessToken: string | null = null;
vi.mock("@/context/customer-auth-context", () => ({
  useCustomerAuth: () => ({
    status: mockAuthStatus,
    accessToken: mockAccessToken,
    customer: mockAuthStatus === "authenticated" ? { id: 1, name: "Test Customer" } : null,
  }),
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

const emptyCart: Cart = { id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] };
const loadedCart: Cart = {
  id: 42,
  status: "active",
  itemCount: 2,
  subtotal: "998.00",
  items: [
    {
      cartItemId: 1, productId: 101, variantId: null, productName: "Dog Collar", productSlug: "dog-collar",
      productType: "simple", sku: "C-1", variantName: null, image: null, price: "499.00", compareAtPrice: null,
      quantity: 2, subtotal: "998.00", available: true, availabilityReason: null, availableQuantity: 10,
    },
  ],
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as any;
}

function countCartGets(mock: ReturnType<typeof vi.fn>): number {
  return mock.mock.calls.filter(
    (c) => String(c[0]).includes("/storefront/cart") && !String(c[0]).includes("/merge") && (!c[1] || c[1].method === "GET" || c[1].method === undefined)
  ).length;
}

function Consumer() {
  const { cart, syncState, isCartAuthoritative, revalidate, refresh, markAuthoritativelyEmpty, applyServerCart } = useCart();
  return (
    <div>
      <span data-testid="sync">{syncState}</span>
      <span data-testid="authoritative">{String(isCartAuthoritative)}</span>
      <span data-testid="count">{cart.itemCount}</span>
      <button data-testid="revalidate" onClick={() => void revalidate("test")}>revalidate</button>
      <button data-testid="refresh" onClick={() => void refresh()}>refresh</button>
      <button data-testid="empty" onClick={() => markAuthoritativelyEmpty()}>empty</button>
      <button data-testid="apply" onClick={() => applyServerCart(loadedCart)}>apply</button>
    </div>
  );
}

let now = 1_700_000_000_000;

describe("CartProvider — authoritative sync state", () => {
  beforeEach(() => {
    now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    mockAuthStatus = "unauthenticated";
    mockAccessToken = null;
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("a successful load is authoritative (syncState ready)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: loadedCart })));
    await act(async () => {
      render(<CartProvider><Consumer /></CartProvider>);
    });
    await waitFor(() => {
      expect(screen.getByTestId("sync")).toHaveTextContent("ready");
      expect(screen.getByTestId("authoritative")).toHaveTextContent("true");
      expect(screen.getByTestId("count")).toHaveTextContent("2");
    });
  });

  it("a failed refresh is NOT an empty cart — items preserved, state stale, not authoritative", async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      call += 1;
      if (call === 1) return jsonResponse({ success: true, data: loadedCart });
      return jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "boom" } }, false, 500);
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<CartProvider><Consumer /></CartProvider>);
    });
    await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));

    now += 5000;
    await act(async () => {
      fireEvent.click(screen.getByTestId("refresh"));
    });

    await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("stale"));
    // Never fabricated as empty; still 2 items, but no longer authoritative.
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("authoritative")).toHaveTextContent("false");
  });

  it("never-loaded + failed load => error (not empty, not authoritative)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: false, error: { code: "X", message: "no" } }, false, 500)));
    await act(async () => {
      render(<CartProvider><Consumer /></CartProvider>);
    });
    await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("error"));
    expect(screen.getByTestId("authoritative")).toHaveTextContent("false");
  });

  it("revalidate() inside the freshness window makes no extra request", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: emptyCart }));
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => {
      render(<CartProvider><Consumer /></CartProvider>);
    });
    await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));
    const baseline = countCartGets(fetchMock);

    // now unchanged => still fresh
    await act(async () => {
      fireEvent.click(screen.getByTestId("revalidate"));
      fireEvent.click(screen.getByTestId("revalidate"));
    });
    expect(countCartGets(fetchMock)).toBe(baseline);
  });

  it("window focus + visibilitychange after the freshness window collapse into ONE refetch", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: emptyCart }));
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => {
      render(<CartProvider><Consumer /></CartProvider>);
    });
    await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));
    const baseline = countCartGets(fetchMock);

    now += 5000;
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => expect(countCartGets(fetchMock)).toBe(baseline + 1));
    // Give any stray second request a chance to appear.
    await act(async () => { await Promise.resolve(); });
    expect(countCartGets(fetchMock)).toBe(baseline + 1);
  });

  it("a remote cart invalidation triggers an authoritative refetch and is not re-broadcast", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: emptyCart }));
    vi.stubGlobal("fetch", fetchMock);
    const setItemSpy = vi.spyOn(window.localStorage.__proto__, "setItem");

    await act(async () => {
      render(<CartProvider><Consumer /></CartProvider>);
    });
    await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));
    const baseline = countCartGets(fetchMock);
    setItemSpy.mockClear();

    await act(async () => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "mypetmart:cart-invalidated",
          newValue: JSON.stringify({ type: "cart-invalidated", source: "cod-confirmed", timestamp: now, tabId: "another-tab" }),
        })
      );
    });

    await waitFor(() => expect(countCartGets(fetchMock)).toBe(baseline + 1));
    // Reacting to an invalidation must NOT write a new invalidation ping.
    expect(setItemSpy).not.toHaveBeenCalledWith("mypetmart:cart-invalidated", expect.anything());
  });

  it("markAuthoritativelyEmpty() clears the cart as an authoritative empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: loadedCart })));
    await act(async () => {
      render(<CartProvider><Consumer /></CartProvider>);
    });
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));

    await act(async () => {
      fireEvent.click(screen.getByTestId("empty"));
    });
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("sync")).toHaveTextContent("ready");
    expect(screen.getByTestId("authoritative")).toHaveTextContent("true");
  });

  it("removes its focus / visibility / storage listeners on unmount", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: emptyCart })));
    const removeWin = vi.spyOn(window, "removeEventListener");
    const removeDoc = vi.spyOn(document, "removeEventListener");

    let unmount!: () => void;
    await act(async () => {
      const result = render(<CartProvider><Consumer /></CartProvider>);
      unmount = result.unmount;
    });
    await waitFor(() => expect(screen.getByTestId("sync")).toHaveTextContent("ready"));

    act(() => unmount());

    expect(removeWin).toHaveBeenCalledWith("focus", expect.any(Function));
    expect(removeWin).toHaveBeenCalledWith("pageshow", expect.any(Function));
    expect(removeDoc).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(removeWin).toHaveBeenCalledWith("storage", expect.any(Function));
  });
});
