// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CartProvider, useCart } from "@/context/cart-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { CartClient } from "./cart-client";
import { SiteHeader } from "@/components/site-header";
import { MobileNavPanel } from "@/components/mobile-nav-panel";
import { ProductDetailClient } from "../products/[slug]/product-detail";
import type { Cart, ProductDetail } from "@/types/storefront";
import { act } from "react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  usePathname: () => "/cart",
}));

// Mock customer auth
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

const mockEmptyCart: Cart = {
  id: null,
  status: "active",
  itemCount: 0,
  subtotal: "0.00",
  items: [],
};

const mockLoadedCart: Cart = {
  id: 42,
  status: "active",
  itemCount: 3,
  subtotal: "1497.00",
  items: [
    {
      cartItemId: 1,
      productId: 101,
      variantId: null,
      productName: "Comfort Dog Collar",
      productSlug: "comfort-dog-collar",
      productType: "simple",
      sku: "COLLAR-SIMPLE",
      variantName: null,
      image: { url: "https://r2.example.com/collar.jpg", alt: "Collar" },
      price: "499.00",
      compareAtPrice: "599.00",
      quantity: 1,
      subtotal: "499.00",
      available: true,
      availabilityReason: null,
      availableQuantity: 10,
    },
    {
      cartItemId: 2,
      productId: 102,
      variantId: 202,
      productName: "Premium Dog Food",
      productSlug: "premium-dog-food",
      productType: "variant",
      sku: "FOOD-10KG",
      variantName: "10kg Pack",
      image: null, // missing image test
      price: "499.00",
      compareAtPrice: null,
      quantity: 2,
      subtotal: "998.00",
      available: true,
      availabilityReason: null,
      availableQuantity: 5,
    },
  ],
};

const mockProductDetail: ProductDetail = {
  id: 101,
  name: "Comfort Dog Collar",
  slug: "comfort-dog-collar",
  sku: "COLLAR-SIMPLE",
  description: "Collar description.",
  petType: "dog",
  price: "499.00",
  compareAtPrice: "599.00",
  stock: 10,
  hasVariants: false,
  featured: false,
  inStock: true,
  category: { id: 1, name: "Dog Essentials", slug: "dog-essentials", petType: "dog" },
  primaryImage: null,
  tags: [],
  metaTitle: null,
  metaDescription: null,
  weightGrams: null,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  variants: [],
  images: [],
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as any;
}

// Simple test consumer component
function TestCartConsumer() {
  const { cart, add, update, remove, clear, refresh } = useCart();
  return (
    <div>
      <span data-testid="cart-id">{cart.id === null ? "null" : cart.id}</span>
      <span data-testid="item-count">{cart.itemCount}</span>
      <button onClick={() => add(101, 1)} data-testid="add-btn">Add</button>
      <button onClick={() => update(1, 3)} data-testid="update-btn">Update</button>
      <button onClick={() => remove(1)} data-testid="remove-btn">Remove</button>
      <button onClick={() => clear()} data-testid="clear-btn">Clear</button>
      <button onClick={() => refresh()} data-testid="refresh-btn">Refresh</button>
    </div>
  );
}

