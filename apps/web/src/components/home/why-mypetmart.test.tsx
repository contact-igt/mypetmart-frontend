// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WhyMyPetMart } from "./why-mypetmart";

describe("WhyMyPetMart", () => {
  it("renders the reference heading and all four existing USP cards", () => {
    render(<WhyMyPetMart />);

    expect(screen.getByRole("heading", { name: "Little things, done well." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Thoughtfully selected" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Small-batch curation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Easy to reach us" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Built with care" })).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
  });
});
