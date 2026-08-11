import type { Metadata } from "next";
import { SigninForm } from "./signin-form";

export const metadata: Metadata = {
  title: "Sign In | MyPetMart",
  description: "Sign in to manage your pet care essentials.",
  robots: {
    index: false,
    follow: false
  }
};

export default function SigninPage() {
  return (
    <main className="flex-1 bg-cream-bg flex items-center justify-center min-h-[calc(100vh-72px)]">
      <div className="site-container w-full px-5 py-8">
        <SigninForm />
      </div>
    </main>
  );
}
