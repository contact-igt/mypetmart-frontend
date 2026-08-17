"use client";

import { useCustomerAuth as useAuth } from "../context/customer-auth-context";

export function useCustomerAuth() {
  return useAuth();
}
export default useCustomerAuth;
