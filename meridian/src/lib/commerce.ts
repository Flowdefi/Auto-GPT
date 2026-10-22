/** Public pricing and cookie names. Safe to import from client components. */

export const LIFETIME_PRICE_USD = 275;
export const LIFETIME_PRICE_CENTS = 27_500;
export const LIFETIME_LABEL = "Lifetime seat";
export const SESSION_COOKIE = "meridian_session";
export const SESSION_HOURS = 12;
export const PASSWORD_MIN = 12;
export const API_KEY_PREFIX = "mk_live_";
export const LICENSE_KEY_PREFIX = "mdl_";

export const PUBLIC_API_PATHS = [
  "/api/health",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/billing/webhook",
  "/api/email/track/open",
  "/api/email/track/click",
  "/api/email/unsubscribe",
  "/api/forms/submit",
  "/api/forms/embed.js",
] as const;
