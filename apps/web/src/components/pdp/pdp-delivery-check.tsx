"use client";

import { useId, useRef, useState } from "react";
import { Check, MapPin, X } from "lucide-react";
import { DeliveryApi } from "@/lib/delivery-api";
import type { DeliveryCheckResult } from "@/types/storefront";

const PINCODE_RE = /^[1-9][0-9]{5}$/;
const STORAGE_KEY = "mypetmart:last-pincode";

type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "success"; result: DeliveryCheckResult }
  | { status: "unavailable"; pincode: string }
  | { status: "error" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso: string): string {
  // Plain calendar date ("2026-09-01") straight from the provider — parse the
  // parts directly (never `new Date(iso)`, which is UTC and can shift a day)
  // and format with a fixed abbreviation table so the output is deterministic
  // across environments/locale data.
  const [, month, day] = iso.split("-").map(Number);
  const label = MONTHS[(month ?? 0) - 1];
  return label && day ? `${day} ${label}` : iso;
}

function formatWindow(min: string, max: string): string {
  return min === max ? formatDate(min) : `${formatDate(min)} – ${formatDate(max)}`;
}

/**
 * Product Detail "check delivery to your pincode" — a pre-purchase
 * serviceability + ETA check. Self-contained: owns its own input/result
 * state, never touches cart/checkout. Reads the customer's last-checked
 * pincode from localStorage for convenience but never auto-submits and never
 * writes to the address book.
 */
export function PdpDeliveryCheck({
  productId,
  variantId,
  quantity,
}: {
  productId: number;
  variantId?: number | null;
  quantity: number;
}) {
  // Prefill the customer's last-checked pincode for convenience — read once,
  // never auto-submitted. Guarded for SSR and blocked/unavailable storage.
  const [pincode, setPincode] = useState(() => {
    try {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      return saved && PINCODE_RE.test(saved) ? saved : "";
    } catch {
      return "";
    }
  });
  const [state, setState] = useState<CheckState>({ status: "idle" });
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorId = useId();
  const resultId = useId();
  const inFlight = useRef(false);

  // A different variant (or the parent product) can have different package
  // dimensions and therefore a different ETA — drop a stale result during
  // render (never in an effect), keeping whatever pincode was typed.
  const [seenVariantId, setSeenVariantId] = useState(variantId);
  if (seenVariantId !== variantId) {
    setSeenVariantId(variantId);
    if (state.status !== "idle") setState({ status: "idle" });
  }

  const trimmed = pincode.trim();
  const isValid = PINCODE_RE.test(trimmed);

  const runCheck = async () => {
    if (!isValid) {
      setValidationError("Enter a valid 6-digit pincode.");
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setValidationError(null);
    setState({ status: "checking" });
    try {
      const result = await DeliveryApi.check({
        pincode: trimmed,
        productId,
        variantId: variantId ?? undefined,
        quantity,
      });
      try {
        window.localStorage.setItem(STORAGE_KEY, trimmed);
      } catch {
        /* ignore persistence failure */
      }
      setState(
        result.serviceable
          ? { status: "success", result }
          : { status: "unavailable", pincode: trimmed },
      );
    } catch {
      // Non-serviceable is handled above via the resolved value; anything
      // that throws here is a technical/provider failure — never presented
      // as "we don't deliver there".
      setState({ status: "error" });
    } finally {
      inFlight.current = false;
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void runCheck();
  };

  return (
    <section
      aria-labelledby={`${resultId}-label`}
      className="mt-6 rounded-xl border border-deep-brown/12 bg-[#FFF9F1] p-4"
    >
      <div id={`${resultId}-label`} className="flex items-center gap-2 text-sm font-bold text-text-primary">
        <MapPin size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 text-primary-orange" />
        Check delivery to your pincode
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row" noValidate>
        <label htmlFor={`${resultId}-input`} className="sr-only">
          Delivery pincode
        </label>
        <input
          id={`${resultId}-input`}
          name="pincode"
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={pincode}
          onChange={(event) => {
            setPincode(event.target.value);
            if (validationError) setValidationError(null);
          }}
          onBlur={(event) => {
            const value = event.target.value.trim();
            setValidationError(value && !PINCODE_RE.test(value) ? "Enter a valid 6-digit pincode." : null);
          }}
          aria-invalid={validationError ? true : undefined}
          aria-describedby={validationError ? errorId : undefined}
          placeholder="Enter pincode"
          className="h-11 w-full rounded-lg border border-deep-brown/15 bg-white px-3 text-sm font-semibold text-text-primary placeholder:font-normal placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 sm:max-w-[10rem]"
        />
        <button
          type="submit"
          disabled={!isValid || state.status === "checking"}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-deep-brown px-6 text-sm font-semibold text-white transition-colors duration-150 hover:bg-terracotta disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-deep-brown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
        >
          {state.status === "checking" ? "Checking…" : "Check"}
        </button>
      </form>

      {validationError && (
        <p id={errorId} className="mt-2 text-xs font-semibold text-terracotta">
          {validationError}
        </p>
      )}

      <div id={resultId} aria-live="polite" className="mt-3 empty:mt-0">
        {state.status === "checking" && (
          <p className="text-xs font-semibold text-text-muted">Checking delivery…</p>
        )}

        {state.status === "success" && (
          <div className="flex flex-col gap-1 rounded-lg border border-emerald-100 bg-[#EDFBF0] p-3 text-sm">
            <span className="flex items-center gap-1.5 font-bold text-[#1E7F3C]">
              <Check size={15} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
              Delivery available
            </span>
            <span className="text-text-primary/80">Pincode {state.result.pincode}</span>
            {state.result.estimatedDelivery ? (
              <span className="text-text-primary/80">
                Expected delivery{" "}
                <span className="font-semibold text-text-primary">
                  {formatWindow(state.result.estimatedDelivery.min, state.result.estimatedDelivery.max)}
                </span>
              </span>
            ) : (
              <span className="text-text-muted">Delivery estimate unavailable for this pincode.</span>
            )}
            {state.result.deliveryCharge && (
              <span className="text-text-primary/80">
                Delivery{" "}
                <span className="font-semibold text-text-primary">
                  {state.result.deliveryCharge.free
                    ? "Free"
                    : `₹${Number(state.result.deliveryCharge.amount).toLocaleString("en-IN")}`}
                </span>
              </span>
            )}
          </div>
        )}

        {state.status === "unavailable" && (
          <div className="flex flex-col gap-1 rounded-lg border border-red-100 bg-[#FFF0ED] p-3 text-sm">
            <span className="flex items-center gap-1.5 font-bold text-terracotta">
              <X size={15} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
              Sorry, we don&rsquo;t currently deliver to this pincode.
            </span>
            <span className="text-text-muted">Try another pincode.</span>
          </div>
        )}

        {state.status === "error" && (
          <div className="rounded-lg border border-amber-200 bg-[#FFF7ED] p-3 text-sm font-semibold text-text-primary">
            Unable to check delivery right now. Please try again.
          </div>
        )}
      </div>
    </section>
  );
}
