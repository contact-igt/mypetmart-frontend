"use client";

import { useCustomerAuth } from "@/context/customer-auth-context";
import { AccountShell } from "@/components/account/account-shell";

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "Not available";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Not available";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
      day: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

export function ProfileClient() {
  const { customer } = useCustomerAuth();

  return (
    <AccountShell subtitle="View and manage your personal account profile information.">
      {customer ? (
        <div className="flex flex-col gap-6">
          {/* Personal Details Card */}
          <div className="rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-deep-brown/10 pb-4">
              <div>
                <h2 className="font-baloo text-xl font-bold text-deep-brown">
                  Personal Profile Details
                </h2>
                <p className="text-xs text-text-primary/70">
                  Your registered customer identity details.
                </p>
              </div>
              <span className="rounded-full bg-peach-hero/40 px-3 py-1 text-xs font-semibold text-deep-brown">
                Read-only
              </span>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/40 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Full Name
                </span>
                <p className="mt-1 text-base font-bold text-deep-brown">
                  {customer.name}
                </p>
              </div>

              <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/40 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Email Address
                </span>
                <p className="mt-1 text-base font-bold text-deep-brown">
                  {customer.email}
                </p>
              </div>

              <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/40 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Phone Number
                </span>
                <p className="mt-1 text-base font-bold text-deep-brown">
                  {customer.phone || "Not provided"}
                </p>
              </div>

              <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/40 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Customer Reference Code
                </span>
                <p className="mt-1 font-mono text-base font-bold text-primary-orange">
                  {customer.referenceCode || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Security & Verification Card */}
          <div className="rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs">
            <div className="border-b border-deep-brown/10 pb-4">
              <h2 className="font-baloo text-xl font-bold text-deep-brown">
                Account Security & Verification
              </h2>
              <p className="text-xs text-text-primary/70">
                Account privileges and login verification metrics.
              </p>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/40 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Account Status
                </span>
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-mint-sage px-3 py-1 text-xs font-bold text-deep-brown">
                    {customer.status ? customer.status.toUpperCase() : "ACTIVE"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/40 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Email Verification
                </span>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
                      customer.emailVerifiedAt
                        ? "bg-mint-sage text-deep-brown"
                        : "bg-peach-hero/60 text-deep-brown"
                    }`}
                  >
                    {customer.emailVerifiedAt ? "Verified" : "Pending Verification"}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/40 p-4 sm:col-span-2 lg:col-span-1">
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Account Role
                </span>
                <p className="mt-1 text-base font-bold text-deep-brown capitalize">
                  {customer.role === "customer" ? "Customer Account" : customer.role}
                </p>
              </div>

              <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/40 p-4">
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Member Since
                </span>
                <p className="mt-1 text-sm font-semibold text-deep-brown">
                  {formatMemberSince(customer.createdAt)}
                </p>
              </div>

              <div className="rounded-xl border border-deep-brown/10 bg-cream-bg/40 p-4 sm:col-span-2 lg:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wider text-deep-brown/60">
                  Last Login Timestamp
                </span>
                <p className="mt-1 text-sm font-semibold text-deep-brown">
                  {formatDate(customer.lastLoginAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AccountShell>
  );
}
