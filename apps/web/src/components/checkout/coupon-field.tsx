"use client";

import { useEffect, useRef, useState } from "react";
import type { CartCoupon } from "@/types/storefront";

type CouponFieldProps = {
  coupon: CartCoupon | null | undefined;
  disabled?: boolean;
  busy?: boolean;
  error?: string | null;
  onApply: (code: string) => Promise<void>;
  onRemove: () => Promise<void>;
};

export function CouponField({ coupon, disabled = false, busy = false, error, onApply, onRemove }: CouponFieldProps) {
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // The Remove button unmounts with the applied coupon; hand focus to the input
  // that replaces it instead of letting it fall to <body>.
  const refocusAfterRemoveRef = useRef(false);

  useEffect(() => {
    if (refocusAfterRemoveRef.current && !coupon && !disabled && !busy && inputRef.current) {
      refocusAfterRemoveRef.current = false;
      inputRef.current.focus();
    }
  }, [coupon, disabled, busy]);

  async function remove() {
    refocusAfterRemoveRef.current = true;
    await onRemove();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextCode = code.trim();
    if (nextCode) await onApply(nextCode);
  }

  return (
    <section className="border-y border-deep-brown/10 py-4" aria-label="Coupon">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-deep-brown">Coupon</p>
      {coupon ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-mint-sage/30 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-bold text-deep-brown">{coupon.code}</p>
            {!coupon.eligible && coupon.message && <p role="alert" className="mt-1 text-xs font-semibold text-terracotta">{coupon.message}</p>}
          </div>
          <button type="button" onClick={() => void remove()}disabled={disabled || busy} aria-label={`Remove coupon ${coupon.code}`} className="shrink-0 text-xs font-bold text-terracotta hover:underline disabled:opacity-50">
            {busy ? "Removing..." : "Remove"}
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="flex gap-2">
          <label className="sr-only" htmlFor="coupon-code">Coupon code</label>
          <input ref={inputRef} id="coupon-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Coupon code" disabled={disabled || busy} maxLength={40} className="min-w-0 flex-1 rounded-xl border border-deep-brown/20 bg-white px-3 py-2 text-sm font-mono uppercase text-text-primary focus:border-primary-orange focus:outline-none disabled:bg-cream-bg" />
          <button type="submit" disabled={disabled || busy || !code.trim()} className="shrink-0 rounded-xl border border-primary-orange px-3 py-2 text-xs font-bold text-primary-orange hover:bg-peach-hero/30 disabled:opacity-50">
            {busy ? "Applying..." : "Apply"}
          </button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-terracotta">{error}</p>}
    </section>
  );
}
