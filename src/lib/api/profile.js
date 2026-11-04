import { tokenStorage } from "./auth";
import { apiRequest } from "./client";

/**
 * Profile of the logged-in user (filled in during onboarding)
 * See docs/onboarding-backend.md and src/types/user.d.ts for the contract.
 */
export const profileApi = {
  /**
   * @param {import("@/types/user").UpdateProfileRequest} payload
   * @returns {Promise<{ user: import("@/types/user").User }>}
   */
  update: async (payload) =>
    apiRequest("/api/v1/me/profile", {
      method: "PATCH",
      token: tokenStorage.getToken() || undefined,
      body: JSON.stringify(payload),
    }),

  /**
   * Confirm the email address with the token from the link in the email.
   * Works without being logged in, so the link also opens on another device.
   * @param {string} token
   * @returns {Promise<{ user?: import("@/types/user").User; message?: string }>}
   */
  verifyEmail: async (token) =>
    apiRequest("/api/v1/auth/verify-email", {
      method: "POST",
      token: tokenStorage.getToken() || undefined,
      // 401/400 here means the link is invalid or expired, not that the session ended
      skipAuthRedirect: true,
      body: JSON.stringify({ token }),
    }),

  /** Send the verification email again to the logged-in user */
  resendVerification: async () =>
    apiRequest("/api/v1/auth/resend-verification", {
      method: "POST",
      token: tokenStorage.getToken() || undefined,
    }),
};
