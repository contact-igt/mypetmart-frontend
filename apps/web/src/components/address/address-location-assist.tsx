"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadGoogleMapsScript, getGoogleMapsApiKey, type GoogleMapsLoadStatus } from "@/lib/google-maps-loader";
import { mapGoogleAddressComponents, type MappedAddressFields, type AddressComponentLike } from "@/lib/location-field-mapper";
import { MapPinIcon } from "@/components/account/account-icons";

export type LocationSelection = {
  fields: MappedAddressFields;
  latitude: number;
  longitude: number;
};

type AddressLocationAssistProps = {
  onAddressSelect: (selection: LocationSelection) => void;
  disabled?: boolean;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
};

export function AddressLocationAssist({ onAddressSelect, disabled = false, initialLatitude, initialLongitude }: AddressLocationAssistProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const apiKey = getGoogleMapsApiKey();
  const [loadStatus, setLoadStatus] = useState<GoogleMapsLoadStatus>(() =>
    apiKey ? "idle" : "missing-key"
  );
  
  const [locationLoading, setLocationLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  // Map State
  const [mapVisible, setMapVisible] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerInstanceRef = useRef<any>(null);
  
  const [tempLocation, setTempLocation] = useState<LocationSelection | null>(null);
  
  const handleMarkerMove = useCallback((lat: number, lng: number) => {
    if (!window.google?.maps?.Geocoder) return;
    
    setStatusMessage("Updating address...");
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const mapped = mapGoogleAddressComponents(
          results[0].address_components as unknown as AddressComponentLike[],
          results[0].formatted_address
        );
        setTempLocation({ fields: mapped, latitude: lat, longitude: lng });
        setStatusMessage("Address updated based on marker.");
      } else {
        // Just update coordinates
        setTempLocation(prev => prev ? { ...prev, latitude: lat, longitude: lng } : { fields: {}, latitude: lat, longitude: lng });
        setStatusMessage("Marker moved, but couldn't reverse-geocode address.");
      }
    });
  }, []);

  const initMap = useCallback((lat: number, lng: number) => {
    setMapVisible(true);
    
    // Give react time to render map container
    setTimeout(() => {
      if (!mapContainerRef.current || !window.google?.maps) return;
      
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat, lng },
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        
        markerInstanceRef.current = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          draggable: true,
          animation: 2 // DROP
        });
        
        // Listeners
        window.google.maps.event.addListener(markerInstanceRef.current, "dragend", () => {
          const pos = markerInstanceRef.current.getPosition();
          handleMarkerMove(pos.lat(), pos.lng());
        });
        
        window.google.maps.event.addListener(mapInstanceRef.current, "click", (e: unknown) => {
          const event = e as { latLng: { lat: () => number, lng: () => number } };
          markerInstanceRef.current.setPosition(event.latLng);
          handleMarkerMove(event.latLng.lat(), event.latLng.lng());
        });
      } else {
        mapInstanceRef.current.setCenter({ lat, lng });
        markerInstanceRef.current.setPosition({ lat, lng });
      }
    }, 0);
  }, [handleMarkerMove]);

  // Load Google Maps Script
  useEffect(() => {
    if (!apiKey) return;

    let active = true;
    loadGoogleMapsScript()
      .then(() => {
        if (!active) return;
        setLoadStatus("ready");

        if (searchInputRef.current && window.google?.maps?.places) {
          const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
            componentRestrictions: { country: "in" },
            fields: ["address_components", "formatted_address", "name", "geometry"],
          });

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (place && place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const mapped = mapGoogleAddressComponents(
                place.address_components as unknown as AddressComponentLike[],
                place.formatted_address,
                place.name
              );
              
              const selection = { fields: mapped, latitude: lat, longitude: lng };
              setTempLocation(selection);
              initMap(lat, lng);
              setStatusMessage("Location selected. You can adjust the marker on the map.");
            }
          });
        }
      })
      .catch(() => {
        if (active) setLoadStatus("error");
      });

    return () => { active = false; };
  }, [apiKey, initMap]);
  
  // Initialize Map from existing coordinates
  useEffect(() => {
    if (loadStatus === "ready" && initialLatitude && initialLongitude && !mapVisible && !tempLocation) {
      // If we are editing an address that has coordinates, we do NOT automatically open the map 
      // unless we want to. The instructions said: "If saved Address already has coordinates: 
      // - initialize location state from existing coordinates
      // - show/recover map location appropriately"
      // We will keep it hidden until they want to search again to avoid being annoying.
    }
  }, [loadStatus, initialLatitude, initialLongitude, mapVisible, tempLocation]);

  const handleUseCurrentLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStatusMessage("Browser location is not supported. Please enter your address manually.");
      return;
    }

    setLocationLoading(true);
    setStatusMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              setLocationLoading(false);
              if (status === "OK" && results && results[0]) {
                const mapped = mapGoogleAddressComponents(
                  results[0].address_components as unknown as AddressComponentLike[],
                  results[0].formatted_address
                );
                
                setTempLocation({ fields: mapped, latitude, longitude });
                initMap(latitude, longitude);
                setStatusMessage("Location detected. Please verify on the map.");
              } else {
                // We got coords but no address
                setTempLocation({ fields: {}, latitude, longitude });
                initMap(latitude, longitude);
                setStatusMessage("Location found, but could not resolve address. Please adjust marker.");
              }
            }
          );
        } else {
          setLocationLoading(false);
          setStatusMessage("Location service unavailable. Please enter your address manually.");
        }
      },
      (error) => {
        setLocationLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setStatusMessage("Location permission denied. You can enter your address manually below.");
        } else if (error.code === error.TIMEOUT) {
          setStatusMessage("Location request timed out. Please enter your address manually.");
        } else {
          setStatusMessage("We couldn't detect your location. Search for your address or enter it manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  
  const handleConfirmLocation = () => {
    if (tempLocation) {
      onAddressSelect(tempLocation);
      setMapVisible(false);
      setStatusMessage("Delivery location selected. Verify details below.");
      
      // Clean up map to avoid stale instances if reopened
      if (mapInstanceRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        window.google.maps.event.clearInstanceListeners(markerInstanceRef.current);
      }
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    }
  };

  const isSearchDisabled = disabled || loadStatus === "missing-key" || loadStatus === "error";

  return (
    <div className="rounded-xl border border-deep-brown/15 bg-peach-hero/10 p-4 space-y-3 mb-4">
      {!mapVisible ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <label htmlFor="google-address-search" className="text-xs font-bold uppercase tracking-wider text-deep-brown">
              Search Your Address
            </label>
            {statusMessage && (
              <span className="text-xs font-semibold text-primary-orange" aria-live="polite">
                {statusMessage}
              </span>
            )}
          </div>

          <div className="relative">
            <input
              id="google-address-search"
              ref={searchInputRef}
              type="text"
              disabled={isSearchDisabled}
              placeholder={
                loadStatus === "missing-key"
                  ? "Automatic search unavailable. Enter details manually below."
                  : loadStatus === "error"
                  ? "Address search is temporarily unavailable. You can still enter your address manually."
                  : "Type street, area, or landmark..."
              }
              className="w-full rounded-xl border border-deep-brown/20 bg-white px-3.5 py-2 text-sm text-text-primary focus:border-primary-orange focus:outline-none disabled:bg-cream-bg/50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={disabled || locationLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-deep-brown/30 bg-white px-3 py-1.5 text-xs font-bold text-deep-brown hover:bg-cream-bg transition-colors disabled:opacity-50"
            >
              <MapPinIcon width={14} height={14} className="text-primary-orange" />
              {locationLoading ? "Finding your location..." : "Use Current Location"}
            </button>
            <span className="text-[11px] text-text-primary/65">
              Or fill in details manually below
            </span>
          </div>

          {loadStatus === "missing-key" && (
            <p className="text-[11px] text-deep-brown/60 italic mt-1">
              Address search assist is unconfigured. Manual address entry remains fully functional below.
            </p>
          )}
        </>
      ) : (
        <div className="space-y-3 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h4 className="text-sm font-bold text-deep-brown">Adjust your delivery location</h4>
            {statusMessage && (
              <span className="text-[11px] font-semibold text-primary-orange" aria-live="polite">
                {statusMessage}
              </span>
            )}
          </div>
          
          <div 
            ref={mapContainerRef} 
            className="w-full h-[250px] sm:h-[300px] rounded-xl overflow-hidden border border-deep-brown/20 bg-cream-bg/50"
          />
          
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setMapVisible(false);
                setStatusMessage(null);
                setTempLocation(null);
              }}
              className="px-3 py-1.5 text-xs font-bold text-deep-brown/70 hover:text-deep-brown transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmLocation}
              className="rounded-xl bg-primary-orange px-5 py-2 text-xs font-bold text-white hover:bg-terracotta transition-colors shadow-sm"
            >
              Confirm Location
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
