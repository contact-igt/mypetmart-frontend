"use client";

import BlazeSDK from "@juspay/blaze-sdk-web";
import {
  BREEZE_SERVICE,
  type BreezeCallbackEvent,
  type BreezeInitiatePayload,
  type BreezeSdkEnvelope,
  type BreezeSendOtpPayload,
  type BreezeStartPaymentPayload,
  type BreezeVerifyOtpPayload,
} from "./types";

// Thin, SSR-safe wrapper around @juspay/blaze-sdk-web. Keeps the documented
// envelope shape ({ requestId, service, payload }) in one place and gives the
// rest of the app plain typed helpers. Makes NO assumptions about undocumented
// SDK behaviour — see breeze-pay-button.tsx for the isolated TODOs.

function requestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function envelope<T>(payload: T): BreezeSdkEnvelope<T> {
  return { requestId: requestId(), service: BREEZE_SERVICE, payload };
}

/**
 * The Breeze team communicated the environment as "smb-release". The SDK
 * itself (and its generated Environment enum) expects the camelCase literal
 * "smbRelease" — the dist source switches on exactly
 * `case "smbBeta": case "smbRelease":` to pick the SMB CDN host
 * (sdk.breezesdk.store). Anything else falls through to the non-SMB host.
 * So we normalize the human label to the SDK literal here.
 * TODO — BREEZE CONFIRMATION REQUIRED: confirm the exact string to pass.
 */
export function normalizeBreezeEnvironment(value: string): string {
  const key = value.trim().toLowerCase().replace(/[\s_-]+/gu, "");
  switch (key) {
    case "smbrelease":
      return "smbRelease";
    case "smbbeta":
      return "smbBeta";
    case "release":
      return "release";
    case "beta":
      return "beta";
    default:
      return value; // pass through unchanged rather than guessing
  }
}

let initialized = false;

/**
 * Initializes the Breeze Web SDK. Values come from the backend
 * /storefront/payments/breeze/initiate response (server-authoritative,
 * non-secret). Safe to call more than once — the SDK is initialized once per
 * page load. `onEvent` receives every SDK callback (initiate / process /
 * eventStream / processResult).
 */
export function initBreeze(payload: BreezeInitiatePayload, onEvent: (event: BreezeCallbackEvent) => void): void {
  if (typeof window === "undefined") return;
  const normalized: BreezeInitiatePayload = { ...payload, environment: normalizeBreezeEnvironment(payload.environment) };
  BlazeSDK.initiate(envelope(normalized), (raw) => {
    onEvent(raw as BreezeCallbackEvent);
  });
  initialized = true;
}

export function isBreezeInitialized(): boolean {
  return initialized;
}

export function breezeSendOtp(input: Omit<BreezeSendOtpPayload, "action">): void {
  BlazeSDK.process(envelope<BreezeSendOtpPayload>({ action: "sendOTP", ...input }));
}

export function breezeVerifyOtp(input: Omit<BreezeVerifyOtpPayload, "action">): void {
  BlazeSDK.process(envelope<BreezeVerifyOtpPayload>({ action: "verifyOTP", ...input }));
}

export function breezeStartPayment(input: Omit<BreezeStartPaymentPayload, "action">): void {
  BlazeSDK.process(envelope<BreezeStartPaymentPayload>({ action: "startPayment", ...input }));
}

export function terminateBreeze(): void {
  if (typeof window === "undefined") return;
  try {
    BlazeSDK.terminate();
  } catch {
    // best-effort teardown
  }
  initialized = false;
}
