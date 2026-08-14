import { AccountShell } from "@/components/account/account-shell";
import { OrderDetailClient } from "./order-detail-client";

export const metadata = {
  title: "Order Detail | MyPetMart",
  description: "View details of your MyPetMart order.",
};

type Props = {
  params: Promise<{ orderId: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;

  return (
    <AccountShell subtitle="Review item breakdown, shipping snapshot, and order status.">
      <OrderDetailClient orderIdStr={orderId} />
    </AccountShell>
  );
}
