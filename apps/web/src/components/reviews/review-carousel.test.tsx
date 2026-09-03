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

  it("16. single-card PDP carousel renders custom arrows and no pagination dots", () => {
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

  it("15. homepage/default carousel renders zero pagination dots with multiple reviews", () => {
    const reviews = [1, 2, 3, 4].map((n) => ({
      id: n,
      rating: 5,
      title: `Review ${n}`,
      review: `Body ${n}`,
      customerName: `Customer ${n}`,
      verifiedPurchase: n % 2 === 0,
      product: { id: 4, name: "Brush", slug: "brush", image: null },
    }));
    const { container } = render(<ReviewCarousel reviews={reviews} />);

    expect(container.querySelector(".slick-dots")).not.toBeInTheDocument();
    expect(container.querySelectorAll("li.slick-active")).toHaveLength(0);
  });

  it("17 & 18. keeps prev/next navigation and the swipeable slick track", () => {
    const reviews = [1, 2, 3].map((n) => ({
      id: n,
      rating: 4,
      title: `Review ${n}`,
      review: `Body ${n}`,
      customerName: `Customer ${n}`,
      verifiedPurchase: false,
      product: { id: 4, name: "Brush", slug: "brush", image: null },
    }));
    const { container } = render(<ReviewCarousel reviews={reviews} showArrows />);

    expect(screen.getAllByRole("button", { name: "Previous review" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Next review" }).length).toBeGreaterThan(0);
    // react-slick's swipeable/touch container is still rendered.
    expect(container.querySelector(".slick-list")).toBeInTheDocument();
    expect(container.querySelector(".slick-track")).toBeInTheDocument();
  });

  it("20. maps a supplied review date into the single-card presentation", () => {
    render(
      <ReviewCarousel
        reviews={[{
          id: 7,
          rating: 4,
          title: "A review with useful detail",
          review: "The full customer review remains readable in the PDP presentation.",
          customerName: "Pet Parent",
          verifiedPurchase: false,
          reviewDate: "2026-08-14",
          createdAt: "2026-09-02T00:00:00.000Z",
          product: { id: 9, name: "A long product name that should wrap naturally", slug: "daily-brush", image: null },
        }]}
        compact
        showHeader={false}
        singleCard
      />
    );

    expect(screen.getByRole("region", { name: "Product reviews" })).toBeInTheDocument();
    expect(screen.getByText("A long product name that should wrap naturally")).toBeInTheDocument();
    // reviewDate wins over createdAt.
    expect(screen.getByText("14 Aug 2026")).toBeInTheDocument();
    expect(screen.queryByText("2 Sep 2026")).not.toBeInTheDocument();
  });
});
