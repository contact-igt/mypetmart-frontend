"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { NewsletterApi } from "@/lib/newsletter-api";
import { getStorefrontWelcomePopup } from "@/lib/storefront-api";
import type { StorefrontWelcomePopup } from "@/types/storefront";

const DEFAULT_DELAY_MS = 1_200;
const DEFAULT_DISMISSAL_COOLDOWN_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1_000;
const ALWAYS_SHOW_IN_LOCAL_DEVELOPMENT = process.env.NODE_ENV === "development";
type SubmitState = "idle" | "submitting" | "success" | "error";

const sessionKey = (id: number) => `mypetmart:welcome-popup:shown:${id}`;
const dismissalKey = (id: number) => `mypetmart:welcome-popup:dismissed:${id}`;

function readStorage(storage: Storage, key: string): string | null {
  try { return storage.getItem(key); } catch { return null; }
}

function writeStorage(storage: Storage, key: string, value: string): void {
  try { storage.setItem(key, value); } catch { /* Storage can be unavailable in privacy modes. */ }
}

function nonNegativeInteger(value: number | null | undefined, fallback: number, maximum: number): number {
  return Number.isInteger(value) && value! >= 0 && value! <= maximum ? value! : fallback;
}

function isSafeNavigationUrl(value: string | null): value is string {
  return Boolean(value && (/^https?:\/\//iu.test(value) || /^\/(?![\/\\])/u.test(value)));
}

function PopupImage({ popup, rounded }: { popup: StorefrontWelcomePopup; rounded: boolean }) {
  const desktop = popup.desktopImageUrl;
  const mobile = popup.mobileImageUrl ?? desktop;
  if (!desktop) return null;
  return <picture className={`block h-full min-h-0 w-full overflow-hidden ${rounded ? "rounded-t-[1.4rem] sm:rounded-l-[1.4rem] sm:rounded-tr-none" : ""}`}><source media="(max-width: 639px)" srcSet={mobile ?? undefined} /><img src={desktop} alt={popup.mobileImageAlt ?? popup.desktopImageAlt ?? ""} className="h-full w-full object-cover" /></picture>;
}

type FormProps = { popup: StorefrontWelcomePopup; email: string; submitState: SubmitState; message: string; onEmailChange: (value: string) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; inputRef: React.RefObject<HTMLInputElement | null> };

function EmailForm({ popup, email, submitState, message, onEmailChange, onSubmit, inputRef }: FormProps) {
  return <form onSubmit={onSubmit} className="mt-5"><label className="sr-only" htmlFor={`welcome-popup-email-${popup.id}`}>Email address</label><input id={`welcome-popup-email-${popup.id}`} ref={inputRef} name="email" type="email" autoComplete="email" required disabled={submitState === "submitting" || submitState === "success"} value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="Email address" className="h-11 w-full border border-deep-brown/20 bg-white px-4 text-sm text-text-primary outline-none placeholder:text-text-primary/45 focus:border-primary-orange focus:ring-2 focus:ring-primary-orange/25 disabled:opacity-60" /><button data-welcome-popup-primary type="submit" disabled={submitState === "submitting" || submitState === "success"} className="mt-2 h-11 w-full bg-deep-brown px-4 text-sm font-bold uppercase tracking-[0.04em] text-white transition-opacity hover:opacity-90 disabled:opacity-60">{submitState === "submitting" ? "Subscribing…" : submitState === "success" ? "Check your inbox" : popup.ctaLabel}</button>{message && <p className={`mt-3 text-xs font-medium ${submitState === "error" ? "text-terracotta" : "text-text-primary/75"}`} role={submitState === "error" ? "alert" : "status"}>{message}</p>}</form>;
}

function NavigationCta({ popup }: { popup: StorefrontWelcomePopup }) {
  if (!isSafeNavigationUrl(popup.ctaUrl)) return null;
  return <a data-welcome-popup-primary href={popup.ctaUrl} className="mt-5 flex h-11 w-full items-center justify-center bg-deep-brown px-4 text-sm font-bold uppercase tracking-[0.04em] text-white transition-opacity hover:opacity-90">{popup.ctaLabel}</a>;
}

type ContentProps = { popup: StorefrontWelcomePopup; onDismiss: () => void; action: React.ReactNode; showConsent: boolean };

function CouponOffer({ code, dark }: { code: string; dark?: boolean }) {
  const router = useRouter();
  const { applyCoupon, isUpdatingCoupon } = useCart();
  const [status, setStatus] = useState("");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Coupon code copied.");
    } catch {
      setStatus("Select and copy the coupon code.");
    }
  }

  async function applyInCart() {
    setStatus("");
    try {
      await applyCoupon(code);
      router.push("/cart");
    } catch (error) {
      setStatus(error instanceof AppAuthError ? error.message : "This coupon could not be applied to the current cart.");
    }
  }

  return <div className={`mt-4 border p-3 ${dark ? "border-white/20 text-white" : "border-deep-brown/20 text-text-primary"}`}><p className="text-xs font-medium">Coupon code</p><div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold" aria-label={`Coupon code ${code}`}>{code}</code><button type="button" onClick={copyCode} className="shrink-0 text-xs font-semibold underline underline-offset-4">Copy</button></div><button type="button" onClick={applyInCart} disabled={isUpdatingCoupon} className={`mt-3 h-10 w-full px-3 text-sm font-bold disabled:opacity-60 ${dark ? "bg-white text-deep-brown" : "bg-deep-brown text-white"}`}>{isUpdatingCoupon ? "Checking..." : "Apply in cart"}</button><p className={`mt-2 text-[11px] ${dark ? "text-white/70" : "text-text-primary/60"}`}>{status || "Eligibility and savings are confirmed from your cart."}</p></div>;
}

