// Shared pricing presentation helper — discount percentage is always derived
// at render time from a Product's real price/compareAtPrice, never stored.
// Extracted from playable-video-card.tsx so every card that needs a
// "X% off" label (AddToCartPanel, TestimonialVideoCard, future reuse) shares
// one rounding convention instead of maintaining separate copies.
export function discountPercent(price: number, compareAtPrice?: number | null): number | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  if (compareAtPrice == null || !Number.isFinite(compareAtPrice) || compareAtPrice <= 0) return null;
  if (compareAtPrice <= price) return null;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}
