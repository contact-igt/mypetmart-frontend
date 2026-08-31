"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentApi } from "@/lib/payment-api";
import type { BreezeStartPaymentParamsJSON, InitiatePaymentInput } from "@/types/payment";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { storeGuestPaymentToken } from "@/app/order/payment/guest-payment-token";
import { breezeSendOtp, breezeStartPayment, breezeVerifyOtp, initBreeze, terminateBreeze } from "@/lib/breeze/blaze-sdk";
import type { BreezeCallbackEvent } from "@/lib/breeze/types";

type BreezePayButtonProps = {
  input: InitiatePaymentInput;
  className?: string;
};

type Phase =
  | "idle"
  | "initiating"
  | "phone"
  | "sending-otp"
  | "otp"
  | "verifying-otp"
  | "starting-payment"
  | "exited";

const DEFAULT_COUNTRY_CODE = "+91"; // India-only store. Multi-country is out of scope for this phase.
const RESEND_COOLDOWN_SECONDS = 30;

function lc(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/**
 * Breeze online payment: MyPetMart's own checkout UI stays exactly as it is
 * up to this point; this component runs only the documented Breeze Web SDK
 * flow `sendOTP -> verifyOTP -> startPayment`, then hands the browser to the
 * existing (non-authoritative) /order/payment/result page, which reconciles
 * the real outcome with the backend. It never marks anything paid.
 *
 * TODO — BREEZE CONFIRMATION REQUIRED (isolated; everything else works):
 *   A. verifyOTP -> startPayment handoff. The docs give startPayment a
 *      `customerId` field ("from your system or Breeze") and verifyOTP
 *      returns `customer.customerId` + `token`. We pass `customer.customerId`.
 *      Unconfirmed: whether startPayment also needs the `token`, or relies on
 *      an implicit authenticated SDK session established by verifyOTP.
 *   B. What startPayment renders on web for the Independent platform. Its
 *      documented response is only `{ status, message, paymentId, orderId }`
 *      (no redirectionUrl / sessionToken). We wait for the documented
 *      `processResult` event and then reconcile via the backend regardless.
 *   C. Whether an S2S webhook fires for this flow (backend side).
 */
export function BreezePayButton({ input, className }: BreezePayButtonProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  const paramsRef = useRef<BreezeStartPaymentParamsJSON | null>(null);
  const otpSessionRef = useRef<string | null>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    return () => {
      terminateBreeze();
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const goToResult = useCallback(
    (outcome: "success" | "failure") => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      const params = paramsRef.current;
      if (input.guestAccessToken) {
        storeGuestPaymentToken(input.guestAccessToken);
      }
      const query = new URLSearchParams({ provider: "breeze", status: outcome });
      if (params?.orderId) query.set("orderId", String(params.orderId));
      router.push(`/order/payment/result?${query.toString()}`);
    },
    [input.guestAccessToken, router],
  );

  const runStartPayment = useCallback((customerId: string) => {
    const params = paramsRef.current;
    if (!params) return;
    setPhase("starting-payment");
    setError(null);
    breezeStartPayment({
      orderId: params.orderRef,
      amount: params.amountPaise,
      currency: params.currency,
      customerId,
      customerPhone: params.customerPhone,
      ...(params.customerEmail ? { customerEmail: params.customerEmail } : {}),
      ...(params.customerName ? { customerName: params.customerName } : {}),
      returnUrl: params.returnUrl,
    });
  }, []);

  const handleEvent = useCallback(
    (event: BreezeCallbackEvent) => {
      const p = event.payload ?? {};
      const eventName = lc(p.eventName);
      const action = lc(p.action);
      const status = lc(p.status);

      // In-checkout lifecycle events — UX/analytics only, never authoritative.
      if (eventName === "eventstream" || eventName === "initiate" || eventName === "terminate") {
        return;
      }

      if (action === "sendotp") {
        if (status === "success" && typeof p.otpSessionToken === "string") {
          otpSessionRef.current = p.otpSessionToken;
          setPhase("otp");
          setResendIn(RESEND_COOLDOWN_SECONDS);
          setError(null);
        } else {
          setPhase("phone");
          setError(p.message || "We couldn't send the OTP. Please check the number and try again.");
        }
        return;
      }

      if (action === "verifyotp") {
        const customerId = p.customer?.customerId;
        if (status === "success" && typeof customerId === "string" && customerId.length > 0) {
          runStartPayment(customerId);
        } else {
          setPhase("otp");
          setError(p.message || "That OTP didn't match. Please try again.");
        }
        return;
      }

      // startPayment "process" ack — payment flow launched; wait for processResult.
      if (eventName === "process" && action === "startpayment") {
        if (status === "error") {
          setPhase("exited");
          setError(p.message || "We couldn't start the payment. Please try again.");
        }
        return;
      }

      // Final outcome.
      if (eventName === "processresult") {
        switch (status) {
          case "success":
          case "payment_success":
          case "partially_paid":
          case "pending":
            // Any of these mean "leave it to server verification" — the
            // result page polls the backend, which only flips to paid on the
            // Breeze S2S webhook.
            goToResult("success");
            return;
          case "failed":
            goToResult("failure");
            return;
          case "backpressed":
          case "closeapp":
            setPhase("exited");
            setError(null);
            return;
          default:
            goToResult("success"); // unknown -> let the backend decide, never a dead end
            return;
        }
      }
    },
    [goToResult, runStartPayment],
  );

  const beginBreeze = useCallback(async () => {
    if (phase !== "idle" && phase !== "exited") return;
    setPhase("initiating");
    setError(null);
    try {
      const params = await PaymentApi.breezeInitiate(input);
      paramsRef.current = params;
      initBreeze({ merchantId: params.merchantId, shopUrl: params.shopUrl, environment: params.environment }, handleEvent);
      setPhone(params.customerPhone || "");
      setPhase("phone");
    } catch (err: unknown) {
      if (err instanceof AppAuthError && err.code === "ORDER_ALREADY_PAID") {
        goToResult("success");
        return;
      }
      setPhase("idle");
      setError(err instanceof AppAuthError ? err.message || "Unable to start Breeze payment." : "Unable to start Breeze payment. Please try again.");
    }
  }, [phase, input, handleEvent, goToResult]);

  const sendOtp = useCallback(() => {
    const digits = phone.replace(/\D/gu, "").slice(-10);
    if (digits.length !== 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    setPhase("sending-otp");
    setError(null);
    breezeSendOtp({ phoneNumber: digits, countryCode: DEFAULT_COUNTRY_CODE });
  }, [phone]);

  const verifyOtp = useCallback(() => {
    const code = otp.replace(/\D/gu, "");
    const session = otpSessionRef.current;
    if (code.length < 4 || code.length > 6) {
      setError("Enter the OTP sent to your mobile.");
      return;
    }
    if (!session) {
      setError("Your OTP session expired. Please request a new OTP.");
      setPhase("phone");
      return;
    }
    setPhase("verifying-otp");
    setError(null);
    breezeVerifyOtp({ otp: code, otpSessionToken: session });
  }, [otp]);

  const resendOtp = useCallback(() => {
    if (resendIn > 0) return;
    setOtp("");
    sendOtp();
  }, [resendIn, sendOtp]);

  // ---- render -------------------------------------------------------------

  const busy = phase === "initiating" || phase === "sending-otp" || phase === "verifying-otp" || phase === "starting-payment";

  return (
    <div className={className}>
      {phase === "idle" && (
        <button
          type="button"
          onClick={beginBreeze}
          className="w-full rounded-xl bg-primary-orange py-3 text-xs font-bold text-white hover:bg-terracotta transition-colors"
        >
          Pay with Breeze
        </button>
      )}

      {phase === "initiating" && <p className="text-xs font-medium text-deep-brown/70 text-center">Starting secure payment&hellip;</p>}

      {(phase === "phone" || phase === "sending-otp") && (
        <div className="space-y-2 text-left">
          <label htmlFor="breeze-phone" className="block text-xs font-bold text-deep-brown">
            Mobile number
          </label>
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-deep-brown/15 bg-cream-bg px-2.5 py-2 text-xs font-semibold text-deep-brown/70">{DEFAULT_COUNTRY_CODE}</span>
            <input
              id="breeze-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={phase === "sending-otp"}
              placeholder="10-digit mobile number"
              className="min-h-11 flex-1 rounded-lg border border-deep-brown/15 px-3 py-2 text-sm text-deep-brown focus:border-primary-orange focus:outline-none focus:ring-1 focus:ring-primary-orange disabled:opacity-60"
            />
          </div>
          <button
            type="button"
            onClick={sendOtp}
            disabled={phase === "sending-otp"}
            className="w-full rounded-xl bg-primary-orange py-3 text-xs font-bold text-white hover:bg-terracotta transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {phase === "sending-otp" ? "Sending OTP..." : "Send OTP"}
          </button>
          <p className="text-[11px] text-text-primary/60">Breeze sends a one-time password to verify your number, then shows the payment options.</p>
        </div>
      )}

      {(phase === "otp" || phase === "verifying-otp") && (
        <div className="space-y-2 text-left">
          <label htmlFor="breeze-otp" className="block text-xs font-bold text-deep-brown">
            Enter OTP
          </label>
          <input
            id="breeze-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={phase === "verifying-otp"}
            placeholder="4-6 digit code"
            className="min-h-11 w-full rounded-lg border border-deep-brown/15 px-3 py-2 text-center text-base tracking-[0.4em] text-deep-brown focus:border-primary-orange focus:outline-none focus:ring-1 focus:ring-primary-orange disabled:opacity-60"
          />
          <button
            type="button"
            onClick={verifyOtp}
            disabled={phase === "verifying-otp"}
            className="w-full rounded-xl bg-primary-orange py-3 text-xs font-bold text-white hover:bg-terracotta transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {phase === "verifying-otp" ? "Verifying..." : "Verify & Continue to Payment"}
          </button>
          <div className="flex items-center justify-between text-[11px]">
            <button type="button" onClick={() => { setPhase("phone"); setError(null); }} className="font-bold text-primary-orange hover:underline">
              Change number
            </button>
            <button
              type="button"
              onClick={resendOtp}
              disabled={resendIn > 0 || phase === "verifying-otp"}
              className="font-bold text-primary-orange hover:underline disabled:text-deep-brown/40 disabled:no-underline"
            >
              {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
            </button>
          </div>
        </div>
      )}

      {phase === "starting-payment" && (
        <p className="text-xs font-medium text-deep-brown/70 text-center">Opening payment&hellip; complete the payment in the Breeze window.</p>
      )}

      {phase === "exited" && (
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold text-deep-brown">Payment window closed before completion.</p>
          <button
            type="button"
            onClick={() => {
              const customerId = otpSessionRef.current;
              // Re-verified identity is not retained across a close; restart from OTP.
              if (customerId) {
                setPhase("otp");
              } else {
                setPhase("phone");
              }
              setError(null);
            }}
            className="w-full rounded-xl bg-primary-orange py-3 text-xs font-bold text-white hover:bg-terracotta transition-colors"
          >
            Try payment again
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-terracotta text-center">{error}</p>}
      {busy && phase !== "starting-payment" && phase !== "initiating" && (
        <p className="sr-only" role="status">
          Working&hellip;
        </p>
      )}
    </div>
  );
}
