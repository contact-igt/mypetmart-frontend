"use client";

import { useState } from "react";
import { SiteLogo } from "@/components/site-logo";
import { PrimaryNav } from "@/components/primary-nav";
import { MobileNavPanel } from "@/components/mobile-nav-panel";
import { IconButton } from "@/components/icon-button";
import {
  SearchIcon,
  HeartIcon,
  UserIcon,
  MenuIcon,
  CloseIcon,
  BagIcon,
} from "@/components/icons";

import Link from "next/link";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useCart } from "@/context/cart-context";

export function SiteHeader() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { status } = useCustomerAuth();

  const authLink = status === "authenticated" ? "/account" : "/signin";
  const authLabel = status === "authenticated" ? "Account" : "Sign in";
  const wishlistLink = status === "authenticated" ? "/wishlist" : "/signin";

  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-t border-deep-brown bg-cream-bg">
      <div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5 sm:px-8 lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <SiteLogo />

        <PrimaryNav className="hidden lg:block lg:justify-self-center" />

        <div className="hidden items-center gap-2 lg:flex lg:justify-self-end">
          <Link href="/shop" className="inline-flex" aria-label="Search products">
            <IconButton label="Search">
              <SearchIcon width={18} height={18} />
            </IconButton>
          </Link>
          <Link href={wishlistLink} className="inline-flex">
            <IconButton label="Wishlist">
              <HeartIcon width={18} height={18} />
            </IconButton>
          </Link>
          <Link href="/cart" className="inline-flex relative" aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"}>
            <IconButton label="Cart">
              <div className="relative">
                <BagIcon width={18} height={18} />
                {itemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-orange px-1 text-[9px] font-bold text-white leading-none">
                    {itemCount}
                  </span>
                )}
              </div>
            </IconButton>
          </Link>
          <Link href={authLink} className="inline-flex">
            <IconButton label={authLabel}>
              <UserIcon width={18} height={18} />
            </IconButton>
          </Link>
          <IconButton label="Menu" variant="solid">
            <MenuIcon width={19} height={19} />
          </IconButton>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <Link
            href="/cart"
            className="relative inline-flex"
            aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"}
          >
            <IconButton label="Cart">
              <div className="relative">
                <BagIcon width={20} height={20} />
                {itemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-orange px-1 text-[9px] font-bold text-white leading-none">
                    {itemCount}
                  </span>
                )}
              </div>
            </IconButton>
          </Link>

          <button
            type="button"
            onClick={() => setMobileNavOpen((value) => !value)}
            aria-expanded={mobileNavOpen}
            aria-controls="mobile-nav-panel"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-primary hover:bg-white/60"
          >
            {mobileNavOpen ? (
              <CloseIcon width={20} height={20} />
            ) : (
              <MenuIcon width={20} height={20} />
            )}
          </button>
        </div>
      </div>

      <MobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </header>
  );
}