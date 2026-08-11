import type { Metadata } from "next";
import { AccountClient } from "./account-client";

export const metadata: Metadata = {
  title: "My Account | MyPetMart",
  description: "View and manage your MyPetMart account details.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountPage() {
  return <AccountClient />;
}
