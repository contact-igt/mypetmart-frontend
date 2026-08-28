"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { LogOutIcon } from "@/components/account/account-icons";
import { AccountNav } from "@/components/account/account-nav";

type AccountShellProps = {
  children: ReactNode;
  subtitle?: string;
};

export function AccountShell({ children, subtitle }: AccountShellProps) {
  const router = useRouter();
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

  return (
    <main className="flex-1 bg-cream-bg py-6 sm:py-8 md:py-12 min-h-[calc(100vh-144px)]">
      <div className="site-container">
        {/* Welcome Header */}
        <div className="border-b border-deep-brown/15 pb-5 sm:pb-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-orange">
                My Account
              </span>
              <h1 className="font-baloo text-2xl font-extrabold text-deep-brown sm:text-4xl">
                Welcome back, {customer.name}!
              </h1>
              <p className="mt-1 text-sm text-text-primary/75">
                {subtitle || "Manage your profile details and continue exploring MyPetMart."}
              </p>
            </div>
            {customer.referenceCode && (
              <div className="mt-3 inline-flex max-w-full items-center gap-1.5 self-start rounded-full border border-deep-brown/20 bg-white px-3.5 py-1 text-xs font-semibold text-deep-brown shadow-xs sm:mt-0 sm:self-auto">
                <span className="shrink-0 text-deep-brown/60">Customer ID:</span>
                <span className="truncate font-mono font-bold text-primary-orange">{customer.referenceCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* Layout Grid */}
        <div className="mt-6 flex flex-col gap-6 lg:mt-8 lg:flex-row lg:items-start lg:gap-8">
          {/* Navigation — icon + label tab cards (horizontally scrollable) on
              mobile, vertical sidebar on desktop. Sign Out is a distinct
              control kept out of the scroll row at both breakpoints. */}
          <div className="flex min-w-0 flex-col gap-3 lg:w-60 lg:shrink-0">
            <AccountNav />

            <button
              type="button"
              disabled={loggingOut}
              onClick={handleLogout}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-deep-brown/15 bg-white px-4 py-2.5 text-sm font-semibold text-terracotta shadow-xs transition-colors hover:bg-terracotta/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deep-brown/30 disabled:opacity-50 lg:justify-start lg:px-3.5 lg:py-3"
            >
              <LogOutIcon width={18} height={18} />
              {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </main>
  );
}
