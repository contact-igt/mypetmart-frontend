// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ContactFormSection } from "./contact-form-section";
import { AuthTokenStore } from "@/lib/auth/auth-api";
import type { StoreProfile } from "@/types/storefront";

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

const TEST_STORE_PROFILE: StoreProfile = {
  storeName: "My Pet Mart",
  supportEmail: "test-support@example.com",
  supportPhone: "+91 90000 00000",
  address: "1 Test Street, Chennai",
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 201 : 400, json: async () => body } as any;
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Priya Sharma" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "priya@example.com" } });
  fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Does this shampoo work for cats?" } });
  fireEvent.click(screen.getByLabelText(/I agree to be contacted/i));
}

describe("ContactFormSection", () => {
  afterEach(() => {
    AuthTokenStore.setAccessToken(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders every existing field", () => {
    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Enquiry type")).toBeInTheDocument();
    expect(screen.getByLabelText("Order number (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(screen.getByLabelText(/I agree to be contacted/i)).toBeInTheDocument();
  });

  it("enforces required fields (name, email, message) before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    fireEvent.click(screen.getByRole("button", { name: /Send message/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires consent before submitting", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Priya Sharma" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "priya@example.com" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Question about a product." } });
    fireEvent.click(screen.getByRole("button", { name: /Send message/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/agree to be contacted/i);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits the correct payload, mapping the selected enquiry type to subject", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: { success: true, enquiryNumber: "ENQ-000042" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Phone (optional)"), { target: { value: "+91 98765 43210" } });
    fireEvent.change(screen.getByLabelText("Enquiry type"), { target: { value: "Order Question" } });
    fireEvent.change(screen.getByLabelText("Order number (optional)"), { target: { value: "ORD-000123" } });
    fireEvent.click(screen.getByRole("button", { name: /Send message/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:5000/api/v1/storefront/contact-enquiries");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Priya Sharma",
      email: "priya@example.com",
      phone: "+91 98765 43210",
      subject: "Order Question",
      orderNumber: "ORD-000123",
      message: "Does this shampoo work for cats?",
    });
  });

  it("omits optional phone and orderNumber from the payload when left blank", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: { success: true, enquiryNumber: "ENQ-000043" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /Send message/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.phone).toBeUndefined();
    expect(body.orderNumber).toBeUndefined();
  });

  it("disables the submit button while submitting to prevent duplicate submission", async () => {
    let resolveFetch!: (value: any) => void;
    const fetchMock = vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    fillRequiredFields();
    const button = screen.getByRole("button", { name: /Send message/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sending/i })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Sending/i }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(jsonResponse({ success: true, data: { success: true, enquiryNumber: "ENQ-000044" } }));
  });

  it("shows the success confirmation with the enquiry reference and resets the form", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: { success: true, enquiryNumber: "ENQ-000045" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /Send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/Thanks, we've received your message/i)).toBeInTheDocument();
    });
    expect(screen.getByText("ENQ-000045")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
    expect(screen.getByLabelText(/I agree to be contacted/i)).not.toBeChecked();
  });

  it("shows a friendly inline error on API failure, without leaking raw error detail", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } }, false)
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /Send message/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Send message/i })).toBeInTheDocument();
  });

  it("remains usable for a guest with no access token set", async () => {
    AuthTokenStore.setAccessToken(null);
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: { success: true, enquiryNumber: "ENQ-000046" } }));
    vi.stubGlobal("fetch", fetchMock);

    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /Send message/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has("Authorization")).toBe(false);
  });
});

// Store-profile display — the phone/email/address values themselves come
// from the backend StoreProfile via the `storeProfile` prop (fetched
// server-side in app/contact/page.tsx, not by this component). page.tsx's
// try/catch guarantees this component only ever receives a complete, valid
// StoreProfile — real data on success, FALLBACK_STORE_PROFILE on API
// failure — so exercising this component with either shape is the correct
// place to prove the displayed values and links are correct; there is no
// Server Component test harness in this codebase to additionally drive the
// fetch-failure path itself.
describe("ContactFormSection store profile display", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the backend support phone, email and address", () => {
    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    expect(screen.getByText(TEST_STORE_PROFILE.supportPhone)).toBeInTheDocument();
    expect(screen.getByText(TEST_STORE_PROFILE.supportEmail)).toBeInTheDocument();
    expect(screen.getByText(TEST_STORE_PROFILE.address)).toBeInTheDocument();
  });

  it("links the phone number with a correct tel: href", () => {
    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    const link = screen.getByRole("link", { name: TEST_STORE_PROFILE.supportPhone });
    expect(link).toHaveAttribute("href", `tel:${TEST_STORE_PROFILE.supportPhone.replace(/\s+/g, "")}`);
  });

  it("links the email with a correct mailto: href", () => {
    render(<ContactFormSection storeProfile={TEST_STORE_PROFILE} />);
    const link = screen.getByRole("link", { name: TEST_STORE_PROFILE.supportEmail });
    expect(link).toHaveAttribute("href", `mailto:${TEST_STORE_PROFILE.supportEmail}`);
  });

  it("renders correctly with a different (e.g. fallback) StoreProfile, proving no hardcoded values leak through", () => {
    const otherProfile: StoreProfile = {
      storeName: "Fallback Pet Mart",
      supportEmail: "fallback@example.com",
      supportPhone: "+91 11111 11111",
      address: "Fallback Address Line",
    };
    render(<ContactFormSection storeProfile={otherProfile} />);
    expect(screen.getByText("fallback@example.com")).toBeInTheDocument();
    expect(screen.getByText("+91 11111 11111")).toBeInTheDocument();
    expect(screen.getByText("Fallback Address Line")).toBeInTheDocument();
    expect(screen.queryByText(TEST_STORE_PROFILE.supportEmail)).not.toBeInTheDocument();
  });
});
