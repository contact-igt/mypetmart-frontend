// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
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
  howToUse: null,
  careInstructions: null,
  safetyInfo: null,
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
  features: [],
  specifications: [],
  contentBlocks: [],
  productVideos: [],
  testimonialVideos: [],
  relatedProducts: [],
  faqs: [],
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
  howToUse: null,
  careInstructions: null,
  safetyInfo: null,
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
  features: [],
  specifications: [],
  contentBlocks: [],
  productVideos: [],
  testimonialVideos: [],
  relatedProducts: [],
  faqs: [],
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

// The PDP renders two Add to Cart surfaces: the desktop purchase panel and the
// mobile bottom-sticky bar (`md:hidden`). jsdom applies no CSS, so both are in
// the tree during tests — scope panel-specific queries so they stay unambiguous.
const inPanel = () => within(screen.getByTestId("pdp-purchase-panel"));

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
    expect(inPanel().getByText("₹499")).toBeInTheDocument();
    expect(inPanel().getByText("₹599")).toBeInTheDocument(); // compare price
    expect(screen.getByText("COLLAR-SIMPLE")).toBeInTheDocument();
    expect(screen.getByText(/A super comfortable dog collar\./)).toBeInTheDocument();
    expect(screen.getByLabelText("Product tags")).toHaveTextContent("#collar");
  });

  it("2. Variant Product renders 'From ₹price' and requires selection before Add to Cart", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockVariantProduct);

    expect(screen.getByRole("heading", { name: "Premium Dog Food" })).toBeInTheDocument();
    expect(inPanel().getByText("From ₹899")).toBeInTheDocument();
    expect(screen.getByText("Choose an option below to view availability.")).toBeInTheDocument();

    const addToCartButton = inPanel().getByRole("button", { name: /Add to Cart/i });
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
    expect(inPanel().getByText("₹899")).toBeInTheDocument();
    expect(inPanel().getByText("₹999")).toBeInTheDocument(); // compare price for 3kg

    // Select 10kg Pack
    fireEvent.click(variantBtn2);
    expect(inPanel().getByText("₹2,499")).toBeInTheDocument();
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

    const addToCartButton = inPanel().getByRole("button", { name: /Add to Cart/i });
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

    const addToCartButton = inPanel().getByRole("button", { name: /Add to Cart/i });
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

    const plusBtn = inPanel().getByRole("button", { name: "Increase quantity" });

    // Click plus 4 times
    for (let i = 0; i < 4; i++) {
      fireEvent.click(plusBtn);
    }
    expect(inPanel().getByText("5")).toBeInTheDocument();
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

    const plusBtn = inPanel().getByRole("button", { name: "Increase quantity" }) as HTMLButtonElement;

    // Click plus 20 times (or more)
    for (let i = 0; i < 25; i++) {
      if (!plusBtn.disabled) {
        fireEvent.click(plusBtn);
      }
    }
    expect(inPanel().getByText("20")).toBeInTheDocument();
    expect(plusBtn).toBeDisabled();
  });

  it("9. Out-of-stock disables Add to Cart and quantity buttons", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const oosProduct = { ...mockSimpleProduct, stock: 0 };
    renderProductDetail(oosProduct);

    expect(screen.getAllByText("Out of Stock").length).toBeGreaterThan(0);
    expect(inPanel().getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    expect(inPanel().getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
    expect(inPanel().getByRole("button", { name: /Add to Cart/i })).toBeDisabled();
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

    const addToCartButton = inPanel().getByRole("button", { name: /Add to Cart/i });
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

    const addToCartButton = inPanel().getByRole("button", { name: /Add to Cart/i });
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

    // Scoped to the "See it in action" section specifically — the always-present
    // generic testimonials section below it also renders <video> elements, so an
    // unscoped container-wide query would double-count them.
    const productMediaSection = groomingView.container.querySelector("#product-media-heading")!.closest("section")!;
    const groomingVideos = productMediaSection.querySelectorAll("video");
    expect(groomingVideos).toHaveLength(4);
    expect(groomingVideos[0].querySelector("source")).toHaveAttribute(
      "src",
      "/assest/grooming_brush_1.mp4"
    );

    groomingView.unmount();

    const pawPadsView = renderProductDetail({
      ...mockSimpleProduct,
      slug: "dog-anti-slip-pads",
    });

    expect(screen.getByAltText("Dog anti-slip paw pads product view 1")).toBeInTheDocument();
    expect(screen.getByAltText("Dog anti-slip paw pads product view 2")).toBeInTheDocument();
    const pawPadsMediaSection = pawPadsView.container.querySelector("#product-media-heading")!.closest("section")!;
    expect(pawPadsMediaSection.querySelectorAll("video")).toHaveLength(0);
  });

  it("21. Dynamic Product Videos take priority over legacy PRODUCT_MEDIA and render publicUrl/title/caption", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      slug: "pet-grooming-brush", // legacy PRODUCT_MEDIA exists for this slug too
      productVideos: [
        {
          id: 1,
          mediaAssetId: 501,
          mediaRole: "product_video",
          title: "How it works",
          caption: "See the mist-powered brush in action",
          displayOrder: 0,
          active: true,
          media: { id: 501, publicUrl: "https://r2.example.com/demo-1.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "demo-1.mp4" },
        },
        {
          id: 2,
          mediaAssetId: 502,
          mediaRole: "product_video",
          title: null,
          caption: null,
          displayOrder: 1,
          active: true,
          media: { id: 502, publicUrl: "https://r2.example.com/demo-2.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "demo-2.mp4" },
        },
      ],
    });

    const productMediaSection = view.container.querySelector("#product-media-heading")!.closest("section")!;
    const videos = productMediaSection.querySelectorAll("video");

    // Priority: dynamic videos replace the legacy 4-video grooming fallback entirely.
    expect(videos).toHaveLength(2);
    expect(videos[0]).toHaveAttribute("src", "https://r2.example.com/demo-1.mp4");
    expect(videos[1]).toHaveAttribute("src", "https://r2.example.com/demo-2.mp4");

    // Title renders when present.
    expect(screen.getByText("How it works")).toBeInTheDocument();
    // Caption renders when present.
    expect(screen.getByText("See the mist-powered brush in action")).toBeInTheDocument();

    // The second assignment has no title/caption — no fabricated fallback text, no empty caption block.
    expect(screen.queryByText("Product video")).not.toBeInTheDocument();
  });

  it("22. Falls back to legacy PRODUCT_MEDIA when there are zero dynamic Product Videos", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      slug: "pet-grooming-brush",
      productVideos: [],
    });

    const productMediaSection = view.container.querySelector("#product-media-heading")!.closest("section")!;
    expect(productMediaSection.querySelectorAll("video")).toHaveLength(4);
  });

  it("23. Hides the 'See it in action' section entirely when neither dynamic nor legacy media exist", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockSimpleProduct); // slug has no legacy entry, productVideos: []

    expect(document.querySelector("#product-media-heading")).not.toBeInTheDocument();
  });

  it("24. Does not render testimonialVideos in the 'See it in action' section", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      productVideos: [],
      testimonialVideos: [
        {
          id: 9,
          mediaAssetId: 601,
          mediaRole: "testimonial_video",
          title: "A real customer story",
          caption: null,
          displayOrder: 0,
          active: true,
          media: { id: 601, publicUrl: "https://r2.example.com/testimonial-1.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "testimonial-1.mp4" },
        },
      ],
    });

    // No legacy/dynamic product media for this slug, so "See it in action" is
    // absent entirely — a testimonial-only Product must not surface it there.
    expect(document.querySelector("#product-media-heading")).not.toBeInTheDocument();
    // As of Phase D, this testimonial DOES render — in its own Customer Stories
    // section (see test 26/28) — so the assertion here is scoped to proving it
    // never leaks into "See it in action", not that it renders nowhere at all.
    expect(document.querySelector("#product-testimonial-heading")).toBeInTheDocument();
    const testimonialSection = view.container.querySelector("#product-testimonial-heading")!.closest("section")!;
    expect(within(testimonialSection).getByText("A real customer story")).toBeInTheDocument();
  });

  it("25. Product Video renders with controls, playsInline, and metadata-only preload", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      productVideos: [
        {
          id: 1,
          mediaAssetId: 501,
          mediaRole: "product_video",
          title: "Demo",
          caption: null,
          displayOrder: 0,
          active: true,
          media: { id: 501, publicUrl: "https://r2.example.com/demo-1.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "demo-1.mp4" },
        },
      ],
    });

    const video = view.container.querySelector("#product-media-heading")!.closest("section")!.querySelector("video")!;
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).not.toHaveAttribute("autoplay");
  });

  it("19. Shows the Key Features section in order when the Product has Features", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const productWithFeatures: ProductDetail = {
      ...mockSimpleProduct,
      features: [
        { id: 1, productId: 101, label: "Soft padded construction", displayOrder: 0 },
        { id: 2, productId: 101, label: "Adjustable fit", displayOrder: 1 },
        { id: 3, productId: 101, label: "Easy to clean", displayOrder: 2 },
      ],
    };
    renderProductDetail(productWithFeatures);

    expect(screen.getByText("Key Features")).toBeInTheDocument();
    const labels = screen.getAllByText(/Soft padded construction|Adjustable fit|Easy to clean/).map((el) => el.textContent);
    expect(labels).toEqual(["Soft padded construction", "Adjustable fit", "Easy to clean"]);
  });

  it("20. Hides the Key Features section entirely when the Product has no Features", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail(mockSimpleProduct);

    expect(screen.queryByText("Key Features")).not.toBeInTheDocument();
  });

  it("26. Renders a Product-specific Customer Stories section with multiple testimonial videos", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      price: "399.00",
      compareAtPrice: "499.00",
      testimonialVideos: [
        {
          id: 1,
          mediaAssetId: 601,
          mediaRole: "testimonial_video",
          title: "A real customer story",
          caption: "Shared with permission",
          displayOrder: 0,
          active: true,
          media: { id: 601, publicUrl: "https://r2.example.com/testimonial-1.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "testimonial-1.mp4" },
        },
        {
          id: 2,
          mediaAssetId: 602,
          mediaRole: "testimonial_video",
          title: null,
          caption: null,
          displayOrder: 1,
          active: true,
          media: { id: 602, publicUrl: "https://r2.example.com/testimonial-2.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "testimonial-2.mp4" },
        },
      ],
    });

    expect(screen.getByText("Customer stories")).toBeInTheDocument();
    const section = view.container.querySelector("#product-testimonial-heading")!.closest("section")!;
    const videos = section.querySelectorAll("video");
    expect(videos).toHaveLength(2);
    expect(videos[0]).toHaveAttribute("src", "https://r2.example.com/testimonial-1.mp4");
    expect(videos[1]).toHaveAttribute("src", "https://r2.example.com/testimonial-2.mp4");

    // Title/caption render only when present — no fabricated text for the second clip.
    expect(screen.getByText("A real customer story")).toBeInTheDocument();
    expect(screen.getByText("Shared with permission")).toBeInTheDocument();

    // Generic rotated testimonial section is suppressed once real ones exist.
    expect(screen.queryByText("Hear from pet parents shopping with us.")).not.toBeInTheDocument();
  });

  it("27. Hides Customer Stories and keeps the generic testimonial section when testimonialVideos is empty", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({ ...mockSimpleProduct, testimonialVideos: [] });

    expect(document.querySelector("#product-testimonial-heading")).not.toBeInTheDocument();
    expect(screen.getByText("Hear from pet parents shopping with us.")).toBeInTheDocument();
  });

  it("28. Customer Stories does not render productVideos, and 'See it in action' does not render testimonialVideos", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      productVideos: [
        {
          id: 1,
          mediaAssetId: 501,
          mediaRole: "product_video",
          title: "Demo",
          caption: null,
          displayOrder: 0,
          active: true,
          media: { id: 501, publicUrl: "https://r2.example.com/demo-video.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "demo-video.mp4" },
        },
      ],
      testimonialVideos: [
        {
          id: 2,
          mediaAssetId: 601,
          mediaRole: "testimonial_video",
          title: "Story",
          caption: null,
          displayOrder: 0,
          active: true,
          media: { id: 601, publicUrl: "https://r2.example.com/testimonial-video.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "testimonial-video.mp4" },
        },
      ],
    });

    const productMediaSection = view.container.querySelector("#product-media-heading")!.closest("section")!;
    expect(productMediaSection.querySelectorAll("video")[0]).toHaveAttribute("src", "https://r2.example.com/demo-video.mp4");
    expect(Array.from(productMediaSection.querySelectorAll("video")).some((el) => el.getAttribute("src") === "https://r2.example.com/testimonial-video.mp4")).toBe(false);

    const testimonialSection = view.container.querySelector("#product-testimonial-heading")!.closest("section")!;
    expect(testimonialSection.querySelectorAll("video")[0]).toHaveAttribute("src", "https://r2.example.com/testimonial-video.mp4");
    expect(Array.from(testimonialSection.querySelectorAll("video")).some((el) => el.getAttribute("src") === "https://r2.example.com/demo-video.mp4")).toBe(false);
  });

  it("29. Simple Product: selling price displays, and MRP + auto-calculated discount show only when compareAtPrice > price", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      name: "Comfort Dog Collar",
      slug: "comfort-dog-collar",
      price: "399.00",
      compareAtPrice: "499.00",
      hasVariants: false,
      testimonialVideos: [
        {
          id: 1,
          mediaAssetId: 601,
          mediaRole: "testimonial_video",
          title: null,
          caption: null,
          displayOrder: 0,
          active: true,
          media: { id: 601, publicUrl: "https://r2.example.com/testimonial-1.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "testimonial-1.mp4" },
        },
      ],
    });

    const section = view.container.querySelector("#product-testimonial-heading")!.closest("section")!;
    expect(section).toHaveTextContent("Comfort Dog Collar");
    expect(section).toHaveTextContent("₹399");
    expect(section).toHaveTextContent("₹499");
    // (499-399)/499 * 100 = 20.04.. → rounds to 20
    expect(section).toHaveTextContent("20% off");

    // Buy Now links straight to this Product's own page, not checkout.
    const buyNow = within(section).getByRole("link", { name: "Buy Now" });
    expect(buyNow).toHaveAttribute("href", "/products/comfort-dog-collar");
  });

  it("30. Simple Product without a compare-at price shows selling price only, no discount", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      price: "399.00",
      compareAtPrice: null,
      testimonialVideos: [
        {
          id: 1,
          mediaAssetId: 601,
          mediaRole: "testimonial_video",
          title: null,
          caption: null,
          displayOrder: 0,
          active: true,
          media: { id: 601, publicUrl: "https://r2.example.com/testimonial-1.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "testimonial-1.mp4" },
        },
      ],
    });

    const section = view.container.querySelector("#product-testimonial-heading")!.closest("section")!;
    expect(section).toHaveTextContent("₹399");
    expect(section.textContent).not.toMatch(/% off/);
  });

  it("31. Simple Product with compareAtPrice <= price shows no discount", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      price: "399.00",
      compareAtPrice: "399.00",
      testimonialVideos: [
        {
          id: 1,
          mediaAssetId: 601,
          mediaRole: "testimonial_video",
          title: null,
          caption: null,
          displayOrder: 0,
          active: true,
          media: { id: 601, publicUrl: "https://r2.example.com/testimonial-1.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "testimonial-1.mp4" },
        },
      ],
    });

    const section = view.container.querySelector("#product-testimonial-heading")!.closest("section")!;
    expect(section.textContent).not.toMatch(/% off/);
  });

  it("32. Variant Product shows 'From ₹price' and never a generic/misleading discount", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockVariantProduct,
      testimonialVideos: [
        {
          id: 1,
          mediaAssetId: 601,
          mediaRole: "testimonial_video",
          title: null,
          caption: null,
          displayOrder: 0,
          active: true,
          media: { id: 601, publicUrl: "https://r2.example.com/testimonial-1.mp4", mimeType: "video/mp4", mediaType: "video", title: null, originalName: "testimonial-1.mp4" },
        },
      ],
    });

    const section = view.container.querySelector("#product-testimonial-heading")!.closest("section")!;
    expect(section).toHaveTextContent(`From ₹${Math.round(parseFloat(mockVariantProduct.price)).toLocaleString("en-IN")}`);
    expect(section.textContent).not.toMatch(/% off/);
  });

  it("33. renders custom Specifications with correct labels, values, and order, merged into the existing Specifications block", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({
      ...mockSimpleProduct,
      specifications: [
        { label: "Material", value: "Nylon", displayOrder: 0 },
        { label: "Breed Size", value: "Medium", displayOrder: 1 },
      ],
    });

    const heading = screen.getByRole("heading", { name: "Specifications", hidden: true });
    const section = heading.closest("div")!;
    expect(section).toHaveTextContent("Material:");
    expect(section).toHaveTextContent("Nylon");
    expect(section).toHaveTextContent("Breed Size:");
    expect(section).toHaveTextContent("Medium");

    const materialIndex = section.textContent!.indexOf("Material");
    const breedSizeIndex = section.textContent!.indexOf("Breed Size");
    expect(materialIndex).toBeLessThan(breedSizeIndex);

    // Existing structured fields remain, sourced from the Product itself — not duplicated as specification rows.
    expect(section).toHaveTextContent(`SKU:${mockSimpleProduct.sku}`);
  });

  it("34. zero Specifications renders no custom specification rows, only the existing structured fields", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({ ...mockSimpleProduct, specifications: [] });

    const heading = screen.getByRole("heading", { name: "Specifications", hidden: true });
    const section = heading.closest("div")!;
    expect(section).toHaveTextContent(`SKU:${mockSimpleProduct.sku}`);
    expect(section.textContent).not.toMatch(/Material/);
  });

  it("35. does not fabricate specification text — only genuinely provided label/value pairs render", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({
      ...mockSimpleProduct,
      specifications: [{ label: "Colour", value: "Black", displayOrder: 0 }],
    });

    const heading = screen.getByRole("heading", { name: "Specifications", hidden: true });
    const section = heading.closest("div")!;
    expect(section).toHaveTextContent("Colour:");
    expect(section).toHaveTextContent("Black");
    expect(section.innerHTML).not.toMatch(/<script/i);
  });

  it("36. renders How to Use, Care Instructions, and Safety / Important Information when present", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({
      ...mockSimpleProduct,
      howToUse: "Place the harness around your pet.",
      careInstructions: "Hand wash with mild detergent.",
      safetyInfo: "Inspect straps before use.",
    });

    expect(screen.getByText("How to Use")).toBeInTheDocument();
    expect(screen.getByText("Place the harness around your pet.")).toBeInTheDocument();
    expect(screen.getByText("Care Instructions")).toBeInTheDocument();
    expect(screen.getByText("Hand wash with mild detergent.")).toBeInTheDocument();
    expect(screen.getByText("Safety / Important Information")).toBeInTheDocument();
    expect(screen.getByText("Inspect straps before use.")).toBeInTheDocument();
  });

  it("37. each of How to Use / Care Instructions / Safety hides independently when null", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({
      ...mockSimpleProduct,
      howToUse: "Only how-to-use is present.",
      careInstructions: null,
      safetyInfo: null,
    });

    expect(screen.getByText("How to Use")).toBeInTheDocument();
    expect(screen.queryByText("Care Instructions")).not.toBeInTheDocument();
    expect(screen.queryByText("Safety / Important Information")).not.toBeInTheDocument();
  });

  it("38. the entire Usage/Care/Safety area is absent when all three are null", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({ ...mockSimpleProduct, howToUse: null, careInstructions: null, safetyInfo: null });

    expect(screen.queryByText("How to Use")).not.toBeInTheDocument();
    expect(screen.queryByText("Care Instructions")).not.toBeInTheDocument();
    expect(screen.queryByText("Safety / Important Information")).not.toBeInTheDocument();
  });

  it("39. preserves line breaks in How to Use content", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({
      ...mockSimpleProduct,
      howToUse: "1. Place the harness.\n2. Adjust the straps.\n3. Secure the buckle.",
    });

    const heading = screen.getByText("How to Use");
    const section = heading.closest("div")!;
    expect(section.querySelector(".whitespace-pre-line")?.textContent).toBe(
      "1. Place the harness.\n2. Adjust the straps.\n3. Secure the buckle."
    );
  });

  it("40. renders HTML/script-like content as plain text, never executed", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({
      ...mockSimpleProduct,
      safetyInfo: "<script>alert('xss')</script> Keep away from children.",
    });

    const heading = screen.getByText("Safety / Important Information");
    const section = heading.closest("div")!;
    expect(section.innerHTML).not.toMatch(/<script>/i);
    expect(section.textContent).toContain("<script>alert('xss')</script> Keep away from children.");
  });

  it("41. renders a media_left content block (image + heading + description)", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      contentBlocks: [
        {
          heading: "Built for Everyday Comfort",
          description: "Soft padded construction.",
          layout: "media_left",
          displayOrder: 0,
          media: { publicUrl: "https://r2.example.com/comfort.jpg", mediaType: "image", mimeType: "image/jpeg", title: "Comfort" },
        },
      ],
    });

    expect(screen.getByText("Built for Everyday Comfort")).toBeInTheDocument();
    expect(screen.getByText("Soft padded construction.")).toBeInTheDocument();
    expect(view.container.querySelector('img[alt="Comfort"]')).toBeInTheDocument();
  });

  it("42. renders a media_right content block", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({
      ...mockSimpleProduct,
      contentBlocks: [
        {
          heading: "Easy to Adjust",
          description: "Multiple adjustment points.",
          layout: "media_right",
          displayOrder: 0,
          media: { publicUrl: "https://r2.example.com/adjust.jpg", mediaType: "image", mimeType: "image/jpeg", title: "Adjust" },
        },
      ],
    });

    expect(screen.getByText("Easy to Adjust")).toBeInTheDocument();
    expect(screen.getByText("Multiple adjustment points.")).toBeInTheDocument();
  });

  it("43. renders a media_full content block", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      contentBlocks: [
        {
          heading: "Designed for Daily Use",
          description: null,
          layout: "media_full",
          displayOrder: 0,
          media: { publicUrl: "https://r2.example.com/daily.mp4", mediaType: "video", mimeType: "video/mp4", title: "Daily use" },
        },
      ],
    });

    expect(screen.getByText("Designed for Daily Use")).toBeInTheDocument();
    expect(view.container.querySelector('video[src="https://r2.example.com/daily.mp4"]')).toBeInTheDocument();
  });

  it("44. video content block uses controls, playsInline, and preload=metadata", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      contentBlocks: [
        {
          heading: "Video block",
          description: null,
          layout: "media_full",
          displayOrder: 0,
          media: { publicUrl: "https://r2.example.com/demo.mp4", mediaType: "video", mimeType: "video/mp4", title: null },
        },
      ],
    });

    const video = view.container.querySelector('video[src="https://r2.example.com/demo.mp4"]')!;
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("preload", "metadata");
  });

  it("45. renders a text-only content block (no media)", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({
      ...mockSimpleProduct,
      contentBlocks: [
        { heading: "Easy to Adjust", description: "Multiple adjustment points.", layout: "media_left", displayOrder: 0, media: null },
      ],
    });

    const heading = screen.getByText("Easy to Adjust");
    const block = heading.closest("div")!.parentElement!;
    expect(block.querySelector("img")).not.toBeInTheDocument();
    expect(block.querySelector("video")).not.toBeInTheDocument();
  });

  it("46. renders a media-only content block (no heading/description)", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      contentBlocks: [
        { heading: null, description: null, layout: "media_left", displayOrder: 0, media: { publicUrl: "https://r2.example.com/only.jpg", mediaType: "image", mimeType: "image/jpeg", title: null } },
      ],
    });

    expect(view.container.querySelector('img[alt="Comfort Dog Collar"]')).toBeInTheDocument();
  });

  it("47. zero content blocks hides the Enhanced Product Content area", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({ ...mockSimpleProduct, contentBlocks: [] });

    expect(view.container.querySelector('video[src^="https://r2.example.com"]')).not.toBeInTheDocument();
    expect(screen.queryByText("Built for Everyday Comfort")).not.toBeInTheDocument();
  });

  it("48. heading renders only when present; description renders only when present", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    renderProductDetail({
      ...mockSimpleProduct,
      contentBlocks: [
        { heading: "Only a heading", description: null, layout: "media_left", displayOrder: 0, media: { publicUrl: "https://r2.example.com/h.jpg", mediaType: "image", mimeType: "image/jpeg", title: null } },
      ],
    });

    expect(screen.getByText("Only a heading")).toBeInTheDocument();
  });

  it("49. does not fabricate a heading for a media-only block, and content is plain text (no script execution)", () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
    );

    const view = renderProductDetail({
      ...mockSimpleProduct,
      contentBlocks: [
        {
          heading: "<script>alert('xss')</script>",
          description: "Safe description",
          layout: "media_full",
          displayOrder: 0,
          media: null,
        },
      ],
    });

    expect(view.container.innerHTML).not.toMatch(/<script>alert/i);
    expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
  });

  it("50. Ratings & Reviews: shows 'No reviews yet' with zero approved reviews", async () => {
    setupMockFetch(async (url) => {
      if (url.includes("/reviews") && !url.includes("review-eligibility")) {
        return jsonResponse({ success: true, data: { items: [], page: 1, pageSize: 8, total: 0, summary: { averageRating: 0, reviewCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } } } });
      }
    });

    renderProductDetail(mockSimpleProduct);

    await waitFor(() => {
      expect(screen.getAllByText("No reviews yet.").length).toBeGreaterThan(0);
    });
  });

  it("51. Ratings & Reviews: renders the average rating and distribution from real approved data", async () => {
    setupMockFetch(async (url) => {
      if (url.includes("/reviews") && !url.includes("review-eligibility")) {
        return jsonResponse({
          success: true,
          data: {
            items: [
              { id: 1, rating: 5, title: "Great collar", review: "My dog loves it.", customerName: "Iyyappan", reviewSource: "customer", verifiedPurchase: true, createdAt: "2026-08-01T00:00:00.000Z" },
            ],
            page: 1,
            pageSize: 8,
            total: 1,
            summary: { averageRating: 4.6, reviewCount: 38, distribution: { 5: 28, 4: 6, 3: 3, 2: 0, 1: 1 } },
          },
        });
      }
    });

    renderProductDetail(mockSimpleProduct);

    await waitFor(() => {
      expect(screen.getAllByText("4.6").length).toBeGreaterThan(0);
    });
    expect(screen.getByText("Based on 38 reviews")).toBeInTheDocument();
    expect(screen.getByText("Great collar")).toBeInTheDocument();
    expect(screen.getByText("My dog loves it.")).toBeInTheDocument();
    expect(screen.queryByText("Verified Purchase")).not.toBeInTheDocument();
    expect(screen.getByText("Iyyappan")).toBeInTheDocument();
  });

  it("52. Ratings & Reviews: does not render a Verified Purchase badge", async () => {
    setupMockFetch(async (url) => {
      if (url.includes("/reviews") && !url.includes("review-eligibility")) {
        return jsonResponse({
          success: true,
          data: {
            items: [{ id: 2, rating: 3, title: null, review: "It was okay.", customerName: "Customer", reviewSource: "customer", verifiedPurchase: false, createdAt: "2026-08-01T00:00:00.000Z" }],
            page: 1,
            pageSize: 8,
            total: 1,
            summary: { averageRating: 3, reviewCount: 1, distribution: { 5: 0, 4: 0, 3: 1, 2: 0, 1: 0 } },
          },
        });
      }
    });

    renderProductDetail(mockSimpleProduct);

    await waitFor(() => {
      expect(screen.getByText("It was okay.")).toBeInTheDocument();
    });
    expect(screen.queryByText("Verified Purchase")).not.toBeInTheDocument();
  });

  it("53. Ratings & Reviews: review text renders as plain text (no HTML execution)", async () => {
    setupMockFetch(async (url) => {
      if (url.includes("/reviews") && !url.includes("review-eligibility")) {
        return jsonResponse({
          success: true,
          data: {
            items: [{ id: 3, rating: 4, title: null, review: "<script>alert('xss')</script> Works great.", customerName: "Rahul Kumar", reviewSource: "admin", verifiedPurchase: true, createdAt: "2026-08-01T00:00:00.000Z" }],
            page: 1,
            pageSize: 8,
            total: 1,
            summary: { averageRating: 4, reviewCount: 1, distribution: { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 } },
          },
        });
      }
    });

    const view = renderProductDetail(mockSimpleProduct);

    await waitFor(() => {
      expect(screen.getByText(/Works great\./)).toBeInTheDocument();
    });
    expect(view.container.innerHTML).not.toMatch(/<script>alert/i);
    expect(screen.getByText("Rahul Kumar")).toBeInTheDocument();
    expect(screen.queryByText("Verified Purchase")).not.toBeInTheDocument();
  });

  it("54. Ratings & Reviews: unauthenticated visitor sees a 'Sign in to review' prompt, not a write form", async () => {
    setupMockFetch(async (url) => {
      if (url.includes("/auth/refresh") || url.includes("/auth/me")) {
        return jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401);
      }
    });

    renderProductDetail(mockSimpleProduct);

    await waitFor(() => {
      expect(screen.getByText("Sign in to review")).toBeInTheDocument();
    });
    expect(screen.queryByText("Write a Review")).not.toBeInTheDocument();
  });

  it("55. above-the-fold rating badge is hidden when there are zero reviews", async () => {
    setupMockFetch(async (url) => {
      if (url.includes("/reviews") && !url.includes("review-eligibility")) {
        return jsonResponse({ success: true, data: { items: [], page: 1, pageSize: 1, total: 0, summary: { averageRating: 0, reviewCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } } } });
      }
    });

    renderProductDetail(mockSimpleProduct);

    await waitFor(() => {
      expect(screen.getAllByText("No reviews yet.").length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/\(\d+ reviews?\)/)).not.toBeInTheDocument();
  });

  it("56. above-the-fold rating badge shows the real average and count, and links to #product-reviews", async () => {
    setupMockFetch(async (url) => {
      if (url.includes("/reviews") && !url.includes("review-eligibility")) {
        return jsonResponse({
          success: true,
          data: { items: [], page: 1, pageSize: 1, total: 0, summary: { averageRating: 4.6, reviewCount: 38, distribution: { 5: 28, 4: 6, 3: 3, 2: 0, 1: 1 } } },
        });
      }
    });

    renderProductDetail(mockSimpleProduct);

    await waitFor(() => {
      expect(screen.getByText("(38 reviews)")).toBeInTheDocument();
    });
    const badgeLink = screen.getByRole("link", { name: /4\.6.*38 reviews/ });
    expect(badgeLink).toHaveAttribute("href", "#product-reviews");
  });

  it("57. regression: Key Features, Specifications, Add to Cart, and gallery remain unaffected by the Reviews section", async () => {
    const productWithFeatures: ProductDetail = {
      ...mockSimpleProduct,
      features: [{ id: 1, productId: 101, label: "Soft padded construction", displayOrder: 0 }],
    };
    renderProductDetail(productWithFeatures);

    expect(screen.getByText("Key Features")).toBeInTheDocument();
    expect(screen.getAllByText("Specifications").length).toBeGreaterThan(0);
    expect(inPanel().getByRole("button", { name: /Add to Cart/i })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: mockSimpleProduct.images[0]!.alt })).toBeInTheDocument();
  });

  describe("Related Products section", () => {
    const relatedItems: ProductDetail["relatedProducts"] = [
      {
        id: 201,
        name: "Rugged Dog Leash",
        slug: "rugged-dog-leash",
        brand: "Comfy Co",
        petType: "dog",
        price: "349.00",
        compareAtPrice: null,
        stock: 5,
        hasVariants: false,
        featured: false,
        inStock: true,
        category: { id: 1, name: "Dog Essentials", slug: "dog-essentials", petType: "dog" },
        primaryImage: null,
        averageRating: 0,
        reviewCount: 0,
      },
      {
        id: 202,
        name: "Padded Dog Harness",
        slug: "padded-dog-harness",
        brand: "Comfy Co",
        petType: "dog",
        price: "799.00",
        compareAtPrice: "999.00",
        stock: 3,
        hasVariants: false,
        featured: false,
        inStock: true,
        category: { id: 1, name: "Dog Essentials", slug: "dog-essentials", petType: "dog" },
        primaryImage: null,
        averageRating: 0,
        reviewCount: 0,
      },
    ];

    it("58. renders the Related Products section with a card per related item", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
      );

      renderProductDetail({ ...mockSimpleProduct, relatedProducts: relatedItems });

      const relatedSection = screen.getByRole("heading", { name: "You may also like." }).closest("section")!;
      expect(relatedSection).toBeInTheDocument();
      expect(within(relatedSection).getAllByRole("link", { name: /Rugged Dog Leash/ }).length).toBeGreaterThan(0);
      expect(within(relatedSection).getAllByRole("link", { name: /Padded Dog Harness/ }).length).toBeGreaterThan(0);
    });

    it("59. Related Product cards show name, price, and a discount when compareAtPrice is set", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
      );

      renderProductDetail({ ...mockSimpleProduct, relatedProducts: relatedItems });

      const harnessCard = screen.getByRole("heading", { name: "Padded Dog Harness" }).closest("article")!;
      expect(within(harnessCard).getByText("₹799")).toBeInTheDocument();
      expect(within(harnessCard).getByText("₹999")).toBeInTheDocument();
      expect(within(harnessCard).getAllByRole("link", { name: /Padded Dog Harness/ })[0]).toHaveAttribute("href", "/products/padded-dog-harness");
    });

    it("60. never renders the current Product itself inside Related Products", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
      );

      renderProductDetail({ ...mockSimpleProduct, relatedProducts: relatedItems });

      // mockSimpleProduct itself ("Comfort Dog Collar") is never part of its own relatedProducts payload —
      // only the two distinct related fixtures render as cards.
      expect(screen.queryAllByRole("link", { name: /Comfort Dog Collar/ })).toHaveLength(0);
    });

    it("61. hides the Related Products section entirely when relatedProducts is empty", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
      );

      renderProductDetail({ ...mockSimpleProduct, relatedProducts: [] });

      expect(screen.queryByRole("heading", { name: "You may also like." })).not.toBeInTheDocument();
    });

    it("62. regression: existing sections (title, price, Add to Cart) are unaffected by Related Products", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
      );

      renderProductDetail({ ...mockSimpleProduct, relatedProducts: relatedItems });

      expect(screen.getByRole("heading", { name: "Comfort Dog Collar" })).toBeInTheDocument();
      expect(inPanel().getByText("₹499")).toBeInTheDocument();
      expect(inPanel().getByRole("button", { name: /Add to Cart/i })).toBeInTheDocument();
    });
  });

  describe("Mobile sticky Add to Cart bar", () => {
    const inStickyBar = () => within(screen.getByTestId("pdp-sticky-cta"));

    it("63. renders a sticky Add to Cart bar mirroring the desktop panel action", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
      );

      renderProductDetail(mockSimpleProduct);

      const bar = screen.getByTestId("pdp-sticky-cta");
      expect(bar).toHaveClass("md:hidden"); // hidden from the md breakpoint up
      expect(bar).toHaveClass("fixed");
      expect(inStickyBar().getByRole("button", { name: /Add to Cart/i })).toBeEnabled();
    });

    it("64. sticky Add to Cart calls the same cart action and payload as the panel", async () => {
      const fetchMock = setupMockFetch(async (url, init) => {
        if (url.includes("/auth/refresh") || url.includes("/auth/me")) {
          return jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401);
        }
        if (url.includes("/storefront/cart/items") && init?.method === "POST") {
          return jsonResponse({ success: true, data: { id: 7, status: "active", itemCount: 1, subtotal: "499.00", items: [] } });
        }
        return undefined;
      });

      renderProductDetail(mockSimpleProduct);

      fireEvent.click(inStickyBar().getByRole("button", { name: /Add to Cart/i }));

      await waitFor(() => {
        expect(screen.getByText("Added to cart successfully!")).toBeInTheDocument();
      });

      const cartPosts = fetchMock.mock.calls.filter(
        (call) => call[0].toString().includes("/storefront/cart/items") && call[1]?.method === "POST"
      );
      expect(cartPosts).toHaveLength(1); // no duplicate cart request
      expect(JSON.parse(cartPosts[0]![1]!.body as string)).toEqual({ productId: 101, quantity: 1 });
      expect(inStickyBar().getByRole("button", { name: /Added to Cart/i })).toBeInTheDocument();
    });

    it("65. sticky bar shows the existing loading treatment while a request is in flight", async () => {
      let resolveAdd: (v: unknown) => void = () => {};
      setupMockFetch(async (url, init) => {
        if (url.includes("/auth/refresh") || url.includes("/auth/me")) {
          return jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401);
        }
        if (url.includes("/storefront/cart/items") && init?.method === "POST") {
          return new Promise((resolve) => {
            resolveAdd = resolve;
          });
        }
        return undefined;
      });

      renderProductDetail(mockSimpleProduct);

      const stickyButton = inStickyBar().getByRole("button", { name: /Add to Cart/i });
      fireEvent.click(stickyButton);

      await waitFor(() => {
        expect(inStickyBar().getByRole("button", { name: /Adding\.\.\./i })).toBeDisabled();
      });

      await act(async () => {
        resolveAdd(jsonResponse({ success: true, data: { id: 7, status: "active", itemCount: 1, subtotal: "499.00", items: [] } }));
      });
    });

    it("66. sticky bar reflects the out-of-stock state with the existing wording", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
      );

      renderProductDetail({ ...mockSimpleProduct, stock: 0 });

      expect(inStickyBar().getByRole("button", { name: /Out of Stock/i })).toBeDisabled();
      expect(inStickyBar().getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
      expect(inStickyBar().getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    });

    it("66b. sticky Add to Cart shows the product's real current price", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
      );

      renderProductDetail(mockSimpleProduct); // price "499.00", compareAtPrice "599.00"

      const stickyButton = inStickyBar().getByRole("button", { name: /Add to Cart/i });
      // Price is rendered in the bar and announced in the button's accessible name.
      expect(stickyButton).toHaveAccessibleName(/₹499/);
      expect(within(screen.getByTestId("pdp-sticky-cta")).getByText("₹499")).toBeInTheDocument();
      expect(within(screen.getByTestId("pdp-sticky-cta")).getByText("₹599")).toBeInTheDocument(); // struck-through compare price
    });

    it("66c. sticky price follows the selected variant and starts with a 'From' hint", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
      );

      renderProductDetail(mockVariantProduct); // 3kg Pack "899.00", 10kg Pack "2499.00"

      // Before a variant is chosen the bar shows the starting price.
      expect(within(screen.getByTestId("pdp-sticky-cta")).getByText("From ₹899")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "10kg Pack" }));

      expect(within(screen.getByTestId("pdp-sticky-cta")).getByText("₹2,499")).toBeInTheDocument();
      expect(within(screen.getByTestId("pdp-sticky-cta")).queryByText("From ₹899")).not.toBeInTheDocument();
      expect(inStickyBar().getByRole("button", { name: /Add to Cart/i })).toHaveAccessibleName(/₹2,499/);
    });

    it("67. sticky bar does not bypass variant selection validation", async () => {
      const fetchMock = setupMockFetch(async (url) => {
        if (url.includes("/auth/refresh") || url.includes("/auth/me")) {
          return jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401);
        }
        return undefined;
      });

      renderProductDetail(mockVariantProduct);

      const stickyButton = inStickyBar().getByRole("button", { name: /Select an option/i });
      expect(stickyButton).toBeDisabled();
      fireEvent.click(stickyButton);
      expect(
        fetchMock.mock.calls.some((call) => call[0].toString().includes("/storefront/cart/items"))
      ).toBe(false);

      fireEvent.click(screen.getByRole("button", { name: "3kg Pack" }));
      expect(inStickyBar().getByRole("button", { name: /Add to Cart/i })).toBeEnabled();
    });

    it("68. no sticky bar when a variant product has no purchasable options", async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } }, false, 401)
      );

      renderProductDetail({ ...mockVariantProduct, variants: [] });

      expect(screen.queryByTestId("pdp-sticky-cta")).not.toBeInTheDocument();
    });
  });
});