function TemplateOne({ popup, onDismiss, action, showConsent }: ContentProps) {
  const description = popup.description && <p className="mt-4 text-sm leading-relaxed text-text-primary/75">{popup.description}</p>;
  return <div className="grid h-[min(32rem,calc(100vh-2rem))] overflow-y-auto sm:grid-cols-[0.94fr_1.06fr]"><PopupImage popup={popup} rounded /><div className="relative flex flex-col justify-center p-6 sm:p-8"><CloseButton onDismiss={onDismiss} dark /><h2 id={`welcome-popup-title-${popup.id}`} className="max-w-[19rem] bg-gradient-to-r from-primary-orange to-deep-brown bg-clip-text text-3xl font-bold leading-[0.95] tracking-[-0.045em] text-transparent sm:text-4xl">{popup.heading}</h2>{popup.ctaMode === "navigation" && description}<div className="[&>form>input]:rounded-full [&>form>button]:rounded-full [&>form>button]:bg-primary-orange [&>a]:rounded-full [&>a]:bg-primary-orange">{action}</div>{popup.couponCode && <CouponOffer code={popup.couponCode} />}{popup.ctaMode !== "navigation" && description}{showConsent && popup.consentText && <p className="mt-3 text-[11px] leading-relaxed text-text-primary/60">{popup.consentText}</p>}{popup.dismissLabel && <button type="button" onClick={onDismiss} className="mt-5 text-sm font-semibold text-text-primary underline underline-offset-4 hover:no-underline">{popup.dismissLabel}</button>}</div></div>;
}

function TemplateTwo({ popup, onDismiss, action, showConsent }: ContentProps) {
  const description = popup.description && <p className="mt-3 line-clamp-9 text-sm leading-relaxed text-white/80">{popup.description}</p>;
  return <div className="grid h-[min(32rem,calc(100vh-2rem))] overflow-y-auto sm:grid-cols-2"><div className="min-h-56 bg-primary-orange sm:h-full"><PopupImage popup={popup} rounded={false} /></div><div className="relative flex flex-col justify-center bg-deep-brown p-6 text-white sm:p-8"><CloseButton onDismiss={onDismiss} /><h2 id={`welcome-popup-title-${popup.id}`} className="pr-8 text-3xl font-bold leading-[0.95] tracking-[-0.045em] text-white sm:text-4xl">{popup.heading}</h2>{popup.offerLabel && <p className="mt-5 text-3xl font-bold leading-[0.95] tracking-[-0.045em] text-primary-orange sm:text-4xl">{popup.offerLabel}</p>}{popup.ctaMode === "navigation" && description}<div className="[&>form>input]:border-0 [&>form>button]:rounded-xl [&>form>button]:bg-white [&>form>button]:text-deep-brown [&>a]:rounded-xl [&>a]:bg-white [&>a]:text-deep-brown">{action}</div>{popup.couponCode && <CouponOffer code={popup.couponCode} dark />}{popup.ctaMode !== "navigation" && description}{showConsent && popup.consentText && <p className="mt-3 text-[11px] leading-relaxed text-white/65">{popup.consentText}</p>}{popup.dismissLabel && <button type="button" onClick={onDismiss} className="mt-5 text-sm font-semibold text-white underline underline-offset-4 hover:no-underline">{popup.dismissLabel}</button>}</div></div>;
}

