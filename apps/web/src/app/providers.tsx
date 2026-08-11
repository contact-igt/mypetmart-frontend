"use client";

import type { ReactNode } from "react";
import { CustomerAuthProvider } from "@/context/customer-auth-context";

export function Providers({ children }: { children: ReactNode }) {
  return <CustomerAuthProvider>{children}</CustomerAuthProvider>;
}
