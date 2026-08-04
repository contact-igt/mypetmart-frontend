import type { ReactNode } from "react";

/**
 * Header icon slot for a feature that is not built yet (search, wishlist,
 * account, cart). Buttons remain focusable and keyboard-operable so the
 * visual shell does not create inaccessible controls.
 */
export function IconButton({
  label,
  children,
  variant = "ghost",
  hideBelowSm = false,
}: {
  label: string;
  children: ReactNode;
  variant?: "ghost" | "solid";
  hideBelowSm?: boolean;
}) {
  const variantClass =
    variant === "solid"
      ? "h-8 w-14 bg-deep-brown text-white hover:opacity-90"
      : "h-10 w-10 text-text-primary hover:bg-white/60";
  const displayClass = hideBelowSm ? "hidden sm:inline-flex" : "inline-flex";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`${displayClass} items-center justify-center rounded-full transition-colors duration-150 ease-out ${variantClass}`}
    >
      {children}
    </button>
  );
}