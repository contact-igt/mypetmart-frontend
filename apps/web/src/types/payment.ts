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
