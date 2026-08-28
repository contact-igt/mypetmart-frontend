// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryGrid } from "./category-grid";
import type { Category } from "@/types/storefront";

describe("Home Shop by Pet section", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://api.test");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  async function renderCategoryGrid() {
    render(await CategoryGrid());
  }

  it("renders categories returned by the Show on Homepage API", async () => {
    const categories: Category[] = [
      {
        id: 11,
        name: "Puppy Care",
        slug: "puppy-care",
        description: "Essentials for growing dogs with grooming, walking, feeding, and wellness basics in one tidy category.",
        petType: "dog",
        displayOrder: 1,
        imageUrl: null,
        imageAlt: null,
      },
      {
        id: 12,
        name: "Senior Cats",
        slug: "senior-cats",
        description: "Comfort for older cats",
        petType: "cat",
        displayOrder: 2,
        imageUrl: null,
        imageAlt: null,
      },
      {
        id: 13,
        name: "Small Pet Care",
        slug: "small-pet-care",
        description: "Essentials for little companions",
        petType: "all",
        displayOrder: 3,
        imageUrl: null,
        imageAlt: null,
      },
    ];
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: categories }) }));
    vi.stubGlobal("fetch", fetchMock);

    await renderCategoryGrid();

    expect(screen.getByRole("heading", { name: "Who are you shopping for?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Puppy Care/i })).toHaveAttribute("href", "/shop?petType=dog");
    expect(screen.getByText(/Essentials for growing dogs/i)).toHaveClass("line-clamp-2", "text-xs", "sm:text-sm");
    expect(screen.getByRole("link", { name: /Senior Cats/i })).toHaveAttribute("href", "/shop?petType=cat");
    expect(screen.getByRole("link", { name: /Small Pet Care/i })).toHaveAttribute("href", "/shop?category=small-pet-care");
    expect(screen.getByLabelText("Shop by pet categories")).toHaveClass("grid-cols-1", "md:grid-cols-2");
    const calledUrl = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(calledUrl).toContain("/storefront/categories");
    expect(calledUrl).toContain("showOnHomepage=true");
  });

  it("returns null when the homepage API has no categories", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: [] }) })));

    const view = render(await CategoryGrid());

    expect(view.container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button", { name: "Previous category" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next category" })).not.toBeInTheDocument();
  });

  it("shows an error state with a Retry action when the categories fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ success: false, error: { code: "INTERNAL_ERROR", message: "boom" } }) })));

    await renderCategoryGrid();

    expect(screen.getByText("Unable to load categories. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("recovers into the real category grid after a successful Retry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ success: false, error: { code: "INTERNAL_ERROR", message: "boom" } }) })));

    await renderCategoryGrid();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    const categories: Category[] = [
      {
        id: 21,
        name: "Adult Dogs",
        slug: "adult-dogs",
        description: "Everyday essentials for grown dogs.",
        petType: "dog",
        displayOrder: 1,
        imageUrl: null,
        imageAlt: null,
      },
    ];
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: categories }) })));

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Adult Dogs/i })).toBeInTheDocument();
    });
    expect(screen.queryByText("Unable to load categories. Please try again.")).not.toBeInTheDocument();
  });
});
