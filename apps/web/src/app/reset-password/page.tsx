import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = {
  title: "Set New Password - MyPetMart",
  description: "Set your new MyPetMart account password."
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-[70vh] bg-cream-bg px-4 py-8">
      <Suspense fallback={<div className="mx-auto my-12 max-w-md p-8 text-center text-deep-brown">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
