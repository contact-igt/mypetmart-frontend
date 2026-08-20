"use client";

import { useState } from "react";
import Link from "next/link";
import { NewsletterApi } from "@/lib/newsletter-api";
import { AppAuthError } from "@/lib/auth/auth-errors";

// Unsubscribing is destructive to the subscriber relationship, so it only
// ever fires on an explicit click here — never automatically when the page
// (or an email preview bot) loads with a token in the URL.
type UnsubscribeState = "confirm" | "submitting" | "done" | "invalid" | "missing-token" | "error";

/** Fallback for a lost/expired unsubscribe link — request a fresh one by email. */
function RequestUnsubscribeLinkForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || sending) return;

    setSending(true);
    try {
      await NewsletterApi.resendUnsubscribeLink(trimmedEmail);
    } finally {
      setSending(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <p className="text-sm font-medium text-text-primary/75">
        If that email is subscribed, we&apos;ve sent a link to manage it.
      </p>
    );
  }

  return (
    <form onSubmit={handleRequest} className="mx-auto flex max-w-sm flex-col gap-2 sm:flex-row">
      <label htmlFor="unsubscribe-email" className="sr-only">Email address</label>
      <input
        id="unsubscribe-email"
        type="email"
        autoComplete="email"
        placeholder="you@paws.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        disabled={sending}
        className="h-10 min-w-0 flex-1 rounded-full border border-deep-brown/15 bg-white px-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-deep-brown/30"
      />
      <button
        type="submit"
        disabled={sending}
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-deep-brown px-5 text-xs font-bold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-60"
      >
        {sending ? "Sending…" : "Email me a link"}
      </button>
    </form>
  );
}

export function NewsletterUnsubscribeClient({ token }: { token: string | null }) {
  const [state, setState] = useState<UnsubscribeState>(token ? "confirm" : "missing-token");

  async function handleConfirm() {
    if (!token || state === "submitting") return;
    setState("submitting");

    try {
      await NewsletterApi.unsubscribe(token);
      setState("done");
    } catch (error) {
      if (error instanceof AppAuthError && error.code === "NEWSLETTER_UNSUBSCRIBE_TOKEN_INVALID") {
        setState("invalid");
      } else {
        setState("error");
      }
    }
  }

  if (state === "confirm" || state === "submitting") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Unsubscribe from the newsletter?</h1>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          You&apos;ll stop receiving MyPetMart newsletter emails. You can always subscribe again later.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={state === "submitting"}
            className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors disabled:opacity-60"
          >
            {state === "submitting" ? "Unsubscribing…" : "Unsubscribe"}
          </button>
          <Link href="/" className="text-xs font-bold text-primary-orange hover:underline">
            Cancel
          </Link>
        </div>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">You&apos;ve been unsubscribed</h1>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          You won&apos;t receive any more newsletter emails from MyPetMart.
        </p>
        <Link href="/shop" className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors">
          Continue Shopping
        </Link>
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">This link is no longer valid</h1>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          This unsubscribe link is invalid or has already been used. Enter your email and we&apos;ll send a fresh one.
        </p>
        <RequestUnsubscribeLinkForm />
        <Link href="/" className="text-xs font-bold text-primary-orange hover:underline">
          Return Home
        </Link>
      </div>
    );
  }

  if (state === "missing-token") {
    return (
      <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
        <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Unsubscribe from the newsletter</h1>
        <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
          Use the unsubscribe link from your email, or enter your email below and we&apos;ll send you one.
        </p>
        <RequestUnsubscribeLinkForm />
        <Link href="/" className="text-xs font-bold text-primary-orange hover:underline">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center shadow-xs space-y-5">
      <h1 className="font-baloo text-2xl font-extrabold text-deep-brown">Something went wrong</h1>
      <p className="mt-2 text-sm text-text-primary/75 max-w-md mx-auto">
        We couldn&apos;t process your request. Please try again later.
      </p>
      <Link href="/" className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors">
        Return Home
      </Link>
    </div>
  );
}
