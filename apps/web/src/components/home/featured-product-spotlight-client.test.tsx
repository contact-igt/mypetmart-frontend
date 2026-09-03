// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeaturedProductSpotlightClient } from "./featured-product-spotlight-client";
import type { ProductDetail } from "@/types/storefront";

const mockPush = vi.fn();
const mockAdd = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

vi.mock("@/context/cart-context", () => ({
  useCart: () => ({ add: mockAdd }),
}));

vi.mock("@/components/product-rating-badge", () => ({
  ProductRatingBadge: ({ productId }: { productId: number }) => (
    <a href="#product-reviews" data-testid="spotlight-rating">
      5.0 ({productId} verified reviews)
    </a>
  ),
}));

const product: ProductDetail = {
  id: 42,
  name: "Pet Grooming Brush",
  slug: "pet-grooming-brush",
  sku: "BRUSH-42",
  brand: null,
  description: "A gentle brush for everyday grooming.",
  petType: "dog",
  price: "1399.00",
  compareAtPrice: "2999.00",
  stock: 8,
  hasVariants: false,
  featured: true,
  inStock: true,
  category: { id: 1, name: "Grooming", slug: "grooming", petType: "dog" },
  primaryImage: null,
  tags: [],
  metaTitle: null,
  metaDescription: null,
  weightGrams: null,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  howToUse: null,
  careInstructions: null,
  safetyInfo: null,
  variants: [],
  images: [],
  features: [
    { id: 1, productId: 42, label: "Gentle bristles", displayOrder: 1 },
    { id: 2, productId: 42, label: "One-click cleaning", displayOrder: 2 },
  ],
  specifications: [],
  contentBlocks: [],
  productVideos: [],
  testimonialVideos: [],
  relatedProducts: [],
  faqs: [],
};

describe("FeaturedProductSpotlightClient", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockAdd.mockReset();
    mockAdd.mockResolvedValue({});
  });

  it("renders live product data and routes simple products to option selection", () => {
    render(<FeaturedProductSpotlightClient product={product} />);

    expect(screen.getByRole("heading", { name: "Pet Grooming Brush" })).toBeInTheDocument();
    expect(screen.getByText("₹1,399")).toBeInTheDocument();
    expect(screen.getByText("53% OFF")).toBeInTheDocument();
    expect(screen.getByTestId("spotlight-rating")).toHaveTextContent("5.0 (42 verified reviews)");
    expect(screen.getByText("Gentle bristles")).toBeInTheDocument();
    expect(screen.getByText("Pan-India delivery")).toBeInTheDocument();
    expect(screen.getByText("COD available")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Choose Options" })).toHaveAttribute("href", "/products/pet-grooming-brush");
    expect(screen.queryByRole("button", { name: "Add to Cart" })).not.toBeInTheDocument();
  });

  it("contains the hero product image without cropping or hover zoom", () => {
    const image = {
      id: 7,
      url: "https://r2.example.com/pet-grooming-brush.jpg",
      alt: "Pet grooming brush",
      contentType: "image/jpeg",
      sizeBytes: null,
      width: 1200,
      height: 1200,
      sortOrder: 0,
      isPrimary: true,
    };

    render(<FeaturedProductSpotlightClient product={{ ...product, primaryImage: image, images: [image] }} />);

    const renderedImage = screen.getByRole("img", { name: "Pet grooming brush" });
    expect(renderedImage).toHaveClass("object-contain");
    expect(renderedImage).not.toHaveClass("object-cover");
    expect(renderedImage).not.toHaveClass("hover:scale-[1.015]");
    expect(renderedImage.parentElement).toHaveClass("absolute", "inset-8", "sm:inset-12", "lg:inset-16");
  });

  it("adds then opens Cart for Buy Now", async () => {
    render(<FeaturedProductSpotlightClient product={product} />);

    fireEvent.click(screen.getByRole("button", { name: "Buy Now" }));

    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(42, 1));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/cart"));
  });

  it("routes variant products to details for option selection", () => {
    render(<FeaturedProductSpotlightClient product={{ ...product, hasVariants: true }} />);

    expect(screen.getByRole("link", { name: "Choose Options" })).toHaveAttribute("href", "/products/pet-grooming-brush");
    expect(screen.queryByRole("button", { name: "Add to Cart" })).not.toBeInTheDocument();
  });
});
