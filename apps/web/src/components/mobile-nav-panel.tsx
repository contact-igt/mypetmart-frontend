"use client";

import Link from "next/link";
import type { RefObject } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { HeartIcon, SearchIcon, UserIcon } from "@/components/icons";
import { PRIMARY_NAV_ITEMS, isPrimaryNavItemActive } from "@/components/primary-nav";

import { useCustomerAuth } from "@/context/customer-auth-context";

export function MobileNavPanel({
  open,
  onClose,
  panelRef,
}: {
  open: boolean;
  onClose: () => void;
  panelRef?: RefObject<HTMLDivElement | null>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useCustomerAuth();

  const authLink = status === "authenticated" ? "/account" : "/signin";
  const authAriaLabel = status === "authenticated" ? "Account" : "Sign in to MyPetMart";
  const wishlistLink = status === "authenticated" ? "/wishlist" : "/signin";

  return (
    <div
      id="mobile-nav-panel"
      ref={panelRef}
      className={`site-container overflow-hidden transition-[max-height,opacity] duration-200 ease-out lg:hidden ${
        open ? "max-h-[28rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"
      }`}
    >
      <nav aria-label="Primary" className="border-t border-border-subtle py-4">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const active = isPrimaryNavItemActive(item, pathname, searchParams);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onClose}
                  className={`body-copy flex min-h-11 items-center rounded-lg px-3 py-2.5 text-base font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 ${
                    active ? "bg-white text-primary-orange" : "text-text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border-subtle pt-3">
          <Link
            href="/shop?searchOpen=1"
            onClick={onClose}
            aria-label="Search products"
            className="inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-white/60 hover:text-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
          >
            <SearchIcon width={20} height={20} />
            <span>Search</span>
          </Link>
          <Link
            href={wishlistLink}
            onClick={onClose}
            aria-label="Wishlist"
            className="inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-white/60 hover:text-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
          >
            <HeartIcon width={20} height={20} />
            <span>Wishlist</span>
          </Link>
          <Link
            href={authLink}
            onClick={onClose}
            aria-label={authAriaLabel}
            className="inline-flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-xs font-semibold text-text-primary transition-colors duration-150 ease-out hover:bg-white/60 hover:text-primary-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30"
          >
            <UserIcon width={20} height={20} />
            <span>Account</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
