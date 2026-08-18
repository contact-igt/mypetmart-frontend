// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReturnApi } from "@/lib/return-api";
import { RequestReturnForm } from "./request-return-form";

describe("RequestReturnForm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("submits the selected replacement resolution with bounded quantity and reason", async () => {
    const create = vi.spyOn(ReturnApi, "create").mockResolvedValue({} as never);
    const submitted = vi.fn();
    render(<RequestReturnForm orderId={12} orderItemId={34} purchasedQuantity={2} onSubmitted={submitted} />);

    fireEvent.click(screen.getByRole("button", { name: "Request Refund or Replacement" }));
    fireEvent.change(screen.getByLabelText("Preferred resolution"), { target: { value: "replacement" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Item arrived damaged" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    await waitFor(() => expect(create).toHaveBeenCalledWith({
      orderId: 12,
      orderItemId: 34,
      quantity: 1,
      reason: "Item arrived damaged",
      resolution: "replacement",
    }));
    expect(submitted).toHaveBeenCalledOnce();
    expect(screen.getByText(/Replacement requested/)).toBeInTheDocument();
  });
});
