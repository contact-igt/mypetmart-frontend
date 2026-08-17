"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartIcon, SearchIcon, UserIcon, BagIcon } from "@/components/icons";
import { IconButton } from "@/components/icon-button";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Contact Us", href: "/contact" },
];

import { useCustomerAuth } from "@/context/customer-auth-context";
import { useCart } from "@/context/cart-context";

export function MobileNavPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { status } = useCustomerAuth();

  const authLink = status === "authenticated" ? "/account" : "/signin";
  const authLabel = status === "authenticated" ? "Account" : "Sign in";
  const wishlistLink = status === "authenticated" ? "/wishlist" : "/signin";
  const { itemCount } = useCart();

  return (
    <div
      id="mobile-nav-panel"
      className={`site-container overflow-hidden transition-[max-height,opacity] duration-150 ease-out md:hidden ${
        open ? "max-h-[28rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"
      }`}
    >
      <nav aria-label="Primary" className="border-t border-border-subtle py-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onClose}
                  className={`body-copy block rounded-lg px-3 py-3 text-base font-medium ${
                    active ? "bg-white text-primary-orange" : "text-text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-3 flex items-center gap-2 border-t border-border-subtle pt-3">
          <IconButton label="Search">
            <SearchIcon width={20} height={20} />
          </IconButton>
          <Link href={wishlistLink} onClick={onClose} className="inline-flex">
            <IconButton label="Wishlist">
              <HeartIcon width={20} height={20} />
            </IconButton>
          </Link>
          <Link href={authLink} onClick={onClose} className="inline-flex">
            <IconButton label={authLabel}>
              <UserIcon width={20} height={20} />
            </IconButton>
          </Link>
          <Link href="/cart" onClick={onClose} className="inline-flex relative" aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : "Cart"}>
            <IconButton label="Cart">
              <div className="relative">
                <BagIcon width={20} height={20} />
                {itemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-orange px-1 text-[9px] font-bold text-white leading-none">
                    {itemCount}
                  </span>
                )}
              </div>
            </IconButton>
          </Link>
        </div>
      </nav>
    </div>
  );
}
