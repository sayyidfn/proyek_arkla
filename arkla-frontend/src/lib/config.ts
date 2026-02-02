/**
 * Application configuration
 * Centralized config to ensure consistency across the app
 */

// Production API URL - Hugging Face Spaces
const PRODUCTION_API_URL = "https://sayyidfn-arkla-backend.hf.space/api/v1";
const LOCAL_API_URL = "http://localhost:8000/api/v1";

/**
 * Get the API base URL
 * Priority: NEXT_PUBLIC_API_URL env var > production URL > local URL
 */
export const getApiBaseUrl = (): string => {
  // Check if we're in browser or server
  const isServer = typeof window === "undefined";

  // Get environment variable
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  // Debug log (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log("[Config] Environment:", {
      NEXT_PUBLIC_API_URL: envUrl,
      isServer,
      nodeEnv: process.env.NODE_ENV,
    });
  }

  // If env var is set, use it (with /api/v1 suffix if needed)
  if (envUrl) {
    const cleanUrl = envUrl.replace(/\/+$/, "");
    const finalUrl = cleanUrl.endsWith("/api/v1")
      ? cleanUrl
      : `${cleanUrl}/api/v1`;
    return finalUrl;
  }

  // In production (Vercel), use hardcoded production URL as fallback
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_API_URL;
  }

  // Default to local development
  return LOCAL_API_URL;
};

// Export the URL for use across the app
export const API_BASE_URL = getApiBaseUrl();

// Log the final URL being used (helpful for debugging)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("[Config] Using API URL:", API_BASE_URL);
}
