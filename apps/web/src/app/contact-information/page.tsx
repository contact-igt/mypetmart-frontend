import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PolicyPage } from "@/components/legal/policy-layout";
import { CONTACT_INFO } from "@/data/contact-data";

export const metadata: Metadata = {
  title: "Contact Information | MyPetMart",
  description: "My Pet Mart's trade name, phone number, email and address.",
};

const linkClass = "font-semibold text-primary-orange underline underline-offset-2 hover:text-terracotta";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
      <dt className="font-bold text-text-primary">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function ContactInformationPage() {
  return (
    <PolicyPage title="Contact information">
      <dl className="divide-y divide-deep-brown/10 first:*:pt-0 last:*:pb-0">
        <Row label="Trade name">My Pet Mart</Row>
        <Row label="Phone number">
          <a href="tel:+919444025511" className={linkClass}>
            +91 94440 25511
          </a>
        </Row>
        <Row label="Email">
          <a href="mailto:mypetmartstore@gmail.com" className={`break-all ${linkClass}`}>
            mypetmartstore@gmail.com
          </a>
        </Row>
        <Row label="Address">
          12A, JR Enclave, MGR Nagar, Ayyapakkam, Chennai – 600077
        </Row>
        <Row label="Instagram">
          <a href={CONTACT_INFO.instagramUrl} target="_blank" rel="noopener noreferrer" className={`break-all ${linkClass}`}>
            {CONTACT_INFO.instagramHandle}
          </a>
        </Row>
        <Row label="YouTube">
          <a href={CONTACT_INFO.youtubeUrl} target="_blank" rel="noopener noreferrer" className={`break-all ${linkClass}`}>
            {CONTACT_INFO.youtubeHandle}
          </a>
        </Row>
      </dl>
    </PolicyPage>
  );
}
