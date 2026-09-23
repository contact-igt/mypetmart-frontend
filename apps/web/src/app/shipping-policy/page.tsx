import type { Metadata } from "next";
import { PolicyH2 as H2, PolicyH3 as H3, PolicyP as P, PolicyPage, PolicyUL as UL } from "@/components/legal/policy-layout";

export const metadata: Metadata = {
  title: "Shipping Policy | MyPetMart",
  description: "Delivery timeframes, shipping charges and order tracking at My Pet Mart.",
};

const CONTACT_EMAIL = "mypetmartstore@gmail.com";

function EmailLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="break-all font-semibold text-primary-orange underline underline-offset-2 hover:text-terracotta">
      {CONTACT_EMAIL}
    </a>
  );
}

export default function ShippingPolicyPage() {
  return (
    <PolicyPage title="Shipping policy">
      <P>
        Welcome to My Pet Mart. Our shipping policy is designed to ensure a smooth and efficient delivery process for your pet essentials. Please review the details below:
      </P>

      <H2>Standard shipping</H2>
      <H3>Delivery timeframe</H3>
      <UL>
        <li>
          Orders are typically delivered within 4-8 business days after the order is placed. Please note that delivery times may vary based on your location within India and other factors beyond our control.
        </li>
      </UL>
      <H3>Location variance</H3>
      <UL>
        <li>
          The delivery time frame varies depending on the delivery location within India. Remote or less accessible areas may experience longer delivery times.
        </li>
      </UL>
      <H3>Order processing</H3>
      <UL>
        <li>Orders are processed during standard business hours. Orders placed on weekends or holidays will be processed on the next business day.</li>
      </UL>

      <H2>Express shipping</H2>
      <H3>Availability</H3>
      <UL>
        <li>We offer express shipping for all prepaid orders to ensure priority delivery.</li>
      </UL>
      <H3>Express shipping time frame</H3>
      <UL>
        <li>Express orders are delivered within 2-4 business days after the order is placed.</li>
      </UL>
      <H3>Additional cost</H3>
      <UL>
        <li>Express shipping may incur an additional charge, clearly communicated at the time of order placement.</li>
      </UL>

      <H2>Shipping charges</H2>
      <UL>
        <li>Shipping charges are calculated and displayed at checkout. Standard shipping charges apply, and any additional charges for express shipping will be detailed.</li>
        <li>For prepaid orders opting for express shipping, charges vary based on delivery location and order size/weight.</li>
      </UL>

      <H2>Tracking your order</H2>
      <UL>
        <li>Once your order ships, you will receive a confirmation email with a tracking number. Use this number to track your order until it arrives.</li>
      </UL>

      <H2>Important information</H2>
      <UL>
        <li>Ensure your shipping address at checkout is accurate and complete to prevent delivery delays or issues.</li>
        <li>
          For any concerns about your order&apos;s shipping status, contact us at <EmailLink />. Our team will assist you promptly.
        </li>
      </UL>

      <P>
        Thank you for choosing My Pet Mart. We are dedicated to delivering your pet needs swiftly and ensuring your satisfaction with every order.
      </P>
    </PolicyPage>
  );
}
