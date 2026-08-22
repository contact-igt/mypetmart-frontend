"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useWishlist } from "@/context/wishlist-context";
import { ProductCard } from "@/components/product-card";
import { ArrowRightIcon, HeartIcon } from "@/components/icons";

export function WishlistClient() {
  const router = useRouter();
  const { status } = useCustomerAuth();
  const { items, loading, error, refresh } = useWishlist();

  // Same auth-gate pattern as AccountShell: client-side redirect, no login modal.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated" || (status === "authenticated" && loading)) {
    return (
      <main className="flex-1 bg-cream-bg flex items-center justify-center min-h-[calc(100vh-144px)] py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-orange border-t-transparent"></div>
          <p className="font-medium text-deep-brown">Loading your Wishlist...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-cream-bg py-8 md:py-12 min-h-[calc(100vh-144px)]">
      <div className="site-container">
        <div className="border-b border-deep-brown/15 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-orange">
            Saved for later
          </span>
          <h1 className="font-baloo text-3xl font-extrabold text-deep-brown sm:text-4xl">
            My Wishlist
          </h1>
          <p className="mt-1 text-sm text-text-primary/75">
            Products you have saved. Select a Variant on the Product page when you are ready to buy.
          </p>
        </div>

        <div className="mt-8">
          {error ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-deep-brown/15 bg-white p-10 text-center">
              <p className="font-medium text-deep-brown">{error}</p>
              <button
                type="button"
                onClick={() => void refresh()}
                className="button-secondary"
              >
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-deep-brown/15 bg-white p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-peach-hero/40 text-primary-orange">
                <HeartIcon width={26} height={26} />
              </div>
              <div>
                <p className="font-baloo text-lg font-bold text-deep-brown">Your Wishlist is empty</p>
                <p className="mt-1 text-sm text-text-primary/75">
                  Tap the heart on any Product to save it here for later.
                </p>
              </div>
              <Link href="/shop" className="button-secondary">
                Browse the shop <ArrowRightIcon width={16} height={16} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <div key={item.wishlistItemId}>
                  <ProductCard product={item.product} />
                  {!item.product.available && item.product.inStock && (
                    <p className="mt-2 text-xs font-semibold text-terracotta">
                      This Product is no longer available.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
