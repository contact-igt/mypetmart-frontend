import { AccountShell } from "@/components/account/account-shell";
import { ReturnsClient } from "./returns-client";

export const metadata = {
  title: "My Returns | MyPetMart",
  description: "Track the status of your MyPetMart return and refund requests.",
};

export default function AccountReturnsPage() {
  return (
    <AccountShell subtitle="Track your return requests and refund status.">
      <ReturnsClient />
    </AccountShell>
  );
}
