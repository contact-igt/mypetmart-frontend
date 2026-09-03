// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProductCard } from "./product-card";
import { CustomerAuthProvider } from "../context/customer-auth-context";
import { CartProvider } from "../context/cart-context";
import { WishlistProvider } from "../context/wishlist-context";
import { AuthTokenStore } from "../lib/auth/auth-api";
import type { ProductListItem } from "@/types/storefront";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  usePathname: () => "/shop",
}));

vi.mock("./product-rating-badge", () => ({
  ProductRatingBadge: ({ summary }: { summary?: { averageRating: number; reviewCount: number } }) =>
    summary ? <span data-testid="rating-summary">{`${summary.averageRating}|${summary.reviewCount}`}</span> : null,
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

const product: ProductListItem = {
  id: 101,
  name: "Comfort Dog Collar",
  slug: "comfort-dog-collar",
  brand: null,
  petType: "dog",
  price: "499.00",
  compareAtPrice: null,
  stock: 10,
  hasVariants: false,
  featured: false,
  inStock: true,
  category: { id: 1, name: "Dog Essentials", slug: "dog-essentials", petType: "dog" },
  primaryImage: null,
  averageRating: 0,
  reviewCount: 0,
};

function renderCard() {
  return render(
    <CustomerAuthProvider>
      <CartProvider>
        <WishlistProvider>
          <ProductCard product={product} />
        </WishlistProvider>
      </CartProvider>
    </CustomerAuthProvider>
  );
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 401, json: async () => body } as any;
}

describe("ProductCard wishlist heart", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("redirects a logged-out customer to /signin instead of persisting a Wishlist add", async () => {
    // Bootstrap refresh fails -> unauthenticated.
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    renderCard();

    const heart = await screen.findByRole("button", { name: /add to wishlist/i });
    heart.click();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/signin");
    });

    // Only the bootstrap refresh call should have happened — no wishlist add request.
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not trigger the card's Product Detail navigation when the heart is clicked", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    renderCard();

    const heart = await screen.findByRole("button", { name: /add to wishlist/i });
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    heart.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(true);
  });

  it("adds the Product to the Wishlist and flips the heart to filled/selected", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: "test-token" } })) // refresh
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 5, name: "Test Customer", role: "customer" } })) // getMe
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [] } })); // initial wishlist list

    renderCard();

    const heart = await screen.findByRole("button", { name: /add to wishlist/i });
    expect(heart).toHaveAttribute("aria-pressed", "false");

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        success: true,
        data: {
          items: [
            {
              wishlistItemId: 1,
              createdAt: "2026-08-12T00:00:00.000Z",
              product: { ...product, available: true },
            },
          ],
        },
      })
    );

    heart.click();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /remove from wishlist/i })).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("removes the Product from the Wishlist and flips the heart back to outline", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: "test-token" } })) // refresh
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 5, name: "Test Customer", role: "customer" } })) // getMe
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          data: {
            items: [
              {
                wishlistItemId: 1,
                createdAt: "2026-08-12T00:00:00.000Z",
                product: { ...product, available: true },
              },
            ],
          },
        })
      ); // initial wishlist list — already wishlisted

    renderCard();

    const heart = await screen.findByRole("button", { name: /remove from wishlist/i });
    expect(heart).toHaveAttribute("aria-pressed", "true");

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [] } }));

    heart.click();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add to wishlist/i })).toHaveAttribute("aria-pressed", "false");
    });
  });
});

describe("ProductCard brand label", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function renderCardWith(overrides: Partial<ProductListItem>) {
    return render(
      <CustomerAuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ProductCard product={{ ...product, ...overrides }} />
          </WishlistProvider>
        </CartProvider>
      </CustomerAuthProvider>
    );
  }

  it("shows the brand label when present", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    renderCardWith({ brand: "Royal Canin" });

    expect(await screen.findByText("Royal Canin")).toBeInTheDocument();
  });

  it("renders normally with no brand label when brand is null", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    renderCardWith({ brand: null });

    expect(await screen.findByRole("heading", { name: "Comfort Dog Collar" })).toBeInTheDocument();
    expect(screen.queryByText("Royal Canin")).not.toBeInTheDocument();
  });

  it("renders a contained product image in the responsive square frame", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    const { container } = renderCardWith({
      category: { id: 1, name: "Dog", slug: "dog", petType: "dog" },
      primaryImage: {
        id: 1,
        url: "/product.jpg",
        alt: "Full product",
        contentType: "image/jpeg",
        sizeBytes: null,
        width: 1500,
        height: 1500,
        sortOrder: 0,
        isPrimary: true,
      },
    });

    expect(await screen.findByAltText("Full product")).toHaveClass("object-contain");
    expect(container.querySelector(".aspect-square")).toBeInTheDocument();
  });

  it("uses real pricing and stock fields for the sale state and cart CTA", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    renderCardWith({ compareAtPrice: "999.00", inStock: true });

    expect(await screen.findByRole("heading", { name: "Comfort Dog Collar" })).toBeInTheDocument();
    expect(screen.getByText("-50%")).toBeInTheDocument();
    expect(screen.getByText("Dog Essentials")).toBeInTheDocument();
    expect(screen.getByText(/in stock/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeEnabled();
  });
});

describe("ProductCard rating aggregate wiring", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("14. passes the Product List DTO's averageRating/reviewCount straight through to the rating badge", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ProductCard product={{ ...product, averageRating: 4.5, reviewCount: 10 }} />
          </WishlistProvider>
        </CartProvider>
      </CustomerAuthProvider>
    );

    expect(await screen.findByTestId("rating-summary")).toHaveTextContent("4.5|10");
  });

  it("19. Choose Options / Add to Cart CTA logic is unaffected by the rating row", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ProductCard product={{ ...product, hasVariants: true, averageRating: 0, reviewCount: 0 }} />
          </WishlistProvider>
        </CartProvider>
      </CustomerAuthProvider>
    );

    expect(await screen.findByRole("link", { name: "Choose Options" })).toBeInTheDocument();
  });

  it("20. wishlist heart behavior is unaffected by the rating row", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false)
    );

    render(
      <CustomerAuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ProductCard product={{ ...product, averageRating: 4.5, reviewCount: 10 }} />
          </WishlistProvider>
        </CartProvider>
      </CustomerAuthProvider>
    );

    expect(await screen.findByRole("button", { name: /add to wishlist/i })).toHaveAttribute("aria-pressed", "false");
  });
});
