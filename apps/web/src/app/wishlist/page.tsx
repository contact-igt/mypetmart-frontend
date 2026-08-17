import type { Metadata } from "next";
import { WishlistClient } from "./wishlist-client";

export const metadata: Metadata = {
  title: "My Wishlist | MyPetMart",
  description: "View and manage the Products you have saved to your MyPetMart Wishlist.",
  robots: {
    index: false,
    follow: false
  }
};

export default function WishlistPage() {
  return <WishlistClient />;
}
