"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCustomerAuth } from "@/context/customer-auth-context";
import { AddressApi } from "@/lib/address-api";
import { CheckoutApi } from "@/lib/checkout-api";
import { OrderApi } from "@/lib/order-api";
import { CartApi } from "@/lib/cart-api";
import type { Address, CreateAddressInput } from "@/types/address";
import type { CheckoutPreviewPayload, CheckoutPreviewResult } from "@/types/checkout";
import type { CreateOrderResultJSON, CreateOrderInput } from "@/types/order";
import type { Cart } from "@/types/storefront";
import { AppAuthError } from "@/lib/auth/auth-errors";
import { AddressLocationAssist, type LocationSelection } from "@/components/address/address-location-assist";
import { ProceedToPaymentButton } from "@/components/payment/proceed-to-payment-button";

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
  const isAuthenticated = status === "authenticated" && Boolean(customer);

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

  // Order Submission & Distinct Network Uncertainty State
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [isOrderStatusUnknown, setIsOrderStatusUnknown] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreateOrderResultJSON | null>(null);
  const isSubmittingRef = useRef(false);

  // Invalidate preview only when actual preview input fields change
  const handleFormFieldChange = (field: keyof AddressFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Invalidate preview if an inline address field that affects shipping preview changes
    const previewImpactingFields: Array<keyof AddressFormData> = [
      "recipientName",
      "phone",
      "line1",
      "line2",
      "city",
      "state",
      "postalCode",
      "country",
      "latitude",
      "longitude",
      "contactEmail",
    ];
    if (previewImpactingFields.includes(field) && activePreviewPayload && !activePreviewPayload.savedAddressId) {
      setActivePreviewPayload(null);
      setPreviewResult(null);
    }
  };

  const handleLocationSelect = useCallback((selection: LocationSelection) => {
    setFormData((prev) => ({
      ...prev,
      line1: selection.fields.line1 !== undefined ? selection.fields.line1 : prev.line1,
      line2: selection.fields.line2 !== undefined ? selection.fields.line2 : prev.line2,
      city: selection.fields.city !== undefined ? selection.fields.city : prev.city,
      state: selection.fields.state !== undefined ? selection.fields.state : prev.state,
      postalCode: selection.fields.postalCode !== undefined ? selection.fields.postalCode : prev.postalCode,
      country: selection.fields.country !== undefined ? selection.fields.country : prev.country,
      latitude: selection.latitude,
      longitude: selection.longitude,
    }));
    // Invalidate stale preview when map location coordinates/fields are chosen
    setActivePreviewPayload(null);
    setPreviewResult(null);
  }, []);

  // Load initial cart and (if authenticated) addresses
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const cartData = await CartApi.getCart();
        setCart(cartData);

        if (isAuthenticated) {
          const addresses = await AddressApi.getAddresses();
          setSavedAddresses(addresses);
          const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
          if (defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            const payload: CheckoutPreviewPayload = { savedAddressId: defaultAddr.id };
            const preview = await CheckoutApi.preview(payload);
            setPreviewResult(preview);
            setActivePreviewPayload(payload);
          } else {
            setIsAddingNewAddress(true);
          }
        }
      } catch (err: unknown) {
        if (err instanceof AppAuthError) {
          setError(err.message);
        } else {
          setError("Failed to load checkout data.");
        }
      } finally {
        setLoading(false);
      }
    }

    if (status !== "loading") {
      init();
    }
  }, [status, isAuthenticated]);

  // Handle selecting a saved address
  const handleSelectSavedAddress = async (addressId: number) => {
    setSelectedAddressId(addressId);
    setIsAddingNewAddress(false);
    setError(null);
    setIsCartError(false);
    setIsOrderStatusUnknown(false);
    setPreviewing(true);

    const payload: CheckoutPreviewPayload = { savedAddressId: addressId };

    try {
      const preview = await CheckoutApi.preview(payload);
      setPreviewResult(preview);
      setActivePreviewPayload(payload);
    } catch (err: unknown) {
      setActivePreviewPayload(null);
      setPreviewResult(null);
      if (err instanceof AppAuthError) {
        setError(err.message);
      } else {
        setError("Failed to preview address.");
      }
    } finally {
      setPreviewing(false);
    }
  };

  const validateAddressForm = (): boolean => {
    const errors: Partial<Record<keyof AddressFormData, string>> = {};

    if (!formData.recipientName.trim()) {
      errors.recipientName = "Recipient name is required";
    }
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required";
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
    if (!formData.postalCode.trim()) {
      errors.postalCode = "Postal code is required";
    }
    if (!isAuthenticated) {
      const emailPattern = /^\S+@\S+\.\S+$/;
      if (!formData.contactEmail.trim()) {
        errors.contactEmail = "Email is required";
      } else if (!emailPattern.test(formData.contactEmail)) {
        errors.contactEmail = "Valid email is required";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit address form (Guest inline OR Authenticated new address)
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAddressForm()) return;

    setPreviewing(true);
    setError(null);
    setIsCartError(false);
    setIsOrderStatusUnknown(false);

    const hasNumericCoords =
      typeof formData.latitude === "number" &&
      typeof formData.longitude === "number" &&
      !isNaN(formData.latitude) &&
      !isNaN(formData.longitude);

    const addressInput: CreateAddressInput = {
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

    try {
      if (isAuthenticated && formData.saveToAccount) {
        const newAddress = await AddressApi.create(addressInput);
        const payload: CheckoutPreviewPayload = { savedAddressId: newAddress.id };
        const preview = await CheckoutApi.preview(payload);
        setPreviewResult(preview);
        setActivePreviewPayload(payload);

        const updatedList = await AddressApi.getAddresses();
        setSavedAddresses(updatedList);
        setSelectedAddressId(newAddress.id);
        setIsAddingNewAddress(false);
      } else {
        const payload: CheckoutPreviewPayload = {
          shippingAddress: addressInput,
          contactEmail: formData.contactEmail.trim(),
        };
        const preview = await CheckoutApi.preview(payload);
        setPreviewResult(preview);
        setActivePreviewPayload(payload);
      }
    } catch (err: unknown) {
      setActivePreviewPayload(null);
      setPreviewResult(null);
      if (err instanceof AppAuthError) {
        setError(err.message);
      } else {
        setError("Failed to validate shipping address.");
      }
    } finally {
      setPreviewing(false);
    }
  };

  // Place Order Action Handshake
  const handlePlaceOrder = async () => {
    // 1. In-flight double submission guard & network uncertainty lock
    if (isSubmittingRef.current || submittingOrder || previewing || isOrderStatusUnknown) return;

    // 2. Validate state readiness
    if (
      !cart ||
      cart.items.length === 0 ||
      !previewResult ||
      !previewResult.readiness.cartReady ||
      !previewResult.readiness.addressReady ||
      !activePreviewPayload
    ) {
      setError("Checkout is not ready for order creation. Please verify your address and cart.");
      return;
    }

    // Lock synchronous submission flag
    isSubmittingRef.current = true;
    setSubmittingOrder(true);
    setError(null);
    setIsCartError(false);
    setIsPendingOrderError(false);
    setPendingOrderRedirectId(null);

    // Resolve CreateOrderInput payload strictly matching preview payload
    let orderInput: CreateOrderInput;
    if (activePreviewPayload.savedAddressId) {
      orderInput = { savedAddressId: activePreviewPayload.savedAddressId };
    } else if (activePreviewPayload.shippingAddress) {
      orderInput = {
        shippingAddress: activePreviewPayload.shippingAddress,
        contactEmail: activePreviewPayload.contactEmail,
      };
    } else {
      setError("Shipping address resolution failed.");
      isSubmittingRef.current = false;
      setSubmittingOrder(false);
      return;
    }

    try {
      const order = await OrderApi.create(orderInput);
      setCreatedOrder(order);
    } catch (err: unknown) {
      if (err instanceof AppAuthError) {
        switch (err.code) {
          case "ORDER_CART_EMPTY":
            setError("Your cart is empty. Add an item before placing your order.");
            setIsCartError(true);
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
          case "ORDER_ALREADY_PENDING": {
            setIsPendingOrderError(true);
            const rawId = (err.details as { orderId?: number } | undefined)?.orderId;
            if (typeof rawId === "number" && rawId > 0) {
              setPendingOrderRedirectId(rawId);
            } else {
              setPendingOrderRedirectId(null);
            }
            setError("You already have a pending order.");
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
            <span className="inline-block rounded-full bg-mint-sage px-3 py-1 text-xs font-extrabold text-deep-brown uppercase tracking-wider mb-2">
              Order Created
            </span>
            <h1 className="font-baloo text-3xl font-extrabold text-deep-brown sm:text-4xl">
              {`Order #${createdOrder.orderNumber}`}
            </h1>
            <p className="mt-2 text-sm font-medium text-text-primary/80">
              Your order has been recorded in pending state. Payment setup is the next step.
            </p>
          </div>

          {/* Guest Notice */}
          {!isAuthenticated && (
            <div className="mt-6 rounded-2xl border border-primary-orange/30 bg-peach-hero/40 p-4 text-center space-y-1">
              <p className="text-xs font-bold text-deep-brown">
                📌 Please note your order number: <span className="text-primary-orange">{createdOrder.orderNumber}</span>
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
                <span className="font-bold text-deep-brown capitalize">{createdOrder.status}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-deep-brown/60 uppercase">Payment Status</span>
                <span className="font-bold text-terracotta capitalize">{createdOrder.paymentStatus} (Not paid)</span>
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

            {/* Proceed to Payment */}
            <div className="pt-4 border-t border-deep-brown/10 space-y-3 text-center">
              {isAuthenticated ? (
                <ProceedToPaymentButton input={{ orderId: createdOrder.id }} />
              ) : createdOrder.guestAccessToken ? (
                <ProceedToPaymentButton input={{ guestAccessToken: createdOrder.guestAccessToken }} />
              ) : null}
              <p className="text-[11px] text-text-primary/60">
                You&apos;ll be redirected to PayU to complete payment. Your cart remains available.
              </p>
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
  const isPreviewValid = Boolean(
    previewResult &&
      previewResult.readiness.cartReady &&
      previewResult.readiness.addressReady &&
      activePreviewPayload
  );

  return (
    <main className="flex-1 bg-cream-bg py-8 md:py-12 min-h-[calc(100vh-144px)]">
      <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between border-b border-deep-brown/15 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-orange">
              Storefront Checkout
            </span>
            <h1 className="font-baloo text-3xl font-extrabold text-deep-brown sm:text-4xl">
              Checkout Preview
            </h1>
          </div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary-orange hover:underline"
          >
            &larr; Back to Cart
          </Link>
        </div>

        {/* Distinct Order Status Unknown State (Network Uncertainty) */}
        {isOrderStatusUnknown && (
          <div className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-deep-brown shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-sm uppercase tracking-wider">
              <span>⚠️ Order Status Unknown</span>
            </div>
            <p className="text-xs font-medium text-deep-brown/90 leading-relaxed">
              We couldn&apos;t confirm whether your order was created because of a network connection issue. To prevent duplicate orders, <strong>Place Order has been locked</strong>. Please re-verify your connection before attempting to unlock checkout.
            </p>
            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsOrderStatusUnknown(false);
                  setError(null);
                  setActivePreviewPayload(null);
                  setPreviewResult(null);
                }}
                className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white hover:bg-amber-800 transition-colors"
              >
                Re-check & Unlock Checkout
              </button>
            </div>
          </div>
        )}

        {/* Standard Error Banner */}
        {error && !isOrderStatusUnknown && (
          <div className="mt-6 rounded-xl border border-terracotta/30 bg-terracotta/10 p-4 text-xs font-semibold text-terracotta flex items-center justify-between">
            <span>{error}</span>
            {isCartError && (
              <Link
                href="/cart"
                className="ml-4 shrink-0 rounded-lg bg-terracotta px-3 py-1 text-xs font-bold text-white hover:opacity-90"
              >
                Review Cart &rarr;
              </Link>
            )}
            {isPendingOrderError && (
              <Link
                href={pendingOrderRedirectId ? `/account/orders/${pendingOrderRedirectId}` : "/account/orders"}
                className="ml-4 shrink-0 rounded-lg bg-terracotta px-3 py-1 text-xs font-bold text-white hover:opacity-90"
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
              Add items to your cart before proceeding to checkout preview.
            </p>
            <Link
              href="/shop"
              className="mt-5 inline-block rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors"
            >
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-12 items-start">
            {/* Left Column: Shipping Address & Selection */}
            <div className="lg:col-span-7 space-y-6">
              {/* Authenticated Saved Address Selector */}
              {isAuthenticated && savedAddresses.length > 0 && !isAddingNewAddress && (
                <div className="rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-deep-brown/10 pb-4 mb-4">
                    <h2 className="font-baloo text-lg font-bold text-deep-brown">
                      Select Shipping Address
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewAddress(true);
                        setActivePreviewPayload(null);
                        setPreviewResult(null);
                      }}
                      className="text-xs font-bold text-primary-orange hover:underline"
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
                <div className="rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-deep-brown/10 pb-4 mb-4">
                    <h2 className="font-baloo text-lg font-bold text-deep-brown">
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
                        className="text-xs font-bold text-deep-brown/60 hover:text-deep-brown"
                      >
                        Use Saved Address
                      </button>
                    )}
                  </div>

                  <AddressLocationAssist 
                    onAddressSelect={handleLocationSelect} 
                    initialLatitude={formData.latitude}
                    initialLongitude={formData.longitude}
                  />

                  <form onSubmit={handleAddressSubmit} className="grid gap-4 sm:grid-cols-2">
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

                    <div className="sm:col-span-2 pt-3 border-t border-deep-brown/10 flex justify-end">
                      <button
                        type="submit"
                        disabled={previewing}
                        className="rounded-xl bg-primary-orange px-6 py-2.5 text-xs font-bold text-white hover:bg-terracotta transition-colors disabled:opacity-50"
                      >
                        {previewing ? "Previewing Address..." : "Verify & Preview Address"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Items Availability & Revalidation Section */}
              <div className="rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs">
                <h2 className="border-b border-deep-brown/10 pb-4 mb-4 font-baloo text-lg font-bold text-deep-brown">
                  Items Revalidation & Availability
                </h2>

                {previewResult && !previewResult.readiness.cartReady && (
                  <div className="mb-4 rounded-xl border border-terracotta/40 bg-terracotta/10 p-4 text-xs font-bold text-terracotta flex items-center justify-between">
                    <span>Attention required: One or more items in your cart are currently unavailable or out of stock. Please update your cart before proceeding.</span>
                    <Link href="/cart" className="ml-4 shrink-0 font-bold underline text-terracotta">
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
                        className={`flex items-center gap-4 rounded-xl border p-3 ${
                          reason ? "border-terracotta/50 bg-terracotta/5" : "border-deep-brown/10"
                        }`}
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-peach-hero/30 border border-deep-brown/10">
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
                          <h4 className="text-sm font-semibold text-deep-brown truncate">
                            {item.productName}
                          </h4>
                          {item.variantName && (
                            <p className="text-xs text-text-primary/70">{item.variantName}</p>
                          )}
                          <p className="text-xs font-medium text-deep-brown/80 mt-0.5">
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

                        <div className="text-right">
                          <span className="text-sm font-bold text-deep-brown">
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
            <div className="lg:col-span-5 space-y-6">
              {/* Readiness Summary Card */}
              <div className="rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs">
                <h2 className="border-b border-deep-brown/10 pb-4 mb-4 font-baloo text-lg font-bold text-deep-brown">
                  Checkout Readiness Status
                </h2>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-deep-brown/70">Shipping Address:</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-bold uppercase ${
                        previewResult?.readiness.addressReady && activePreviewPayload
                          ? "bg-mint-sage text-deep-brown"
                          : "bg-terracotta/20 text-terracotta"
                      }`}
                    >
                      {previewResult?.readiness.addressReady && activePreviewPayload ? "Ready" : "Action Required"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-deep-brown/70">Cart Inventory & Price:</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-bold uppercase ${
                        previewResult?.readiness.cartReady
                          ? "bg-mint-sage text-deep-brown"
                          : "bg-terracotta/20 text-terracotta"
                      }`}
                    >
                      {previewResult?.readiness.cartReady ? "Verified" : "Attention Required"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Totals Summary Card & CTA */}
              <div className="rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs">
                <h2 className="border-b border-deep-brown/10 pb-4 mb-4 font-baloo text-lg font-bold text-deep-brown">
                  Order Summary
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-text-primary">
                    <span>Merchandise Subtotal</span>
                    <span className="font-semibold text-deep-brown">
                      ₹{previewResult?.totals.merchandiseSubtotal || cart.subtotal}
                    </span>
                  </div>

                  <div className="flex justify-between text-text-primary text-xs">
                    <span>Estimated Shipping</span>
                    <span className="font-medium text-deep-brown/70">
                      {previewResult?.totals.shippingAmount
                        ? `₹${previewResult.totals.shippingAmount}`
                        : "To be calculated"}
                    </span>
                  </div>

                  <div className="border-t border-deep-brown/10 pt-3 flex justify-between font-bold text-base text-deep-brown">
                    <span>Payable Total</span>
                    <span className="text-primary-orange font-extrabold">
                      ₹{previewResult?.totals.payableTotal || previewResult?.totals.merchandiseSubtotal || cart.subtotal}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-deep-brown/10 space-y-3">
                  {/* Real Place Order Action CTA */}
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={!isPreviewValid || submittingOrder || previewing || isCartEmpty || isOrderStatusUnknown}
                    aria-disabled={!isPreviewValid || submittingOrder || previewing || isCartEmpty || isOrderStatusUnknown}
                    className={`w-full rounded-xl py-3 text-xs font-bold text-white transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-primary-orange focus:ring-offset-2 ${
                      isPreviewValid && !submittingOrder && !previewing && !isCartEmpty && !isOrderStatusUnknown
                        ? "bg-primary-orange hover:bg-terracotta cursor-pointer"
                        : "bg-deep-brown/20 text-deep-brown/50 cursor-not-allowed"
                    }`}
                  >
                    {submittingOrder ? "Placing Order..." : "Place Order"}
                  </button>

                  <p className="text-[11px] text-center text-text-primary/60">
                    Placing order creates a pending order. Payment setup is the next step.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
