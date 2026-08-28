// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShopExplorer } from "./shop-explorer";

const { mockPush, mockSearchParams } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockSearchParams: new URLSearchParams("searchOpen=1"),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/shop",
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

vi.mock("@/lib/storefront-api", () => ({
  getStorefrontCategories: vi.fn().mockResolvedValue([]),
  getStorefrontProducts: vi.fn().mockResolvedValue({
    items: [],
    total: 0,
    totalPages: 1,
  }),
}));

describe("ShopExplorer mobile search entry point", () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it("reveals and focuses the existing product search input", async () => {
    render(<ShopExplorer />);

    const searchInput = screen.getByRole("searchbox", { name: "Search products" });

    expect(screen.getByRole("button", { name: "Hide Filters" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await waitFor(() => expect(searchInput).toHaveFocus());
  });
});
