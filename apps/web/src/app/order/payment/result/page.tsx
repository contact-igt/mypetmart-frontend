import { PaymentResultClient } from "./payment-result-client";

export const metadata = {
  title: "Payment Status | MyPetMart",
  description: "Your payment is being verified.",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams: Promise<{ status?: string; txnid?: string; orderId?: string }>;
};

export default async function PaymentResultPage({ searchParams }: Props) {
  const { status, txnid, orderId } = await searchParams;

  return (
    <main className="flex-1 bg-cream-bg py-8 md:py-12 min-h-[calc(100vh-144px)] flex items-center">
      <div className="mx-auto max-w-[640px] w-full px-5 sm:px-8">
        <PaymentResultClient status={status === "success" ? "success" : "failure"} txnid={txnid ?? null} orderId={orderId ?? null} />
      </div>
    </main>
  );
}
