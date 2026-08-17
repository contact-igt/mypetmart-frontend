/**
 * Validates and retrieves the API base URL lazily.
 * Ensures any trailing slashes are removed.
 */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) {
    throw new Error("Configuration Error: NEXT_PUBLIC_API_BASE_URL is not configured.");
  }
  return url.replace(/\/+$/, "");
}
