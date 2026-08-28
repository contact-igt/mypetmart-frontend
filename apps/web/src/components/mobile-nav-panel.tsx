"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HeartIcon, SearchIcon, UserIcon } from "@/components/icons";
import { IconButton } from "@/components/icon-button";
import { PRIMARY_NAV_ITEMS, isPrimaryNavItemActive } from "@/components/primary-nav";

import { useCustomerAuth } from "@/context/customer-auth-context";

export function MobileNavPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status } = useCustomerAuth();

  const authLink = status === "authenticated" ? "/account" : "/signin";
  const authLabel = status === "authenticated" ? "Account" : "Sign in";
  const wishlistLink = status === "authenticated" ? "/wishlist" : "/signin";

  return (
    <div
      id="mobile-nav-panel"
      className={`site-container overflow-hidden transition-[max-height,opacity] duration-150 ease-out lg:hidden ${
        open ? "max-h-[28rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"
      }`}
    >
      <nav aria-label="Primary" className="border-t border-border-subtle py-4">
        <ul className="flex flex-col gap-1">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const active = isPrimaryNavItemActive(item, pathname, searchParams);
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
          <Link href="/shop" onClick={onClose} className="inline-flex" aria-label="Search products">
            <IconButton label="Search">
              <SearchIcon width={20} height={20} />
            </IconButton>
          </Link>
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
        </div>
      </nav>
    </div>
  );
}
