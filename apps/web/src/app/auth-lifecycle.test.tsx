// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VerifyEmailForm } from "./verify-email/verify-email-form";
import { ForgotPasswordForm } from "./forgot-password/forgot-password-form";
import { ForgotPasswordVerifyForm } from "./forgot-password/verify/forgot-password-verify-form";
import { ResetPasswordForm } from "./reset-password/reset-password-form";
import { CustomerAuthProvider } from "../context/customer-auth-context";
import { AuthTokenStore } from "../lib/auth/auth-api";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams("challengeId=123&maskedEmail=te***@example.com");

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => mockSearchParams,
}));

process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:5000/api/v1";

describe("Stage 8.7: Email Verification & Password Recovery Website UI Tests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    AuthTokenStore.setAccessToken(null);
    mockSearchParams = new URLSearchParams("challengeId=123&maskedEmail=te***@example.com");
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("1. VerifyEmailForm renders 6 digit inputs and handles successful verification", async () => {
    // 1st call: bootstrap refresh (fails → sets status "unauthenticated")
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } })
    } as any);

    render(
      <CustomerAuthProvider>
        <VerifyEmailForm />
      </CustomerAuthProvider>
    );

    // Wait for bootstrap to complete and form to become interactive
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Verify & Continue/i })).not.toBeDisabled();
    });

    expect(screen.getByText(/Verify Your Email/i)).toBeInTheDocument();
    expect(screen.getByText(/te\*\*\*@example.com/i)).toBeInTheDocument();

    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);

    digitsInput("123456", inputs);

    // 2nd call: verifyEmail POST (succeeds)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          accessToken: "mock-access-token",
          user: { id: 1, email: "test@example.com", name: "Test User", role: "customer", referenceCode: "CUS-000001" }
        }
      })
    } as any);

    const submitBtn = screen.getByRole("button", { name: /Verify & Continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/account");
    });
  });

  it("2. ForgotPasswordForm accepts email and redirects to verification page", async () => {
    // 1st call: bootstrap refresh (fails)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } })
    } as any);

    render(
      <CustomerAuthProvider>
        <ForgotPasswordForm />
      </CustomerAuthProvider>
    );

    // Wait for bootstrap to finish
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Send Verification Code/i })).not.toBeDisabled();
    });

    expect(screen.getByText(/Forgot Password\?/i)).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText(/yourname@example.com/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    // 2nd call: forgotPassword POST (succeeds)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          message: "If an account exists for this email, a verification code has been sent.",
          challengeId: 456,
          maskedEmail: "te***@example.com"
        }
      })
    } as any);

    const submitBtn = screen.getByRole("button", { name: /Send Verification Code/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
      const calledWith = mockPush.mock.calls[0][0] as string;
      expect(calledWith).toContain("/forgot-password/verify");
      expect(calledWith).toContain("email=test%40example.com");
      expect(calledWith).not.toContain("challengeId=");
    });
  });

  it("3. ForgotPasswordVerifyForm verifies reset OTP and redirects to /reset-password", async () => {
    // 1st call: bootstrap refresh (fails)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } })
    } as any);

    render(
      <CustomerAuthProvider>
        <ForgotPasswordVerifyForm />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Authorize Password Reset/i })).not.toBeDisabled();
    });

    expect(screen.getByText(/Enter Reset Code/i)).toBeInTheDocument();

    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(6);

    digitsInput("654321", inputs);

    // 2nd call: verifyResetOTP POST (succeeds)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { resetTokenGranted: true }
      })
    } as any);

    const submitBtn = screen.getByRole("button", { name: /Authorize Password Reset/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/reset-password");
    });
  });

  it("4. ResetPasswordForm submits new password and displays completion UI", async () => {
    // 1st call: bootstrap refresh (fails)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { code: "UNAUTHENTICATED", message: "Not authenticated" } })
    } as any);

    render(
      <CustomerAuthProvider>
        <ResetPasswordForm />
      </CustomerAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Update Password/i })).not.toBeDisabled();
    });

    expect(screen.getByText(/Set New Password/i)).toBeInTheDocument();

    const newPass = screen.getByPlaceholderText(/Min. 8 characters/i);
    const confirmPass = screen.getByPlaceholderText(/Repeat your password/i);

    fireEvent.change(newPass, { target: { value: "NewSecurePassword123" } });
    fireEvent.change(confirmPass, { target: { value: "NewSecurePassword123" } });

    // 2nd call: resetPassword POST (succeeds)
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { passwordReset: true }
      })
    } as any);

    const submitBtn = screen.getByRole("button", { name: /Update Password/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Password Reset Complete!/i)).toBeInTheDocument();
    });
  });
});

function digitsInput(code: string, inputs: HTMLElement[]) {
  const digits = code.split("");
  digits.forEach((d, idx) => {
    fireEvent.change(inputs[idx]!, { target: { value: d } });
  });
}
