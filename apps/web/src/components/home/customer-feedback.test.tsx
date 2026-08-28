import { describe, expect, it, vi } from "vitest";
import { CustomerFeedback } from "./customer-feedback";

vi.mock("@/lib/storefront-api", () => ({
  getStorefrontTestimonials: vi.fn().mockResolvedValue({ testimonials: [{ id: 8, videoUrl: "https://cdn.example.test/paw.mp4", title: "Paws up", caption: null, product: { id: 9, name: "Paw Balm", slug: "paw-balm", image: null } }] }),
}));

vi.mock("@/components/testimonials/testimonial-carousel", () => ({
  TestimonialCarousel: (props: { testimonials: unknown[] }) => <div data-testid="testimonial-carousel" data-count={props.testimonials.length} />,
}));

describe("CustomerFeedback", () => {
  it("loads the global testimonial feed for the homepage", async () => {
    const element = await CustomerFeedback();
    expect(element.props.testimonials).toHaveLength(1);
    expect(element.props.testimonials[0].product.name).toBe("Paw Balm");
  });
});
