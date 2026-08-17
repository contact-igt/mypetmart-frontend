"use client";

import Link from "next/link";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { AccountShell } from "@/components/account/account-shell";
import {
  ShoppingBagIcon,
  SupportIcon,
  UserIcon,
  ArrowRightIcon,
} from "@/components/account/account-icons";

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "Not available";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Not available";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Not available";
  }
}

function formatMemberSince(isoString: string | null | undefined): string {
  if (!isoString) return "Unknown";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  } catch {
    return "Unknown";
  }
}

export function AccountClient() {
  const { customer } = useCustomerAuth();

  return (
    <AccountShell subtitle="Here is a quick overview of your MyPetMart account and profile.">
      {customer ? (
        <div className="flex flex-col gap-6">
          {/* Profile Summary Card */}
          <div className="rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-deep-brown/10 pb-4">
              <h2 className="font-baloo text-xl font-bold text-deep-brown">
                Profile Summary
              </h2>
              <Link
                href="/account/profile"
                className="text-xs font-bold text-primary-orange hover:underline"
              >
                View Full Profile &rarr;
              </Link>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Full Name
                </span>
                <p className="mt-1 text-base font-semibold text-text-primary">
                  {customer.name}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Email Address
                </span>
                <p className="mt-1 text-base font-semibold text-text-primary">
                  {customer.email}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Phone Number
                </span>
                <p className="mt-1 text-base font-semibold text-text-primary">
                  {customer.phone || "Not provided"}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Customer ID
                </span>
                <p className="mt-1 font-mono text-base font-bold text-primary-orange">
                  {customer.referenceCode || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Account Status Card */}
          <div className="rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs">
            <h2 className="border-b border-deep-brown/10 pb-4 font-baloo text-xl font-bold text-deep-brown">
              Account Details & Status
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Account Status
                </span>
                <div className="mt-1.5">
                  <span className="inline-flex items-center rounded-full bg-mint-sage px-3 py-0.5 text-xs font-bold text-deep-brown">
                    {customer.status ? customer.status.toUpperCase() : "ACTIVE"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Email Verification
                </span>
                <div className="mt-1.5">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold ${
                      customer.emailVerifiedAt
                        ? "bg-mint-sage text-deep-brown"
                        : "bg-peach-hero/50 text-deep-brown"
                    }`}
                  >
                    {customer.emailVerifiedAt ? "Verified" : "Not Verified"}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Member Since
                </span>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {formatMemberSince(customer.createdAt)}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Last Login
                </span>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {formatDate(customer.lastLoginAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="mb-4 font-baloo text-lg font-bold text-deep-brown">
              Quick Actions
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <Link
                href="/shop"
                className="group flex flex-col justify-between rounded-2xl border border-deep-brown/15 bg-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary-orange hover:shadow-md"
              >
                <div className="flex items-center gap-3 text-primary-orange">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-peach-hero/40">
                    <ShoppingBagIcon width={20} height={20} />
                  </div>
                  <span className="font-bold text-deep-brown group-hover:text-primary-orange transition-colors">
                    Continue Shopping
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-primary-orange">
                  <span>Browse catalog</span>
                  <ArrowRightIcon width={14} height={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                href="/contact"
                className="group flex flex-col justify-between rounded-2xl border border-deep-brown/15 bg-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary-orange hover:shadow-md"
              >
                <div className="flex items-center gap-3 text-primary-orange">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-peach-hero/40">
                    <SupportIcon width={20} height={20} />
                  </div>
                  <span className="font-bold text-deep-brown group-hover:text-primary-orange transition-colors">
                    Contact Support
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-primary-orange">
                  <span>Get assistance</span>
                  <ArrowRightIcon width={14} height={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              <Link
                href="/account/profile"
                className="group flex flex-col justify-between rounded-2xl border border-deep-brown/15 bg-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary-orange hover:shadow-md"
              >
                <div className="flex items-center gap-3 text-primary-orange">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-peach-hero/40">
                    <UserIcon width={20} height={20} />
                  </div>
                  <span className="font-bold text-deep-brown group-hover:text-primary-orange transition-colors">
                    View Profile
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-primary-orange">
                  <span>Account details</span>
                  <ArrowRightIcon width={14} height={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </AccountShell>
  );
}
