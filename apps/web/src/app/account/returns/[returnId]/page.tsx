import { AccountShell } from "@/components/account/account-shell";
import { ReturnDetailClient } from "./return-detail-client";

export const metadata = {
  title: "Return Details | MyPetMart",
  description: "View the status of your MyPetMart return and refund request.",
};

export default async function AccountReturnDetailPage({ params }: { params: Promise<{ returnId: string }> }) {
  const { returnId } = await params;
  return (
    <AccountShell subtitle="Return and refund status.">
      <ReturnDetailClient returnIdStr={returnId} />
    </AccountShell>
  );
}
