// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroSection } from "./hero-section";

vi.mock("next/image", () => ({
  default: (props: React.ComponentProps<"img">) => <img {...props} />,
}));

describe("HeroSection", () => {
  it("renders the new hero structure and keeps its shop destinations", () => {
    render(<HeroSection />);

    expect(
      screen.getByRole("heading", { name: "Better little things for happier pets." })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Shop Best Sellers/i })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: "Explore All Products" })).toHaveAttribute("href", "/shop");
    expect(screen.getByRole("link", { name: /Dogs/i })).toHaveAttribute("href", "/shop?petType=dog");
    expect(screen.getByRole("link", { name: /Cats/i })).toHaveAttribute("href", "/shop?petType=cat");
  });
});
