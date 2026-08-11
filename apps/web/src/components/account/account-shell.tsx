"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { UserIcon, ShieldCheckIcon, LogOutIcon } from "@/components/account/account-icons";

type AccountShellProps = {
  children: ReactNode;
  subtitle?: string;
};

export function AccountShell({ children, subtitle }: AccountShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, customer, logout } = useCustomerAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    }
  }, [status, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.push("/signin");
    } catch {
      router.push("/signin");
    } finally {
      setLoggingOut(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <main className="flex-1 bg-cream-bg flex items-center justify-center min-h-[calc(100vh-144px)] py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-orange border-t-transparent"></div>
          <p className="font-medium text-deep-brown">Loading your account details...</p>
        </div>
      </main>
    );
  }

  if (!customer) {
    return null;
  }

  const isOverviewActive = pathname === "/account";
  const isProfileActive = pathname === "/account/profile";

  return (
    <main className="flex-1 bg-cream-bg py-8 md:py-12 min-h-[calc(100vh-144px)]">
      <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
        {/* Welcome Header */}
        <div className="border-b border-deep-brown/15 pb-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-orange">
                My Account
              </span>
              <h1 className="font-baloo text-3xl font-extrabold text-deep-brown sm:text-4xl">
                Welcome back, {customer.name}!
              </h1>
              <p className="mt-1 text-sm text-text-primary/75">
                {subtitle || "Manage your profile details and continue exploring MyPetMart."}
              </p>
            </div>
            {customer.referenceCode && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-deep-brown/20 bg-white px-3.5 py-1 text-xs font-semibold text-deep-brown shadow-xs sm:mt-0">
                <span className="text-deep-brown/60">Customer ID:</span>
                <span className="font-mono text-primary-orange font-bold">{customer.referenceCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* Layout Grid */}
        <div className="mt-8 flex flex-col gap-8 md:flex-row md:items-start">
          {/* Navigation */}
          <nav
            aria-label="Account navigation"
            className="flex flex-row overflow-x-auto gap-2 p-1.5 rounded-2xl border border-deep-brown/15 bg-white shadow-xs md:w-60 md:shrink-0 md:flex-col md:p-3"
          >
            <Link
              href="/account"
              aria-current={isOverviewActive ? "page" : undefined}
              className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                isOverviewActive
                  ? "bg-primary-orange text-white shadow-xs"
                  : "text-deep-brown hover:bg-cream-bg hover:text-primary-orange"
              }`}
            >
              <UserIcon width={18} height={18} />
              Overview
            </Link>

            <Link
              href="/account/profile"
              aria-current={isProfileActive ? "page" : undefined}
              className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                isProfileActive
                  ? "bg-primary-orange text-white shadow-xs"
                  : "text-deep-brown hover:bg-cream-bg hover:text-primary-orange"
              }`}
            >
              <ShieldCheckIcon width={18} height={18} />
              Profile
            </Link>

            <div className="my-1 hidden border-t border-deep-brown/10 md:block" />

            <button
              type="button"
              disabled={loggingOut}
              onClick={handleLogout}
              className="flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-terracotta hover:bg-terracotta/10 transition-colors disabled:opacity-50"
            >
              <LogOutIcon width={18} height={18} />
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </nav>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
