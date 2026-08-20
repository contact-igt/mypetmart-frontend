"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NewsletterApi } from "@/lib/newsletter-api";
import { AppAuthError } from "@/lib/auth/auth-errors";

type VerifyState =
  | { kind: "verifying" }
  | { kind: "confirmed"; email: string; unsubscribeToken: string }
  | { kind: "invalid" }
  | { kind: "missing-token" }
  | { kind: "error" };

export function NewsletterVerifyClient({ token }: { token: string | null }) {
  const [state, setState] = useState<VerifyState>(token ? { kind: "verifying" } : { kind: "missing-token" });
  const hasRequested = useRef(false);

  useEffect(() => {
    if (!token || hasRequested.current) return;
    hasRequested.current = true;

    NewsletterApi.verify(token)
      .then((result) => {
        setState({ kind: "confirmed", email: result.email, unsubscribeToken: result.unsubscribeToken });
      })
      .catch((error: unknown) => {
        if (error instanceof AppAuthError && error.code === "NEWSLETTER_VERIFICATION_TOKEN_INVALID") {
          setState({ kind: "invalid" });
        } else {
          setState({ kind: "error" });
        }
      });
  }, [token]);

  if (state.kind === "verifying") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Confirming your subscription&hellip;</h1>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">Please wait a moment.</p>
      </div>
    );
  }

  if (state.kind === "confirmed") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-mint-sage">
          <span className="text-2xl">&#10003;</span>
        </div>
        <div>
          <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Subscription confirmed</h1>
          <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
            You&apos;re now subscribed to the MyPetMart newsletter at {state.email}.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/shop" className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors">
            Continue Shopping
          </Link>
          <Link
            href={`/newsletter/unsubscribe?token=${encodeURIComponent(state.unsubscribeToken)}`}
            className="text-xs font-bold text-primary-orange hover:underline"
          >
            Not you? Unsubscribe
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === "invalid") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">This link is no longer valid</h1>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          This confirmation link is invalid, has expired, or has already been used.
        </p>
        <Link href="/" className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  if (state.kind === "missing-token") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Missing confirmation link</h1>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          Please use the link from your email exactly as sent.
        </p>
        <Link href="/" className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
      <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Something went wrong</h1>
      <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
        We couldn&apos;t confirm your subscription. Please try again later.
      </p>
      <Link href="/" className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors">
        Return Home
      </Link>
    </div>
  );
}
