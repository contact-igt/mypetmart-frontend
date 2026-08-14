import { fetchWithAuth } from "./auth/auth-api";
import type { Address, CreateAddressInput, UpdateAddressInput } from "@/types/address";

export const AddressApi = {
  /**
   * Retrieves the authenticated customer's address list.
   */
  async getAddresses(): Promise<Address[]> {
    return fetchWithAuth<Address[]>("/storefront/addresses", {
      method: "GET",
    });
  },

  /**
   * Retrieves a single address by ID.
   */
  async getAddress(id: number): Promise<Address> {
    return fetchWithAuth<Address>(`/storefront/addresses/${id}`, {
      method: "GET",
    });
  },

  /**
   * Creates a new address in the customer's account.
   */
  async create(input: CreateAddressInput): Promise<Address> {
    return fetchWithAuth<Address>("/storefront/addresses", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * Updates an existing customer address.
   */
  async update(id: number, input: UpdateAddressInput): Promise<Address> {
    return fetchWithAuth<Address>(`/storefront/addresses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  /**
   * Sets a customer address as default.
   */
  async setDefault(id: number): Promise<Address> {
    return fetchWithAuth<Address>(`/storefront/addresses/${id}/default`, {
      method: "PATCH",
    });
  },

  /**
   * Deletes a customer address.
   */
  async delete(id: number): Promise<void> {
    return fetchWithAuth<void>(`/storefront/addresses/${id}`, {
      method: "DELETE",
    });
  },
};
