import { Suspense } from "react";
import { ForgotPasswordVerifyForm } from "./forgot-password-verify-form";

export const metadata = {
  title: "Verify Reset Code - MyPetMart",
  description: "Verify your 6-digit password reset code."
};

export default function ForgotPasswordVerifyPage() {
  return (
    <main className="min-h-[70vh] bg-cream-bg px-4 py-8">
      <Suspense fallback={<div className="mx-auto my-12 max-w-md p-8 text-center text-deep-brown">Loading...</div>}>
        <ForgotPasswordVerifyForm />
      </Suspense>
    </main>
  );
}
