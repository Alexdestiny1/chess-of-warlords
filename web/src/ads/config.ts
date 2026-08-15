/**
 * Monetization knobs. A real AdSense publisher ID is what turns these breaks
 * into money; without one the game still plays the same flow (test ads, then a
 * house missive) so the gates can be checked on localhost.
 *
 * `?ads=house` skips the Google request and plays the house missive at once —
 * useful when the AdSense script is blocked or you only want to see the overlay.
 */

export type AdKind = "match-end" | "undo" | "redo-point";

/** Google's documented dummy client — only used while no publisher ID is set. */
const TEST_ADSENSE_CLIENT = "ca-pub-123456789";

export const HOUSE_DURATION_MS = 6_000;
/** Interstitials may be skipped after this; rewarded take-backs may not. */
export const HOUSE_SKIP_AFTER_MS = 4_000;
const GOOGLE_BREAK_TIMEOUT_MS = 10_000;

export function getAdSenseClient(): string {
  const configured = import.meta.env.VITE_ADSENSE_CLIENT?.trim();
  return configured && configured.length > 0 ? configured : TEST_ADSENSE_CLIENT;
}

export function hasPublisherId(): boolean {
  const configured = import.meta.env.VITE_ADSENSE_CLIENT?.trim();
  return Boolean(configured && configured.startsWith("ca-pub-") && configured !== TEST_ADSENSE_CLIENT);
}

/** Test creatives from Google — on unless a real publisher ID is set, or forced. */
export function isAdTestMode(): boolean {
  const flag = import.meta.env.VITE_ADS_TEST;
  if (flag === "1") return true;
  if (flag === "0") return false;
  return !hasPublisherId();
}

export function readForceHouse(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("ads") === "house";
  } catch {
    return false;
  }
}

/**
 * House missive when Google has nothing to show.
 * On in development, when no publisher ID is set, when `VITE_ADS_HOUSE=1`,
 * or when the URL asks for `?ads=house`. Off in a paid production build so a
 * frequency cap does not invent a second ad.
 */
export function allowHouseFallback(): boolean {
  if (readForceHouse()) return true;
  if (import.meta.env.VITE_ADS_HOUSE === "1") return true;
  if (import.meta.env.VITE_ADS_HOUSE === "0") return false;
  return import.meta.env.DEV || !hasPublisherId();
}

export function googleBreakTimeoutMs(): number {
  return GOOGLE_BREAK_TIMEOUT_MS;
}
