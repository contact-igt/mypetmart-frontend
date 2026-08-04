import Image from "next/image";
import { NewsletterCard } from "@/components/newsletter-card";
import {
  PhoneIcon,
  MailIcon,
  PinIcon,
  InstagramIcon,
  FacebookIcon,
  TwitterIcon,
} from "@/components/icons";

const SOCIAL_LINKS = [
  { label: "Instagram", icon: InstagramIcon },
  { label: "Facebook", icon: FacebookIcon },
  { label: "Twitter", icon: TwitterIcon },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-cream-bg text-white">
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 top-[52px] bg-deep-brown" />
      <NewsletterCard />

      <div className="relative z-10 px-6 pb-5 pt-20 sm:px-10 lg:px-0 lg:pb-5 lg:pt-[19rem]">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid gap-10 border-b border-white/35 pb-10 xl:grid-cols-[390px_1fr_390px] xl:items-center xl:gap-16 xl:pb-9">
            <div>
              <Image
                src="/assest/logo2.png"
                alt="My Pet Mart"
                width={1336}
                height={936}
                className="h-auto w-[210px] object-contain sm:w-[240px]"
              />
            </div>

            <address className="not-italic text-white/80">
              <ul className="space-y-3 text-[0.9rem] leading-[1.35] lg:text-[1rem] lg:leading-[1.28]">
                <li className="flex items-center gap-3"><PhoneIcon width={17} height={17} className="shrink-0" /><span>+91 94440 25511</span></li>
                <li className="flex items-center gap-3"><MailIcon width={17} height={17} className="shrink-0" /><span>mypetmartstore@gmail.com</span></li>
                <li className="flex items-start gap-3"><PinIcon width={17} height={17} className="mt-0.5 shrink-0" /><span>12A, JR Enclave, MGR Nagar,<br />Ayyapakkam, Chennai – 600077</span></li>
              </ul>
            </address>

            <div className="lg:pt-4">
              <p className="max-w-[285px] text-[0.8rem] leading-[1.65] text-white/70">
                Thoughtfully selected pet-care essentials that make grooming, walking and everyday life easier for pet parents across India.
              </p>
              <div className="mt-9 flex gap-4">
                {SOCIAL_LINKS.map(({ label, icon: Icon }) => (
                  <button key={label} type="button" aria-label={label} title={label} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-150 hover:bg-white/20">
                    <Icon width={20} height={20} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 text-[0.82rem] leading-tight text-white/60 sm:flex-row sm:items-center sm:justify-between lg:pt-5 lg:text-[0.95rem]">
            <p>© {new Date().getFullYear()} My Pet Mart. Made with love for pet parents.</p>
            <p>Payments: UPI · Visa · Mastercard · Cash on Delivery</p>
          </div>
        </div>
      </div>
    </footer>
  );
}