// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WishlistProvider } from "@/context/wishlist-context";
import { FeaturedProducts } from "./featured-products";
import type { PaginatedProductList, ProductListItem } from "@/types/storefront";

const mockPush = vi.fn();
const mockAddToCart = vi.fn();

vi.mock("react-slick", async () => {
  const React = await import("react");
  const MockSlider = React.forwardRef(function MockSlider(
    { children }: { children: React.ReactNode },
    ref,
  ) {
    React.useImperativeHandle(ref, () => ({ slickPrev: () => undefined, slickNext: () => undefined }));
    return <div>{children}</div>;
  });
  return {
    default: MockSlider,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

vi.mock("@/context/cart-context", () => ({
  useCart: () => ({ add: mockAddToCart }),
}));

let mockAuthStatus = "unauthenticated";
vi.mock("@/context/customer-auth-context", () => ({
  useCustomerAuth: () => ({
    status: mockAuthStatus,
    accessToken: mockAuthStatus === "authenticated" ? "mock-token" : null,
    customer: mockAuthStatus === "authenticated" ? { id: 1, name: "Test Customer" } : null,
  }),
}));

vi.mock("@/components/product-rating-badge", () => ({
  ProductRatingBadge: () => <span>4.2 (18 reviews)</span>,
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as any;
}

const simpleItem: ProductListItem = {
  id: 501,
  name: "Comfort Dog Collar",
  slug: "comfort-dog-collar",
  brand: null,
  description: "Soft everyday collar made for repeat walks and comfortable wear.",
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
  averageRating: 4.2,
  reviewCount: 18,
};

const variantItem: ProductListItem = {
  ...simpleItem,
  id: 502,
  name: "Premium Dog Food",
  slug: "premium-dog-food",
  compareAtPrice: null,
  hasVariants: true,
  primaryImage: null,
};

async function renderFeaturedProducts() {
  const jsx = await FeaturedProducts();
  return render(<WishlistProvider>{jsx}</WishlistProvider>);
}

describe("Home Best Sellers", () => {
  beforeEach(() => {
    mockAuthStatus = "unauthenticated";
    mockAddToCart.mockReset();
    mockAddToCart.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses the real newest-products query and receives the backend featured flag for selection", async () => {
    const list: PaginatedProductList = { items: [simpleItem], total: 1, page: 1, pageSize: 12, totalPages: 1 };
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: list }));
    vi.stubGlobal("fetch", fetchMock);

    await renderFeaturedProducts();

    const calledUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(calledUrl).toContain("/storefront/products");
    expect(calledUrl).toContain("sort=newest");
    expect(calledUrl).toContain("pageSize=12");
    expect(calledUrl).not.toContain("featured=true");
  });

  it("renders three real products and prefers featured items without dropping active non-featured items", async () => {
    const items = [
      { ...simpleItem, id: 701, name: "Newest non-featured", slug: "newest-non-featured", featured: false },
      { ...simpleItem, id: 702, name: "Featured product", slug: "featured-product", featured: true },
      { ...simpleItem, id: 703, name: "Another newest product", slug: "another-newest-product", featured: false },
    ];
    const list: PaginatedProductList = { items, total: 3, page: 1, pageSize: 12, totalPages: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderFeaturedProducts();

    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Featured product" })).toBeInTheDocument();
    expect(screen.getAllByText("4.2 (18 reviews)")).toHaveLength(3);
  });

  it("renders real product cards in the carousel with desktop controls", async () => {
    const items = Array.from({ length: 5 }, (_, index) => ({
      ...simpleItem,
      id: 600 + index,
      name: `Featured Item ${index + 1}`,
      slug: `featured-item-${index + 1}`,
    }));
    const list: PaginatedProductList = { items, total: 5, page: 1, pageSize: 8, totalPages: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderFeaturedProducts();

    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(screen.getByRole("region", { name: "Best sellers products" })).toHaveAttribute("aria-roledescription", "carousel");
    expect(screen.getByRole("button", { name: "Previous best seller" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next best seller" })).toBeInTheDocument();
  });

  it("keeps detail, wishlist, and add-to-cart actions on a real product", async () => {
    const list: PaginatedProductList = { items: [simpleItem], total: 1, page: 1, pageSize: 8, totalPages: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderFeaturedProducts();

    expect(screen.getAllByRole("link", { name: "Comfort Dog Collar" })[0]).toHaveAttribute("href", "/products/comfort-dog-collar");
    expect(screen.getByText("Dog Essentials")).toHaveClass("uppercase");
    expect(screen.getByText(/Soft everyday collar/i)).toHaveClass("line-clamp-2");
    expect(screen.getByText("17% OFF")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to wishlist" }));
    expect(mockPush).toHaveBeenCalledWith("/signin");

    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    await waitFor(() => expect(mockAddToCart).toHaveBeenCalledWith(501, 1));
  });

  it("renders a variant price with a product-detail options action and the image fallback", async () => {
    const list: PaginatedProductList = { items: [variantItem], total: 1, page: 1, pageSize: 8, totalPages: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderFeaturedProducts();

    expect(screen.getByText("Starts at ₹499")).toBeInTheDocument();
    expect(screen.getByText("Multiple variants available")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Premium Dog Food - Image coming soon" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Options" })).toHaveAttribute("href", "/products/premium-dog-food");
  });

  it("shows an error state with a Retry action when the featured-products fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "boom" } }, false, 500)));

    await renderFeaturedProducts();

    expect(screen.getByText("Unable to load products. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("recovers into the real product grid after a successful Retry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "boom" } }, false, 500)));

    await renderFeaturedProducts();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    const list: PaginatedProductList = { items: [simpleItem], total: 1, page: 1, pageSize: 8, totalPages: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Pet parent favourites" })).toBeInTheDocument();
    });
    expect(screen.queryByText("Unable to load products. Please try again.")).not.toBeInTheDocument();
  });

  it("hides the section for a genuinely empty (not failed) product result", async () => {
    const list: PaginatedProductList = { items: [], total: 0, page: 1, pageSize: 12, totalPages: 0 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    const emptyView = await renderFeaturedProducts();

    expect(emptyView.container).not.toBeEmptyDOMElement();
    expect(screen.getByText("New products are coming soon.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse the shop" })).toHaveAttribute("href", "/shop");
  });

  it("renders the supplied section heading and all-products link", async () => {
    const list: PaginatedProductList = { items: [simpleItem], total: 1, page: 1, pageSize: 8, totalPages: 1 };
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderFeaturedProducts();

    expect(screen.getByRole("heading", { name: "Pet parent favourites" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See all products/i })).toHaveAttribute("href", "/shop");
  });
});
