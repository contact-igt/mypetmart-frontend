// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReviewCarousel } from "./review-carousel";

describe("ReviewCarousel", () => {
  it("shows only the supplied approved feed items", () => {
    render(<ReviewCarousel reviews={[{ id: 1, rating: 5, title: "Excellent", review: "Our dog loves it.", customerName: "Asha", verifiedPurchase: true, product: { id: 4, name: "Daily Brush", slug: "daily-brush", image: null } }]} />);
    expect(screen.getByText("Excellent")).toBeInTheDocument();
    expect(screen.getByText("Our dog loves it.")).toBeInTheDocument();
    expect(screen.getByText("✓ Verified purchase")).toBeInTheDocument();
    expect(screen.getByText("Daily Brush")).toBeInTheDocument();
  });

  it("renders an empty state", () => {
    render(<ReviewCarousel reviews={[]} />);
    expect(screen.getByText("No approved reviews yet.")).toBeInTheDocument();
  });

  it("keeps the review area in a loading state before data arrives", () => {
    render(<ReviewCarousel reviews={[]} compact showHeader={false} loading />);
    expect(screen.getByLabelText("Loading reviews")).toBeInTheDocument();
    expect(screen.queryByText("No approved reviews yet.")).not.toBeInTheDocument();
  });

  it("uses custom arrows without pagination dots for a single-card carousel", () => {
    const { container } = render(
      <ReviewCarousel
        reviews={[
          { id: 1, rating: 5, title: "First", review: "First review", customerName: "Asha", verifiedPurchase: true, product: { id: 4, name: "Brush", slug: "brush", image: null } },
          { id: 2, rating: 4, title: "Second", review: "Second review", customerName: "Mohan", verifiedPurchase: false, product: { id: 4, name: "Brush", slug: "brush", image: null } },
        ]}
        compact
        showHeader={false}
        singleCard
        showArrows
      />
    );

    expect(screen.getByRole("button", { name: "Previous review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next review" })).toBeInTheDocument();
    expect(container.querySelector(".slick-dots")).not.toBeInTheDocument();
  });

  it("keeps product review details readable in the single-card presentation", () => {
    render(
      <ReviewCarousel
        reviews={[{
          id: 7,
          rating: 4,
          title: "A review with useful detail",
          review: "The full customer review remains readable in the PDP presentation.",
          customerName: "Pet Parent",
          verifiedPurchase: false,
          createdAt: "2026-08-27T00:00:00.000Z",
          product: { id: 9, name: "A long product name that should wrap naturally", slug: "daily-brush", image: null },
        }]}
        compact
        showHeader={false}
        singleCard
        fullReview
      />
    );

    expect(screen.getByRole("region", { name: "Product reviews" })).toBeInTheDocument();
    expect(screen.getByText("A long product name that should wrap naturally")).toBeInTheDocument();
    expect(screen.getByText("27 Aug 2026")).toBeInTheDocument();
  });
});
