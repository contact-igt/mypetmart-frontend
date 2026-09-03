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

  it("renders the available visual for every need card", () => {
    render(<ShopByNeedSection />);

    expect(screen.getByRole("img", { name: "Dog in a yellow sweater" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Puppies and kitten peeking over a table" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Orange and white cat outdoors" })).toBeInTheDocument();
  });
});
