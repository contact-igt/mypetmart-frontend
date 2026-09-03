"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { OrderApi } from "@/lib/order-api";
import { AppAuthError } from "@/lib/auth/auth-errors";
import type { GuestOrderDetailJSON, OrderDetailJSON } from "@/types/order";

export function getPendingOrderCancellationMessage(error: unknown): string {
  if (error instanceof AppAuthError) {
    switch (error.code) {
      case "PAYMENT_STATUS_UNCERTAIN":
        return "We're still checking the payment status for this order. To avoid cancelling an order that may already be paid, please try again shortly.";
      case "ORDER_ALREADY_PAID":
        return "This order has already been paid and cannot be cancelled as an unfinished order.";
      case "ORDER_NOT_CANCELLABLE":
        return "This order has already progressed and can no longer be cancelled from this screen.";
      default:
        return error.message || "We couldn't cancel this unfinished order. Please try again.";
    }
  }
  return "We couldn't cancel this unfinished order. Please try again.";
}

type CancelPendingOrderButtonProps =
  | {
      orderId: number;
      guestToken?: never;
      buttonLabel?: string;
      className?: string;
      onSuccess: (order: OrderDetailJSON) => void | Promise<void>;
      onError?: (error: unknown) => void;
    }
  | {
      guestToken: string;
      orderId?: never;
      buttonLabel?: string;
      className?: string;
      onSuccess: (order: GuestOrderDetailJSON) => void | Promise<void>;
      onError?: (error: unknown) => void;
    };

/**
 * Shared self-service cancellation action for the customer and guest order
 * pages, plus checkout recovery. The native dialog supplies Escape handling,
 * focus capture, and a mobile-safe confirmation surface without a new modal
 * dependency.
 */
export function CancelPendingOrderButton(props: CancelPendingOrderButtonProps) {
  const { buttonLabel = "Cancel Order", className, onError } = props;
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-cancel-dialog-autofocus]")?.focus();
      return;
    }

    if (dialog.open) dialog.close();
  }, [open]);

  const closeDialog = () => {
    if (cancelling) return;
    setOpen(false);
    setError(null);
    openerRef.current?.focus();
  };

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    closeDialog();
  };

  const handleConfirm = async () => {
    if (cancelling) return;
    setCancelling(true);
    setError(null);

    try {
      if (props.orderId !== undefined) {
        const cancelledOrder = await OrderApi.cancelPendingOrder(props.orderId);
        await props.onSuccess(cancelledOrder);
      } else {
        const cancelledOrder = await OrderApi.cancelPendingGuestOrder(props.guestToken);
        await props.onSuccess(cancelledOrder);
      }
      setOpen(false);
    } catch (requestError: unknown) {
      setError(getPendingOrderCancellationMessage(requestError));
      onError?.(requestError);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className={className}>
      <button
        ref={openerRef}
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={cancelling}
        className="w-full rounded-xl border border-terracotta bg-white px-4 py-3 text-xs font-bold text-terracotta transition-colors hover:bg-terracotta hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cancelling ? "Cancelling Order..." : buttonLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="cancel-pending-order-title"
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-deep-brown/10 bg-white p-0 text-text-primary shadow-[0_24px_60px_rgba(74,37,17,0.22)] backdrop:bg-deep-brown/40"
        onCancel={handleCancel}
        onClose={() => {
          if (!cancelling) setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeDialog();
        }}
      >
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <h2 id="cancel-pending-order-title" className="font-baloo text-xl font-extrabold text-deep-brown">
              Cancel this unfinished order?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-primary/75">
              This order will be marked as cancelled. Your cart items will remain available, so you can continue shopping or place a new order.
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/10 p-3 text-xs font-semibold leading-relaxed text-terracotta">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              disabled={cancelling}
              className="rounded-xl border border-deep-brown/20 px-4 py-3 text-xs font-bold text-deep-brown transition-colors hover:bg-cream-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Keep Order
            </button>
            <button
              type="button"
              data-cancel-dialog-autofocus
              onClick={() => void handleConfirm()}
              disabled={cancelling}
              className="rounded-xl bg-terracotta px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-deep-brown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling ? "Cancelling Order..." : error ? "Try Cancel Again" : "Cancel Order"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
