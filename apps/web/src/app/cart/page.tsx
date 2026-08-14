import type { Metadata } from "next";
import { CartClient } from "./cart-client";

export const metadata: Metadata = {
  title: "Shopping Cart | MyPetMart",
  description: "Review the items in your shopping cart.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartPage() {
  return (
    <main className="flex-1 bg-[#FFF5E9]">
      <CartClient />
    </main>
  );
}
