"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { useOptionalCart } from "@/context/cart-context";
import { broadcastCartInvalidated } from "@/lib/cart/cart-sync-channel";
import { AddressApi } from "@/lib/address-api";
import { CheckoutApi } from "@/lib/checkout-api";
import { OrderApi } from "@/lib/order-api";
import { CartApi } from "@/lib/cart-api";
import type { Address, CreateAddressInput } from "@/types/address";
import type { CheckoutPaymentMethod, CheckoutPreviewPayload, CheckoutPreviewResult } from "@/types/checkout";
import type { CreateOrderResultJSON, CreateOrderInput } from "@/types/order";
import type { Cart } from "@/types/storefront";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { ProceedToPaymentButton } from "@/components/payment/proceed-to-payment-button";
import { ConfirmCodOrderButton } from "@/components/payment/confirm-cod-order-button";
import type { CodConfirmationResultJSON } from "@/types/payment";
import { storeGuestPaymentToken } from "@/app/order/payment/guest-payment-token";
import { readGuestPaymentToken } from "@/app/order/payment/guest-payment-token";
import { TrustBadges } from "@/components/checkout/trust-badges";
import { CheckoutStickyCta } from "@/components/checkout/checkout-sticky-cta";
import { CouponField } from "@/components/checkout/coupon-field";
import { useMediaQuery } from "@/hooks/use-media-query";
import { CancelPendingOrderButton, getPendingOrderCancellationMessage } from "@/components/order/cancel-pending-order-button";

type AddressFormData = {
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  saveToAccount: boolean;
  latitude: number | null;
  longitude: number | null;
  contactEmail: string;
};

const initialFormData: AddressFormData = {
  label: "Home",
  recipientName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
  saveToAccount: true,
  latitude: null,
  longitude: null,
  contactEmail: "",
};

