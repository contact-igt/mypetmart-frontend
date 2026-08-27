"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export const PRIMARY_NAV_ITEMS = [
  { label: "Shop", href: "/shop", type: "shop" },
  { label: "Dogs", href: "/shop?petType=dog", type: "dog" },
  { label: "Cats", href: "/shop?petType=cat", type: "cat" },
  { label: "Contact Us", href: "/contact", type: "contact" },
];

export function isPrimaryNavItemActive(
  item: (typeof PRIMARY_NAV_ITEMS)[number],
  pathname: string,
  searchParams: { get: (key: string) => string | null }
) {
  if (item.type === "contact") return pathname.startsWith("/contact");
  if (pathname !== "/shop") return false;

  if (item.type === "dog") return searchParams.get("petType") === "dog";
  if (item.type === "cat") return searchParams.get("petType") === "cat";
  return (
    searchParams.get("petType") !== "dog" &&
    searchParams.get("petType") !== "cat"
  );
}

export function PrimaryNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className={className} aria-label="Primary">
      <ul className="flex items-center gap-6">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const active = isPrimaryNavItemActive(item, pathname, searchParams);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-11 items-center border-b-2 px-0.5 text-[13px] font-semibold leading-none transition-colors duration-150 ease-out ${
                  active
                    ? "border-primary-orange text-text-primary"
                    : "border-transparent text-text-primary hover:border-deep-brown/30"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
