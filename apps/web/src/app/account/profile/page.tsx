import type { Metadata } from "next";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "My Profile | MyPetMart",
  description: "View your MyPetMart customer profile.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfilePage() {
  return <ProfileClient />;
}
