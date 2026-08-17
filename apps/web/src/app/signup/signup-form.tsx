"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/context/customer-auth-context";

export function SignupForm() {
  const router = useRouter();
  const { signup, status } = useCustomerAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/account");
    }
  }, [status, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password || !passwordConfirmation) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    if (!termsAccepted) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }

    setError(null);
    setFormLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        passwordConfirmation
      };

      if (phone.trim()) {
        payload.phone = phone.trim();
      }

      const res = await signup(payload);
      if (res?.verificationRequired) {
        const queryParams = new URLSearchParams({
          challengeId: String(res.challengeId),
          maskedEmail: res.maskedEmail || ""
        });
        router.push(`/verify-email?${queryParams.toString()}`);
        return;
      }
      router.push("/account");
    } catch (err: any) {
      setError(err?.message || "Registration failed.");
    } finally {
      setFormLoading(false);
    }
  };

  const isLoading = status === "loading" || formLoading;

  return (
    <div className="mx-auto my-12 max-w-md rounded-2xl border border-deep-brown bg-white p-6 shadow-md md:p-8">
      <div className="text-center">
        <h2 className="font-baloo text-3xl font-extrabold text-deep-brown">Create Account</h2>
        <p className="mt-2 text-text-primary">Join us today to get started with MyPetMart!</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-terracotta/10 p-3 text-sm font-medium text-terracotta border border-terracotta/20"
          >
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="signup-name" className="block text-sm font-semibold text-deep-brown">
            Full Name <span className="text-terracotta">*</span>
          </label>
          <input
            id="signup-name"
            type="text"
            required
            disabled={isLoading}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-deep-brown/30 bg-cream-bg px-4 py-2 text-text-primary focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
            placeholder="John Doe"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="signup-email" className="block text-sm font-semibold text-deep-brown">
            Email Address <span className="text-terracotta">*</span>
          </label>
          <input
            id="signup-email"
            type="email"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-deep-brown/30 bg-cream-bg px-4 py-2 text-text-primary focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
            placeholder="john@example.com"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="signup-phone" className="block text-sm font-semibold text-deep-brown">
            Phone Number <span className="text-xs text-deep-brown/60">(Optional)</span>
          </label>
          <input
            id="signup-phone"
            type="tel"
            disabled={isLoading}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-deep-brown/30 bg-cream-bg px-4 py-2 text-text-primary focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
            placeholder="+1 555-555-5555"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="signup-password" className="block text-sm font-semibold text-deep-brown">
            Password <span className="text-terracotta">*</span>
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-deep-brown/30 bg-cream-bg px-4 py-2 pr-12 text-text-primary focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
              placeholder="Min. 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-deep-brown/60 hover:text-deep-brown focus:outline-none focus:ring-2 focus:ring-primary-orange"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="signup-confirm" className="block text-sm font-semibold text-deep-brown">
            Confirm Password <span className="text-terracotta">*</span>
          </label>
          <input
            id="signup-confirm"
            type={showPassword ? "text" : "password"}
            required
            disabled={isLoading}
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            className="w-full rounded-lg border border-deep-brown/30 bg-cream-bg px-4 py-2 text-text-primary focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
            placeholder="Repeat your password"
          />
        </div>

        <div className="flex items-start gap-3 py-2">
          <input
            id="signup-terms"
            type="checkbox"
            disabled={isLoading}
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-deep-brown/30 text-primary-orange focus:ring-primary-orange"
          />
          <label htmlFor="signup-terms" className="text-sm text-text-primary">
            I accept the MyPetMart terms and privacy policies. (Note: Separate policy pages are coming soon).
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-primary-orange py-3 font-semibold text-white shadow-sm hover:bg-primary-orange/95 focus:outline-none focus:ring-2 focus:ring-primary-orange/50 disabled:bg-primary-orange/50 transition-colors"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-primary">
        Already have an account?{" "}
        <Link href="/signin" className="font-semibold text-primary-orange hover:underline">
          Sign in here
        </Link>
      </p>
    </div>
  );
}
