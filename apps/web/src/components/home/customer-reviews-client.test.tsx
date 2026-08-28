// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerReviewsClient } from "./customer-reviews-client";
import { ReviewApi } from "@/lib/review-api";

vi.mock("@/lib/review-api", () => ({
  ReviewApi: { list: vi.fn() },
}));

const mockList = vi.mocked(ReviewApi.list);

describe("CustomerReviewsClient", () => {
  beforeEach(() => {
    mockList.mockReset();
  });

  it("shows only real review summary and purchase verification data", async () => {
    mockList.mockResolvedValue({
      items: [
        {
          id: 1,
          rating: 5,
          title: "Great brush",
          review: "My dog enjoys grooming now.",
          customerName: "Iyyappan",
          reviewSource: "customer",
          verifiedPurchase: true,
          createdAt: "2026-08-01T00:00:00.000Z",
        },
        {
          id: 2,
          rating: 4,
          title: null,
          review: "Helpful for everyday care.",
          customerName: "Rahul Kumar",
          reviewSource: "admin",
          // Even malformed legacy data must not make an admin Review appear
          // purchase-verified on the Storefront.
          verifiedPurchase: true,
          createdAt: "2026-08-02T00:00:00.000Z",
        },
      ],
      page: 1,
      pageSize: 4,
      total: 2,
      summary: { averageRating: 4.5, reviewCount: 2, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 } },
    });

    render(<CustomerReviewsClient productId={42} />);

    await waitFor(() => expect(screen.getByText("Based on 2 reviews")).toBeInTheDocument());
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Great brush" })).toBeInTheDocument();
    expect(screen.getByText("My dog enjoys grooming now.")).toBeInTheDocument();
    expect(screen.getByText("Iyyappan")).toBeInTheDocument();
    expect(screen.getByText("Rahul Kumar")).toBeInTheDocument();
    expect(screen.queryByText("✓ Verified purchase")).not.toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith(42, { page: 1, pageSize: 4, sort: "newest" });
  });

  it("shows a neutral empty state when no approved reviews are available", async () => {
    mockList.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 4,
      total: 0,
      summary: { averageRating: 0, reviewCount: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    });

    render(<CustomerReviewsClient productId={42} />);

    await waitFor(() => expect(screen.getByText("No approved reviews yet.")).toBeInTheDocument());
    expect(screen.queryByText(/Based on/)).not.toBeInTheDocument();
  });
});
