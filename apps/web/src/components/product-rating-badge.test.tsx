// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProductRatingBadge } from "./product-rating-badge";
import { ReviewApi } from "@/lib/review-api";

vi.mock("@/lib/review-api", () => ({
  ReviewApi: { list: vi.fn() },
}));

describe("ProductRatingBadge — static summary mode (Product List DTO data)", () => {
  beforeEach(() => {
    vi.mocked(ReviewApi.list).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("11. renders stars + average + review count straight from a supplied summary, no fetch", () => {
    render(<ProductRatingBadge productId={1} summary={{ averageRating: 4.5, reviewCount: 10 }} />);

    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("(10 reviews)")).toBeInTheDocument();
    expect(ReviewApi.list).not.toHaveBeenCalled();
  });

  it("12. uses the singular 'review' for a reviewCount of 1", () => {
    render(<ProductRatingBadge productId={1} summary={{ averageRating: 5, reviewCount: 1 }} />);

    expect(screen.getByText("(1 review)")).toBeInTheDocument();
  });

  it("13. shows a genuine zero-review state, never a fabricated 5.0, when showZero is set", () => {
    render(<ProductRatingBadge productId={1} summary={{ averageRating: 0, reviewCount: 0 }} showZero />);

    expect(screen.getByText("0 Reviews")).toBeInTheDocument();
    expect(screen.queryByText("5.0")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "0 out of 5 stars" })).toBeInTheDocument();
  });

  it("hides entirely on zero reviews when showZero is not set (existing PDP/Spotlight behavior)", () => {
    const { container } = render(<ProductRatingBadge productId={1} summary={{ averageRating: 0, reviewCount: 0 }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("15. never calls ReviewApi.list when a summary is supplied", async () => {
    render(<ProductRatingBadge productId={1} summary={{ averageRating: 4.2, reviewCount: 18 }} compact />);

    await waitFor(() => expect(screen.getByText("4.2")).toBeInTheDocument());
    expect(ReviewApi.list).not.toHaveBeenCalled();
  });

  it("compact mode renders the parenthesised count without the word 'review'", () => {
    render(<ProductRatingBadge productId={1} summary={{ averageRating: 4.2, reviewCount: 18 }} compact />);

    expect(screen.getByText("(18)")).toBeInTheDocument();
  });
});

describe("ProductRatingBadge — fetch fallback mode (PDP / Spotlight, single product per page)", () => {
  beforeEach(() => {
    vi.mocked(ReviewApi.list).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the summary via ReviewApi.list when no summary prop is supplied", async () => {
    vi.mocked(ReviewApi.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 1,
      total: 3,
      summary: { averageRating: 4, reviewCount: 3, distribution: { 5: 1, 4: 1, 3: 1, 2: 0, 1: 0 } },
    });

    render(<ProductRatingBadge productId={42} />);

    await waitFor(() => expect(screen.getByText("4.0")).toBeInTheDocument());
    expect(ReviewApi.list).toHaveBeenCalledWith(42, { pageSize: 1 });
  });

  it("stays hidden while there are no reviews yet and showZero is not requested", async () => {
    vi.mocked(ReviewApi.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 1,
      total: 0,
      summary: { averageRating: 0, reviewCount: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
    });

    const { container } = render(<ProductRatingBadge productId={42} />);

    await waitFor(() => expect(ReviewApi.list).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
