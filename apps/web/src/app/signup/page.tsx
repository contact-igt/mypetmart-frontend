import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Sign Up | MyPetMart",
  description: "Create an account with MyPetMart today.",
  robots: {
    index: false,
    follow: false
  }
};

export default function SignupPage() {
  return (
    <main className="flex-1 bg-cream-bg flex items-center justify-center min-h-[calc(100vh-72px)]">
      <div className="site-container w-full px-5 py-8">
        <SignupForm />
      </div>
    </main>
  );
}
