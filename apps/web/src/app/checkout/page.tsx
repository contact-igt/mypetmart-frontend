import { CheckoutClient } from "./checkout-client";

export const metadata = {
  title: "Checkout Preview | MyPetMart",
  description: "Preview your order items, shipping address, and calculated totals.",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
