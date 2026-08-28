"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ShoppingCart } from "lucide-react";
import { SiteLogo } from "@/components/site-logo";
import { PrimaryNav } from "@/components/primary-nav";
import { MobileNavPanel } from "@/components/mobile-nav-panel";
import {
  HeartIcon,
  SearchIcon,
  UserIcon,
  MenuIcon,
  CloseIcon,
} from "@/components/icons";
import {
  LogOutIcon,
  MapPinIcon,
  ReturnIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
} from "@/components/account/account-icons";

import Link from "next/link";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useCart } from "@/context/cart-context";

export function SiteHeader() {
  const router = useRouter();
  const accountMenuRef = useRef<HTMLDetailsElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavPanelRef = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { status, customer, logout } = useCustomerAuth();
  const wishlistHref = status === "authenticated" ? "/wishlist" : "/signin";

  const firstName = customer?.name?.trim().split(/\s+/)[0];
  const accountLabel =
    status === "authenticated"
      ? "Account"
      : status === "loading"
        ? ""
        : "Account";
  const accountMenuAriaLabel =
    status === "authenticated"
      ? `Open account menu for ${firstName || customer?.name || "your account"}`
      : status === "loading"
        ? "Account menu"
        : "Sign in to MyPetMart";

  const { itemCount } = useCart();

  const closeAccountMenu = () => accountMenuRef.current?.removeAttribute("open");

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (
        mobileNavOpen &&
        !mobileMenuButtonRef.current?.contains(target) &&
        !mobileNavPanelRef.current?.contains(target)
      ) {
        setMobileNavOpen(false);
      }

      if (accountMenuRef.current?.open && !accountMenuRef.current.contains(target)) {
        accountMenuRef.current.removeAttribute("open");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileNavOpen(false);
      accountMenuRef.current?.removeAttribute("open");
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavOpen]);

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
    <header className="sticky top-0 z-50 border-t-[3px] border-deep-brown bg-cream-bg">
      <div className="site-container grid h-[72px] grid-cols-[1fr_auto_1fr] items-center gap-2 lg:flex lg:justify-between lg:gap-8">
        {/* Mobile: menu button on the left. Toggles the same mobile nav panel
            the previous layout used — no second navigation system. */}
        <button
          type="button"
          ref={mobileMenuButtonRef}
          onClick={() => setMobileNavOpen((value) => !value)}
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-nav-panel"
          aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
          className="-ml-1 inline-flex h-11 w-11 items-center justify-center justify-self-start rounded-full text-text-primary transition-colors duration-150 ease-out hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 lg:hidden"
        >
          {mobileNavOpen ? (
            <CloseIcon width={22} height={22} />
          ) : (
            <MenuIcon width={22} height={22} />
          )}
        </button>

        <SiteLogo className="shrink-0 justify-self-center [&>img]:!h-8 [&>img]:!max-w-[160px] sm:[&>img]:!h-9 sm:[&>img]:!max-w-[180px]" />

        <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex lg:gap-4">
          <PrimaryNav className="shrink-0" />
          <Link
            href={wishlistHref}
            aria-label="Wishlist"
            className="inline-flex h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-0.5 text-[13px] font-semibold leading-none text-text-primary transition-colors duration-150 ease-out hover:border-deep-brown/30 hover:text-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
          >
            <HeartIcon width={16} height={16} />
            <span>Wishlist</span>
          </Link>
          <form
            action="/shop"
            method="get"
            role="search"
            aria-label="Product search"
            onSubmit={handleSearchSubmit}
            className="relative ml-auto w-[clamp(240px,28vw,520px)] shrink-0"
          >
            <label htmlFor="navbar-product-search" className="sr-only">
              Search products
            </label>
            <input
              id="navbar-product-search"
              name="search"
              type="search"
              placeholder="Search products..."
              className="h-12 w-full rounded-lg border border-deep-brown/10 bg-surface-secondary/30 py-2 pl-11 pr-4 text-sm text-text-primary outline-none transition-colors duration-150 placeholder:text-text-muted focus:border-deep-brown/45 focus:ring-2 focus:ring-deep-brown/10"
            />
            <button
              type="submit"
              aria-label="Search products"
              className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-white/50 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 active:scale-95"
            >
              <SearchIcon width={17} height={17} />
            </button>
          </form>
          <details ref={accountMenuRef} className="group relative">
            <summary
              data-testid="account-menu-trigger"
              aria-label={accountMenuAriaLabel}
              title={accountMenuAriaLabel}
              className="inline-flex h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-deep-brown/15 bg-white/45 px-4 text-sm font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 [&::-webkit-details-marker]:hidden"
            >
              <span>{accountLabel}</span>
              <ChevronDown
                size={15}
                strokeWidth={1.8}
                aria-hidden="true"
                className="transition-transform duration-150 group-open:rotate-180"
              />
            </summary>

            <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-deep-brown/15 bg-white p-2 shadow-[0_14px_40px_rgba(62,35,25,0.18)]">
              <nav aria-label="Account menu" className="flex flex-col">
                {status === "authenticated" ? (
                  <>
                    <p className="truncate px-3 py-2 text-sm font-bold text-deep-brown">
                      Hi, {customer?.name ?? "Pet Parent"}
                    </p>
                    <div className="mb-1 border-t border-deep-brown/10" />
                    <Link href="/account" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-brown hover:bg-cream-bg hover:text-primary-orange">
                      <UserIcon width={17} height={17} /> Overview
                    </Link>
                    <Link href="/account/orders" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-brown hover:bg-cream-bg hover:text-primary-orange">
                      <ShoppingBagIcon width={17} height={17} /> My Orders
                    </Link>
                    <Link href="/account/returns" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-brown hover:bg-cream-bg hover:text-primary-orange">
                      <ReturnIcon width={17} height={17} /> My Returns
                    </Link>
                    <Link href="/account/profile" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-brown hover:bg-cream-bg hover:text-primary-orange">
                      <ShieldCheckIcon width={17} height={17} /> Profile
                    </Link>
                    <Link href="/account/addresses" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-brown hover:bg-cream-bg hover:text-primary-orange">
                      <MapPinIcon width={17} height={17} /> Address Book
                    </Link>
                    <div className="my-1 border-t border-deep-brown/10" />
                    <button
                      type="button"
                      disabled={loggingOut}
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-terracotta transition-colors hover:bg-terracotta/10 disabled:opacity-50"
                    >
                      <LogOutIcon width={17} height={17} />
                      {loggingOut ? "Signing out..." : "Sign Out"}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/signin" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary-orange hover:bg-cream-bg">
                      <UserIcon width={17} height={17} /> Sign In
                    </Link>
                    <Link href="/signup" onClick={closeAccountMenu} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-deep-brown hover:bg-cream-bg hover:text-primary-orange">
                      <UserIcon width={17} height={17} /> Create Account
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </details>
          <Link
            href="/cart"
            className="inline-flex h-11 shrink-0 items-center gap-2.5 rounded-lg bg-deep-brown px-4 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
            aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"}
          >
            <span>Cart</span>
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary-orange px-1 text-[11px] font-bold leading-none">
              {itemCount}
            </span>
          </Link>
        </div>

        {/* Mobile: existing cart link + live count badge on the right. */}
        <div className="flex items-center justify-self-end lg:hidden">
          <Link
            href="/cart"
            aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"}
            className="-mr-1 inline-flex h-11 w-11 items-center justify-center rounded-full text-text-primary transition-colors duration-150 ease-out hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
          >
            <span className="relative inline-flex">
              <ShoppingCart size={21} strokeWidth={1.8} aria-hidden="true" />
              {itemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-orange px-1 text-[9px] font-bold leading-none text-white">
                  {itemCount}
                </span>
              )}
            </span>
          </Link>
        </div>
      </div>

      <MobileNavPanel
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        panelRef={mobileNavPanelRef}
      />
    </header>
  );
}
