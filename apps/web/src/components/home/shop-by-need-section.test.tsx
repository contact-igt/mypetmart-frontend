// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShopByNeedSection } from "./shop-by-need-section";

describe("ShopByNeedSection", () => {
  it("renders the six default need cards with their established Shop destinations", () => {
    render(<ShopByNeedSection />);

    expect(screen.getByRole("heading", { name: "What does your pet need?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Grooming/i })).toHaveAttribute("href", "/shop?category=grooming");
    expect(screen.getByRole("link", { name: /Walking/i })).toHaveAttribute("href", "/shop?category=walking-essentials");
    expect(screen.getByRole("link", { name: /Paw Care/i })).toHaveAttribute("href", "/shop?category=paw-care");
    expect(screen.getByRole("link", { name: /Everyday Essentials/i })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: /Dog Essentials/i })).toHaveAttribute("href", "/shop?petType=dog");
    expect(screen.getByRole("link", { name: /Cat Essentials/i })).toHaveAttribute("href", "/shop?petType=cat");
  });

  it("uses existing image fallbacks for cards without a local visual", () => {
    render(<ShopByNeedSection />);

    expect(screen.getByRole("img", { name: "Paw Care - Image coming soon" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Everyday Essentials - Image coming soon" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Cat Essentials - Image coming soon" })).toBeInTheDocument();
  });
});
