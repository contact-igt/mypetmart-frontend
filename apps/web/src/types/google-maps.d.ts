/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: {
      maps?: {
        Map: new (mapDiv: Element, opts?: any) => any;
        Marker: new (opts?: any) => any;
        LatLng: new (lat: number, lng: number) => any;
        event: {
          addListener: (instance: any, eventName: string, handler: (e?: any) => void) => any;
          removeListener: (listener: any) => void;
          clearInstanceListeners: (instance: any) => void;
        };
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: any
          ) => {
            addListener: (event: string, handler: () => void) => any;
            getPlace: () => any;
          };
        };
        Geocoder?: new () => {
          geocode: (
            request: { location: { lat: number; lng: number } },
            callback: (results: any[] | null, status: string) => void
          ) => void;
        };
      };
    };
  }
}

export {};
