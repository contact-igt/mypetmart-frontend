"use client";

import type { ReactNode } from "react";
import { CustomerAuthProvider } from "@/context/customer-auth-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { CartProvider } from "@/context/cart-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CustomerAuthProvider>
      <WishlistProvider>
        <CartProvider>{children}</CartProvider>
      </WishlistProvider>
    </CustomerAuthProvider>
  );
}
