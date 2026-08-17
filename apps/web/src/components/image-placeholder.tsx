import type { SVGProps } from "react";

export type PlaceholderTone =
  | "peach"
  | "orange"
  | "mint"
  | "terracotta"
  | "brown"
  | "yellow"
  | "cream";

const TONE_CLASSES: Record<PlaceholderTone, string> = {
  peach: "bg-peach-hero",
  orange: "bg-orange-hero",
  mint: "bg-mint-sage",
  terracotta: "bg-terracotta",
  brown: "bg-deep-brown",
  yellow: "bg-yellow-card",
  cream: "bg-cream-bg border border-border-subtle",
};

const TONE_ICON_CLASSES: Record<PlaceholderTone, string> = {
  peach: "text-text-primary/20",
  orange: "text-white/40",
  mint: "text-text-primary/20",
  terracotta: "text-white/30",
  brown: "text-white/25",
  yellow: "text-text-primary/20",
  cream: "text-text-primary/15",
};

export function PawIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      {/* Toe pads */}
      <circle cx="6" cy="11" r="1.75" />
      <circle cx="10" cy="7.5" r="2.2" />
      <circle cx="14" cy="7.5" r="2.2" />
      <circle cx="18" cy="11" r="1.75" />
      {/* Main pad */}
      <path d="M12 11c-2.2 0-4 1.8-4 4.5s1.8 4 4 4 4-1.3 4-4-1.8-4.5-4-4.5Z" />
    </svg>
  );
}

/**
 * Reusable Product Image Placeholder for MyPetMart storefront.
 * Communicates visually using a recognized, friendly pet paw shape.
 */
export function ProductImagePlaceholder({
  label,
  tone = "peach",
  className = "",
  iconSize = 38,
}: {
  label: string;
  tone?: PlaceholderTone;
  className?: string;
  iconSize?: number;
}) {
  return (
    <div
      role="img"
      aria-label={`${label} - Image coming soon`}
      title={`${label} - Image coming soon`}
      className={`flex flex-col items-center justify-center rounded-[var(--radius-card)] p-4 text-center select-none ${TONE_CLASSES[tone]} ${className}`}
    >
      <PawIcon style={{ width: iconSize, height: iconSize }} className={TONE_ICON_CLASSES[tone]} />
      <span className="sr-only">Product image unavailable</span>
    </div>
  );
}

/**
 * Legacy wrapper to maintain backward-compatibility with other modules.
 */
export function ImagePlaceholder({
  label,
  tone = "peach",
  className,
}: {
  label: string;
  tone?: PlaceholderTone;
  className?: string;
}) {
  return (
    <ProductImagePlaceholder
      label={label}
      tone={tone}
      className={className}
      iconSize={28}
    />
  );
}