describe("Cart Context & API Actions", () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart")) {
        if (urlStr.includes("/merge") && init?.method === "POST") {
          return jsonResponse({
            success: true,
            data: {
              cart: mockEmptyCart,
              mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] },
            },
          });
        }
        if (init?.method === "GET") {
          return jsonResponse({ success: true, data: mockEmptyCart });
        }
      }
      return jsonResponse({ success: true, data: {} });
    });
    vi.stubGlobal("fetch", fetchMock);
    mockAuthStatus = "unauthenticated";
    mockAccessToken = null;
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. GET Cart loads guest Cart on startup", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: mockEmptyCart }));

    await act(async () => {
      render(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("cart-id")).toHaveTextContent("null");
      expect(screen.getByTestId("item-count")).toHaveTextContent("0");
    });

    const calls = vi.mocked(fetch).mock.calls;
    expect(calls[0]![0].toString()).toContain("/storefront/cart");
  });

  it("2. Empty Cart id:null is accepted", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: mockEmptyCart }));

    render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("cart-id")).toHaveTextContent("null");
    });
  });

  it("3. Add updates shared Cart state immediately", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockEmptyCart })) // initial GET
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart })); // POST addItem

    render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    const addBtn = await screen.findByTestId("add-btn");
    await act(async () => {
      fireEvent.click(addBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId("cart-id")).toHaveTextContent("42");
      expect(screen.getByTestId("item-count")).toHaveTextContent("3");
    });
  });

  it("4. Update updates shared Cart state immediately", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart })) // initial GET
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ...mockLoadedCart, itemCount: 5 } })); // PATCH updateItem

    render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    const updateBtn = await screen.findByTestId("update-btn");
    await act(async () => {
      fireEvent.click(updateBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("5");
    });
  });

  it("5. Remove updates shared Cart state immediately", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart })) // initial GET
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ...mockLoadedCart, itemCount: 2, items: [mockLoadedCart.items[1]] } })); // DELETE removeItem

    render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    const removeBtn = await screen.findByTestId("remove-btn");
    await act(async () => {
      fireEvent.click(removeBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("2");
    });
  });

  it("6. Clear updates shared Cart state immediately", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart })) // initial GET
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockEmptyCart })); // DELETE clearCart

    render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    const clearBtn = await screen.findByTestId("clear-btn");
    await act(async () => {
      fireEvent.click(clearBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("0");
    });
  });

  it("7 & 8 & 9. Auth transition triggers merge, replaces local Cart, and does not loop repeatedly", async () => {
    // Stub fetch dynamically to return mockEmptyCart for GET and mockLoadedCart for merge POST
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart/merge") && init?.method === "POST") {
        return jsonResponse({
          success: true,
          data: {
            cart: mockLoadedCart,
            mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] },
          },
        });
      }
      if (urlStr.includes("/storefront/cart") && init?.method === "GET") {
        return jsonResponse({ success: true, data: mockEmptyCart });
      }
      return jsonResponse({ success: true, data: {} });
    });

    const { rerender } = render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("0");
    });

    // Mock transition to authenticated
    mockAuthStatus = "authenticated";
    mockAccessToken = "mock-jwt-token";

    await act(async () => {
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("3");
    });

    // Trigger another render — merge should NOT be called again since accessToken is unchanged
    await act(async () => {
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    // Total fetches should be 2: 1 initial getCart + 1 merge.
    const calls = vi.mocked(fetch).mock.calls;
    const mergeCallsCount = calls.filter((c) => c[0].toString().includes("/storefront/cart/merge")).length;
    expect(mergeCallsCount).toBe(1);
  });

  it("A. clears the previous customer's Cart synchronously on logout, before the guest Cart fetch resolves", async () => {
    let resolveGuestFetch!: (value: unknown) => void;
    const pendingGuestFetch = new Promise((resolve) => {
      resolveGuestFetch = resolve;
    });

    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart/merge") && init?.method === "POST") {
        return jsonResponse({ success: true, data: { cart: mockLoadedCart, mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] } } });
      }
      if (urlStr.includes("/storefront/cart") && init?.method === "GET") {
        // Simulate an in-flight guest fetch that has not resolved yet.
        return pendingGuestFetch as Promise<ReturnType<typeof jsonResponse>>;
      }
      return jsonResponse({ success: true, data: {} });
    });

    // Start authenticated, with a loaded Cart already in state.
    mockAuthStatus = "authenticated";
    mockAccessToken = "customer-a-token";
    const { rerender } = render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("3");
    });

    // Log out: auth status transitions away from "authenticated".
    mockAuthStatus = "unauthenticated";
    mockAccessToken = null;
    act(() => {
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    // The Cart must already be empty here — the guest fetch is still pending (unresolved).
    expect(screen.getByTestId("item-count")).toHaveTextContent("0");
    expect(screen.getByTestId("cart-id")).toHaveTextContent("null");

    // Clean up the pending promise so it doesn't leak into the next test.
    resolveGuestFetch(jsonResponse({ success: true, data: mockEmptyCart }));
    await waitFor(() => {});
  });

  it("B. loads the guest Cart once the post-logout fetch resolves", async () => {
    const guestCartAfterLogout: Cart = { ...mockEmptyCart, id: 7, itemCount: 1, items: [mockLoadedCart.items[0]] };

    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart/merge") && init?.method === "POST") {
        return jsonResponse({ success: true, data: { cart: mockLoadedCart, mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] } } });
      }
      if (urlStr.includes("/storefront/cart") && init?.method === "GET") {
        return jsonResponse({ success: true, data: guestCartAfterLogout });
      }
      return jsonResponse({ success: true, data: {} });
    });

    mockAuthStatus = "authenticated";
    mockAccessToken = "customer-a-token";
    const { rerender } = render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("3");
    });

    mockAuthStatus = "unauthenticated";
    mockAccessToken = null;
    await act(async () => {
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("cart-id")).toHaveTextContent("7");
      expect(screen.getByTestId("item-count")).toHaveTextContent("1");
    });
  });

  it("C. never lets the previous customer's items reappear if the post-logout guest fetch fails", async () => {
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart/merge") && init?.method === "POST") {
        return jsonResponse({ success: true, data: { cart: mockLoadedCart, mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] } } });
      }
      if (urlStr.includes("/storefront/cart") && init?.method === "GET") {
        return jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "boom" } }, false, 500);
      }
      return jsonResponse({ success: true, data: {} });
    });

    mockAuthStatus = "authenticated";
    mockAccessToken = "customer-a-token";
    const { rerender } = render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("3");
    });

    mockAuthStatus = "unauthenticated";
    mockAccessToken = null;
    await act(async () => {
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    // Guest fetch failed — Cart must remain empty, never falling back to Customer A's stale items.
    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("0");
      expect(screen.getByTestId("cart-id")).toHaveTextContent("null");
    });
  });

  it("D. Header badge shows zero immediately on logout, before the guest Cart fetch resolves", async () => {
    let resolveGuestFetch!: (value: unknown) => void;
    const pendingGuestFetch = new Promise((resolve) => {
      resolveGuestFetch = resolve;
    });

    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart/merge") && init?.method === "POST") {
        return jsonResponse({ success: true, data: { cart: mockLoadedCart, mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] } } });
      }
      if (urlStr.includes("/storefront/cart") && init?.method === "GET") {
        return pendingGuestFetch as Promise<ReturnType<typeof jsonResponse>>;
      }
      return jsonResponse({ success: true, data: {} });
    });

    mockAuthStatus = "authenticated";
    mockAccessToken = "customer-a-token";
    const { rerender } = render(
      <CartProvider>
        <SiteHeader />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText("3")[0]).toBeInTheDocument();
    });

    mockAuthStatus = "unauthenticated";
    mockAccessToken = null;
    act(() => {
      rerender(
        <CartProvider>
          <SiteHeader />
        </CartProvider>
      );
    });

    expect(screen.queryByText("3")).not.toBeInTheDocument();

    resolveGuestFetch(jsonResponse({ success: true, data: mockEmptyCart }));
    await waitFor(() => {});
  });

  it("E. guest Add-to-Cart still works after logout", async () => {
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart/merge") && init?.method === "POST") {
        return jsonResponse({ success: true, data: { cart: mockLoadedCart, mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] } } });
      }
      if (urlStr.includes("/storefront/cart/items") && init?.method === "POST") {
        return jsonResponse({ success: true, data: { ...mockEmptyCart, id: 9, itemCount: 1 } });
      }
      if (urlStr.includes("/storefront/cart") && init?.method === "GET") {
        return jsonResponse({ success: true, data: mockEmptyCart });
      }
      return jsonResponse({ success: true, data: {} });
    });

    mockAuthStatus = "authenticated";
    mockAccessToken = "customer-a-token";
    const { rerender } = render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("3");
    });

    mockAuthStatus = "unauthenticated";
    mockAccessToken = null;
    await act(async () => {
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("0");
    });

    const addBtn = screen.getByTestId("add-btn");
    await act(async () => {
      fireEvent.click(addBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("1");
    });
  });

  it("F. signing in again after logout still triggers exactly one merge call", async () => {
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart/merge") && init?.method === "POST") {
        return jsonResponse({ success: true, data: { cart: mockLoadedCart, mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] } } });
      }
      if (urlStr.includes("/storefront/cart") && init?.method === "GET") {
        return jsonResponse({ success: true, data: mockEmptyCart });
      }
      return jsonResponse({ success: true, data: {} });
    });

    // Customer A authenticated, then logs out.
    mockAuthStatus = "authenticated";
    mockAccessToken = "customer-a-token";
    const { rerender } = render(
      <CartProvider>
        <TestCartConsumer />
      </CartProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("3");
    });

    mockAuthStatus = "unauthenticated";
    mockAccessToken = null;
    await act(async () => {
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("0");
    });

    // A different customer (or the same one) signs back in with a new token.
    mockAuthStatus = "authenticated";
    mockAccessToken = "customer-b-token";
    await act(async () => {
      rerender(
        <CartProvider>
          <TestCartConsumer />
        </CartProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("item-count")).toHaveTextContent("3");
    });

    // Merge must fire once per distinct authenticated session: once for the first
    // sign-in, and again for the sign-in after logout — the logout reset must not
    // leave behind any ref state that incorrectly suppresses the second merge.
    const calls = vi.mocked(fetch).mock.calls;
    const mergeCallsCount = calls.filter((c) => c[0].toString().includes("/storefront/cart/merge")).length;
    expect(mergeCallsCount).toBe(2);
  });
});

