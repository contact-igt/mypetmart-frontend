"use client";

import Image from "next/image";
import { ArrowRightIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { CONTACT_INFO, ENQUIRY_TYPES } from "@/data/contact-data";

const FIELD_CLASS = "mt-2 h-[50px] w-full rounded-[15px] border border-[#E7CCB4] bg-white/85 px-4 text-[15px] outline-none transition-colors focus:border-primary-orange";
const LABEL_CLASS = "text-[12px] font-semibold uppercase tracking-[0.17em] text-text-primary";

export function ContactFormSection() {
  return (
    <section className="relative isolate overflow-hidden bg-cream-bg py-12 sm:py-14 xl:py-16">
      <svg
        aria-hidden="true"
        viewBox="0 0 1910 700"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full xl:block"
      >
        <path d="M 430 0 C 410 25, 520 58, 690 86" fill="none" stroke="#E8A27A" strokeDasharray="4 6" strokeWidth="1.5" />
        <path d="M 1040 132 C 1110 142, 1090 194, 1065 232" fill="none" stroke="#E8A27A" strokeDasharray="4 6" strokeWidth="1.5" />
        <path d="M 1040 285 C 1110 275, 1105 344, 1070 342" fill="none" stroke="#E8A27A" strokeDasharray="4 6" strokeWidth="1.5" />
      </svg>

      <div className="site-container relative z-10 grid gap-10 xl:grid-cols-[1.42fr_1fr] xl:gap-[4.5rem]">
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className={LABEL_CLASS}>Name</label>
              <input id="contact-name" name="name" type="text" required autoComplete="name" className={FIELD_CLASS} />
            </div>
            <div>
              <label htmlFor="contact-email" className={LABEL_CLASS}>Email</label>
              <input id="contact-email" name="email" type="email" required autoComplete="email" className={FIELD_CLASS} />
            </div>
            <div>
              <label htmlFor="contact-phone" className={LABEL_CLASS}>Phone (optional)</label>
              <input id="contact-phone" name="phone" type="tel" autoComplete="tel" className={FIELD_CLASS} />
            </div>
            <div>
              <label htmlFor="contact-enquiry" className={LABEL_CLASS}>Enquiry type</label>
              <select id="contact-enquiry" name="enquiryType" className={FIELD_CLASS}>
                {ENQUIRY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-order" className={LABEL_CLASS}>Order number (optional)</label>
              <input id="contact-order" name="orderNumber" type="text" className={FIELD_CLASS} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-message" className={LABEL_CLASS}>Message</label>
              <textarea id="contact-message" name="message" required rows={5} className="mt-2 h-[145px] w-full resize-none rounded-[15px] border border-[#E7CCB4] bg-white/85 p-4 text-[15px] outline-none transition-colors focus:border-primary-orange" />
            </div>
          </div>

          <label className="mt-6 flex items-start gap-2 text-sm text-text-primary/80">
            <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 accent-[#147AF3]" />
            I agree to be contacted about my enquiry. We respect your inbox.
          </label>

          <button type="submit" className="button-primary motion-press mt-6 h-[54px] w-full text-base">
            Send message <ArrowRightIcon width={17} height={17} />
          </button>
        </form>

        <div className="flex flex-col gap-5">
          <div className="relative h-[145px] overflow-hidden rounded-[25px]">
            <Image src="/assest/pet-mail-cat.png" alt="Ginger cat resting beside a paper envelope" fill sizes="(min-width: 1024px) 34vw, 100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/20" />
            <span className="absolute left-6 top-6 inline-flex h-[30px] items-center rounded-full bg-white px-4 text-[11px] font-medium uppercase tracking-[0.02em] text-text-primary">Say hi</span>
            <p className="absolute bottom-6 left-6 text-[2rem] leading-none text-text-primary" style={{ fontFamily: "var(--font-bagel-fat-one)", fontWeight: 400 }}>
              We love pet mail.
            </p>
          </div>

          <div className="rounded-[25px] bg-white/35 px-6 py-6">
            <ContactDetail icon={<PhoneIcon width={18} height={18} />} label="Phone" value={CONTACT_INFO.phone} />
            <ContactDetail icon={<MailIcon width={18} height={18} />} label="Email" value={CONTACT_INFO.email} className="mt-4" />
            <ContactDetail icon={<PinIcon width={18} height={18} />} label="Address" value={CONTACT_INFO.address} className="mt-4" />
          </div>

          <a
            href={CONTACT_INFO.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[92px] items-center justify-between rounded-[25px] bg-yellow-card px-6 py-5 transition-opacity hover:opacity-90"
          >
            <div>
              <p className="text-[1.35rem] italic leading-none text-text-primary" style={{ fontFamily: "var(--font-display-italic)" }}>Follow the pack</p>
              <p className="mt-1 text-sm text-text-primary">{CONTACT_INFO.instagramHandle} on Instagram</p>
            </div>
            <InstagramIcon width={23} height={23} className="shrink-0 text-text-primary" />
          </a>
        </div>
      </div>
    </section>
  );
}

function ContactDetail({ icon, label, value, className = "" }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-hero text-text-primary">{icon}</span>
      <div className="pt-0.5">
        <p className="text-[12px] text-text-primary/75">{label}</p>
        <p className="text-[16px] leading-[1.45] text-text-primary">{value}</p>
      </div>
    </div>
  );
}
