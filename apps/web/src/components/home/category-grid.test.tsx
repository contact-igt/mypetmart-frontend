// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { CategoryGrid } from "./category-grid";
import type { Category } from "@/types/storefront";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as any;
}

function category(overrides: Partial<Category>): Category {
  return {
    id: 1,
    name: "Grooming",
    slug: "grooming",
    description: null,
    petType: "all",
    displayOrder: 1,
    imageUrl: "https://r2.example.com/grooming.jpg",
    imageAlt: "A dog being groomed",
    ...overrides,
  };
}

async function renderCategoryGrid() {
  const jsx = await CategoryGrid();
  return render(jsx);
}

describe("Home Category Grid (dynamic)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches from the real Storefront Category API with showOnHomepage=true, not the hardcoded fixture", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await renderCategoryGrid();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(calledUrl).toContain("/storefront/categories");
    expect(calledUrl).toContain("showOnHomepage=true");
  });

  it("renders a category's real name and links to the site-wide /shop?category=<slug> convention", async () => {
    const list = [category({ id: 1, name: "Grooming Essentials", slug: "grooming-essentials" })];
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderCategoryGrid();

    const link = screen.getByRole("link", { name: /Grooming Essentials/i });
    expect(link).toHaveAttribute("href", "/shop?category=grooming-essentials");
  });

  it("renders the category's real image with its alt text", async () => {
    const list = [category({ id: 1, name: "Walking Gear", slug: "walking-gear", imageUrl: "https://r2.example.com/walk.jpg", imageAlt: "A dog on a leash" })];
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderCategoryGrid();

    expect(screen.getByRole("img", { name: "A dog on a leash" })).toBeInTheDocument();
  });

  it("falls back to alt=name when imageAlt is missing", async () => {
    const list = [category({ id: 1, name: "Cat Corner", slug: "cat-corner", imageAlt: null })];
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderCategoryGrid();

    expect(screen.getByRole("img", { name: "Cat Corner" })).toBeInTheDocument();
  });

  it("uses the neutral ProductImagePlaceholder fallback (not a broken image) when imageUrl is missing", async () => {
    const list = [category({ id: 1, name: "Paw Care", slug: "paw-care", imageUrl: null })];
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderCategoryGrid();

    expect(screen.getByRole("img", { name: "Paw Care - Image coming soon" })).toBeInTheDocument();
  });

  it("renders at most 5 category tiles even when the API returns more", async () => {
    const list = Array.from({ length: 8 }, (_, i) => category({ id: i + 1, name: `Category ${i + 1}`, slug: `category-${i + 1}`, displayOrder: i + 1 }));
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderCategoryGrid();

    // Only the first 5 (already sorted server-side) should appear.
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole("link", { name: new RegExp(`Category ${i}$`) })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: /Category 6/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Category 7/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Category 8/ })).not.toBeInTheDocument();
  });

  it("renders fewer than 5 category tiles without breaking the static promo and CTA tiles", async () => {
    const list = [
      category({ id: 1, name: "Only Category One", slug: "only-category-one" }),
      category({ id: 2, name: "Only Category Two", slug: "only-category-two" }),
    ];
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: list })));

    await renderCategoryGrid();

    expect(screen.getByRole("link", { name: /Only Category One/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Only Category Two/i })).toBeInTheDocument();
    expect(screen.getByText("Less Fur. More Cuddles.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shop All Products/i })).toHaveAttribute("href", "/shop");
  });

  it("still renders the static promo and CTA tiles when zero categories are curated for the homepage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: [] })));

    await renderCategoryGrid();

    expect(screen.getByText("Less Fur. More Cuddles.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shop All Products/i })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: /See everything/i })).toHaveAttribute("href", "/shop");
  });

  it("does not crash the section when the Category API call fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "boom" } }, false, 500)));

    await renderCategoryGrid();

    // Graceful degradation: static tiles still render, no raw error text leaks to the customer.
    expect(screen.getByText("Less Fur. More Cuddles.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shop All Products/i })).toBeInTheDocument();
    expect(screen.queryByText(/boom/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/INTERNAL_ERROR/i)).not.toBeInTheDocument();
  });

  it("'See everything' always links to /shop", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ success: true, data: [category({})] })));

    await renderCategoryGrid();

    expect(screen.getByRole("link", { name: /See everything/i })).toHaveAttribute("href", "/shop");
  });
});
