import { Suspense } from "react";
import { VerifyEmailForm } from "./verify-email-form";

export const metadata = {
  title: "Verify Email - MyPetMart",
  description: "Verify your MyPetMart email address with your 6-digit verification code."
};

export default function VerifyEmailPage() {
  return (
    <main className="min-h-[70vh] bg-cream-bg px-4 py-8">
      <Suspense fallback={<div className="mx-auto my-12 max-w-md p-8 text-center text-deep-brown">Loading...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </main>
  );
}
