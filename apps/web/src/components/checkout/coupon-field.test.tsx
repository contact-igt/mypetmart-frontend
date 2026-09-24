import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CouponField } from "./coupon-field";
import type { CartCoupon } from "@/types/storefront";

const applied = { code: "STAGE10", eligible: true } as CartCoupon;

function Harness({ onApply = vi.fn(async () => {}) }: { onApply?: (code: string) => Promise<void> }) {
  const [coupon, setCoupon] = useState<CartCoupon | null>(applied);
  return <CouponField coupon={coupon} onApply={onApply} onRemove={async () => setCoupon(null)} />;
}

describe("CouponField", () => {
  it("moves focus to the coupon input after the coupon is removed", async () => {
    render(<Harness />);
    const remove = screen.getByRole("button", { name: "Remove coupon STAGE10" });
    remove.focus();
    fireEvent.click(remove);
    await waitFor(() => expect(screen.getByLabelText("Coupon code")).toHaveFocus());
  });

  it("submits the normalised code on Enter", async () => {
    const onApply = vi.fn(async () => {});
    render(<CouponField coupon={null} onApply={onApply} onRemove={async () => {}} />);
    const input = screen.getByLabelText("Coupon code");
    fireEvent.change(input, { target: { value: "stage10" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(onApply).toHaveBeenCalledWith("STAGE10"));
  });
});