function CloseButton({ onDismiss, dark = false }: { onDismiss: () => void; dark?: boolean }) {
  return <button type="button" onClick={onDismiss} aria-label="Dismiss welcome offer" className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 ${dark ? "text-text-primary/65 hover:bg-cream-bg focus-visible:ring-primary-orange" : "text-white/80 hover:bg-white/10 focus-visible:ring-white"}`}>×</button>;
}

export function WelcomePopup({ delayMs, dismissalCooldownMs, fetchPopup = getStorefrontWelcomePopup, initialPopup }: { delayMs?: number; dismissalCooldownMs?: number; fetchPopup?: () => Promise<StorefrontWelcomePopup | null>; initialPopup?: StorefrontWelcomePopup | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [popup, setPopup] = useState<StorefrontWelcomePopup | null | undefined>(initialPopup);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => { if (initialPopup !== undefined) return; let cancelled = false; fetchPopup().then((data) => { if (!cancelled) setPopup(data); }).catch(() => { if (!cancelled) setPopup(null); }); return () => { cancelled = true; }; }, [fetchPopup, initialPopup]);

  const mode = popup?.ctaMode ?? "email_signup";
  const configuredDelay = delayMs ?? nonNegativeInteger(popup?.displayDelayMs, DEFAULT_DELAY_MS, 60_000);
  const configuredCooldown = dismissalCooldownMs ?? nonNegativeInteger(popup?.dismissalCooldownDays, DEFAULT_DISMISSAL_COOLDOWN_DAYS, 365) * DAY_MS;

  useEffect(() => {
    if (!popup) return;
    const dismissedAt = Number(readStorage(window.localStorage, dismissalKey(popup.id)) ?? 0);
    if (!ALWAYS_SHOW_IN_LOCAL_DEVELOPMENT && (readStorage(window.sessionStorage, sessionKey(popup.id)) || (dismissedAt > 0 && Date.now() - dismissedAt < configuredCooldown))) return;
    const timer = window.setTimeout(() => { writeStorage(window.sessionStorage, sessionKey(popup.id), "1"); setVisible(true); }, Math.max(0, configuredDelay));
    return () => window.clearTimeout(timer);
  }, [popup, configuredDelay, configuredCooldown]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (visible) {
      if (!dialog.open) dialog.showModal();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.setTimeout(() => (mode === "email_signup" ? emailRef.current : dialog.querySelector<HTMLElement>("[data-welcome-popup-primary]"))?.focus(), 0);
      return () => { document.body.style.overflow = previousOverflow; };
    }
    if (dialog.open) dialog.close();
  }, [visible, mode]);

  function dismiss() { if (popup) writeStorage(window.localStorage, dismissalKey(popup.id), String(Date.now())); setVisible(false); }
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const trimmedEmail = email.trim(); if (!trimmedEmail) { setSubmitState("error"); setMessage("Enter your email address."); return; } setSubmitState("submitting"); setMessage(""); try { const result = await NewsletterApi.subscribe(trimmedEmail, "welcome_popup"); setSubmitState("success"); setMessage(result.message); if (popup) writeStorage(window.localStorage, dismissalKey(popup.id), String(Date.now())); } catch (error) { setSubmitState("error"); setMessage(error instanceof AppAuthError ? error.message : "Something went wrong. Please try again."); } }

  if (!popup || !visible) return null;
  const action = mode === "navigation" ? <NavigationCta popup={popup} /> : <EmailForm popup={popup} email={email} submitState={submitState} message={message} onEmailChange={setEmail} onSubmit={submit} inputRef={emailRef} />;
  const props = { popup, onDismiss: dismiss, action, showConsent: mode === "email_signup" };
  return <dialog ref={dialogRef} aria-labelledby={`welcome-popup-title-${popup.id}`} className={`m-auto w-[calc(100vw-2rem)] max-w-[48rem] overflow-hidden border-0 p-0 text-text-primary shadow-[0_28px_90px_rgba(43,27,20,0.38)] backdrop:bg-deep-brown/65 ${popup.template === "template_1" ? "rounded-[1.4rem] bg-white" : "rounded-[1.1rem] bg-deep-brown"}`} onCancel={(event) => { event.preventDefault(); dismiss(); }} onClose={dismiss} onClick={(event) => { if (event.target === dialogRef.current) dismiss(); }}><div className="motion-enter">{popup.template === "template_1" ? <TemplateOne {...props} /> : <TemplateTwo {...props} />}</div></dialog>;
}
