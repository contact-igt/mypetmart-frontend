import { fetchWithAuth } from "./auth/auth-api";

export type NewsletterSubscribeResult = { message: string };
export type NewsletterVerifyResult = { message: string; email: string; unsubscribeToken: string };
export type NewsletterUnsubscribeResult = { message: string };
export type NewsletterResendUnsubscribeLinkResult = { message: string };

export const NewsletterApi = {
  async subscribe(email: string, source?: string): Promise<NewsletterSubscribeResult> {
    return fetchWithAuth<NewsletterSubscribeResult>("/storefront/newsletter/subscribe", {
      method: "POST",
      body: JSON.stringify(source ? { email, source } : { email })
    });
  },

  async verify(token: string): Promise<NewsletterVerifyResult> {
    return fetchWithAuth<NewsletterVerifyResult>("/storefront/newsletter/verify", {
      method: "POST",
      body: JSON.stringify({ token })
    });
  },

  async unsubscribe(token: string): Promise<NewsletterUnsubscribeResult> {
    return fetchWithAuth<NewsletterUnsubscribeResult>("/storefront/newsletter/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ token })
    });
  },

  async resendUnsubscribeLink(email: string): Promise<NewsletterResendUnsubscribeLinkResult> {
    return fetchWithAuth<NewsletterResendUnsubscribeLinkResult>("/storefront/newsletter/resend-unsubscribe-link", {
      method: "POST",
      body: JSON.stringify({ email })
    });
  }
};
