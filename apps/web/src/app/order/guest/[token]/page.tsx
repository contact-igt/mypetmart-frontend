import { GuestOrderClient } from "./guest-order-client";

export const metadata = {
  title: "Order Status | MyPetMart",
  description: "View the status of your MyPetMart order.",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function GuestOrderPage({ params }: Props) {
  const { token } = await params;

  return (
    <main className="flex-1 bg-cream-bg py-8 md:py-12 min-h-[calc(100vh-144px)]">
      <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
        <GuestOrderClient token={token} />
      </div>
    </main>
  );
}
