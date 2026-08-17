"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useCustomerAuth } from "@/context/customer-auth-context";

export function ResetPasswordForm() {
  const { resetPassword } = useCustomerAuth();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!password || !passwordConfirmation) {
      setError("Please fill in both password fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setFormLoading(true);

    try {
      await resetPassword({ password, passwordConfirmation });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Your reset session may have expired.");
    } finally {
      setFormLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto my-12 max-w-md rounded-2xl border border-deep-brown bg-white p-6 text-center shadow-md md:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint-sage/40 text-3xl">
          ✓
        </div>
        <h2 className="mt-4 font-baloo text-3xl font-extrabold text-deep-brown">Password Reset Complete!</h2>
        <p className="mt-2 text-text-primary">
          Your account password was changed successfully. All other active sessions have been signed out for your security.
        </p>
        <div className="mt-8">
          <Link
            href="/signin"
            className="inline-block w-full rounded-full bg-primary-orange py-3 font-semibold text-white shadow-sm hover:bg-primary-orange/95 focus:outline-none focus:ring-2 focus:ring-primary-orange/50 transition-colors"
          >
            Sign In with New Password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto my-12 max-w-md rounded-2xl border border-deep-brown bg-white p-6 shadow-md md:p-8">
      <div className="text-center">
        <h2 className="font-baloo text-3xl font-extrabold text-deep-brown">Set New Password</h2>
        <p className="mt-2 text-text-primary">Create a strong new password for your MyPetMart account.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-terracotta/10 p-3 text-sm font-medium text-terracotta border border-terracotta/20 text-center"
          >
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="reset-password" className="block text-sm font-semibold text-deep-brown">
            New Password <span className="text-terracotta">*</span>
          </label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              required
              disabled={formLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-deep-brown/30 bg-cream-bg px-4 py-2 pr-12 text-text-primary focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
              placeholder="Min. 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={formLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-deep-brown/60 hover:text-deep-brown focus:outline-none focus:ring-2 focus:ring-primary-orange"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="reset-confirm" className="block text-sm font-semibold text-deep-brown">
            Confirm New Password <span className="text-terracotta">*</span>
          </label>
          <input
            id="reset-confirm"
            type={showPassword ? "text" : "password"}
            required
            disabled={formLoading}
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            className="w-full rounded-lg border border-deep-brown/30 bg-cream-bg px-4 py-2 text-text-primary focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
            placeholder="Repeat your password"
          />
        </div>

        <button
          type="submit"
          disabled={formLoading}
          className="w-full rounded-full bg-primary-orange py-3 font-semibold text-white shadow-sm hover:bg-primary-orange/95 focus:outline-none focus:ring-2 focus:ring-primary-orange/50 disabled:bg-primary-orange/50 transition-colors"
        >
          {formLoading ? "Updating Password..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