export function CheckoutClient() {
  const { status, customer } = useCustomerAuth();
  const cartContext = useOptionalCart();
  // Latest context in a ref so async flows (COD confirmation, error reconcile)
  // can reach it without adding it to effect dependency lists.
  const cartContextRef = useRef(cartContext);
  useEffect(() => {
    cartContextRef.current = cartContext;
  });
  const isAuthenticated = status === "authenticated" && Boolean(customer);

  // Below the checkout's two-column breakpoint the primary action moves into a
  // fixed bottom bar (progressive enhancement — false on the server / first
  // render, see useMediaQuery).
  const isCompactCheckout = useMediaQuery("(max-width: 1023px)");

  // Cart & Address State
  const [cart, setCart] = useState<Cart | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);

  // Form State
  const [formData, setFormData] = useState<AddressFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

  // Active Preview Payload tracking (for input-precise stale preview validation)
  const [activePreviewPayload, setActivePreviewPayload] = useState<CheckoutPreviewPayload | null>(null);

  // Preview Result & Status
  const [previewResult, setPreviewResult] = useState<CheckoutPreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCartError, setIsCartError] = useState(false);
  const [isPendingOrderError, setIsPendingOrderError] = useState(false);
  const [pendingOrderRedirectId, setPendingOrderRedirectId] = useState<number | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);
  const [pendingGuestToken, setPendingGuestToken] = useState<string | null>(null);
  const [pendingCancellationError, setPendingCancellationError] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);

  // Order Submission & Distinct Network Uncertainty State
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [isOrderStatusUnknown, setIsOrderStatusUnknown] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreateOrderResultJSON | null>(null);
  const [postOrderError, setPostOrderError] = useState<string | null>(null);
  // A commerce action succeeded but the follow-up authoritative cart refresh
  // did not — the order is fine, only the local cart view is behind.
  const [cartSyncWarning, setCartSyncWarning] = useState(false);
  const isSubmittingRef = useRef(false);
  const previewGenerationRef = useRef(0);

  // Reconcile the shared CartContext after a commerce action that finalized the
  // cart server-side (COD confirmation, verified payment). The action's own
  // success is authoritative and is never rolled back if this fails.
  const reconcileCartAfterCommerce = useCallback(async (source: "cod-confirmed" | "payment-paid") => {
    broadcastCartInvalidated(source);
    const ok = await cartContextRef.current?.refresh();
    setCartSyncWarning(ok === false);
  }, []);

  // Pay Online is the existing checkout default. The selected method is sent
  // to preview and Order creation so serviceability stays payment-specific.
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("payu");
  const [codConfirmation, setCodConfirmation] = useState<CodConfirmationResultJSON | null>(null);

  const addressValidationErrors = useCallback((): Partial<Record<keyof AddressFormData, string>> => {
    const errors: Partial<Record<keyof AddressFormData, string>> = {};

    if (!formData.recipientName.trim()) {
      errors.recipientName = "Recipient name is required";
    }
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (formData.phone.replace(/\D/g, "").length < 10) {
      errors.phone = "Phone number must have at least 10 digits";
    }
    if (!formData.line1.trim()) {
      errors.line1 = "Address line 1 is required";
    }
    if (!formData.city.trim()) {
      errors.city = "City is required";
    }
    if (!formData.state.trim()) {
      errors.state = "State is required";
    }
    if (!/^\d{6}$/.test(formData.postalCode.trim())) {
      errors.postalCode = "Enter a valid 6-digit PIN code";
    }
    if (!isAuthenticated) {
      const emailPattern = /^\S+@\S+\.\S+$/;
      if (!formData.contactEmail.trim()) {
        errors.contactEmail = "Email is required";
      } else if (!emailPattern.test(formData.contactEmail)) {
        errors.contactEmail = "Valid email is required";
      }
    }

    return errors;
  }, [formData, isAuthenticated]);

  const buildInlineAddress = useCallback((): CreateAddressInput => {
    const hasNumericCoords =
      typeof formData.latitude === "number" &&
      typeof formData.longitude === "number" &&
      !isNaN(formData.latitude) &&
      !isNaN(formData.longitude);

    return {
      label: formData.label.trim() || undefined,
      recipientName: formData.recipientName.trim(),
      phone: formData.phone.trim(),
      line1: formData.line1.trim(),
      line2: formData.line2.trim() || undefined,
      city: formData.city.trim(),
      state: formData.state.trim(),
      postalCode: formData.postalCode.trim(),
      country: formData.country.trim() || "IN",
      isDefault: false,
      ...(hasNumericCoords
        ? { latitude: formData.latitude as number, longitude: formData.longitude as number }
        : {}),
    };
  }, [formData]);

  const validateAddressForm = useCallback((): boolean => {
    const errors = addressValidationErrors();
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [addressValidationErrors]);

  const inlineAddressReady = Object.keys(addressValidationErrors()).length === 0;

  const getCurrentPreviewPayload = useCallback((): CheckoutPreviewPayload | null => {
    if (isAuthenticated && savedAddresses.length > 0 && !isAddingNewAddress && selectedAddressId) {
      return {
        savedAddressId: selectedAddressId,
        billingSameAsShipping: true,
        paymentMethod,
      };
    }
    if (!inlineAddressReady) return null;
    return {
      shippingAddress: buildInlineAddress(),
      contactEmail: formData.contactEmail.trim() || undefined,
      billingSameAsShipping: true,
      paymentMethod,
    };
  }, [buildInlineAddress, formData.contactEmail, inlineAddressReady, isAddingNewAddress, isAuthenticated, paymentMethod, savedAddresses.length, selectedAddressId]);

  const invalidatePreview = useCallback(() => {
    previewGenerationRef.current += 1;
    setActivePreviewPayload(null);
    setPreviewResult(null);
  }, []);

  const runPreview = useCallback(async (payload: CheckoutPreviewPayload): Promise<CheckoutPreviewResult | null> => {
    const generation = ++previewGenerationRef.current;
    setPreviewing(true);
    setError(null);
    setIsCartError(false);
    try {
      const preview = await CheckoutApi.preview(payload);
      if (generation !== previewGenerationRef.current) return null;
      setPreviewResult(preview);
      setActivePreviewPayload(payload);
      return preview;
    } catch (err: unknown) {
      if (generation !== previewGenerationRef.current) return null;
      setActivePreviewPayload(null);
      setPreviewResult(null);
      // The backend telling us the cart is empty is authoritative — reconcile
      // the shared cart cache and show a cart-specific message (with a Review
      // Cart action), never a generic "delivery availability" error.
      if (err instanceof AppAuthError && (err.code === "CHECKOUT_CART_EMPTY" || err.code === "ORDER_CART_EMPTY")) {
        setError("Your cart is empty. Add an item before checking out.");
        setIsCartError(true);
        setCart({ id: null, status: "ordered", itemCount: 0, subtotal: "0.00", items: [] });
        cartContextRef.current?.markAuthoritativelyEmpty();
      } else {
        setError(err instanceof AppAuthError ? err.message : "We couldn’t verify delivery availability right now. Please try again.");
      }
      return null;
    } finally {
      if (generation === previewGenerationRef.current) setPreviewing(false);
    }
  }, []);

  const handleFormFieldChange = (field: keyof AddressFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    const inlineCheckout = !isAuthenticated || isAddingNewAddress || savedAddresses.length === 0;
    if (field !== "label" && inlineCheckout) invalidatePreview();
  };

  // Load the live cart and saved addresses. The preview effect below performs
  // the first automatic payment-specific delivery check once state is ready.
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const cartData = await CartApi.getCart();
        setCart(cartData);
        // Feed this authoritative fetch into the shared context so the header
        // badge and Cart page stay consistent without a second request.
        cartContextRef.current?.applyServerCart(cartData);
        if (isAuthenticated) {
          const addresses = await AddressApi.getAddresses();
          setSavedAddresses(addresses);
          const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
          if (defaultAddr) setSelectedAddressId(defaultAddr.id);
          else setIsAddingNewAddress(true);
        } else {
          setIsAddingNewAddress(false);
        }
      } catch (err: unknown) {
        setError(err instanceof AppAuthError ? err.message : "Failed to load checkout data.");
      } finally {
        setLoading(false);
      }
    }
    if (status !== "loading") void init();
  }, [status, isAuthenticated]);

  // Saved addresses preview immediately; inline addresses preview only after
  // the complete minimum address is valid and the debounce has elapsed.
  useEffect(() => {
    const payload = getCurrentPreviewPayload();
    if (!payload) {
      return;
    }
    const isSaved = Boolean(payload.savedAddressId);
    const timer = window.setTimeout(() => void runPreview(payload), isSaved ? 0 : 400);
    return () => window.clearTimeout(timer);
  }, [getCurrentPreviewPayload, runPreview]);

  const handleSelectSavedAddress = (addressId: number) => {
    setSelectedAddressId(addressId);
    setIsAddingNewAddress(false);
    setError(null);
    setIsCartError(false);
    setIsOrderStatusUnknown(false);
    invalidatePreview();
  };

  // Enter/submit remains a keyboard-friendly immediate preview shortcut; no
  // visible verification step is required for placement.
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddressForm()) return;
    const payload = getCurrentPreviewPayload();
    if (payload) void runPreview(payload);
  };

  const resolveAddressForOrder = async (): Promise<CheckoutPreviewPayload | null> => {
    if (isAuthenticated && formData.saveToAccount && (isAddingNewAddress || savedAddresses.length === 0)) {
      try {
        const newAddress = await AddressApi.create(buildInlineAddress());
        setSavedAddresses((prev) => [...prev, newAddress]);
        setSelectedAddressId(newAddress.id);
        setIsAddingNewAddress(false);
        return { savedAddressId: newAddress.id, billingSameAsShipping: true, paymentMethod };
      } catch (err: unknown) {
        setError(err instanceof AppAuthError ? err.message : "We couldn’t save this address. Please try again.");
        return null;
      }
    }
    return getCurrentPreviewPayload();
  };

  const previewIsServiceable = (result: CheckoutPreviewResult): boolean => {
    if (result.serviceability) return result.serviceability.serviceable;
    if (typeof result.readiness.serviceable === "boolean") return result.readiness.serviceable;
    // Compatibility for older mocked/legacy responses. Stage 1 responses
    // always include serviceability and readiness.serviceable.
    return result.readiness.addressReady && result.readiness.cartReady;
  };

  const previewMatches = (payload: CheckoutPreviewPayload) =>
    Boolean(
      activePreviewPayload &&
        JSON.stringify(activePreviewPayload) === JSON.stringify(payload) &&
        previewResult &&
        previewResult.paymentMethod !== null &&
        (previewResult.paymentMethod === undefined || previewResult.paymentMethod === paymentMethod)
    );

  // Place Order Action Handshake
  const handlePlaceOrder = async () => {
    if (isSubmittingRef.current || submittingOrder || previewing || isOrderStatusUnknown) return;
    if (!cart || cart.items.length === 0) {
      setError("Your cart is empty. Add an item before placing your order.");
      return;
    }

    isSubmittingRef.current = true;
    setSubmittingOrder(true);
    setError(null);
    setIsCartError(false);
    setIsPendingOrderError(false);
    setPendingOrderRedirectId(null);
    setPendingOrderNumber(null);
    setPendingGuestToken(null);
    setPendingCancellationError(null);
    setPostOrderError(null);

    try {
      const payload = await resolveAddressForOrder();
      if (!payload) {
        if (isAuthenticated || !inlineAddressReady) setFormErrors(addressValidationErrors());
        return;
      }

      // Never create an Order from an invalidated or payment-mismatched
      // preview. The final request is authoritative for this click.
      let finalPreview = previewResult;
      if (!finalPreview || !previewMatches(payload)) {
        finalPreview = await runPreview(payload);
      }
      if (!finalPreview) {
        // runPreview already set the precise error (cart empty / delivery
        // unavailable / transient). Don't override it with a generic message.
        return;
      }
      if (
        !finalPreview.readiness.cartReady ||
        !finalPreview.readiness.addressReady ||
        !previewIsServiceable(finalPreview)
      ) {
        setError(
          finalPreview.serviceability && !finalPreview.serviceability.serviceable
            ? paymentMethod === "cod"
              ? "Cash on Delivery is not available for this delivery address."
              : "Delivery is currently unavailable for this PIN code."
            : "We couldn't verify delivery availability right now. Please try again."
        );
        return;
      }

      const orderInput: CreateOrderInput = payload.savedAddressId
        ? { savedAddressId: payload.savedAddressId, paymentMethod }
        : {
            shippingAddress: payload.shippingAddress!,
            contactEmail: payload.contactEmail,
            paymentMethod,
          };
      const order = await OrderApi.create(orderInput);
      // Preserve recovery immediately. Payment/COD is a separate operation
      // and must never cause a second Order creation after this point.
      if (order.guestAccessToken) storeGuestPaymentToken(order.guestAccessToken);
      setCreatedOrder(order);
    } catch (err: unknown) {
      if (err instanceof AppAuthError) {
        switch (err.code) {
          case "ORDER_CART_EMPTY":
            setError("Your cart is empty. Add an item before placing your order.");
            setIsCartError(true);
            // The backend is authoritative: there is no active cart. Reconcile
            // the local + shared cart cache so the page, header and other tabs
            // stop showing the phantom items.
            setCart({ id: null, status: "ordered", itemCount: 0, subtotal: "0.00", items: [] });
            cartContextRef.current?.markAuthoritativelyEmpty();
            break;
          case "ORDER_PRODUCT_NOT_AVAILABLE":
            setError("This product is no longer available. Review your cart.");
            setIsCartError(true);
            break;
          case "ORDER_VARIANT_NOT_AVAILABLE":
            setError("One of your selected options is no longer available. Review your cart.");
            setIsCartError(true);
            break;
          case "ORDER_INSUFFICIENT_STOCK":
            setError("Some items no longer have enough stock. Review your cart.");
            setIsCartError(true);
            break;
          case "ORDER_ADDRESS_REQUIRED":
            setError("Please select or enter a shipping address.");
            break;
          case "ORDER_ADDRESS_NOT_FOUND":
            setError("The selected address is no longer available. Please choose another address.");
            break;
          case "ORDER_DESTINATION_UNSERVICEABLE":
          case "ORDER_SERVICEABILITY_UNAVAILABLE":
            setError("Delivery is currently unavailable for this address. Please try another address or payment method.");
            break;
          case "ORDER_ALREADY_PENDING": {
            setIsPendingOrderError(true);
            const rawId = (err.details as { orderId?: number } | undefined)?.orderId;
            const rawOrderNumber = (err.details as { orderNumber?: string } | undefined)?.orderNumber;
            if (typeof rawId === "number" && rawId > 0) {
              setPendingOrderRedirectId(rawId);
            } else {
              setPendingOrderRedirectId(null);
            }
            setPendingOrderNumber(typeof rawOrderNumber === "string" ? rawOrderNumber : null);
            // Guest creates normally re-issue a fresh token with the existing
            // Order. If an older backend response only reports the duplicate,
            // use the token already retained for this tab; never guess a guest
            // recovery URL from a numeric Order ID.
            setPendingGuestToken(!isAuthenticated ? readGuestPaymentToken() : null);
            setPendingCancellationError(null);
            setError(null);
            break;
          }
          case "AUTH_VALIDATION_FAILED":
            setError("Invalid address or order details. Please review your information.");
            break;
          case "NETWORK_ERROR":
            setIsOrderStatusUnknown(true);
            setError("We couldn't confirm whether your order was created. Please don't submit again immediately.");
            break;
          default:
            setError(err.message || "Failed to place order.");
            break;
        }
      } else {
        setError("An unexpected error occurred while placing your order.");
      }
    } finally {
      isSubmittingRef.current = false;
      setSubmittingOrder(false);
    }
  };

  const handlePendingOrderCancellation = async () => {
    setIsPendingOrderError(false);
    setPendingOrderRedirectId(null);
    setPendingOrderNumber(null);
    setPendingGuestToken(null);
    setPendingCancellationError(null);
    setError(null);

    // Keep the address, payment method, and cart in place. Only the stale
    // preview/blocker is invalidated, then the existing preview pipeline runs
    // again for the same current payload.
    invalidatePreview();
    await cartContext?.refresh();
    const payload = getCurrentPreviewPayload();
    if (payload) await runPreview(payload);
  };

  if (loading) {
    return (
      <main className="flex-1 bg-cream-bg flex items-center justify-center min-h-[calc(100vh-144px)] py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-orange border-t-transparent"></div>
          <p className="font-medium text-deep-brown">Loading checkout preview...</p>
        </div>
      </main>
    );
  }

  // Safe Pre-Payment Order Created Success State
  if (createdOrder) {
    return (
      <main className="flex-1 bg-cream-bg py-8 md:py-12 min-h-[calc(100vh-144px)]">
        <div className="mx-auto max-w-[800px] px-5 sm:px-8">
          {/* Header */}
          <div className="text-center pb-6 border-b border-deep-brown/15">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider mb-2 ${codConfirmation ? "bg-mint-sage text-deep-brown" : "bg-peach-hero text-primary-orange"}`}>
              {codConfirmation ? "Order Confirmed" : "Order Created"}
            </span>
            <h1 className="font-baloo text-3xl font-extrabold text-deep-brown sm:text-4xl">
              {`Order #${createdOrder.orderNumber}`}
            </h1>
            <p className="mt-2 text-sm font-medium text-text-primary/80">
              {codConfirmation
                ? "Cash on Delivery — payment will be collected when your order arrives."
                : postOrderError
                  ? "Your order has been created, but payment could not be started. You can retry payment for this order."
                  : "Your order is being prepared for secure payment."}
            </p>
          </div>

          {/* Guest Notice */}
          {!isAuthenticated && (
            <div className="mt-6 rounded-2xl border border-primary-orange/30 bg-peach-hero/40 p-4 text-center space-y-1">
              <p className="text-xs font-bold text-deep-brown">
                Please note your order number: <span className="text-primary-orange">{createdOrder.orderNumber}</span>
              </p>
              {createdOrder.guestAccessToken && (
                <p className="text-[11px] font-medium text-deep-brown/80">
                  Use the &quot;View Order&quot; link below to check your order status later — save or bookmark it, since it is
                  the only way back to this page without an account.
                </p>
              )}
            </div>
          )}

          {/* Details Card */}
          <div className="mt-6 rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs space-y-6">
            <div className="grid gap-4 sm:grid-cols-3 border-b border-deep-brown/10 pb-6 text-sm">
              <div>
                <span className="block text-xs font-bold text-deep-brown/60 uppercase">Order Status</span>
                <span className="font-bold text-deep-brown capitalize">{codConfirmation ? codConfirmation.orderStatus : createdOrder.status}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-deep-brown/60 uppercase">Payment Status</span>
                {codConfirmation ? (
                  <span className="font-bold text-deep-brown capitalize">Cash on Delivery ({codConfirmation.paymentStatus})</span>
                ) : (
                  <span className="font-bold text-terracotta capitalize">{createdOrder.paymentStatus} (Not paid)</span>
                )}
              </div>
              <div>
                <span className="block text-xs font-bold text-deep-brown/60 uppercase">Fulfilment</span>
                <span className="font-bold text-deep-brown capitalize">{createdOrder.fulfilmentStatus}</span>
              </div>
            </div>

            {/* Shipping Summary */}
            <div className="border-b border-deep-brown/10 pb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary-orange mb-2">
                Shipping Snapshot
              </h3>
              <p className="font-bold text-deep-brown text-sm">{createdOrder.shippingAddress.recipientName}</p>
              <p className="text-xs text-text-primary/80 mt-1">
                {createdOrder.shippingAddress.line1}
                {createdOrder.shippingAddress.line2 ? `, ${createdOrder.shippingAddress.line2}` : ""},{" "}
                {createdOrder.shippingAddress.city}, {createdOrder.shippingAddress.state}{" "}
                {createdOrder.shippingAddress.postalCode}
              </p>
              <p className="text-xs text-text-primary/70 mt-1">Phone: {createdOrder.shippingAddress.phone}</p>
            </div>

            {/* Order Items */}
            <div className="border-b border-deep-brown/10 pb-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary-orange mb-2">
                Order Items ({createdOrder.items.length})
              </h3>
              {createdOrder.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm py-1">
                  <div>
                    <span className="font-semibold text-deep-brown">{item.productName}</span>
                    {item.variantSku && <span className="text-xs text-text-primary/60 ml-2">({item.variantSku})</span>}
                    <div className="text-xs text-text-primary/70">
                      Qty: {item.quantity} &times; ₹{item.unitPrice}
                    </div>
                  </div>
                  <span className="font-bold text-deep-brown">₹{item.lineTotal}</span>
                </div>
              ))}
            </div>

            {/* Price Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-text-primary">
                <span>Subtotal</span>
                <span className="font-semibold text-deep-brown">₹{createdOrder.subtotal}</span>
              </div>
              <div className="flex justify-between text-text-primary">
                <span>Shipping Fee</span>
                <span className="font-semibold text-deep-brown">₹{createdOrder.shippingFee}</span>
              </div>
              <div className="flex justify-between border-t border-deep-brown/10 pt-3 font-bold text-base text-deep-brown">
                <span>Total Amount</span>
                <span className="text-primary-orange font-extrabold">₹{createdOrder.total}</span>
              </div>
            </div>

            {/* Payment handoff / COD confirmation. These start automatically
                after the Order response has been stored in state. */}
            <div className="pt-4 border-t border-deep-brown/10 space-y-3 text-center">
              {codConfirmation ? (
                <div className="rounded-xl border border-mint-sage bg-mint-sage/20 p-4">
                  <p className="text-sm font-bold text-deep-brown">Order confirmed</p>
                  <p className="mt-1 text-xs font-semibold text-deep-brown/80">
                    Payment Method: Cash on Delivery
                  </p>
                  <p className="mt-1 text-[11px] text-text-primary/70">
                    Please keep ₹{codConfirmation.amount} ready at the time of delivery.
                  </p>
                  {cartSyncWarning && (
                    <div className="mt-3 border-t border-mint-sage/60 pt-3 text-[11px] text-deep-brown/80">
                      <p>We couldn&apos;t refresh your cart right now. It will update automatically when the connection is restored.</p>
                      <button
                        type="button"
                        onClick={() => void reconcileCartAfterCommerce("cod-confirmed")}
                        className="mt-1 font-bold text-primary-orange hover:underline"
                      >
                        Retry Cart Sync
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <TrustBadges items={paymentMethod === "payu" ? ["secure", "tracking"] : ["cod", "tracking"]} />
                  {paymentMethod === "payu" ? (
                    isAuthenticated ? (
                      <ProceedToPaymentButton input={{ orderId: createdOrder.id }} autoStart onFailure={() => setPostOrderError("payment")} />
                    ) : createdOrder.guestAccessToken ? (
                      <ProceedToPaymentButton input={{ guestAccessToken: createdOrder.guestAccessToken }} autoStart onFailure={() => setPostOrderError("payment")} />
                    ) : null
                  ) : isAuthenticated ? (
                    <ConfirmCodOrderButton
                      input={{ orderId: createdOrder.id }}
                      autoStart
                      onConfirmed={(result) => {
                        setCodConfirmation(result);
                        void reconcileCartAfterCommerce("cod-confirmed");
                      }}
                      onFailure={() => setPostOrderError("cod")}
                    />
                  ) : createdOrder.guestAccessToken ? (
                    <ConfirmCodOrderButton
                      input={{ guestAccessToken: createdOrder.guestAccessToken }}
                      autoStart
                      onConfirmed={(result) => {
                        setCodConfirmation(result);
                        void reconcileCartAfterCommerce("cod-confirmed");
                      }}
                      onFailure={() => setPostOrderError("cod")}
                    />
                  ) : null}
                  <p className="text-[11px] text-text-primary/60">
                    {paymentMethod === "payu" ? "You’ll be redirected to PayU to complete payment." : "Pay in cash when your order is delivered."}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Action Links */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/cart"
              className="inline-flex items-center gap-1 text-xs font-bold text-primary-orange hover:underline"
            >
              &larr; Review Cart
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <Link
                  href={`/account/orders/${createdOrder.id}`}
                  className="rounded-xl border border-primary-orange bg-cream-bg px-6 py-2.5 text-xs font-bold text-primary-orange hover:bg-peach-hero/30 transition-colors"
                >
                  View Order
                </Link>
              ) : (
                createdOrder.guestAccessToken && (
                  <Link
                    href={`/order/guest/${createdOrder.guestAccessToken}`}
                    className="rounded-xl border border-primary-orange bg-cream-bg px-6 py-2.5 text-xs font-bold text-primary-orange hover:bg-peach-hero/30 transition-colors"
                  >
                    View Order
                  </Link>
                )
              )}
              <Link
                href="/shop"
                className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isCartEmpty = !cart || cart.items.length === 0;
  const serviceabilityKnown = Boolean(previewResult?.serviceability || typeof previewResult?.readiness.serviceable === "boolean");
  const previewServiceable = previewResult ? previewIsServiceable(previewResult) : false;
  const currentPreviewPayload = getCurrentPreviewPayload();
  const isPreviewValid = Boolean(
    previewResult &&
      previewResult.readiness.cartReady &&
      previewResult.readiness.addressReady &&
      activePreviewPayload &&
      currentPreviewPayload &&
      JSON.stringify(activePreviewPayload) === JSON.stringify(currentPreviewPayload) &&
      activePreviewPayload.paymentMethod === paymentMethod &&
      (previewResult.paymentMethod === undefined || previewResult.paymentMethod === paymentMethod) &&
      previewServiceable
  );

  // If the shared cart context's last authoritative sync failed, its `cart` is
  // stale — never let Place Order proceed off unverified cart state.
  const cartContextUnsynced =
    cartContext?.syncState === "stale" || cartContext?.syncState === "error";

  // Single source of truth for the Place Order gate, shared by the in-card
  // button and the mobile sticky bar so they can never drift apart.
  const placeOrderDisabled =
    !isPreviewValid ||
    !paymentMethod ||
    submittingOrder ||
    previewing ||
    isCartEmpty ||
    isOrderStatusUnknown ||
    cartContextUnsynced;

  // The payable amount shown in the Order Summary card — mirrored, not recomputed.
  const payableTotalDisplay = previewResult?.totals.payableTotal;
  const displayedCoupon = previewResult?.coupon
    ? { ...previewResult.coupon, discountAmount: previewResult.totals.discountAmount ?? "0.00", eligibleMerchandiseSubtotal: "0.00" }
    : cart?.coupon;

  const showStickyPlaceOrder = isCompactCheckout && !isCartEmpty;

  const handlePaymentMethodChange = (method: CheckoutPaymentMethod) => {
    if (method === paymentMethod) return;
    setPaymentMethod(method);
    setPostOrderError(null);
    invalidatePreview();
  };

  const handleApplyCoupon = async (code: string) => {
    setCouponBusy(true);
    setCouponError(null);
    try {
      const updatedCart = await CartApi.applyCoupon(code);
      setCart(updatedCart);
      cartContextRef.current?.applyServerCart(updatedCart);
      broadcastCartInvalidated("cart-mutation");
      invalidatePreview();
      const payload = getCurrentPreviewPayload();
      if (payload) await runPreview(payload);
    } catch (err: unknown) {
      setCouponError(err instanceof AppAuthError ? err.message : "We couldn't apply that coupon. Please try again.");
    } finally {
      setCouponBusy(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponBusy(true);
    setCouponError(null);
    try {
      const updatedCart = await CartApi.removeCoupon();
      setCart(updatedCart);
      cartContextRef.current?.applyServerCart(updatedCart);
      broadcastCartInvalidated("cart-mutation");
      invalidatePreview();
      const payload = getCurrentPreviewPayload();
      if (payload) await runPreview(payload);
    } catch (err: unknown) {
      setCouponError(err instanceof AppAuthError ? err.message : "We couldn't remove that coupon. Please try again.");
    } finally {
      setCouponBusy(false);
    }
  };

  const primaryCtaLabel = paymentMethod === "payu" && payableTotalDisplay ? `Place Order & Pay ₹${payableTotalDisplay}` : "Place Order";
  const deliveryMessage = previewing
    ? "Checking delivery availability..."
    : !previewResult || !activePreviewPayload
      ? "Enter your address to check delivery availability."
      : !previewServiceable
        ? paymentMethod === "cod"
          ? "Cash on Delivery is not available for this delivery address."
          : "Delivery is currently unavailable for this PIN code."
        : "✓ Delivery available";

  return (
    <main
      className={`min-w-0 flex-1 bg-cream-bg py-6 sm:py-8 md:py-12 min-h-[calc(100vh-144px)] ${
        showStickyPlaceOrder ? "pb-28" : ""
      }`}
    >
      <div className="mx-auto w-full max-w-[1100px] px-4 sm:px-8">
        {/* Header Breadcrumb */}
        <div className="flex flex-col items-start gap-2 border-b border-deep-brown/15 pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-6">
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-orange">
              Complete your order securely
            </span>
            <h1 className="font-baloo text-[2rem] font-extrabold leading-none text-deep-brown sm:text-4xl">
              Checkout
            </h1>
          </div>
          <Link
            href="/cart"
            className="inline-flex min-h-8 items-center gap-1.5 text-xs font-bold text-primary-orange hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-orange/40 focus-visible:ring-offset-2 sm:shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Back to Cart</span>
          </Link>
        </div>

        {/* Distinct Order Status Unknown State (Network Uncertainty) */}
        {isOrderStatusUnknown && (
          <div className="mt-5 space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-deep-brown shadow-xs sm:mt-6 sm:p-5">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm uppercase tracking-wider">
              <span>Order Status Unknown</span>
            </div>
            <p className="text-xs font-medium text-deep-brown/90 leading-relaxed">
              We couldn&apos;t confirm whether your order was created because of a network connection issue. To prevent duplicate orders, <strong>Place Order has been locked</strong>. Please re-verify your connection before attempting to unlock checkout.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOrderStatusUnknown(false);
                  setError(null);
                  setActivePreviewPayload(null);
                  setPreviewResult(null);
                }}
                className="w-full rounded-xl bg-amber-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-amber-800 sm:w-auto"
              >
                Re-check & Unlock Checkout
              </button>
            </div>
          </div>
        )}

        {/* Existing pending Order recovery. Complete Payment reuses the
            authoritative Order; cancellation is the only action that clears
            the duplicate-create blocker. */}
        {isPendingOrderError && (
          <div className="mt-5 space-y-4 rounded-2xl border border-amber-300 bg-amber-50/80 p-5 text-deep-brown shadow-xs sm:mt-6">
            <div>
              <h2 className="font-baloo text-xl font-extrabold text-deep-brown">You have an unfinished order</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-amber-950/85">
                {pendingOrderNumber
                  ? `Order #${pendingOrderNumber} still has a pending payment.`
                  : "Your existing order still has a pending payment."}
              </p>
            </div>

            {pendingCancellationError && (
              <p role="alert" className="rounded-xl border border-terracotta/30 bg-terracotta/10 p-3 text-xs font-semibold leading-relaxed text-terracotta">
                {pendingCancellationError}
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              {pendingOrderRedirectId && isAuthenticated ? (
                <Link
                  href={`/account/orders/${pendingOrderRedirectId}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-primary-orange bg-white px-4 py-3 text-center text-xs font-bold text-primary-orange transition-colors hover:bg-peach-hero/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-orange/40"
                >
                  Complete Payment
                </Link>
              ) : pendingGuestToken ? (
                <Link
                  href={`/order/guest/${pendingGuestToken}`}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-primary-orange bg-white px-4 py-3 text-center text-xs font-bold text-primary-orange transition-colors hover:bg-peach-hero/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-orange/40"
                >
                  Complete Payment
                </Link>
              ) : (
                <span className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-deep-brown/15 bg-white px-4 py-3 text-center text-xs font-semibold text-deep-brown/60">
                  Payment link unavailable
                </span>
              )}

              {pendingOrderRedirectId && isAuthenticated ? (
                <CancelPendingOrderButton
                  orderId={pendingOrderRedirectId}
                  buttonLabel="Cancel Order & Continue"
                  className="flex-1"
                  onSuccess={handlePendingOrderCancellation}
                  onError={(cancellationError) => setPendingCancellationError(getPendingOrderCancellationMessage(cancellationError))}
                />
              ) : pendingGuestToken ? (
                <CancelPendingOrderButton
                  guestToken={pendingGuestToken}
                  buttonLabel="Cancel Order & Continue"
                  className="flex-1"
                  onSuccess={handlePendingOrderCancellation}
                  onError={(cancellationError) => setPendingCancellationError(getPendingOrderCancellationMessage(cancellationError))}
                />
              ) : null}
            </div>
          </div>
        )}

        {/* Standard Error Banner */}
        {error && !isOrderStatusUnknown && !isPendingOrderError && (
          <div className="mt-5 flex flex-col items-start gap-3 rounded-xl border border-terracotta/30 bg-terracotta/10 p-3 text-xs font-semibold text-terracotta sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <span className="leading-relaxed">{error}</span>
            {isCartError && (
              <Link
                href="/cart"
                className="shrink-0 rounded-lg bg-terracotta px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
              >
                Review Cart &rarr;
              </Link>
            )}
            {isPendingOrderError && (
              <Link
                href={pendingOrderRedirectId ? `/account/orders/${pendingOrderRedirectId}` : "/account/orders"}
                className="shrink-0 rounded-lg bg-terracotta px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
              >
                {pendingOrderRedirectId ? "View Pending Order \u2192" : "View My Orders \u2192"}
              </Link>
            )}
          </div>
        )}

        {isCartEmpty ? (
          <div className="mt-8 rounded-2xl border border-deep-brown/15 bg-white p-8 text-center">
            <h2 className="font-baloo text-xl font-bold text-deep-brown">
              Your cart is empty
            </h2>
            <p className="mt-2 text-sm text-text-primary/75">
              Add items to your cart before proceeding to checkout.
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-block rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid min-w-0 gap-5 sm:mt-8 sm:gap-8 lg:grid-cols-12 lg:items-start">
            {/* Left Column: Shipping Address & Selection */}
            <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-7">
              {/* Authenticated Saved Address Selector */}
              {isAuthenticated && savedAddresses.length > 0 && !isAddingNewAddress && (
                <div className="rounded-2xl border border-deep-brown/15 bg-white p-4 shadow-xs sm:p-6">
                  <div className="flex items-start justify-between gap-3 border-b border-deep-brown/10 pb-4 mb-4">
                    <h2 className="min-w-0 font-baloo text-base font-bold leading-tight text-deep-brown sm:text-lg">
                      Select Shipping Address
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewAddress(true);
                        setActivePreviewPayload(null);
                        setPreviewResult(null);
                      }}
                      className="shrink-0 text-right text-xs font-bold text-primary-orange hover:underline"
                    >
                      + Add New Address
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {savedAddresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectSavedAddress(addr.id)}
                          className={`cursor-pointer rounded-xl border p-4 transition-all ${
                            isSelected
                              ? "border-primary-orange bg-peach-hero/20 ring-1 ring-primary-orange"
                              : "border-deep-brown/15 hover:border-deep-brown/30 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-primary-orange uppercase">
                              {addr.label || "Address"}
                            </span>
                            {addr.isDefault && (
                              <span className="rounded-full bg-mint-sage px-2 py-0.5 text-[9px] font-bold text-deep-brown uppercase">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-2 font-semibold text-deep-brown text-sm">
                            {addr.recipientName}
                          </p>
                          <p className="text-xs text-text-primary/80 mt-1 line-clamp-2">
                            {addr.line1}, {addr.city}, {addr.state} {addr.postalCode}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Address Input Form (Guest OR New Address for Authenticated) */}
              {(!isAuthenticated || savedAddresses.length === 0 || isAddingNewAddress) && (
                <div className="rounded-2xl border border-deep-brown/15 bg-white p-4 shadow-xs sm:p-6">
                  <div className="flex items-start justify-between gap-3 border-b border-deep-brown/10 pb-4 mb-4">
                    <h2 className="min-w-0 font-baloo text-base font-bold leading-tight text-deep-brown sm:text-lg">
                      {isAuthenticated ? "New Shipping Address" : "Guest Shipping Address"}
                    </h2>
                    {isAuthenticated && savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewAddress(false);
                          if (selectedAddressId) {
                            handleSelectSavedAddress(selectedAddressId);
                          }
                        }}
                        className="shrink-0 text-right text-xs font-bold text-deep-brown/60 hover:text-deep-brown"
                      >
                        Use Saved Address
                      </button>
                    )}
                  </div>

                  {/* <AddressLocationAssist 
                    onAddressSelect={handleLocationSelect} 
                    initialLatitude={formData.latitude}
                    initialLongitude={formData.longitude}
                  /> */}

                  <form onSubmit={handleAddressSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
                    {isAuthenticated && (
                      <div>
                        <label htmlFor="chk-label" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                          Label (e.g. Home, Work)
                        </label>
                        <input
                          id="chk-label"
                          type="text"
                          value={formData.label}
                          onChange={(e) => handleFormFieldChange("label", e.target.value)}
                          className="w-full rounded-xl border border-deep-brown/20 px-3.5 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none"
                        />
                      </div>
                    )}

                    <div className={isAuthenticated ? "" : "sm:col-span-2"}>
                      <label htmlFor="chk-recipient" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                        Recipient Full Name *
                      </label>
                      <input
                        id="chk-recipient"
                        type="text"
                        placeholder="e.g. Jordan Rivera"
                        value={formData.recipientName}
                        onChange={(e) => handleFormFieldChange("recipientName", e.target.value)}
                        className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                          formErrors.recipientName ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                        }`}
                      />
                      {formErrors.recipientName && (
                        <p className="mt-1 text-xs text-terracotta">{formErrors.recipientName}</p>
                      )}
                    </div>

                    {!isAuthenticated && (
                      <div className="sm:col-span-2">
                        <label htmlFor="chk-contact-email" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                          Contact Email *
                        </label>
                        <input
                          id="chk-contact-email"
                          type="email"
                          autoComplete="email"
                          placeholder="e.g. guest@example.com"
                          value={formData.contactEmail}
                          onChange={(e) => handleFormFieldChange("contactEmail", e.target.value)}
                          className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                            formErrors.contactEmail ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                          }`}
                        />
                        {formErrors.contactEmail && (
                          <p className="mt-1 text-xs text-terracotta">{formErrors.contactEmail}</p>
                        )}
                        <p className="mt-1 text-[11px] text-text-primary/60">
                          We&apos;ll use this email to send you updates about your order.
                        </p>
                      </div>
                    )}

                    <div>
                      <label htmlFor="chk-phone" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                        Phone Number *
                      </label>
                      <input
                        id="chk-phone"
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => handleFormFieldChange("phone", e.target.value)}
                        className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                          formErrors.phone ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                        }`}
                      />
                      {formErrors.phone && (
                        <p className="mt-1 text-xs text-terracotta">{formErrors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="chk-line1" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                        Address Line 1 *
                      </label>
                      <input
                        id="chk-line1"
                        type="text"
                        placeholder="Street, Flat/House No."
                        value={formData.line1}
                        onChange={(e) => handleFormFieldChange("line1", e.target.value)}
                        className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                          formErrors.line1 ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                        }`}
                      />
                      {formErrors.line1 && (
                        <p className="mt-1 text-xs text-terracotta">{formErrors.line1}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="chk-line2" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        id="chk-line2"
                        type="text"
                        placeholder="Landmark, Suite"
                        value={formData.line2}
                        onChange={(e) => handleFormFieldChange("line2", e.target.value)}
                        className="w-full rounded-xl border border-deep-brown/20 px-3.5 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="chk-city" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                        City *
                      </label>
                      <input
                        id="chk-city"
                        type="text"
                        placeholder="e.g. Mumbai"
                        value={formData.city}
                        onChange={(e) => handleFormFieldChange("city", e.target.value)}
                        className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                          formErrors.city ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                        }`}
                      />
                      {formErrors.city && (
                        <p className="mt-1 text-xs text-terracotta">{formErrors.city}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="chk-state" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                        State *
                      </label>
                      <input
                        id="chk-state"
                        type="text"
                        placeholder="e.g. Maharashtra"
                        value={formData.state}
                        onChange={(e) => handleFormFieldChange("state", e.target.value)}
                        className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                          formErrors.state ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                        }`}
                      />
                      {formErrors.state && (
                        <p className="mt-1 text-xs text-terracotta">{formErrors.state}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="chk-postal" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                        Postal Code / PIN *
                      </label>
                      <input
                        id="chk-postal"
                        type="text"
                        placeholder="e.g. 400001"
                        value={formData.postalCode}
                        onChange={(e) => handleFormFieldChange("postalCode", e.target.value)}
                        className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                          formErrors.postalCode ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                        }`}
                      />
                      {formErrors.postalCode && (
                        <p className="mt-1 text-xs text-terracotta">{formErrors.postalCode}</p>
                      )}
                    </div>

                    {isAuthenticated && (
                      <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                        <input
                          id="chk-save-to-account"
                          type="checkbox"
                          checked={formData.saveToAccount}
                          onChange={(e) => handleFormFieldChange("saveToAccount", e.target.checked)}
                          className="h-4 w-4 rounded border-deep-brown/30 text-primary-orange focus:ring-primary-orange"
                        />
                        <label htmlFor="chk-save-to-account" className="text-sm font-medium text-deep-brown">
                          Save this address to my account
                        </label>
                      </div>
                    )}

                    <div className="sm:col-span-2 border-t border-deep-brown/10 pt-3" aria-live="polite">
                      <p className="text-xs font-semibold text-deep-brown/70">
                        {previewing ? "Checking delivery availability..." : "Delivery availability checks automatically as your address becomes complete."}
                      </p>
                    </div>
                  </form>
                </div>
              )}

              {/* Items Availability */}
              <div className="rounded-2xl border border-deep-brown/15 bg-white p-4 shadow-xs sm:p-6">
                <h2 className="border-b border-deep-brown/10 pb-4 mb-4 font-baloo text-base font-bold leading-tight text-deep-brown sm:text-lg">
                  Your Items
                </h2>

                {previewResult && !previewResult.readiness.cartReady && (
                  <div className="mb-4 flex flex-col items-start gap-2 rounded-xl border border-terracotta/40 bg-terracotta/10 p-3 text-xs font-bold text-terracotta sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <span className="leading-relaxed">Attention required: One or more items in your cart are currently unavailable or out of stock. Please update your cart before proceeding.</span>
                    <Link href="/cart" className="shrink-0 font-bold underline text-terracotta">
                      Review Cart
                    </Link>
                  </div>
                )}

                <div className="space-y-4">
                  {(previewResult?.cart.items || cart.items).map((item) => {
                    const reason = item.availabilityReason;

                    return (
                      <div
                        key={item.cartItemId}
                        className={`flex min-w-0 items-start gap-3 rounded-xl border p-3 sm:items-center sm:gap-4 ${
                          reason ? "border-terracotta/50 bg-terracotta/5" : "border-deep-brown/10"
                        }`}
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-peach-hero/30 border border-deep-brown/10 sm:h-14 sm:w-14">
                          {item.image?.url ? (
                            <Image
                              src={item.image.url}
                              alt={item.image.alt || item.productName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-deep-brown/60">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="truncate text-xs font-semibold text-deep-brown sm:text-sm">
                            {item.productName}
                          </h4>
                          {item.variantName && (
                            <p className="text-xs text-text-primary/70">{item.variantName}</p>
                          )}
                          <p className="mt-0.5 text-[11px] font-medium text-deep-brown/80 sm:text-xs">
                            Qty: {item.quantity} &times; ₹{item.price}
                          </p>

                          {reason === "PRODUCT_UNAVAILABLE" && (
                            <span className="mt-1.5 inline-block rounded-md bg-terracotta px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                              Product Unavailable
                            </span>
                          )}

                          {reason === "VARIANT_UNAVAILABLE" && (
                            <span className="mt-1.5 inline-block rounded-md bg-terracotta px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                              Variant Unavailable
                            </span>
                          )}

                          {reason === "OUT_OF_STOCK" && (
                            <span className="mt-1.5 inline-block rounded-md bg-terracotta px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                              Out of Stock ({item.availableQuantity} available)
                            </span>
                          )}
                        </div>

                        <div className="shrink-0 pt-0.5 text-right sm:pt-0">
                          <span className="text-xs font-bold text-deep-brown sm:text-sm">
                            ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Readiness & Place Order CTA */}
            <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-5">
              {/* Delivery status */}
              <div className="rounded-2xl border border-deep-brown/15 bg-white p-4 shadow-xs sm:p-6">
                <h2 className="border-b border-deep-brown/10 pb-4 mb-4 font-baloo text-base font-bold leading-tight text-deep-brown sm:text-lg">
                  Delivery
                </h2>
                <p className={`text-sm font-bold ${previewServiceable ? "text-deep-brown" : "text-terracotta"}`} role="status" aria-live="polite">
                  {deliveryMessage}
                </p>
                {paymentMethod === "cod" && serviceabilityKnown && !previewServiceable && (
                  <p className="mt-2 text-xs font-medium text-deep-brown/75">
                    Pay Online may be available. Select it above to check.
                  </p>
                )}
              </div>

              {/* Payment method is selected before Order creation. */}
              <div className="rounded-2xl border border-deep-brown/15 bg-white p-4 shadow-xs sm:p-6">
                <h2 className="border-b border-deep-brown/10 pb-4 mb-4 font-baloo text-base font-bold leading-tight text-deep-brown sm:text-lg">
                  Payment Method
                </h2>
                <div className="space-y-3" role="radiogroup" aria-label="Payment method">
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${paymentMethod === "payu" ? "border-primary-orange bg-peach-hero/20 ring-1 ring-primary-orange" : "border-deep-brown/15 hover:border-deep-brown/30"}`}>
                    <input type="radio" name="checkout-payment-method" value="payu" checked={paymentMethod === "payu"} onChange={() => handlePaymentMethodChange("payu")} className="mt-0.5 h-4 w-4 text-primary-orange focus:ring-primary-orange" />
                    <span>
                      <span className="block text-sm font-bold text-deep-brown">Pay Online</span>
                      <span className="block text-xs font-medium text-deep-brown/65">Secure payment via PayU</span>
                    </span>
                  </label>
                  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${paymentMethod === "cod" ? "border-primary-orange bg-peach-hero/20 ring-1 ring-primary-orange" : "border-deep-brown/15 hover:border-deep-brown/30"}`}>
                    <input type="radio" name="checkout-payment-method" value="cod" checked={paymentMethod === "cod"} onChange={() => handlePaymentMethodChange("cod")} className="mt-0.5 h-4 w-4 text-primary-orange focus:ring-primary-orange" />
                    <span>
                      <span className="block text-sm font-bold text-deep-brown">Cash on Delivery</span>
                      <span className={`block text-xs font-medium ${paymentMethod === "cod" && serviceabilityKnown && !previewServiceable ? "text-terracotta" : "text-deep-brown/65"}`}>
                        {paymentMethod === "cod" && serviceabilityKnown && !previewServiceable ? "Not available for this delivery address" : "Pay when your order arrives"}
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Order Totals Summary Card & CTA */}
              <div className="rounded-2xl border border-deep-brown/15 bg-white p-4 shadow-xs sm:p-6">
                <h2 className="border-b border-deep-brown/10 pb-4 mb-4 font-baloo text-lg font-bold text-deep-brown">
                  Order Summary
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3 text-text-primary">
                    <span className="min-w-0">Merchandise Subtotal</span>
                    <span className="font-semibold text-deep-brown">
                      ₹{previewResult?.totals.merchandiseSubtotal || cart.subtotal}
                    </span>
                  </div>

                  <CouponField
                    coupon={displayedCoupon}
                    busy={couponBusy}
                    disabled={previewing || submittingOrder || cartContextUnsynced}
                    error={couponError}
                    onApply={handleApplyCoupon}
                    onRemove={handleRemoveCoupon}
                  />

                  <div className="flex items-baseline justify-between gap-3 text-text-primary">
                    <span className="min-w-0">Coupon discount</span>
                    <span className="font-semibold text-deep-brown">-{previewResult?.totals.discountAmount ? `₹${previewResult.totals.discountAmount}` : "₹0.00"}</span>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 text-xs text-text-primary">
                    <span className="min-w-0">Shipping</span>
                    <span className="min-w-0 max-w-[58%] break-words text-right font-medium text-deep-brown/70 sm:max-w-none">
                      {previewing
                        ? "Calculating delivery charges..."
                        : error && !previewResult
                          ? "Unable to calculate delivery charges. Please retry."
                          : previewResult?.totals.shippingAmount
                            ? `₹${previewResult.totals.shippingAmount}`
                            : "To be calculated"}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-3 border-t border-deep-brown/10 pt-3 text-base font-bold text-deep-brown">
                    <span>Final payable total</span>
                    <span className="text-primary-orange font-extrabold">
                      {payableTotalDisplay ? `₹${payableTotalDisplay}` : "To be calculated"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-deep-brown/10 space-y-3">
                  {/* Real Place Order Action CTA. On compact viewports this moves
                      into the fixed bottom bar (CheckoutStickyCta) — same
                      handler, same disabled gate — so it is hidden here. */}
                  {!isCompactCheckout && (
                    <button
                      type="button"
                      onClick={handlePlaceOrder}
                      disabled={placeOrderDisabled}
                      aria-disabled={placeOrderDisabled}
                      className={`w-full rounded-xl py-3 text-xs font-bold text-white transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-orange focus:ring-offset-2 ${
                        placeOrderDisabled
                          ? "bg-deep-brown/20 text-deep-brown/50 cursor-not-allowed"
                          : "bg-primary-orange hover:bg-terracotta cursor-pointer"
                      }`}
                    >
                      {submittingOrder ? "Creating Order..." : primaryCtaLabel}
                    </button>
                  )}

                  <p className="text-[11px] text-center text-text-primary/60">
                     {paymentMethod === "payu" ? "You’ll continue to secure PayU payment after your order is created." : "No online payment is needed."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showStickyPlaceOrder && (
        <CheckoutStickyCta
          total={payableTotalDisplay ?? null}
          disabled={placeOrderDisabled}
          submitting={submittingOrder}
          label={primaryCtaLabel}
          onPlaceOrder={handlePlaceOrder}
        />
      )}
    </main>
  );
}
