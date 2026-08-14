export type GoogleMapsLoadStatus = "idle" | "loading" | "ready" | "error" | "missing-key";

let scriptPromise: Promise<void> | null = null;

export function getGoogleMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
}

/**
 * Singleton Google Maps JavaScript API loader.
 * Loads the Google Maps script dynamically with the Places library.
 * Safe for React/Next.js SSR and client hydration.
 */
export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps loader must be run in browser environment."));
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.reject(new Error("MISSING_API_KEY"));
  }

  // Already loaded in window
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    // Check if script element already exists
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );

    if (existingScript) {
      if (window.google?.maps?.places) {
        resolve();
        return;
      }
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("SCRIPT_LOAD_ERROR")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("SCRIPT_LOAD_ERROR"));
    };

    document.head.appendChild(script);
  });

  return scriptPromise;
}
