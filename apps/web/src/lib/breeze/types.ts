// Types for the Breeze Web SDK (@juspay/blaze-sdk-web) — the documented
// Independent-platform `sendOTP -> verifyOTP -> startPayment` flow.
//
// Sources:
//   - docs.breeze.in/web               (initiate / process / callback)
//   - docs.breeze.in/sdk-payload-helper -> Independent -> Login Flow / Start Payment Flow
//   - docs.breeze.in -> Event Stream, Process Result Events
//
// Only fields the official docs describe are typed here. Anything the docs
// do not specify is intentionally left off (see the TODO markers in
// breeze-pay-button.tsx).

export const BREEZE_SERVICE = "in.breeze.onecco" as const;

// ---- SDK init -------------------------------------------------------------

export type BreezeInitiatePayload = {
  merchantId: string;
  shopUrl: string;
  environment: string; // Breeze team confirmed: "smb-release"
};

export type BreezeSdkEnvelope<TPayload> = {
  requestId: string;
  service: typeof BREEZE_SERVICE;
  payload: TPayload;
};

// ---- process() action payloads (documented) -------------------------------

export type BreezeSendOtpPayload = {
  action: "sendOTP";
  phoneNumber: string; // WITHOUT country code, e.g. "9876543210"
  countryCode: string; // WITH + prefix, e.g. "+91"
};

export type BreezeVerifyOtpPayload = {
  action: "verifyOTP";
  otp: string; // 4-6 digits
  otpSessionToken: string; // from the sendOTP response
};

export type BreezeStartPaymentPayload = {
  action: "startPayment";
  orderId: string; // our Payment.provider_order_id (server-authoritative)
  amount: number; // paise ("smallest currency unit", per docs)
  currency: string; // "INR"
  customerId: string; // from verifyOTP response  [see TODO in component]
  customerPhone: string; // 10 digits
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  paymentMethods?: string[]; // UPI | CARDS | NB | WALLET | COD | EMI | BNPL
};

// ---- callback event shapes (documented) ----------------------------------

// Generic envelope the SDK delivers to the init callback.
export type BreezeCallbackEvent = {
  requestId?: string;
  service?: string;
  payload?: {
    eventName?: "initiate" | "process" | "eventStream" | "processResult" | "terminate" | string;
    action?: "sendOTP" | "verifyOTP" | "startPayment" | string;
    status?: string;
    message?: string;
    // sendOTP result
    otpSessionToken?: string;
    phoneNumber?: string;
    // verifyOTP result
    customer?: {
      name?: string;
      emailAddress?: string;
      countryCode?: string;
      phoneNumber?: string;
      customerId?: string;
    };
    token?: string;
    // startPayment result
    paymentId?: string;
    orderId?: string;
    // processResult / eventStream extras
    event?: string;
    checkoutId?: string;
    trackingUrl?: string | null;
    [key: string]: unknown;
  };
};

// processResult final-outcome statuses (docs.breeze.in -> Process Result Events)
export type BreezeProcessResultStatus =
  | "SUCCESS"
  | "PAYMENT_SUCCESS"
  | "PARTIALLY_PAID"
  | "PENDING"
  | "FAILED"
  | "backPressed"
  | "closeApp";
