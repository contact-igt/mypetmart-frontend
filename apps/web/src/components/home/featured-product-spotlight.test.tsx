// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FeaturedProductSpotlight } from "./featured-product-spotlight";
import type { ProductDetail, ProductListItem } from "@/types/storefront";

const { getStorefrontProducts, getStorefrontProductBySlug } = vi.hoisted(() => ({
  getStorefrontProducts: vi.fn(),
  getStorefrontProductBySlug: vi.fn(),
}));

vi.mock("@/lib/storefront-api", () => ({
  getStorefrontProducts,
  getStorefrontProductBySlug,
}));

vi.mock("./featured-product-spotlight-client", () => ({
  FeaturedProductSpotlightClient: ({ product }: { product: ProductDetail }) => (
    <article>{product.name}</article>
  ),
}));

const listItem = { slug: "real-grooming-product" } as ProductListItem;
const detail = { name: "Real Grooming Product" } as ProductDetail;

describe("FeaturedProductSpotlight", () => {
  beforeEach(() => {
    getStorefrontProducts.mockReset();
    getStorefrontProductBySlug.mockReset();
    getStorefrontProductBySlug.mockResolvedValue(detail);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses a real newest active product when no featured product is configured", async () => {
    getStorefrontProducts
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [listItem] });

    render(await FeaturedProductSpotlight());

    expect(screen.getByText("Real Grooming Product")).toBeInTheDocument();
    expect(getStorefrontProducts).toHaveBeenNthCalledWith(1, {
      page: 1,
      pageSize: 1,
      featured: true,
      sort: "newest",
    });
    expect(getStorefrontProducts).toHaveBeenNthCalledWith(2, {
      page: 1,
      pageSize: 1,
      category: "grooming",
      sort: "newest",
    });
    expect(getStorefrontProductBySlug).toHaveBeenCalledWith("real-grooming-product");
  });

  it("uses the selected featured product regardless of its category", async () => {
    getStorefrontProducts.mockResolvedValueOnce({ items: [{ slug: "pet-grooming-brush", featured: true, category: { slug: "pet-combos-brushes" } }] });
    getStorefrontProductBySlug.mockResolvedValueOnce({ name: "Pet Grooming Brush" });
    render(await FeaturedProductSpotlight());
    expect(screen.getByText("Pet Grooming Brush")).toBeInTheDocument();
    expect(getStorefrontProducts).toHaveBeenCalledExactlyOnceWith({ page: 1, pageSize: 1, featured: true, sort: "newest" });
    expect(getStorefrontProductBySlug).toHaveBeenCalledWith("pet-grooming-brush");
  });

  it("falls back to the newest active catalog product when grooming is empty", async () => {
    getStorefrontProducts
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [listItem] });

    render(await FeaturedProductSpotlight());

    expect(screen.getByText("Real Grooming Product")).toBeInTheDocument();
    expect(getStorefrontProducts).toHaveBeenNthCalledWith(3, { page: 1, pageSize: 1, sort: "newest" });
  });

  it("shows an intentional empty state only when the active catalog is genuinely empty", async () => {
    getStorefrontProducts
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [] });

    render(await FeaturedProductSpotlight());

    expect(screen.getByText("New products are coming soon.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse the shop" })).toHaveAttribute("href", "/shop");
  });

  it("distinguishes API failure from a successful empty catalog", async () => {
    const error = new Error("API unavailable");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getStorefrontProducts.mockRejectedValueOnce(error);

    render(await FeaturedProductSpotlight());

    expect(screen.getByText("We couldn’t load a featured product right now.")).toBeInTheDocument();
    expect(screen.queryByText("New products are coming soon.")).not.toBeInTheDocument();
    expect(log).toHaveBeenCalledWith("Homepage featured product request failed", error);
  });
});