describe("Cart UI Components", () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart")) {
        if (urlStr.includes("/merge") && init?.method === "POST") {
          return jsonResponse({
            success: true,
            data: {
              cart: mockEmptyCart,
              mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] },
            },
          });
        }
        if (init?.method === "GET") {
          return jsonResponse({ success: true, data: mockEmptyCart });
        }
      }
      return jsonResponse({ success: true, data: {} });
    });
    vi.stubGlobal("fetch", fetchMock);
    mockAuthStatus = "unauthenticated";
    mockAccessToken = null;
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("10. Empty Cart renders friendly empty state", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: mockEmptyCart }));

    render(
      <CartProvider>
        <CartClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Your cart is waiting for something pawsome.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Continue Shopping" })).toHaveAttribute("href", "/shop");
    });
  });

  it("11 & 12. Loaded Simple Product line and Variant Product line render correctly", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart }));

    render(
      <CartProvider>
        <CartClient />
      </CartProvider>
    );

    await waitFor(() => {
      // Simple product
      expect(screen.getByText("Comfort Dog Collar")).toBeInTheDocument();
      expect(screen.getByText("SKU: COLLAR-SIMPLE")).toBeInTheDocument();
      // Variant product
      expect(screen.getByText("Premium Dog Food")).toBeInTheDocument();
      expect(screen.getByText("Option: 10kg Pack")).toBeInTheDocument();
      expect(screen.getByText("SKU: FOOD-10KG")).toBeInTheDocument();
    });
  });

  it("13 & 14 & 15. Header badge uses itemCount, desktop link works, and mobile link works", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart }));

    render(
      <CartProvider>
        <SiteHeader />
        <MobileNavPanel open={true} onClose={vi.fn()} />
      </CartProvider>
    );

    await waitFor(() => {
      // Desktop link and badge
      const desktopCartLink = screen.getAllByRole("link", { name: "Cart, 3 items" })[0];
      expect(desktopCartLink).toHaveAttribute("href", "/cart");
      expect(screen.getAllByText("3")[0]).toBeInTheDocument(); // Badge count

      // Mobile link and badge
      const mobileCartLink = screen.getAllByRole("link", { name: "Cart, 3 items" })[1];
      expect(mobileCartLink).toHaveAttribute("href", "/cart");
    });
  });

  it("16. Quantity decrement stops at 1", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart }));

    render(
      <CartProvider>
        <CartClient />
      </CartProvider>
    );

    await waitFor(() => {
      // Find the decrease quantity button for the first item (Comfort Dog Collar, quantity is 1)
      const decreaseBtns = screen.getAllByRole("button", { name: /Decrease quantity/i });
      expect(decreaseBtns[0]).toBeDisabled();
    });
  });

  it("17. Quantity update calls correct cartItemId", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart })) // initial load
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { ...mockLoadedCart, itemCount: 4 } })); // PATCH update

    render(
      <CartProvider>
        <CartClient />
      </CartProvider>
    );

    await waitFor(() => {
      const increaseBtns = screen.getAllByRole("button", { name: /Increase quantity/i });
      fireEvent.click(increaseBtns[0]); // Increase quantity of first item (cartItemId: 1)
    });

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const patchCall = calls.find((call) => call[0].toString().includes("/storefront/cart/items/1") && call[1]?.method === "PATCH");
      expect(patchCall).toBeDefined();
    });
  });

  it("18. Remove calls correct cartItemId", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart })) // initial load
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockEmptyCart })); // DELETE remove

    render(
      <CartProvider>
        <CartClient />
      </CartProvider>
    );

    await waitFor(() => {
      const removeBtns = screen.getAllByRole("button", { name: /Remove/i });
      fireEvent.click(removeBtns[0]); // Remove first item (cartItemId: 1)
    });

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const deleteCall = calls.find((call) => call[0].toString().includes("/storefront/cart/items/1") && call[1]?.method === "DELETE");
      expect(deleteCall).toBeDefined();
    });
  });

  it("19. Clear Cart uses one clear request", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: mockEmptyCart })); // DELETE clear

    render(
      <CartProvider>
        <CartClient />
      </CartProvider>
    );

    await waitFor(() => {
      const clearBtn = screen.getByRole("button", { name: /Clear Cart/i });
      fireEvent.click(clearBtn);
    });

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const clearCall = calls.find((call) => call[0].toString().endsWith("/storefront/cart/items") && call[1]?.method === "DELETE");
      expect(clearCall).toBeDefined();
    });
  });

  it("20 & 21 & 22. Availability warning messages render", async () => {
    const unavailableCart: Cart = {
      id: 42,
      status: "active",
      itemCount: 3,
      subtotal: "1497.00",
      items: [
        {
          ...mockLoadedCart.items[0],
          available: false,
          availabilityReason: "PRODUCT_UNAVAILABLE",
        },
        {
          ...mockLoadedCart.items[1],
          available: false,
          availabilityReason: "VARIANT_UNAVAILABLE",
        },
        {
          cartItemId: 3,
          productId: 103,
          variantId: null,
          productName: "Dog Grooming Brush",
          productSlug: "dog-grooming-brush",
          productType: "simple",
          sku: "BRUSH-SIMPLE",
          variantName: null,
          image: null,
          price: "100.00",
          compareAtPrice: null,
          quantity: 1,
          subtotal: "100.00",
          available: false,
          availabilityReason: "OUT_OF_STOCK",
          availableQuantity: 0,
        },
      ],
    };

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: unavailableCart }));

    render(
      <CartProvider>
        <CartClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("This product is no longer available.")).toBeInTheDocument();
      expect(screen.getByText("This option is no longer available.")).toBeInTheDocument();
      expect(screen.getByText("Out of stock.")).toBeInTheDocument();
    });
  });

  it("23. Missing image uses ProductImagePlaceholder", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart }));

    render(
      <CartProvider>
        <CartClient />
      </CartProvider>
    );

    await waitFor(() => {
      // Premium Dog Food has image: null
      expect(screen.getByRole("img", { name: "Premium Dog Food - Image coming soon" })).toBeInTheDocument();
    });
  });

  it("24. Broken image fallback works", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart }));

    render(
      <CartProvider>
        <CartClient />
      </CartProvider>
    );

    const img = await screen.findByAltText("Collar");
    fireEvent.error(img); // Trigger onError handler

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Comfort Dog Collar - Image coming soon" })).toBeInTheDocument();
    });
  });

  it("25. Cart subtotal uses Backend value directly", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: mockLoadedCart }));

    render(
      <CartProvider>
        <CartClient />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("₹1,497")).toBeInTheDocument(); // matches subtotal "1497.00"
    });
  });

  it("26 & 27. Checkout locks for unavailable lines, and unlocks for valid non-empty carts", async () => {
    const unavailableCart: Cart = {
      id: 42,
      status: "active",
      itemCount: 1,
      subtotal: "499.00",
      items: [
        {
          ...mockLoadedCart.items[0],
          available: false,
          availabilityReason: "PRODUCT_UNAVAILABLE",
        },
      ],
    };

    let cartResponse = mockLoadedCart;
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      if (String(url).includes("/storefront/cart") && init?.method === "GET") {
        return jsonResponse({ success: true, data: cartResponse });
      }
      return jsonResponse({ success: true, data: {} });
    });

    render(
      <CartProvider>
        <TestCartConsumer />
        <CartClient />
      </CartProvider>
    );

    await waitFor(() => {
      const checkoutLink = screen.getByRole("link", { name: /Proceed to Checkout/i });
      expect(checkoutLink).not.toHaveAttribute("aria-disabled", "true");
    });

    // Update response to return unavailable items, then trigger refresh/re-render
    cartResponse = unavailableCart;
    const refreshBtn = screen.getByTestId("refresh-btn");
    await act(async () => {
      fireEvent.click(refreshBtn);
    });

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Proceed to Checkout/i })).toHaveAttribute("aria-disabled", "true");
    });
  });

  it("28. Product Detail Add updates Cart context/header count", async () => {
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart/items") && init?.method === "POST") {
        return jsonResponse({ success: true, data: mockLoadedCart });
      }
      if (urlStr.includes("/storefront/cart") && init?.method === "GET") {
        return jsonResponse({ success: true, data: mockEmptyCart });
      }
      return jsonResponse({ success: true, data: {} });
    });

    render(
      <WishlistProvider>
        <CartProvider>
          <SiteHeader />
          <ProductDetailClient product={mockProductDetail} />
        </CartProvider>
      </WishlistProvider>
    );

    const addToCartButton = await screen.findByRole("button", { name: /Add to Cart/i });
    await act(async () => {
      fireEvent.click(addToCartButton);
    });

    await waitFor(() => {
      // Header count updates
      expect(screen.getAllByText("3")[0]).toBeInTheDocument();
    });
  });
});


