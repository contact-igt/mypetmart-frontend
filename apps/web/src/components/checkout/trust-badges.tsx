import { ShieldCheck, PackageSearch, RotateCcw, Banknote } from "lucide-react";

export type TrustBadgeId = "secure" | "cod" | "tracking" | "returns";

const BADGES: Record<TrustBadgeId, { icon: typeof ShieldCheck; label: string }> = {
  secure: { icon: ShieldCheck, label: "Secure checkout" },
  // Cash on Delivery is a real, shipped payment method (see PaymentService.confirmCodOrder) —
  // never claimed unless it's actually offered at checkout.
  cod: { icon: Banknote, label: "Cash on Delivery available" },
  // Real feature: OrderTracker + ShipmentTracking already give a customer a live status/timeline.
  tracking: { icon: PackageSearch, label: "Track your order anytime" },
  // Real feature: RequestReturnForm + ReturnModels already support return/replacement requests.
  returns: { icon: RotateCcw, label: "Easy returns & refunds" },
};

/**
 * Reassurance strip reused on Cart (before the checkout CTA) and Checkout
 * (near payment method selection). Only ever lists features that already
 * ship — never a claim this codebase can't back (see website/CLAUDE.md's
 * "Unconfirmed public claims" list, which is why this deliberately omits
 * delivery-timeframe/pan-India wording).
 */
export function TrustBadges({
  items,
  layout = "grid",
}: {
  items: TrustBadgeId[];
  layout?: "grid" | "stacked";
}) {
  const isStacked = layout === "stacked";

  return (
    <ul
      className={`mt-4 grid gap-2 ${isStacked ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3 sm:gap-3"}`}
      aria-label="Shopping reassurance"
    >
      {items.map((id) => {
        const badge = BADGES[id];
        const Icon = badge.icon;
        return (
          <li
            key={id}
            className={`flex items-center rounded-xl border border-deep-brown/10 bg-cream-bg text-xs font-semibold text-deep-brown ${
              isStacked ? "min-h-12 gap-3 px-3 py-2.5" : "gap-2 px-3 py-2"
            }`}
          >
            <Icon size={16} className="shrink-0 text-primary-orange" aria-hidden="true" />
            <span>{badge.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
