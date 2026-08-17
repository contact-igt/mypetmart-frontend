// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AddressLocationAssist } from "./address-location-assist";
import { mapGoogleAddressComponents } from "@/lib/location-field-mapper";

describe("Address Location Assist & Field Mapper Tests", () => {
  const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Field Mapper Unit Tests", () => {
    it("1. Maps standard Google address components to MyPetMart form fields", () => {
      const components = [
        { long_name: "221B", short_name: "221B", types: ["street_number"] },
        { long_name: "Baker Street", short_name: "Baker St", types: ["route"] },
        { long_name: "Suite 4", short_name: "Suite 4", types: ["subpremise"] },
        { long_name: "Bandra West", short_name: "Bandra", types: ["sublocality_level_1"] },
        { long_name: "Mumbai", short_name: "Mumbai", types: ["locality"] },
        { long_name: "Maharashtra", short_name: "MH", types: ["administrative_area_level_1"] },
        { long_name: "400050", short_name: "400050", types: ["postal_code"] },
        { long_name: "India", short_name: "IN", types: ["country"] },
      ];

      const mapped = mapGoogleAddressComponents(components, "221B Baker St, Bandra, Mumbai");
      expect(mapped.line1).toBe("221B Baker Street, Bandra West");
      expect(mapped.line2).toBe("Flat Suite 4");
      expect(mapped.city).toBe("Mumbai");
      expect(mapped.state).toBe("Maharashtra");
      expect(mapped.postalCode).toBe("400050");
      expect(mapped.country).toBe("IN");
    });

    it("2. Ensures country code is 2-letter uppercase for backend compatibility", () => {
      const components = [{ long_name: "India", short_name: "in", types: ["country"] }];
      const mapped = mapGoogleAddressComponents(components);
      expect(mapped.country).toBe("IN");
    });

    it("3. Does NOT return recipientName or phone properties in mapped payload", () => {
      const components = [
        { long_name: "Main St", short_name: "Main St", types: ["route"] },
        { long_name: "Pune", short_name: "Pune", types: ["locality"] },
      ];
      const mapped = mapGoogleAddressComponents(components) as any;
      expect(mapped.recipientName).toBeUndefined();
      expect(mapped.phone).toBeUndefined();
      expect(mapped.latitude).toBeUndefined();
      expect(mapped.longitude).toBeUndefined();
      expect(mapped.placeId).toBeUndefined();
    });
  });

  describe("AddressLocationAssist Component Tests", () => {
    it("4. Handles missing API key gracefully without crashing or throwing", () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const onSelect = vi.fn();
      render(<AddressLocationAssist onAddressSelect={onSelect} />);

      expect(screen.getByText(/Search Your Address/i)).toBeInTheDocument();
      expect(screen.getByText(/Address search assist is unconfigured/i)).toBeInTheDocument();

      const searchInput = screen.getByRole("textbox", { name: /Search Your Address/i });
      expect(searchInput).toBeDisabled();
    });

    it("5. Current location permission denied shows concise fallback message", async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((_, error) => {
          error({ code: 1, PERMISSION_DENIED: 1, message: "User denied Geolocation" });
        }),
      };
      vi.stubGlobal("navigator", { geolocation: mockGeolocation });

      const onSelect = vi.fn();
      render(<AddressLocationAssist onAddressSelect={onSelect} />);

      const locBtn = screen.getByRole("button", { name: /Use Current Location/i });
      fireEvent.click(locBtn);

      await waitFor(() => {
        expect(screen.getByText(/Location permission denied/i)).toBeInTheDocument();
      });
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("6. Current location reverse-geocode success and Confirm Location triggers onAddressSelect", async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn().mockImplementation((success) => {
          success({ coords: { latitude: 19.076, longitude: 72.8777 } });
        }),
      };
      vi.stubGlobal("navigator", { geolocation: mockGeolocation });

      // Mock Google Geocoder
      const geocodeMock = vi.fn().mockImplementation((_, callback) => {
        callback(
          [
            {
              formatted_address: "Linking Rd, Bandra West, Mumbai",
              address_components: [
                { long_name: "Linking Rd", short_name: "Linking Rd", types: ["route"] },
                { long_name: "Mumbai", short_name: "Mumbai", types: ["locality"] },
                { long_name: "Maharashtra", short_name: "MH", types: ["administrative_area_level_1"] },
                { long_name: "400050", short_name: "400050", types: ["postal_code"] },
                { long_name: "India", short_name: "IN", types: ["country"] },
              ],
            },
          ],
          "OK"
        );
      });

      class MockGeocoder {
        geocode = geocodeMock;
      }
      
      class MockMap {
        setCenter = vi.fn();
      }
      
      class MockMarker {
        setPosition = vi.fn();
        getPosition = vi.fn().mockReturnValue({ lat: () => 19.076, lng: () => 72.8777 });
      }

      vi.stubGlobal("google", {
        maps: {
          Geocoder: MockGeocoder,
          Map: MockMap,
          Marker: MockMarker,
          event: {
            addListener: vi.fn(),
            clearInstanceListeners: vi.fn(),
          }
        },
      });

      const onSelect = vi.fn();
      render(<AddressLocationAssist onAddressSelect={onSelect} />);

      const locBtn = screen.getByRole("button", { name: /Use Current Location/i });
      fireEvent.click(locBtn);

      await waitFor(() => {
        expect(screen.getByText(/Location detected. Please verify on the map./i)).toBeInTheDocument();
      });
      
      // Click confirm location
      const confirmBtn = screen.getByRole("button", { name: /Confirm Location/i });
      fireEvent.click(confirmBtn);

      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: expect.objectContaining({
            line1: "Linking Rd",
            city: "Mumbai",
            state: "Maharashtra",
            postalCode: "400050",
            country: "IN",
          }),
          latitude: 19.076,
          longitude: 72.8777
        })
      );
    });
  });
});
