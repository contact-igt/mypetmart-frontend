import Image from "next/image";
import Link from "next/link";
import { InstagramIcon, YouTubeIcon } from "@/components/icons";
import { NewsletterCard } from "@/components/newsletter-card";
import { CONTACT_INFO } from "@/data/contact-data";

const SOCIAL_LINKS = [
  { label: "Instagram", href: CONTACT_INFO.instagramUrl, icon: InstagramIcon },
  { label: "YouTube", href: CONTACT_INFO.youtubeUrl, icon: YouTubeIcon },
] as const;

const SHOP_LINKS = [
  { label: "Grooming", href: "/shop?category=grooming" },
  { label: "Walking", href: "/shop?category=walking-essentials" },
  { label: "Paw Care", href: "/shop?category=paw-care" },
  { label: "Best Sellers", href: "/shop?sort=newest" },
] as const;

// Contact information / Shipping policy / Refund policy / Privacy policy /
// Terms of service live in the bottom legal bar (LEGAL_LINKS) — kept out of
// here so they aren't duplicated in both places.
const HELP_LINKS = [
  { label: "Contact us", href: "/contact" },
  { label: "Shop all products", href: "/shop" },
  { label: "Returns", href: "/account/returns" },
  { label: "Track order", href: "/account/orders" },
] as const;

const LEGAL_LINKS = [
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Refund policy", href: "/refund-policy" },
  { label: "Terms of service", href: "/terms-of-service" },
  { label: "Shipping policy", href: "/shipping-policy" },
  { label: "Contact information", href: "/contact-information" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-deep-brown text-white">
      <NewsletterCard />

      <div className="relative z-10 pt-14 sm:pt-16 lg:pt-20">
        <div className="site-container">
          <div className="grid gap-10 pb-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_0.9fr_1.05fr] lg:gap-x-12 lg:gap-y-8 xl:gap-x-20">
            <div className="max-w-[19rem]">
              <Image
                src="/assest/logo2.png"
                alt="My Pet Mart"
                width={1336}
                height={936}
                className="h-auto w-[12.5rem] object-contain sm:w-[14rem]"
              />
              <p className="mt-5 text-base leading-[1.75] text-white/80">
                Thoughtfully selected pet-care essentials that make grooming, walking and everyday life easier for pet parents across India.
              </p>
              <ul aria-label="My Pet Mart on social media" className="mt-5 flex items-center gap-3">
                {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`My Pet Mart on ${label}`}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/35 text-white/85 transition-colors hover:border-white hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      <Icon width={20} height={20} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <nav aria-label="Shop footer links">
              <h2 className="text-lg font-bold text-white">Shop</h2>
              <ul className="mt-3 space-y-1 text-base text-white/75">
                {SHOP_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="-mx-2 inline-block rounded-lg px-2 py-2 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Help footer links">
              <h2 className="text-lg font-bold text-white">Help</h2>
              <ul className="mt-3 space-y-1 text-base text-white/75">
                {HELP_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="-mx-2 inline-block rounded-lg px-2 py-2 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <address className="not-italic">
              <h2 className="text-lg font-bold text-white">Get in touch</h2>
              <div className="mt-3 space-y-1 text-base leading-[1.55] text-white/75">
                <p>
                  <a href="tel:+919444025511" className="-mx-2 inline-block rounded-lg px-2 py-2 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">+91 94440 25511</a>
                </p>
                <p>
                  <a href="mailto:mypetmartstore@gmail.com" className="-mx-2 inline-block break-all rounded-lg px-2 py-2 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">mypetmartstore@gmail.com</a>
                </p>
                <p className="pt-1">12A, JR Enclave, MGR Nagar,<br />Ayyapakkam, Chennai – 600077</p>
              </div>
            </address>
          </div>
        </div>

        <div className="border-t border-white/35">
          <div className="site-container site-footer-bottom flex flex-col gap-3 py-5 text-sm leading-tight text-white/60 sm:flex-row sm:items-center sm:justify-between sm:text-base">
            <p>© {new Date().getFullYear()} My Pet Mart. Made with love for pet parents.</p>
            <nav aria-label="Legal footer links">
              <ul className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {LEGAL_LINKS.map((link, index) => (
                  <li key={link.href} className="flex items-center gap-1.5">
                    {index > 0 && <span aria-hidden="true">·</span>}
                    <Link
                      href={link.href}
                      className="rounded-lg px-1 py-1 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
