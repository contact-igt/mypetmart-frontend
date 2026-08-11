"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomerAuth } from "@/context/customer-auth-context";

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerification, status } = useCustomerAuth();

  const challengeIdParam = searchParams.get("challengeId");
  const maskedEmailParam = searchParams.get("maskedEmail") || "your email";

  const challengeId = challengeIdParam ? parseInt(challengeIdParam, 10) : 0;

  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [cooldown, setCooldown] = useState<number>(60);
  const canResend = cooldown <= 0;

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/account");
    }
  }, [status, router]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);

    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      const digits = pastedData.split("");
      const newDigits = ["", "", "", "", "", ""];
      digits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join("");

    if (otp.length !== 6) {
      setError("Please enter all 6 digits of your verification code.");
      return;
    }

    if (!challengeId) {
      setError("Invalid or missing challenge session. Please request a new code.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setFormLoading(true);

    try {
      await verifyEmail(challengeId, otp);
      router.push("/account");
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please check your code and try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setError(null);
    setSuccessMsg(null);
    setFormLoading(true);

    try {
      await resendVerification({ challengeId });
      setSuccessMsg("A new verification code has been sent to your email.");
      setCooldown(60);
    } catch (err: any) {
      setError(err?.message || "Failed to resend code. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const isLoading = status === "loading" || formLoading;

  return (
    <div className="mx-auto my-12 max-w-md rounded-2xl border border-deep-brown bg-white p-6 shadow-md md:p-8">
      <div className="text-center">
        <h2 className="font-baloo text-3xl font-extrabold text-deep-brown">Verify Your Email</h2>
        <p className="mt-2 text-text-primary">
          We sent a 6-digit verification code to <span className="font-semibold text-deep-brown">{maskedEmailParam}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-terracotta/10 p-3 text-sm font-medium text-terracotta border border-terracotta/20 text-center"
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="rounded-lg bg-mint-sage/20 p-3 text-sm font-medium text-deep-brown border border-mint-sage/40 text-center"
          >
            {successMsg}
          </div>
        )}

        <div className="flex justify-center gap-2 sm:gap-3">
          {otpDigits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={isLoading}
              className="h-12 w-12 rounded-xl border border-deep-brown/30 bg-cream-bg text-center text-xl font-bold text-deep-brown focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20 disabled:bg-cream-bg/50"
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-primary-orange py-3 font-semibold text-white shadow-sm hover:bg-primary-orange/95 focus:outline-none focus:ring-2 focus:ring-primary-orange/50 disabled:bg-primary-orange/50 transition-colors"
        >
          {isLoading ? "Verifying Code..." : "Verify & Continue"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-text-primary">
        Didn&apos;t receive the code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={!canResend || isLoading}
          className="font-semibold text-primary-orange hover:underline disabled:text-deep-brown/40"
        >
          {canResend ? "Resend code" : `Resend available in ${cooldown}s`}
        </button>
      </div>
    </div>
  );
}
