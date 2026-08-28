import { CheckoutClient } from "./checkout-client";

export const metadata = {
  title: "Checkout | MyPetMart",
  description: "Complete your order securely — review items, shipping address, and totals.",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
