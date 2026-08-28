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
export function TrustBadges({ items }: { items: TrustBadgeId[] }) {
  return (
    <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3" aria-label="Shopping reassurance">
      {items.map((id) => {
        const badge = BADGES[id];
        const Icon = badge.icon;
        return (
          <li key={id} className="flex items-center gap-2 rounded-xl border border-deep-brown/10 bg-cream-bg px-3 py-2 text-xs font-semibold text-deep-brown">
            <Icon size={16} className="shrink-0 text-primary-orange" aria-hidden="true" />
            <span>{badge.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
