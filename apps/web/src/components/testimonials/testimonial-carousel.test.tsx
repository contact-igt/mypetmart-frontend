// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TestimonialCarousel } from "./testimonial-carousel";

describe("TestimonialCarousel", () => {
  it("shows a safe empty state when the testimonial feed is empty", () => {
    render(<TestimonialCarousel testimonials={[]} />);
    expect(screen.getByText("No customer stories are available yet.")).toBeInTheDocument();
  });

  it("renders API testimonials with product context", () => {
    render(<TestimonialCarousel testimonials={[{ id: 1, videoUrl: "https://cdn.example.test/story.mp4", title: "A happy story", caption: "Milo loves it", product: { id: 7, name: "Comfort Collar", slug: "comfort-collar", image: null } }]} />);
    expect(screen.getByText("A happy story")).toBeInTheDocument();
    expect(screen.getByText("Comfort Collar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Comfort Collar/ })).toHaveAttribute("href", "/products/comfort-collar");
  });
});
