// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PdpDeliveryCheck } from "./pdp-delivery-check";
import { DeliveryApi } from "@/lib/delivery-api";

vi.mock("@/lib/delivery-api", () => ({
  DeliveryApi: { check: vi.fn() },
}));

const checkMock = vi.mocked(DeliveryApi.check);

const serviceableWithEta = {
  pincode: "600077",
  serviceable: true as const,
  estimatedDelivery: { min: "2026-08-29", max: "2026-09-01" },
  deliveryCharge: { free: true, amount: "0.00", currency: "INR" },
};

function typePincode(value: string) {
  fireEvent.change(screen.getByLabelText("Delivery pincode"), { target: { value } });
}

beforeEach(() => {
  checkMock.mockReset();
  window.localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PdpDeliveryCheck", () => {
  it("1. initial state: prompt, empty input, disabled Check button", () => {
    render(<PdpDeliveryCheck productId={1} variantId={null} quantity={1} />);
    expect(screen.getByText("Check delivery to your pincode")).toBeInTheDocument();
    expect(screen.getByLabelText("Delivery pincode")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
  });

  it("2. invalid pincode keeps the button disabled and never calls the API", () => {
    render(<PdpDeliveryCheck productId={1} variantId={null} quantity={1} />);
    typePincode("12ab");
    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
    typePincode("12345");
    expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
    expect(checkMock).not.toHaveBeenCalled();
  });

  it("2b. blurring an invalid entry surfaces the 'valid 6-digit pincode' message", () => {
    render(<PdpDeliveryCheck productId={1} variantId={null} quantity={1} />);
    const input = screen.getByLabelText("Delivery pincode");
    fireEvent.change(input, { target: { value: "12xy" } });
    fireEvent.blur(input);
    expect(screen.getByText("Enter a valid 6-digit pincode.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("3. a valid 6-digit pincode enables the button", () => {
    render(<PdpDeliveryCheck productId={1} variantId={null} quantity={1} />);
    typePincode("600077");
    expect(screen.getByRole("button", { name: "Check" })).toBeEnabled();
  });

  it("4. loading state disables the button and shows progress; no duplicate submit", async () => {
    let resolve!: (v: typeof serviceableWithEta) => void;
    checkMock.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<PdpDeliveryCheck productId={7} variantId={null} quantity={2} />);
    typePincode("600077");
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    fireEvent.click(screen.getByRole("button", { name: /Checking/ }));

    expect(screen.getByRole("button", { name: /Checking/ })).toBeDisabled();
    expect(screen.getByText("Checking delivery…")).toBeInTheDocument();

    resolve(serviceableWithEta);
    await waitFor(() => expect(screen.getByText("Delivery available")).toBeInTheDocument());
    expect(checkMock).toHaveBeenCalledTimes(1);
    expect(checkMock).toHaveBeenCalledWith({ pincode: "600077", productId: 7, variantId: undefined, quantity: 2 });
  });

  it("5. success state shows the real ETA window and free delivery, no courier name", async () => {
    checkMock.mockResolvedValue(serviceableWithEta);
    render(<PdpDeliveryCheck productId={1} variantId={9} quantity={1} />);
    typePincode("600077");
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    await waitFor(() => expect(screen.getByText("Delivery available")).toBeInTheDocument());
    expect(screen.getByText("29 Aug – 1 Sep")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Pincode 600077")).toBeInTheDocument();
    expect(screen.queryByText(/delhivery|xpressbees|shadowfax|ekart/i)).not.toBeInTheDocument();
    expect(checkMock).toHaveBeenCalledWith({ pincode: "600077", productId: 1, variantId: 9, quantity: 1 });
  });

  it("6. not-serviceable pincode shows the friendly unavailable message", async () => {
    checkMock.mockResolvedValue({ pincode: "999999", serviceable: false, estimatedDelivery: null, deliveryCharge: null });
    render(<PdpDeliveryCheck productId={1} variantId={null} quantity={1} />);
    typePincode("999999");
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    await waitFor(() =>
      expect(screen.getByText(/we don.t currently deliver to this pincode/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("Try another pincode.")).toBeInTheDocument();
  });

  it("7. API failure shows the technical-error message, not 'unavailable'", async () => {
    checkMock.mockRejectedValue(new Error("boom"));
    render(<PdpDeliveryCheck productId={1} variantId={null} quantity={1} />);
    typePincode("600077");
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    await waitFor(() =>
      expect(screen.getByText("Unable to check delivery right now. Please try again.")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/we don.t currently deliver/i)).not.toBeInTheDocument();
  });

  it("8. serviceable but no ETA shows an honest fallback, not a fabricated date", async () => {
    checkMock.mockResolvedValue({
      pincode: "600077",
      serviceable: true,
      estimatedDelivery: null,
      deliveryCharge: { free: true, amount: "0.00", currency: "INR" },
    });
    render(<PdpDeliveryCheck productId={1} variantId={null} quantity={1} />);
    typePincode("600077");
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    await waitFor(() => expect(screen.getByText("Delivery available")).toBeInTheDocument());
    expect(screen.getByText("Delivery estimate unavailable for this pincode.")).toBeInTheDocument();
  });

  it("9. retry after an error succeeds", async () => {
    checkMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(serviceableWithEta);
    render(<PdpDeliveryCheck productId={1} variantId={null} quantity={1} />);
    typePincode("600077");
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    await waitFor(() => expect(screen.getByText(/Unable to check delivery/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    await waitFor(() => expect(screen.getByText("Delivery available")).toBeInTheDocument());
  });

  it("10. Enter key in the input submits the check", async () => {
    checkMock.mockResolvedValue(serviceableWithEta);
    render(<PdpDeliveryCheck productId={1} variantId={null} quantity={1} />);
    const input = screen.getByLabelText("Delivery pincode");
    fireEvent.change(input, { target: { value: "600077" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => expect(checkMock).toHaveBeenCalledTimes(1));
  });

  it("11. prefills the last-checked pincode from localStorage and persists a new one", async () => {
    window.localStorage.setItem("mypetmart:last-pincode", "560001");
    checkMock.mockResolvedValue(serviceableWithEta);
    render(<PdpDeliveryCheck productId={1} variantId={null} quantity={1} />);
    expect(screen.getByLabelText("Delivery pincode")).toHaveValue("560001");

    typePincode("600077");
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    await waitFor(() => expect(screen.getByText("Delivery available")).toBeInTheDocument());
    expect(window.localStorage.getItem("mypetmart:last-pincode")).toBe("600077");
  });

  it("12. changing the selected variant clears a stale result", async () => {
    checkMock.mockResolvedValue(serviceableWithEta);
    const { rerender } = render(<PdpDeliveryCheck productId={1} variantId={1} quantity={1} />);
    typePincode("600077");
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    await waitFor(() => expect(screen.getByText("Delivery available")).toBeInTheDocument());

    rerender(<PdpDeliveryCheck productId={1} variantId={2} quantity={1} />);
    expect(screen.queryByText("Delivery available")).not.toBeInTheDocument();
    // the typed pincode is kept
    expect(screen.getByLabelText("Delivery pincode")).toHaveValue("600077");
  });
});
