import { fetchWithAuth } from "./auth/auth-api";

export type ContactEnquirySubject = "Product Question" | "Order Question" | "Something Else";

export type ContactEnquirySubmission = {
  name: string;
  email: string;
  phone?: string;
  subject: ContactEnquirySubject;
  orderNumber?: string;
  message: string;
};

export type ContactEnquirySubmitResult = { success: true; enquiryNumber: string };

export const ContactApi = {
  async submit(input: ContactEnquirySubmission): Promise<ContactEnquirySubmitResult> {
    return fetchWithAuth<ContactEnquirySubmitResult>("/storefront/contact-enquiries", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};
