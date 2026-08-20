"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ShoppingCart } from "lucide-react";
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
} from "@/components/icons";
import { LogOutIcon, ReturnIcon, ShoppingBagIcon } from "@/components/account/account-icons";

import Link from "next/link";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useCart } from "@/context/cart-context";

export function SiteHeader() {
  const router = useRouter();
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { status, logout } = useCustomerAuth();

  const wishlistLink = status === "authenticated" ? "/wishlist" : "/signin";

  const { itemCount } = useCart();

  const closeAccountMenu = () => accountMenuRef.current?.removeAttribute("open");

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    router.push(`/shop?search=${encodeURIComponent(query)}`);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    closeAccountMenu();
    try {
      await logout();
    } catch {
      // Auth state is cleared by the provider even if the API request fails.
    } finally {
      setLoggingOut(false);
      router.push("/signin");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-t border-deep-brown bg-cream-bg">
      <div className="site-container flex h-[72px] items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr]">
        <SiteLogo />

        <PrimaryNav className="hidden lg:block lg:justify-self-center" />

        <div className="hidden items-center gap-2 lg:flex lg:justify-self-end">
          <form
            action="/shop"
            method="get"
            role="search"
            onSubmit={handleSearchSubmit}
            className="relative w-40 xl:w-56"
          >
            <label htmlFor="navbar-product-search" className="sr-only">
              Search products
            </label>
            <input
              id="navbar-product-search"
              name="search"
              type="search"
              placeholder="Search products..."
              className="h-10 w-full rounded-full border border-deep-brown/15 bg-white py-2 pl-4 pr-10 text-sm text-text-primary outline-none transition-colors duration-150 placeholder:text-text-muted focus:border-deep-brown/45 focus:ring-2 focus:ring-deep-brown/10"
            />
            <button
              type="submit"
              aria-label="Search products"
              className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-primary transition-colors duration-150 hover:bg-cream-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 active:scale-95"
            >
              <SearchIcon width={17} height={17} />
            </button>
          </form>
          <Link href={wishlistLink} className="inline-flex">
            <IconButton label="Wishlist">
              <HeartIcon width={18} height={18} />
            </IconButton>
          </Link>
          <Link href="/cart" className="inline-flex relative" aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"}>
            <IconButton label="Cart">
              <div className="relative">
                <ShoppingCart size={19} strokeWidth={1.8} />
                {itemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-orange px-1 text-[9px] font-bold text-white leading-none">
                    {itemCount}
                  </span>
                )}
              </div>
            </IconButton>
          </Link>
          <details ref={accountMenuRef} className="group relative">
            <summary
              aria-label="Account menu"
              title="Account menu"
              className="inline-flex h-10 cursor-pointer list-none items-center justify-center gap-1 rounded-full px-2.5 text-text-primary transition-colors duration-150 ease-out hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 [&::-webkit-details-marker]:hidden"
            >
              <UserIcon width={18} height={18} />
              <ChevronDown
                size={14}
                strokeWidth={1.8}
                aria-hidden="true"
                className="transition-transform duration-150 group-open:rotate-180"
              />
            </summary>

            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-deep-brown/15 bg-white p-2 shadow-[0_14px_40px_rgba(62,35,25,0.18)]">
              <nav aria-label="Account menu" className="flex flex-col">
                <Link href="/account/profile" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-brown hover:bg-cream-bg hover:text-primary-orange">
                  <UserIcon width={17} height={17} /> My Profile
                </Link>
                <Link href="/cart" onClick={closeAccountMenu} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-brown hover:bg-cream-bg hover:text-primary-orange">
                  <span className="flex items-center gap-3"><ShoppingCart size={17} strokeWidth={1.8} /> Cart</span>
                  {itemCount > 0 && <span className="rounded-full bg-primary-orange px-2 py-0.5 text-[10px] font-bold text-white">{itemCount}</span>}
                </Link>
                <Link href="/account/orders" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-brown hover:bg-cream-bg hover:text-primary-orange">
                  <ShoppingBagIcon width={17} height={17} /> My Orders
                </Link>
                <Link href="/account/returns" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-brown hover:bg-cream-bg hover:text-primary-orange">
                  <ReturnIcon width={17} height={17} /> Returns
                </Link>
                <div className="my-1 border-t border-deep-brown/10" />
                {status === "authenticated" ? (
                  <button
                    type="button"
                    disabled={loggingOut}
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-50"
                  >
                    <LogOutIcon width={17} height={17} />
                    {loggingOut ? "Signing out..." : "Sign Out"}
                  </button>
                ) : (
                  <Link href="/signin" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary-orange hover:bg-cream-bg">
                    <UserIcon width={17} height={17} /> Sign In
                  </Link>
                )}
              </nav>
            </div>
          </details>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <Link
            href="/cart"
            className="relative inline-flex"
            aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"}
          >
            <IconButton label="Cart">
              <div className="relative">
                <ShoppingCart size={20} strokeWidth={1.8} />
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
