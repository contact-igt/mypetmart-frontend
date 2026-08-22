"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRightIcon, InstagramIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { CONTACT_INFO, ENQUIRY_TYPES } from "@/data/contact-data";
import { ContactApi, type ContactEnquirySubject } from "@/lib/contact-api";
import { AppAuthError } from "@/lib/auth/auth-errors";
import type { StoreProfile } from "@/types/storefront";

const FIELD_CLASS = "mt-2 h-[50px] w-full rounded-[15px] border border-[#E7CCB4] bg-white/85 px-4 text-[15px] outline-none transition-colors focus:border-primary-orange";
const LABEL_CLASS = "text-[12px] font-semibold uppercase tracking-[0.17em] text-text-primary";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SubmitState = "idle" | "submitting" | "success" | "error";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  subject: ENQUIRY_TYPES[0] as ContactEnquirySubject,
  orderNumber: "",
  message: "",
  consent: false,
};

export function ContactFormSection({ storeProfile }: { storeProfile: StoreProfile }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [enquiryNumber, setEnquiryNumber] = useState("");

  function update<K extends keyof typeof EMPTY_FORM>(field: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validate(): string | null {
    const name = form.name.trim();
    const email = form.email.trim();
    const msg = form.message.trim();

    if (!name) return "Enter your name.";
    if (name.length > 160) return "Name is too long.";
    if (!email) return "Enter your email address.";
    if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
    if (email.length > 190) return "Email is too long.";
    if (form.phone.trim().length > 32) return "Phone number is too long.";
    if (form.orderNumber.trim().length > 50) return "Order number is too long.";
    if (!msg) return "Enter a message.";
    if (msg.length > 4000) return "Message is too long.";
    if (!form.consent) return "Please agree to be contacted about your enquiry.";
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;

    const validationError = validate();
    if (validationError) {
      setState("error");
      setMessage(validationError);
      return;
    }

    setState("submitting");
    setMessage("");

    try {
      const result = await ContactApi.submit({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        subject: form.subject,
        orderNumber: form.orderNumber.trim() || undefined,
        message: form.message.trim(),
      });
      setEnquiryNumber(result.enquiryNumber);
      setState("success");
      setMessage("Thanks, we've received your message. Our team will get back to you soon.");
      setForm(EMPTY_FORM);
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof AppAuthError
          ? error.message
          : "We couldn't send your message right now. Please try again."
      );
    }
  }

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
        <form onSubmit={handleSubmit} noValidate>
          {state === "success" && (
            <div role="status" className="mb-6 rounded-[15px] border border-primary-orange/30 bg-primary-orange/5 p-4 text-sm text-text-primary">
              <p className="font-semibold">{message}</p>
              {enquiryNumber && (
                <p className="mt-1 text-text-primary/70">Reference: <span className="font-mono">{enquiryNumber}</span></p>
              )}
            </div>
          )}
          {state === "error" && message && (
            <p role="alert" className="mb-6 rounded-[15px] border border-terracotta/30 bg-terracotta/5 p-4 text-sm font-medium text-terracotta">
              {message}
            </p>
          )}

          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className={LABEL_CLASS}>Name</label>
              <input
                id="contact-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                disabled={state === "submitting"}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="contact-email" className={LABEL_CLASS}>Email</label>
              <input
                id="contact-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                disabled={state === "submitting"}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className={LABEL_CLASS}>Phone (optional)</label>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(event) => update("phone", event.target.value)}
                disabled={state === "submitting"}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor="contact-enquiry" className={LABEL_CLASS}>Enquiry type</label>
              <select
                id="contact-enquiry"
                name="enquiryType"
                value={form.subject}
                onChange={(event) => update("subject", event.target.value as ContactEnquirySubject)}
                disabled={state === "submitting"}
                className={FIELD_CLASS}
              >
                {ENQUIRY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-order" className={LABEL_CLASS}>Order number (optional)</label>
              <input
                id="contact-order"
                name="orderNumber"
                type="text"
                value={form.orderNumber}
                onChange={(event) => update("orderNumber", event.target.value)}
                disabled={state === "submitting"}
                className={FIELD_CLASS}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-message" className={LABEL_CLASS}>Message</label>
              <textarea
                id="contact-message"
                name="message"
                required
                rows={5}
                value={form.message}
                onChange={(event) => update("message", event.target.value)}
                disabled={state === "submitting"}
                className="mt-2 h-[145px] w-full resize-none rounded-[15px] border border-[#E7CCB4] bg-white/85 p-4 text-[15px] outline-none transition-colors focus:border-primary-orange"
              />
            </div>
          </div>

          <label className="mt-6 flex items-start gap-2 text-sm text-text-primary/80">
            <input
              type="checkbox"
              name="consent"
              required
              checked={form.consent}
              onChange={(event) => update("consent", event.target.checked)}
              disabled={state === "submitting"}
              className="mt-0.5 h-4 w-4 accent-[#147AF3]"
            />
            I agree to be contacted about my enquiry. We respect your inbox.
          </label>

          <button
            type="submit"
            disabled={state === "submitting"}
            className="button-primary motion-press mt-6 h-[54px] w-full text-base disabled:opacity-60"
          >
            {state === "submitting" ? "Sending…" : "Send message"} <ArrowRightIcon width={17} height={17} />
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
            <ContactDetail
              icon={<PhoneIcon width={18} height={18} />}
              label="Phone"
              value={storeProfile.supportPhone}
              href={storeProfile.supportPhone ? `tel:${storeProfile.supportPhone.replace(/\s+/g, "")}` : undefined}
            />
            <ContactDetail
              icon={<MailIcon width={18} height={18} />}
              label="Email"
              value={storeProfile.supportEmail}
              href={storeProfile.supportEmail ? `mailto:${storeProfile.supportEmail}` : undefined}
              className="mt-4"
            />
            <ContactDetail icon={<PinIcon width={18} height={18} />} label="Address" value={storeProfile.address} className="mt-4" />
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

function ContactDetail({
  icon,
  label,
  value,
  href,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-hero text-text-primary">{icon}</span>
      <div className="pt-0.5">
        <p className="text-[12px] text-text-primary/75">{label}</p>
        {href ? (
          <a href={href} className="text-[16px] leading-[1.45] text-text-primary underline-offset-2 transition-colors hover:text-primary-orange hover:underline">
            {value}
          </a>
        ) : (
          <p className="text-[16px] leading-[1.45] text-text-primary whitespace-pre-line">{value}</p>
        )}
      </div>
    </div>
  );
}
