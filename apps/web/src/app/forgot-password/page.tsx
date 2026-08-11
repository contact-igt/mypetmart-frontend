import { Suspense } from "react";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata = {
  title: "Forgot Password - MyPetMart",
  description: "Reset your MyPetMart account password."
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-[70vh] bg-cream-bg px-4 py-8">
      <Suspense fallback={<div className="mx-auto my-12 max-w-md p-8 text-center text-deep-brown">Loading...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
