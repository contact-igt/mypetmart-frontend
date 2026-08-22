// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProductDetailClient } from "./product-detail";
import { CustomerAuthProvider } from "@/context/customer-auth-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { AuthTokenStore } from "@/lib/auth/auth-api";
import { CartProvider } from "@/context/cart-context";
import type { ProductDetail } from "@/types/storefront";
import { act } from "react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

const mockSimpleProduct: ProductDetail = {
  id: 101,
  name: "Comfort Dog Collar",
  slug: "comfort-dog-collar",
  sku: "COLLAR-SIMPLE",
  brand: "Comfy Co",
  description: "A super comfortable dog collar.",
  petType: "dog",
  price: "499.00",
  compareAtPrice: "599.00",
  stock: 10,
  hasVariants: false,
  featured: false,
  inStock: true,
  category: { id: 1, name: "Dog Essentials", slug: "dog-essentials", petType: "dog" },
  primaryImage: {
    id: 1,
    url: "https://r2.example.com/collar.jpg",
    alt: "Comfort Dog Collar Main Image",
    contentType: "image/jpeg",
    sizeBytes: 12345,
    width: 400,
    height: 500,
    sortOrder: 1,
    isPrimary: true,
  },
  tags: ["collar", "dog"],
  metaTitle: "Comfort Dog Collar - Buy Online",
  metaDescription: "Get the best collar for your dog.",
  weightGrams: 150,
  lengthCm: "30.00",
  widthCm: "2.00",
  heightCm: "1.00",
  variants: [],
  images: [
    {
      id: 1,
      url: "https://r2.example.com/collar.jpg",
      alt: "Comfort Dog Collar Main Image",
      contentType: "image/jpeg",
      sizeBytes: 12345,
      width: 400,
      height: 500,
      sortOrder: 1,
      isPrimary: true,
    },
  ],
};

const mockVariantProduct: ProductDetail = {
  id: 102,
  name: "Premium Dog Food",
  slug: "premium-dog-food",
  sku: "FOOD-PARENT",
  brand: null,
  description: "Highly nutritious dog food.",
  petType: "dog",
  price: "899.00",
  compareAtPrice: null,
  stock: 45,
  hasVariants: true,
  featured: true,
  inStock: true,
  category: { id: 2, name: "Grooming", slug: "grooming", petType: "dog" },
  primaryImage: null,
  tags: ["food"],
  metaTitle: null,
  metaDescription: null,
  weightGrams: null,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  variants: [
    {
      id: 201,
      productId: 102,
      name: "3kg Pack",
      sku: "FOOD-3KG",
      price: "899.00",
      compareAtPrice: "999.00",
      stock: 5,
      active: true,
      displayOrder: 1,
      weightGrams: 3000,
      lengthCm: "25.00",
      widthCm: "15.00",
      heightCm: "10.00",
      createdAt: "2026-08-12T00:00:00.000Z",
      updatedAt: "2026-08-12T00:00:00.000Z",
    },
    {
      id: 202,
      productId: 102,
      name: "10kg Pack",
      sku: "FOOD-10KG",
      price: "2499.00",
      compareAtPrice: null,
      stock: 40,
      active: true,
      displayOrder: 2,
      weightGrams: 10000,
      lengthCm: "40.00",
      widthCm: "30.00",
      heightCm: "20.00",
      createdAt: "2026-08-12T00:00:00.000Z",
      updatedAt: "2026-08-12T00:00:00.000Z",
    },
  ],
  images: [],
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as any;
}

function setupMockFetch(customHandler?: (url: string, init?: RequestInit) => Promise<any> | undefined) {
  const fetchMock = vi.fn(async (url, init) => {
    const urlStr = String(url);

    if (customHandler) {
      const customRes = await customHandler(urlStr, init);
      if (customRes !== undefined) return customRes;
    }

    if (urlStr.includes("/storefront/cart")) {
      if (urlStr.includes("/merge") && init?.method === "POST") {
        return jsonResponse({
          success: true,
          data: {
            cart: { id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] },
            mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] },
          },
        });
      }
      if (init?.method === "GET") {
        return jsonResponse({ success: true, data: { id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] } });
      }
    }
    return jsonResponse({ success: true, data: {} });
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderProductDetail(product: ProductDetail) {
  return render(
    <CustomerAuthProvider>
      <WishlistProvider>
        <CartProvider>
          <ProductDetailClient product={product} />
        </CartProvider>
      </WishlistProvider>
    </CustomerAuthProvider>
  );
}

