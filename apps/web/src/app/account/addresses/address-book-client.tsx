"use client";

import { useEffect, useState, useCallback } from "react";
import { AccountShell } from "@/components/account/account-shell";
import { AddressApi } from "@/lib/address-api";
import type { Address, CreateAddressInput } from "@/types/address";
import { AppAuthError } from "@/lib/auth/auth-errors";

import { AddressLocationAssist, type LocationSelection } from "@/components/address/address-location-assist";

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
  isDefault: boolean;
  latitude: number | null;
  longitude: number | null;
};

const initialFormData: AddressFormData = {
  label: "",
  recipientName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "IN",
  isDefault: false,
  latitude: null,
  longitude: null,
};

export function AddressBookClient() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);

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
  }, []);

  // Correction #2: Trust server state completely after any mutation by re-fetching address list
  const refreshAddressList = useCallback(async () => {
    try {
      setError(null);
      const data = await AddressApi.getAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      if (err instanceof AppAuthError) {
        setError(err.message);
      } else {
        setError("Failed to load addresses. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await AddressApi.getAddresses();
        if (active) {
          setAddresses(Array.isArray(data) ? data : []);
        }
      } catch (err: unknown) {
        if (active) {
          if (err instanceof AppAuthError) {
            setError(err.message);
          } else {
            setError("Failed to load addresses. Please try again.");
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const openAddForm = () => {
    setEditingAddressId(null);
    setFormData(initialFormData);
    setFormErrors({});
    setIsFormOpen(true);
    setActionSuccess(null);
  };

  const openEditForm = (address: Address) => {
    setEditingAddressId(address.id);
    setFormData({
      label: address.label || "",
      recipientName: address.recipientName || "",
      phone: address.phone || "",
      line1: address.line1 || "",
      line2: address.line2 || "",
      city: address.city || "",
      state: address.state || "",
      postalCode: address.postalCode || "",
      country: address.country || "IN",
      isDefault: address.isDefault,
      latitude: address.latitude || null,
      longitude: address.longitude || null,
    });
    setFormErrors({});
    setIsFormOpen(true);
    setActionSuccess(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAddressId(null);
    setFormData(initialFormData);
    setFormErrors({});
  };

  const validateForm = (): boolean => {
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
      errors.postalCode = "PIN / Postal code is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);
    setActionSuccess(null);

    const basePayload = {
      label: formData.label.trim() || undefined,
      recipientName: formData.recipientName.trim(),
      phone: formData.phone.trim(),
      line1: formData.line1.trim(),
      line2: formData.line2.trim() || undefined,
      city: formData.city.trim(),
      state: formData.state.trim(),
      postalCode: formData.postalCode.trim(),
      country: formData.country.trim() || "IN",
      isDefault: formData.isDefault,
    };

    const hasNumericCoords =
      typeof formData.latitude === "number" &&
      typeof formData.longitude === "number" &&
      !isNaN(formData.latitude) &&
      !isNaN(formData.longitude);

    try {
      if (editingAddressId !== null) {
        const original = addresses.find((a) => a.id === editingAddressId);
        const originalHadCoords = Boolean(original && original.latitude !== null && original.longitude !== null);

        let updatePayload;
        if (hasNumericCoords) {
          updatePayload = {
            ...basePayload,
            latitude: formData.latitude as number,
            longitude: formData.longitude as number,
          };
        } else if (originalHadCoords && formData.latitude === null && formData.longitude === null) {
          // Explicitly clear coordinates if address previously had them
          updatePayload = {
            ...basePayload,
            latitude: null,
            longitude: null,
          };
        } else {
          // Address never had coordinates or coordinates unchanged: omit lat/lon keys entirely
          updatePayload = basePayload;
        }

        await AddressApi.update(editingAddressId, updatePayload);
        setActionSuccess("Address updated successfully.");
      } else {
        const createPayload: CreateAddressInput = hasNumericCoords
          ? {
              ...basePayload,
              latitude: formData.latitude as number,
              longitude: formData.longitude as number,
            }
          : basePayload;

        await AddressApi.create(createPayload);
        setActionSuccess("Address added successfully.");
      }
      closeForm();
      // Re-fetch to get exact server state
      await refreshAddressList();
    } catch (err: unknown) {
      if (err instanceof AppAuthError) {
        setError(err.message);
      } else {
        setError("Failed to save address. Please verify your details.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    setSettingDefaultId(id);
    setError(null);
    setActionSuccess(null);
    try {
      await AddressApi.setDefault(id);
      setActionSuccess("Default address updated.");
      // Re-fetch address list and trust returned server state (Correction #2)
      await refreshAddressList();
    } catch (err: unknown) {
      if (err instanceof AppAuthError) {
        setError(err.message);
      } else {
        setError("Failed to set default address.");
      }
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    setDeletingId(id);
    setError(null);
    setActionSuccess(null);
    try {
      await AddressApi.delete(id);
      setActionSuccess("Address removed.");
      // Re-fetch address list and trust returned server state (Correction #2)
      await refreshAddressList();
    } catch (err: unknown) {
      if (err instanceof AppAuthError) {
        setError(err.message);
      } else {
        setError("Failed to delete address.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AccountShell subtitle="Manage your saved shipping addresses for quick and effortless checkout.">
      <div className="flex flex-col gap-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-deep-brown/15 bg-white p-6 shadow-xs">
          <div>
            <h2 className="font-baloo text-xl font-bold text-deep-brown">
              Saved Address Book
            </h2>
            <p className="text-xs text-text-primary/75 mt-0.5">
              {addresses.length === 0
                ? "No addresses saved yet."
                : `${addresses.length} saved address${addresses.length > 1 ? "es" : ""}`}
            </p>
          </div>
          {!isFormOpen && (
            <button
              type="button"
              onClick={openAddForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-orange px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-terracotta transition-colors"
            >
              + Add New Address
            </button>
          )}
        </div>

        {/* Global Alert / Success Messages */}
        {error && (
          <div className="rounded-xl border border-terracotta/30 bg-terracotta/10 p-4 text-xs font-semibold text-terracotta">
            {error}
          </div>
        )}

        {actionSuccess && (
          <div className="rounded-xl border border-mint-sage bg-mint-sage/20 p-4 text-xs font-semibold text-deep-brown">
            {actionSuccess}
          </div>
        )}

        {/* Address Form (Add / Edit) */}
        {isFormOpen && (
          <div className="rounded-2xl border border-primary-orange/40 bg-white p-6 shadow-md">
            <div className="flex items-center justify-between border-b border-deep-brown/10 pb-4 mb-5">
              <h3 className="font-baloo text-lg font-bold text-deep-brown">
                {editingAddressId ? "Edit Address" : "Add New Address"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="text-xs font-bold text-deep-brown/60 hover:text-deep-brown"
              >
                Cancel
              </button>
            </div>

            {/* <AddressLocationAssist 
              onAddressSelect={handleLocationSelect} 
              initialLatitude={formData.latitude}
              initialLongitude={formData.longitude}
            /> */}

            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="address-label" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                  Label (Optional)
                </label>
                <input
                  id="address-label"
                  type="text"
                  placeholder="e.g. Home, Office"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full rounded-xl border border-deep-brown/20 px-3.5 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="address-recipient" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                  Recipient Full Name *
                </label>
                <input
                  id="address-recipient"
                  type="text"
                  placeholder="e.g. Jordan Rivera"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                    formErrors.recipientName ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                  }`}
                />
                {formErrors.recipientName && (
                  <p className="mt-1 text-xs text-terracotta">{formErrors.recipientName}</p>
                )}
              </div>

              <div>
                <label htmlFor="address-phone" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <input
                  id="address-phone"
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                    formErrors.phone ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                  }`}
                />
                {formErrors.phone && (
                  <p className="mt-1 text-xs text-terracotta">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="address-line1" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                  Address Line 1 *
                </label>
                <input
                  id="address-line1"
                  type="text"
                  placeholder="House/Flat No., Street, Area"
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                    formErrors.line1 ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                  }`}
                />
                {formErrors.line1 && (
                  <p className="mt-1 text-xs text-terracotta">{formErrors.line1}</p>
                )}
              </div>

              <div>
                <label htmlFor="address-line2" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                  Address Line 2 (Optional)
                </label>
                <input
                  id="address-line2"
                  type="text"
                  placeholder="Landmark, Suite, Apartment"
                  value={formData.line2}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  className="w-full rounded-xl border border-deep-brown/20 px-3.5 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="address-city" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                  City *
                </label>
                <input
                  id="address-city"
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                    formErrors.city ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                  }`}
                />
                {formErrors.city && (
                  <p className="mt-1 text-xs text-terracotta">{formErrors.city}</p>
                )}
              </div>

              <div>
                <label htmlFor="address-state" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                  State *
                </label>
                <input
                  id="address-state"
                  type="text"
                  placeholder="e.g. Maharashtra"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                    formErrors.state ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                  }`}
                />
                {formErrors.state && (
                  <p className="mt-1 text-xs text-terracotta">{formErrors.state}</p>
                )}
              </div>

              <div>
                <label htmlFor="address-postal" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                  Postal Code / PIN *
                </label>
                <input
                  id="address-postal"
                  type="text"
                  placeholder="e.g. 400001"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm text-text-primary focus:outline-none ${
                    formErrors.postalCode ? "border-terracotta" : "border-deep-brown/20 focus:border-primary-orange"
                  }`}
                />
                {formErrors.postalCode && (
                  <p className="mt-1 text-xs text-terracotta">{formErrors.postalCode}</p>
                )}
              </div>

              <div>
                <label htmlFor="address-country" className="block text-xs font-bold text-deep-brown uppercase tracking-wider mb-1">
                  Country
                </label>
                <input
                  id="address-country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full rounded-xl border border-deep-brown/20 px-3.5 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                <input
                  id="address-is-default"
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-deep-brown/30 text-primary-orange focus:ring-primary-orange"
                />
                <label htmlFor="address-is-default" className="text-sm font-medium text-deep-brown">
                  Set as default shipping address
                </label>
              </div>

              <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-3 border-t border-deep-brown/10 mt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-deep-brown/20 px-4 py-2 text-xs font-bold text-deep-brown hover:bg-cream-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-primary-orange px-5 py-2 text-xs font-bold text-white hover:bg-terracotta transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingAddressId ? "Update Address" : "Save Address"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Address Cards List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-orange border-t-transparent"></div>
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl border border-deep-brown/15 bg-white p-8 text-center">
            <p className="text-sm font-medium text-deep-brown/70">
              You haven&apos;t added any shipping addresses yet.
            </p>
            <button
              type="button"
              onClick={openAddForm}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-orange px-4 py-2 text-xs font-bold text-white hover:bg-terracotta transition-colors"
            >
              + Add Address
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 bg-white shadow-xs transition-all ${
                  address.isDefault
                    ? "border-primary-orange ring-1 ring-primary-orange/30"
                    : "border-deep-brown/15 hover:border-deep-brown/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-orange">
                      {address.label || "Address"}
                    </span>
                    {address.isDefault && (
                      <span className="rounded-full bg-mint-sage px-2.5 py-0.5 text-[10px] font-bold text-deep-brown uppercase">
                        Default
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-deep-brown text-base">
                    {address.recipientName}
                  </h4>
                  <p className="text-xs text-text-primary/75 font-medium mt-0.5">
                    Phone: {address.phone}
                  </p>

                  <div className="mt-3 text-xs text-text-primary space-y-0.5">
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    <p>
                      {address.city}, {address.state} - {address.postalCode}
                    </p>
                    <p className="text-deep-brown/60 uppercase">{address.country}</p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-deep-brown/10 pt-3 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditForm(address)}
                      className="font-bold text-primary-orange hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === address.id}
                      onClick={() => handleDelete(address.id)}
                      className="font-bold text-terracotta hover:underline disabled:opacity-50"
                    >
                      {deletingId === address.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>

                  {!address.isDefault && (
                    <button
                      type="button"
                      disabled={settingDefaultId === address.id}
                      onClick={() => handleSetDefault(address.id)}
                      className="font-bold text-deep-brown/80 hover:text-primary-orange hover:underline disabled:opacity-50"
                    >
                      {settingDefaultId === address.id ? "Setting..." : "Set as Default"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountShell>
  );
}
