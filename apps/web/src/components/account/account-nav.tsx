"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UserIcon,
  ShieldCheckIcon,
  MapPinIcon,
  ShoppingBagIcon,
  ReturnIcon,
  ChevronRightIcon,
} from "@/components/account/account-icons";

// Single source of truth for the account sections. Labels are the existing
// route names — the design must not rename them.
const NAV_ITEMS = [
  { href: "/account", label: "Overview", Icon: UserIcon, isActive: (p: string) => p === "/account" },
  { href: "/account/orders", label: "My Orders", Icon: ShoppingBagIcon, isActive: (p: string) => p.startsWith("/account/orders") },
  { href: "/account/returns", label: "My Returns", Icon: ReturnIcon, isActive: (p: string) => p.startsWith("/account/returns") },
  { href: "/account/profile", label: "Profile", Icon: ShieldCheckIcon, isActive: (p: string) => p === "/account/profile" },
  { href: "/account/addresses", label: "Address Book", Icon: MapPinIcon, isActive: (p: string) => p.startsWith("/account/addresses") },
] as const;

const linkClass = (active: boolean) =>
  `group flex min-h-11 w-20 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-[11px] font-semibold leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 lg:w-full lg:flex-row lg:justify-start lg:gap-3 lg:whitespace-nowrap lg:px-3.5 lg:py-2.5 lg:text-left lg:text-sm ${
    active
      ? "bg-primary-orange text-white shadow-xs"
      : "border border-deep-brown/15 bg-white text-deep-brown hover:border-primary-orange/40 hover:text-primary-orange lg:border-0 lg:bg-transparent lg:hover:bg-cream-bg lg:hover:text-primary-orange"
  }`;

/**
 * Account navigation.
 * - Mobile: compact icon + label tab cards in a horizontally scrollable row,
 *   with swipe affordance (edge fade + chevron) shown only while there is more
 *   to scroll in that direction, and the active tab auto-scrolled into view.
 * - Desktop (lg): unchanged vertical sidebar card.
 */
export function AccountNav() {
  const pathname = usePathname();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const [swipe, setSwipe] = useState({ left: false, right: false });

  // Show the swipe hint only when it is actionable (more tabs off that edge).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setSwipe({
        left: el.scrollLeft > 4,
        right: Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 4,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Bring the active tab into view when it is off-screen on mobile.
  useEffect(() => {
    const el = activeTabRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    try {
      el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
    } catch {
      // jsdom / older browsers: scrollIntoView options unsupported — safe to ignore.
    }
  }, [pathname]);

  return (
    <div className="relative min-w-0">
      {/* Swipe-left affordance — mobile only, fades in when scrolled right. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 flex w-9 items-center justify-start bg-gradient-to-r from-cream-bg to-transparent pb-2 transition-opacity duration-200 lg:hidden ${
          swipe.left ? "opacity-100" : "opacity-0"
        }`}
      >
        <ChevronRightIcon className="h-4 w-4 rotate-180 text-deep-brown/50" />
      </div>

      <nav
        ref={scrollerRef}
        aria-label="Account navigation"
        className="flex snap-x flex-row gap-2 overflow-x-auto scroll-pl-4 pb-2 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:gap-1 lg:overflow-x-visible lg:rounded-2xl lg:border lg:border-deep-brown/15 lg:bg-white lg:p-3 lg:pr-3 lg:pb-3 lg:shadow-xs"
      >
        {NAV_ITEMS.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname);
          return (
            <Link
              key={href}
              href={href}
              ref={active ? activeTabRef : undefined}
              aria-current={active ? "page" : undefined}
              className={linkClass(active)}
            >
              <Icon className="h-5 w-5 shrink-0 lg:h-[18px] lg:w-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Swipe-right affordance — mobile only, fades in while more tabs remain. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 flex w-9 items-center justify-end pb-2 bg-gradient-to-l from-cream-bg to-transparent transition-opacity duration-200 lg:hidden ${
          swipe.right ? "opacity-100" : "opacity-0"
        }`}
      >
        <ChevronRightIcon className="h-4 w-4 text-deep-brown/50" />
      </div>
    </div>
  );
}
