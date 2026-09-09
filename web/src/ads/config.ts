/**
 * Monetization knobs. A real AdSense publisher ID is what turns these breaks
 * into money; without one the game still plays the same flow (test ads, then a
 * house missive) so the gates can be checked on localhost. New Duel, match-end,
 * take-back and hall banners all go through this file.
 *
 * `?ads=house` skips the Google request and plays the house missive at once —
 * useful when the AdSense script is blocked or you only want to see the overlay.
 */

export type AdKind = "match-end" | "new-duel" | "undo" | "redo-point";

/** Skip-after-a-wait interstitials, as opposed to watch-to-the-end rewards. */
export function isInterstitial(kind: AdKind): boolean {
  return kind === "match-end" || kind === "new-duel";
}

/** Live AdSense publisher. `VITE_ADSENSE_CLIENT` can override this. */
const PUBLISHER_CLIENT = "ca-pub-3845995896948168";
/** Google's documented dummy client — never treated as a real publisher. */
const TEST_ADSENSE_CLIENT = "ca-pub-123456789";

export const HOUSE_DURATION_MS = 6_000;
/** Interstitials may be skipped after this; rewarded take-backs may not. */
export const HOUSE_SKIP_AFTER_MS = 4_000;
const GOOGLE_BREAK_TIMEOUT_MS = 10_000;

/** Accepts `ca-pub-…` or `pub-…`. Empty falls back to the live publisher. */
export function normalizeAdSenseClient(raw: string | undefined): string {
  const value = raw?.trim() ?? "";
  if (!value) return PUBLISHER_CLIENT;
  if (value.startsWith("ca-pub-")) return value;
  if (value.startsWith("pub-")) return `ca-${value}`;
  return value;
}

export function getAdSenseClient(): string {
  return normalizeAdSenseClient(import.meta.env.VITE_ADSENSE_CLIENT);
}

export function hasPublisherId(): boolean {
  const client = getAdSenseClient();
  return client.startsWith("ca-pub-") && client !== TEST_ADSENSE_CLIENT;
}

/**
 * Test creatives from Google. On in `npm run dev` so localhost does not generate
 * invalid traffic against a live publisher. Off in a production build. Force
 * with `VITE_ADS_TEST=1` / `0`.
 */
export function isAdTestMode(): boolean {
  const flag = import.meta.env.VITE_ADS_TEST;
  if (flag === "1") return true;
  if (flag === "0") return false;
  return import.meta.env.DEV || !hasPublisherId();
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

/** Google's documented AdMob test units — never bill a real account. */
const ADMOB_TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712";
const ADMOB_TEST_REWARDED = "ca-app-pub-3940256099942544/5224354917";

function isNativeShell(): boolean {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("mc-native")) {
    return true;
  }
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * AdMob interstitial unit for the Android/iOS shell.
 * The website uses AdSense H5 ads and does not need this.
 * Native test builds fall back to Google's sample unit until a real id is set.
 */
export function getAdMobInterstitialSlot(): string | undefined {
  const configured = import.meta.env.VITE_ADMOB_INTERSTITIAL?.trim();
  if (configured) return configured;
  if (isNativeShell()) return ADMOB_TEST_INTERSTITIAL;
  return undefined;
}

/** AdMob rewarded unit for take-backs and hall banners. */
export function getAdMobRewardedSlot(): string | undefined {
  const configured = import.meta.env.VITE_ADMOB_REWARDED?.trim();
  if (configured) return configured;
  if (isNativeShell()) return ADMOB_TEST_REWARDED;
  return undefined;
}

/** True when the native Google Mobile Ads SDK should own the break. */
export function useNativeAdMob(): boolean {
  return isNativeShell();
}
