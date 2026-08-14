export interface MappedAddressFields {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export type AddressComponentLike = {
  long_name: string;
  short_name: string;
  types: string[];
};

/**
 * Maps Google Geocoder/Places address components to MyPetMart form fields.
 * Strictly avoids overwriting recipientName or phone.
 * Uses 2-letter uppercase country code for backend compatibility.
 */
export function mapGoogleAddressComponents(
  components?: AddressComponentLike[],
  formattedAddress?: string,
  placeName?: string
): MappedAddressFields {
  if (!components || components.length === 0) {
    if (formattedAddress) {
      const parts = formattedAddress.split(",").map((s) => s.trim());
      return {
        line1: parts.slice(0, 2).join(", "),
      };
    }
    return {};
  }

  let streetNumber = "";
  let route = "";
  let subpremise = "";
  let premise = "";
  let sublocality1 = "";
  let sublocality2 = "";
  let locality = "";
  let adminArea2 = "";
  let adminArea1 = "";
  let postalCode = "";
  let countryCode = "IN";

  for (const component of components) {
    const types = component.types || [];
    if (types.includes("street_number")) {
      streetNumber = component.long_name;
    } else if (types.includes("route")) {
      route = component.long_name;
    } else if (types.includes("subpremise")) {
      subpremise = component.long_name;
    } else if (types.includes("premise") || types.includes("building")) {
      premise = component.long_name;
    } else if (types.includes("sublocality_level_1") || types.includes("sublocality")) {
      sublocality1 = component.long_name;
    } else if (types.includes("sublocality_level_2")) {
      sublocality2 = component.long_name;
    } else if (types.includes("locality")) {
      locality = component.long_name;
    } else if (types.includes("administrative_area_level_2")) {
      adminArea2 = component.long_name;
    } else if (types.includes("administrative_area_level_1")) {
      adminArea1 = component.long_name;
    } else if (types.includes("postal_code")) {
      postalCode = component.long_name;
    } else if (types.includes("country")) {
      countryCode = component.short_name.toUpperCase();
    }
  }

  // Construct Line 1
  const line1Parts: string[] = [];
  if (streetNumber && route) {
    line1Parts.push(`${streetNumber} ${route}`);
  } else if (route) {
    line1Parts.push(route);
  } else if (premise) {
    line1Parts.push(premise);
  } else if (sublocality1) {
    line1Parts.push(sublocality1);
  } else if (placeName && !formattedAddress?.startsWith(placeName)) {
    line1Parts.push(placeName);
  }

  if (sublocality1 && !line1Parts.includes(sublocality1) && (streetNumber || route || premise)) {
    line1Parts.push(sublocality1);
  }

  let line1 = line1Parts.join(", ").trim();

  // Fallback line1 from formattedAddress if empty
  if (!line1 && formattedAddress) {
    const parts = formattedAddress.split(",").map((s) => s.trim());
    line1 = parts.slice(0, 2).join(", ");
  }

  // Line 2: subpremise or sublocality2 if available and safe
  let line2: string | undefined;
  if (subpremise) {
    line2 = `Flat ${subpremise}`;
  } else if (sublocality2 && sublocality1 && sublocality2 !== sublocality1) {
    line2 = sublocality2;
  }

  // City: locality -> sublocality1 -> adminArea2
  const city = locality || sublocality1 || adminArea2 || "";

  // State: administrative_area_level_1
  const state = adminArea1 || "";

  const mapped: MappedAddressFields = {};
  if (line1) mapped.line1 = line1;
  if (line2) mapped.line2 = line2;
  if (city) mapped.city = city;
  if (state) mapped.state = state;
  if (postalCode) mapped.postalCode = postalCode;
  if (countryCode) mapped.country = countryCode.length === 2 ? countryCode : "IN";

  return mapped;
}
