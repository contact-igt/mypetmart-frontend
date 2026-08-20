import { NewsletterVerifyClient } from "./newsletter-verify-client";

export const metadata = {
  title: "Confirm Subscription | MyPetMart",
  description: "Confirm your MyPetMart newsletter subscription.",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function NewsletterVerifyPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <main className="flex-1 bg-cream-bg py-8 md:py-12 min-h-[calc(100vh-144px)] flex items-center">
      <div className="mx-auto max-w-[640px] w-full px-5 sm:px-8">
        <NewsletterVerifyClient token={token ?? null} />
      </div>
    </main>
  );
}
