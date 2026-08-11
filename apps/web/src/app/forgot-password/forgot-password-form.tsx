"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/context/customer-auth-context";

export function ForgotPasswordForm() {
  const router = useRouter();
  const { forgotPassword } = useCustomerAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setError(null);
    setFormLoading(true);

    try {
      await forgotPassword(email);
      const queryParams = new URLSearchParams({
        email: email.trim().toLowerCase()
      });
      router.push(`/forgot-password/verify?${queryParams.toString()}`);
    } catch (err: any) {
      setError(err?.message || "Failed to initiate password reset. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="mx-auto my-12 max-w-md rounded-2xl border border-deep-brown bg-white p-6 shadow-md md:p-8">
      <div className="text-center">
        <h2 className="font-baloo text-3xl font-extrabold text-deep-brown">Forgot Password?</h2>
        <p className="mt-2 text-text-primary">
          Enter your email address and we&apos;ll send you a verification code to reset your password.
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

        <div className="space-y-2">
          <label htmlFor="forgot-email" className="block text-sm font-semibold text-deep-brown">
            Email Address <span className="text-terracotta">*</span>
          </label>
          <input
            id="forgot-email"
            type="email"
            required
            disabled={formLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-deep-brown/30 bg-cream-bg px-4 py-2 text-text-primary focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
            placeholder="yourname@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={formLoading}
          className="w-full rounded-full bg-primary-orange py-3 font-semibold text-white shadow-sm hover:bg-primary-orange/95 focus:outline-none focus:ring-2 focus:ring-primary-orange/50 disabled:bg-primary-orange/50 transition-colors"
        >
          {formLoading ? "Sending Code..." : "Send Verification Code"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-primary">
        Remember your password?{" "}
        <Link href="/signin" className="font-semibold text-primary-orange hover:underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
