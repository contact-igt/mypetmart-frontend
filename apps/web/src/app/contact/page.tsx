import type { Metadata } from "next";
import { ContactHero } from "@/components/contact/contact-hero";
import { ContactFormSection } from "@/components/contact/contact-form-section";
import { CommonQuestions } from "@/components/contact/common-questions";
import { getStorefrontStoreProfile } from "@/lib/storefront-api";
import { CONTACT_INFO } from "@/data/contact-data";
import type { StoreProfile } from "@/types/storefront";

export const metadata: Metadata = {
  title: "Contact | MyPetMart",
  description: "We're all ears. Even the floppy ones.",
};

// Resilience fallback only — the real source of truth is the backend
// StoreProfile (Admin Settings → Store profile). This local copy exists
// purely so the page still renders real-looking contact details if that
// fetch fails; it is never read when the API call succeeds.
const FALLBACK_STORE_PROFILE: StoreProfile = {
  storeName: "My Pet Mart",
  supportPhone: CONTACT_INFO.phone,
  supportEmail: CONTACT_INFO.email,
  address: CONTACT_INFO.address,
};

async function loadStoreProfile(): Promise<StoreProfile> {
  try {
    return await getStorefrontStoreProfile();
  } catch {
    return FALLBACK_STORE_PROFILE;
  }
}

export default async function ContactPage() {
  const storeProfile = await loadStoreProfile();

  return (
    <main className="flex-1">
      <ContactHero />
      <ContactFormSection storeProfile={storeProfile} />
      <CommonQuestions />
    </main>
  );
}
