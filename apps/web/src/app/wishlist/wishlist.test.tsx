// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WishlistClient } from "./wishlist-client";
import { CustomerAuthProvider } from "../../context/customer-auth-context";
import { WishlistProvider } from "../../context/wishlist-context";
import { AuthTokenStore } from "../../lib/auth/auth-api";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/wishlist",
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

function renderPage() {
  return render(
    <CustomerAuthProvider>
      <WishlistProvider>
        <WishlistClient />
      </WishlistProvider>
    </CustomerAuthProvider>
  );
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 401, json: async () => body } as any;
}

const authenticatedBootstrap = [
  jsonResponse({ success: true, data: { accessToken: "test-token" } }), // refresh
  jsonResponse({ success: true, data: { id: 5, name: "Test Customer", role: "customer" } }), // getMe
];

describe("Wishlist page", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("redirects an unauthenticated customer to /signin", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    renderPage();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/signin");
    });
  });

  it("shows the empty state with a link back to Shop when the Wishlist has no items", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(authenticatedBootstrap[0]!)
      .mockResolvedValueOnce(authenticatedBootstrap[1]!)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [] } }));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Your Wishlist is empty/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: /browse the shop/i })).toHaveAttribute("href", "/shop");
  });

  it("renders saved Products and flags an unavailable-but-in-stock item distinctly from out-of-stock", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(authenticatedBootstrap[0]!)
      .mockResolvedValueOnce(authenticatedBootstrap[1]!)
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            items: [
              {
                wishlistItemId: 1,
                createdAt: "2026-08-12T00:00:00.000Z",
                product: {
                  id: 101,
                  name: "Comfort Dog Collar",
                  slug: "comfort-dog-collar",
                  petType: "dog",
                  price: "499.00",
                  compareAtPrice: null,
                  stock: 10,
                  hasVariants: false,
                  featured: false,
                  inStock: true,
                  available: false,
                  category: { id: 1, name: "Dog Essentials", slug: "dog-essentials", petType: "dog" },
                  primaryImage: null,
                },
              },
              {
                wishlistItemId: 2,
                createdAt: "2026-08-11T00:00:00.000Z",
                product: {
                  id: 102,
                  name: "Cat Scratch Post",
                  slug: "cat-scratch-post",
                  petType: "cat",
                  price: "799.00",
                  compareAtPrice: null,
                  stock: 0,
                  hasVariants: false,
                  featured: false,
                  inStock: false,
                  available: false,
                  category: { id: 2, name: "Cat Essentials", slug: "cat-essentials", petType: "cat" },
                  primaryImage: null,
                },
              },
            ],
          },
        })
      );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Comfort Dog Collar")).toBeInTheDocument();
      expect(screen.getByText("Cat Scratch Post")).toBeInTheDocument();
    });

    // Draft/archived-style unavailability (still in stock) gets the explicit "no longer available" note.
    expect(screen.getAllByText(/no longer available/i)).toHaveLength(1);
    // Out-of-stock still uses ProductCard's existing "Out of Stock" overlay, not the unavailable note.
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it("shows an error state with a retry action when the Wishlist fails to load", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(authenticatedBootstrap[0]!)
      .mockResolvedValueOnce(authenticatedBootstrap[1]!)
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "Boom" } }, false));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Unable to load your Wishlist/i)).toBeInTheDocument();
    });

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [] } }));
    screen.getByRole("button", { name: /try again/i }).click();

    await waitFor(() => {
      expect(screen.getByText(/Your Wishlist is empty/i)).toBeInTheDocument();
    });
  });
});
