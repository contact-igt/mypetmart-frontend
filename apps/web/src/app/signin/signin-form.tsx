"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/context/customer-auth-context";

export function SigninForm() {
  const router = useRouter();
  const { signin, status } = useCustomerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setFormLoading(true);

    try {
      const res = await signin({
        email: email.trim().toLowerCase(),
        password
      });
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
      setError(err?.message || "Invalid credentials.");
    } finally {
      setFormLoading(false);
    }
  };

  const isLoading = status === "loading" || formLoading;

  return (
    <div className="mx-auto my-12 max-w-md rounded-2xl border border-deep-brown bg-white p-6 shadow-md md:p-8">
      <div className="text-center">
        <h2 className="font-baloo text-3xl font-extrabold text-deep-brown">Welcome Back!</h2>
        <p className="mt-2 text-text-primary">Sign in to manage your pet care essentials.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-terracotta/10 p-3 text-sm font-medium text-terracotta border border-terracotta/20"
          >
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="signin-email" className="block text-sm font-semibold text-deep-brown">
            Email Address
          </label>
          <input
            id="signin-email"
            type="email"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-deep-brown/30 bg-cream-bg px-4 py-2 text-text-primary focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
            placeholder="yourname@example.com"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="signin-password" className="block text-sm font-semibold text-deep-brown">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-semibold text-primary-orange hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="signin-password"
              type={showPassword ? "text" : "password"}
              required
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-deep-brown/30 bg-cream-bg px-4 py-2 pr-12 text-text-primary focus:border-primary-orange focus:outline-none focus:ring-2 focus:ring-primary-orange/20"
              placeholder="••••••••"
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

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-primary-orange py-3 font-semibold text-white shadow-sm hover:bg-primary-orange/95 focus:outline-none focus:ring-2 focus:ring-primary-orange/50 disabled:bg-primary-orange/50 transition-colors"
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-primary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-primary-orange hover:underline">
          Sign up here
        </Link>
      </p>
    </div>
  );
}
