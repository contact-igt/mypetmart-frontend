// Mirrors backend PaymentModels/payment.types.ts PaymentInitiationResultJSON.
// Exactly one of orderId (customer) / guestAccessToken (guest) is sent —
// never both, never a client-supplied amount/email/phone/callback URL.
export type InitiatePaymentInput = { orderId: number; guestAccessToken?: never } | { guestAccessToken: string; orderId?: never };

export interface PayuHostedCheckoutFieldsJSON {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  udf1: string;
  hash: string;
}

export interface PaymentInitiationResultJSON {
  provider: "payu";
  gatewayUrl: string;
  fields: PayuHostedCheckoutFieldsJSON;
}

// Mirrors backend PaymentModels/breeze.types.ts BreezeStartPaymentParamsJSON.
// Returned by POST /storefront/payments/breeze/initiate. Server-authoritative
// values for the Breeze Web SDK `sendOTP -> verifyOTP -> startPayment` flow —
// no secret is included (Breeze requires no frontend key).
export interface BreezeStartPaymentParamsJSON {
  provider: "breeze";
  merchantId: string;
  environment: string;
  shopUrl: string;
  orderRef: string; // pass as startPayment.orderId
  amountPaise: number; // pass as startPayment.amount
  currency: string;
  customerPhone: string;
  customerEmail: string | null;
  customerName: string | null;
  returnUrl: string;
  orderId: number; // internal id — only used to poll /payments/status
}

// Mirrors backend PaymentModels/payment.types.ts PaymentStatusResultJSON.
// MyPetMart-normalized state only — never the raw PayU payload.
export interface PaymentStatusResultJSON {
  paymentStatus: string;
  orderId: number;
  orderStatus: string;
  amount: string;
  currency: string;
  commerceException: string | null;
}

// Mirrors backend PaymentModels/payment.types.ts ConfirmCodOrderInput —
// identical shape to InitiatePaymentInput (exactly one of orderId/guestAccessToken).
export type ConfirmCodOrderInput = InitiatePaymentInput;

// Mirrors backend PaymentModels/payment.types.ts CodConfirmationResultJSON.
// paymentStatus is always "pending" here — a COD Payment is never marked
// "paid" automatically (Phase 1 scope).
export interface CodConfirmationResultJSON {
  provider: "cod";
  paymentId: number;
  orderId: number;
  orderStatus: string;
  paymentStatus: string;
  amount: string;
  currency: string;
}
