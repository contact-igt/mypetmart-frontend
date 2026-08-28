"use client";

import { useState } from "react";
import type { BinaryDownload } from "@/lib/auth/auth-api";

// download() is injected rather than this component knowing about
// OrderApi/order id/guest token directly — the same call site works for
// both the authenticated customer page and the guest recovery page, and it
// keeps this component trivially testable with a mock.
export function DownloadReceiptButton({
  download,
  fallbackFilename = "receipt.pdf",
}: {
  download: () => Promise<BinaryDownload>;
  fallbackFilename?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setState("loading");
    try {
      const { blob, filename } = await download();
      // Same-origin blob download — not the sandboxed-artifact-preview
      // restriction that applies elsewhere; this is a normal webapp page
      // triggering a save of bytes it just fetched itself.
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ?? fallbackFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "loading"}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-deep-brown/20 bg-cream-bg px-4 py-2 text-xs font-bold text-deep-brown transition-all hover:border-primary-orange hover:bg-primary-orange hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "loading" ? "Preparing..." : "Download Receipt"}
      </button>
      {state === "error" && (
        <p className="text-xs font-semibold text-terracotta">Couldn&apos;t download the receipt. Please try again.</p>
      )}
    </div>
  );
}
