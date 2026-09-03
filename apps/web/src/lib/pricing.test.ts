import { describe, it, expect } from "vitest";
import { discountPercent } from "./pricing";

describe("discountPercent", () => {
  it("1. MRP 1199, sale 599 -> 50%", () => {
    expect(discountPercent(599, 1199)).toBe(50);
  });

  it("2. MRP 2999, sale 1399 -> 53%", () => {
    expect(discountPercent(1399, 2999)).toBe(53);
  });

  it("3. MRP 4999, sale 3499 -> 30%", () => {
    expect(discountPercent(3499, 4999)).toBe(30);
  });

  it("4. MRP equals sale -> no badge", () => {
    expect(discountPercent(999, 999)).toBeNull();
  });

  it("5. MRP lower than sale -> no badge", () => {
    expect(discountPercent(1199, 999)).toBeNull();
  });

  it("6. missing MRP -> no badge", () => {
    expect(discountPercent(599, null)).toBeNull();
    expect(discountPercent(599, undefined)).toBeNull();
  });

  it("invalid price states never render -0%, +20%, NaN%, or Infinity%", () => {
    expect(discountPercent(0, 1199)).toBeNull();
    expect(discountPercent(-10, 1199)).toBeNull();
    expect(discountPercent(599, 0)).toBeNull();
    expect(discountPercent(599, -10)).toBeNull();
    expect(discountPercent(NaN, 1199)).toBeNull();
  });
});
