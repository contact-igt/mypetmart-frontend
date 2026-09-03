// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CancelPendingOrderButton } from "./cancel-pending-order-button";
import { OrderApi } from "@/lib/order-api";

describe("CancelPendingOrderButton", () => {
  afterEach(() => vi.restoreAllMocks());

  it("requires confirmation and calls the authenticated cancellation route once", async () => {
    const cancelSpy = vi.spyOn(OrderApi, "cancelPendingOrder").mockResolvedValue({ status: "cancelled" } as never);
    const onSuccess = vi.fn();

    render(<CancelPendingOrderButton orderId={42} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel Order" }));

    expect(screen.getByRole("heading", { name: "Cancel this unfinished order?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("dialog").querySelector("button[data-cancel-dialog-autofocus]") as HTMLButtonElement);

    await waitFor(() => expect(cancelSpy).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("disables duplicate confirmation while cancellation is in flight", async () => {
    let resolveRequest!: (value: never) => void;
    const cancelSpy = vi.spyOn(OrderApi, "cancelPendingGuestOrder").mockReturnValue(
      new Promise((resolve) => { resolveRequest = resolve; })
    );

    render(<CancelPendingOrderButton guestToken="opaque-guest-token" onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel Order" }));
    const confirm = screen.getByRole("dialog").querySelector("button[data-cancel-dialog-autofocus]") as HTMLButtonElement;
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();
    resolveRequest({ status: "cancelled" } as never);
  });
});
