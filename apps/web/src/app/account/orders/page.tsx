import { AccountShell } from "@/components/account/account-shell";
import { OrdersClient } from "./orders-client";

export const metadata = {
  title: "My Orders | MyPetMart",
  description: "View and manage your MyPetMart orders.",
};

export default function AccountOrdersPage() {
  return (
    <AccountShell subtitle="Track your past purchases and pending orders.">
      <OrdersClient />
    </AccountShell>
  );
}
