// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WishlistProvider } from "@/context/wishlist-context";
import { FeaturedProducts } from "./featured-products";
import type { ProductListItem, PaginatedProductList } from "@/types/storefront";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => "/",
}));

let mockAuthStatus = "unauthenticated";
vi.mock("@/context/customer-auth-context", () => ({
  useCustomerAuth: () => ({
    status: mockAuthStatus,
    accessToken: mockAuthStatus === "authenticated" ? "mock-token" : null,
    customer: mockAuthStatus === "authenticated" ? { id: 1, name: "Test Customer" } : null,
  }),
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as any;
}

const simpleItem: ProductListItem = {
  id: 501,
  name: "Comfort Dog Collar",
  slug: "comfort-dog-collar",
  petType: "dog",
  price: "499.00",
  compareAtPrice: "599.00",
  stock: 10,
  hasVariants: false,
  featured: true,
  inStock: true,
  category: { id: 1, name: "Dog Essentials", slug: "dog-essentials", petType: "dog" },
  primaryImage: {
    id: 1,
    url: "https://r2.example.com/collar.jpg",
    alt: "Collar",
    contentType: "image/jpeg",
    sizeBytes: null,
    width: null,
    height: null,
    sortOrder: 0,
    isPrimary: true,
  },
};

const variantItem: ProductListItem = {
  id: 502,
  name: "Premium Dog Food",
  slug: "premium-dog-food",
  petType: "dog",
  price: "499.00",
  compareAtPrice: null,
  stock: 5,
  hasVariants: true,
  featured: false,
  inStock: true,
  category: { id: 1, name: "Dog Essentials", slug: "dog-essentials", petType: "dog" },
  primaryImage: null, // missing image
};

async function renderFeaturedProducts() {
  const jsx = await FeaturedProducts();
  return render(<WishlistProvider>{jsx}</WishlistProvider>);
}

describe("Home Featured Products (Fix 3)", () => {
  beforeEach(() => {
    mockAuthStatus = "unauthenticated";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches from the real Storefront Product API, not the mock fixture", async () => {
    const list: PaginatedProductList = { items: [simpleItem, variantItem], total: 2, page: 1, pageSize: 12, totalPages: 1 };
    const fetchMock = vi.fn(async (...args: unknown[]) => {
      void args;
      return jsonResponse({ success: true, data: list });
    });
    vi.stubGlobal("fetch", fetchMock);

    await renderFeaturedProducts();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(calledUrl).toContain("/storefront/products");
    expect(calledUrl).toContain("sort=newest");
  });

  it("renders the real numeric Product id, so the Product Detail link and Wishlist heart both work", async () => {
    const list: PaginatedProductList = { items: [simpleItem], total: 1, page: 1, pageSize: 12, totalPages: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderFeaturedProducts();

    const link = screen.getByRole("link", { name: /Comfort Dog Collar/i });
    expect(link).toHaveAttribute("href", "/products/comfort-dog-collar");

    // A real numeric id reaching ProductCard is what lets the Wishlist heart click
    // actually resolve to a navigation (a null id, as mock Products always had,
    // makes the click handler return early and do nothing at all).
    const heartButton = screen.getByRole("button", { name: /add to wishlist/i });
    fireEvent.click(heartButton);
    expect(mockPush).toHaveBeenCalledWith("/signin");
  });

  it("shows the variant aggregate 'From ₹...' price prefix for a variant Product", async () => {
    const list: PaginatedProductList = { items: [variantItem], total: 1, page: 1, pageSize: 12, totalPages: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderFeaturedProducts();

    expect(screen.getByText(/From ₹499/)).toBeInTheDocument();
  });

  it("uses ProductImagePlaceholder when a Product has no primary image", async () => {
    const list: PaginatedProductList = { items: [variantItem], total: 1, page: 1, pageSize: 12, totalPages: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderFeaturedProducts();

    expect(screen.getByRole("img", { name: "Premium Dog Food - Image coming soon" })).toBeInTheDocument();
  });

  it("does not crash the section when the Product API call fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "boom" } }, false, 500)));

    await renderFeaturedProducts();

    expect(screen.getByText(/couldn't load products right now/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse the shop/i })).toHaveAttribute("href", "/shop");
  });

  it("handles an empty result set without crashing", async () => {
    const list: PaginatedProductList = { items: [], total: 0, page: 1, pageSize: 12, totalPages: 0 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderFeaturedProducts();

    expect(screen.getByText(/New products are on their way/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse the shop/i })).toHaveAttribute("href", "/shop");
  });

  it("'See all products' links to /shop", async () => {
    const list: PaginatedProductList = { items: [simpleItem], total: 1, page: 1, pageSize: 12, totalPages: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderFeaturedProducts();

    expect(screen.getByRole("link", { name: /See all products/i })).toHaveAttribute("href", "/shop");
  });
});