describe("ProductDetail Storefront Component", () => {
  beforeEach(() => {
    const fetchMock = vi.fn(async (url, init) => {
      const urlStr = String(url);
      if (urlStr.includes("/storefront/cart")) {
        if (urlStr.includes("/merge") && init?.method === "POST") {
          return jsonResponse({
            success: true,
            data: {
              cart: { id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] },
              mergeReport: { mergedItems: [], adjustedItems: [], skippedItems: [] },
            },
          });
        }
        if (init?.method === "GET") {
          return jsonResponse({ success: true, data: { id: null, status: "active", itemCount: 0, subtotal: "0.00", items: [] } });
        }
      }
      return jsonResponse({ success: true, data: {} });
    });
    vi.stubGlobal("fetch", fetchMock);
    AuthTokenStore.setAccessToken(null);
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. Simple Product renders with correct title, price, and specs", async () => {
    // Mock bootstrap and wishlist
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockSimpleProduct);

    expect(screen.getByRole("heading", { name: "Comfort Dog Collar" })).toBeInTheDocument();
    expect(screen.getByText("Comfy Co")).toBeInTheDocument();
    expect(screen.getByText("₹499")).toBeInTheDocument();
    expect(screen.getByText("₹599")).toBeInTheDocument(); // compare price
    expect(screen.getByText("COLLAR-SIMPLE")).toBeInTheDocument();
    expect(screen.getByText(/A super comfortable dog collar\./)).toBeInTheDocument();
  });

  it("2. Variant Product renders 'From ₹price' and requires selection before Add to Cart", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockVariantProduct);

    expect(screen.getByRole("heading", { name: "Premium Dog Food" })).toBeInTheDocument();
    expect(screen.getByText("From ₹899")).toBeInTheDocument();
    expect(screen.getByText("Choose an option below to view availability.")).toBeInTheDocument();

    const addToCartButton = screen.getByRole("button", { name: /Add to Cart/i });
    expect(addToCartButton).toBeDisabled();
  });

  it("3. Variant selection changes price display", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockVariantProduct);

    const variantBtn1 = screen.getByRole("button", { name: "3kg Pack" });
    const variantBtn2 = screen.getByRole("button", { name: "10kg Pack" });

    // Select 3kg Pack
    fireEvent.click(variantBtn1);
    expect(screen.getByText("₹899")).toBeInTheDocument();
    expect(screen.getByText("₹999")).toBeInTheDocument(); // compare price for 3kg

    // Select 10kg Pack
    fireEvent.click(variantBtn2);
    expect(screen.getByText("₹2,499")).toBeInTheDocument();
    expect(screen.queryByText("₹999")).not.toBeInTheDocument();
  });

  it("4. Variant selection changes stock availability state", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockVariantProduct);

    const variantBtn = screen.getByRole("button", { name: "3kg Pack" });
    fireEvent.click(variantBtn);

    expect(screen.getByText("In Stock (5 available)")).toBeInTheDocument();
  });

  it("5. Simple Cart payload has no variantId", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)) // refresh bootstrap
      .mockResolvedValueOnce(jsonResponse({ success: true, data: {} })); // cart POST success

    renderProductDetail(mockSimpleProduct);

    const addToCartButton = screen.getByRole("button", { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(screen.getByText("Added to cart successfully!")).toBeInTheDocument();
    });

    const calls = vi.mocked(fetch).mock.calls;
    const cartPostCall = calls.find((call) => call[0].toString().includes("/storefront/cart/items"));
    expect(cartPostCall).toBeDefined();
    const payload = JSON.parse(cartPostCall![1]!.body as string);
    expect(payload).toEqual({
      productId: 101,
      quantity: 1,
    });
    expect(payload.variantId).toBeUndefined();
  });

  it("6. Variant Cart payload has correct variantId", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)) // refresh bootstrap
      .mockResolvedValueOnce(jsonResponse({ success: true, data: {} })); // cart POST success

    renderProductDetail(mockVariantProduct);

    const variantBtn = screen.getByRole("button", { name: "10kg Pack" });
    fireEvent.click(variantBtn);

    const addToCartButton = screen.getByRole("button", { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(screen.getByText("Added to cart successfully!")).toBeInTheDocument();
    });

    const calls = vi.mocked(fetch).mock.calls;
    const cartPostCall = calls.find((call) => call[0].toString().includes("/storefront/cart/items"));
    expect(cartPostCall).toBeDefined();
    const payload = JSON.parse(cartPostCall![1]!.body as string);
    expect(payload).toEqual({
      productId: 102,
      variantId: 202,
      quantity: 1,
    });
  });

  it("7. Quantity capped by stock limit", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockVariantProduct);

    // Select 3kg Pack (stock is 5)
    const variantBtn = screen.getByRole("button", { name: "3kg Pack" });
    fireEvent.click(variantBtn);

    const plusBtn = screen.getByRole("button", { name: "Increase quantity" });

    // Click plus 4 times
    for (let i = 0; i < 4; i++) {
      fireEvent.click(plusBtn);
    }
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(plusBtn).toBeDisabled();
  });

  it("8. Quantity capped by 20 limit even if stock is larger", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockVariantProduct);

    // Select 10kg Pack (stock is 40)
    const variantBtn = screen.getByRole("button", { name: "10kg Pack" });
    fireEvent.click(variantBtn);

    const plusBtn = screen.getByRole("button", { name: "Increase quantity" }) as HTMLButtonElement;

    // Click plus 20 times (or more)
    for (let i = 0; i < 25; i++) {
      if (!plusBtn.disabled) {
        fireEvent.click(plusBtn);
      }
    }
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(plusBtn).toBeDisabled();
  });

  it("9. Out-of-stock disables Add to Cart and quantity buttons", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const oosProduct = { ...mockSimpleProduct, stock: 0 };
    renderProductDetail(oosProduct);

    expect(screen.getAllByText("Out of Stock").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Add to Cart/i })).toBeDisabled();
  });

  it("10. Zero variants shows product unavailable", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const zeroVariantProduct = { ...mockVariantProduct, variants: [] };
    renderProductDetail(zeroVariantProduct);

    expect(screen.getByText("Product currently unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add to Cart/i })).not.toBeInTheDocument();
  });

  it("11. Existing Wishlist state works", async () => {
    setupMockFetch(async (url) => {
      if (url.includes("/auth/refresh")) {
        return jsonResponse({ success: true, data: { accessToken: "test-token" } });
      }
      if (url.includes("/auth/me")) {
        return jsonResponse({ success: true, data: { id: 5, name: "Customer", role: "customer" } });
      }
      if (url.includes("/storefront/wishlist")) {
        return jsonResponse({
          success: true,
          data: {
            items: [
              {
                wishlistItemId: 10,
                createdAt: "2026-08-12T00:00:00.000Z",
                product: { ...mockSimpleProduct, available: true } as any,
              },
            ],
          },
        });
      }
    });

    await act(async () => {
      renderProductDetail(mockSimpleProduct);
    });

    const heart = await screen.findByRole("button", { name: /remove from wishlist/i });
    expect(heart).toHaveAttribute("aria-pressed", "true");
  });

  it("12. Logged-out Wishlist redirects to signin", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockSimpleProduct);

    const heart = await screen.findByRole("button", { name: /add to wishlist/i });
    fireEvent.click(heart);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/signin");
    });
  });

  it("13. Missing image uses ProductImagePlaceholder", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const noImageProduct = { ...mockSimpleProduct, primaryImage: null, images: [] };
    renderProductDetail(noImageProduct);

    expect(screen.getByRole("img", { name: "Comfort Dog Collar - Image coming soon" })).toBeInTheDocument();
  });

  it("14. Broken image falls back to ProductImagePlaceholder", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockSimpleProduct);

    const mainImage = screen.getByAltText("Comfort Dog Collar Main Image");
    // Simulate image error
    fireEvent.error(mainImage);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Comfort Dog Collar - Image coming soon" })).toBeInTheDocument();
    });
  });

  it("15. Category breadcrumb uses correct link structure", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockSimpleProduct);

    const categoryLink = screen.getByRole("link", { name: "Dog Essentials" });
    expect(categoryLink).toHaveAttribute("href", "/shop?category=dog-essentials");
  });

  it("16. Add-to-Cart shows success message", async () => {
    setupMockFetch(async (url, init) => {
      if (url.includes("/auth/refresh") || url.includes("/auth/me")) {
        return jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401);
      }
      if (url.includes("/storefront/cart/items") && init?.method === "POST") {
        return jsonResponse({ success: true, data: { id: 42, status: "active", itemCount: 1, subtotal: "499.00", items: [] } });
      }
    });

    renderProductDetail(mockSimpleProduct);

    const addToCartButton = screen.getByRole("button", { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(screen.getByText("Added to cart successfully!")).toBeInTheDocument();
    });
  });

  it("17. Add-to-Cart structured error mapping", async () => {
    setupMockFetch(async (url, init) => {
      if (url.includes("/auth/refresh") || url.includes("/auth/me")) {
        return jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401);
      }
      if (url.includes("/storefront/cart/items") && init?.method === "POST") {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "CART_INSUFFICIENT_STOCK",
              message: "Only 3 unit(s) are currently available.",
              details: { availableQuantity: 3 },
            },
          },
          false,
          422
        );
      }
    });

    renderProductDetail(mockSimpleProduct);

    const addToCartButton = screen.getByRole("button", { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    await waitFor(() => {
      expect(screen.getByText("Only 3 unit(s) are currently available.")).toBeInTheDocument();
    });
  });

  it("18. Shows only the media assigned to the current product", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const groomingView = renderProductDetail({
      ...mockSimpleProduct,
      slug: "pet-grooming-brush",
    });

    const groomingVideos = groomingView.container.querySelectorAll("video");
    expect(groomingVideos).toHaveLength(4);
    expect(groomingVideos[0].querySelector("source")).toHaveAttribute(
      "src",
      "/assest/grooming_brush_1.mp4"
    );

    groomingView.unmount();

    renderProductDetail({
      ...mockSimpleProduct,
      slug: "dog-anti-slip-pads",
    });

    expect(screen.getByAltText("Dog anti-slip paw pads product view 1")).toBeInTheDocument();
    expect(screen.getByAltText("Dog anti-slip paw pads product view 2")).toBeInTheDocument();
    expect(document.querySelectorAll("video")).toHaveLength(0);
  });
});
