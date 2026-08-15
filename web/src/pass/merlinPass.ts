/**
 * Merlin Pass — a one-time purchase that silences banners and raises the
 * daily take-back purse from three to five, claimed without watching an ad.
 *
 * Checkout is a Stripe Payment Link (five US dollars, Adaptive Pricing for
 * local currency). The return URL should be this site with
 * `?merlin=success&session_id={CHECKOUT_SESSION_ID}`. There is no backend
 * here, so the receipt is kept on the device.
 */

export const MERLIN_PASS_KEY = "kg.merlin.v2";
export const MERLIN_PASS_NAME = "Merlin Pass";
export const MERLIN_PASS_TAG = "No ads";

export interface MerlinPassState {
  active: boolean;
  grantedAt: string | null;
  sessionId: string | null;
  source: "stripe" | "dev" | null;
}

export function emptyPass(): MerlinPassState {
  return { active: false, grantedAt: null, sessionId: null, source: null };
}

export function normalizePass(raw: unknown): MerlinPassState {
  if (!raw || typeof raw !== "object") return emptyPass();
  const stored = raw as Partial<MerlinPassState>;
  if (stored.active !== true) return emptyPass();
  return {
    active: true,
    grantedAt: typeof stored.grantedAt === "string" ? stored.grantedAt : new Date().toISOString(),
    sessionId: typeof stored.sessionId === "string" ? stored.sessionId : null,
    source: stored.source === "stripe" || stored.source === "dev" ? stored.source : "stripe",
  };
}

export function loadMerlinPass(): MerlinPassState {
  if (typeof window === "undefined") return emptyPass();
  try {
    const raw = window.localStorage.getItem(MERLIN_PASS_KEY);
    return normalizePass(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyPass();
  }
}

export function saveMerlinPass(state: MerlinPassState): void {
  try {
    window.localStorage.setItem(MERLIN_PASS_KEY, JSON.stringify(state));
  } catch {
    // Private browsing — the pass lasts only for this visit.
  }
}

export function clearMerlinPass(): MerlinPassState {
  const next = emptyPass();
  saveMerlinPass(next);
  try {
    window.localStorage.removeItem("kg.merlin");
  } catch {
    // Same private-browsing case as save.
  }
  return next;
}

export function grantMerlinPass(source: "stripe" | "dev", sessionId: string | null = null): MerlinPassState {
  const next: MerlinPassState = {
    active: true,
    grantedAt: new Date().toISOString(),
    sessionId,
    source,
  };
  saveMerlinPass(next);
  return next;
}

export function stripePaymentLink(): string | null {
  const link = import.meta.env.VITE_STRIPE_PAYMENT_LINK?.trim();
  return link && link.startsWith("http") ? link : null;
}

export function isStripeSessionId(value: string): boolean {
  return /^cs_(test|live)_[A-Za-z0-9]+$/.test(value);
}

export type MerlinReturn = "granted" | "cleared" | null;

/**
 * Reads a checkout return, a local-dev grant, or a reset off the URL.
 */
export function consumeCheckoutReturn(search: string, allowDev: boolean): MerlinReturn {
  if (typeof window === "undefined") return null;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return null;
  }

  const flag = params.get("merlin");
  if (!flag) return null;

  if (flag === "reset" || flag === "off" || flag === "clear") {
    clearMerlinPass();
    stripMerlinQuery();
    return "cleared";
  }

  if (flag === "dev") {
    if (!allowDev) return null;
    grantMerlinPass("dev");
    stripMerlinQuery();
    return "granted";
  }

  if (flag !== "success") return null;
  const sessionId = params.get("session_id") ?? "";
  if (!isStripeSessionId(sessionId)) return null;
  if (loadMerlinPass().sessionId === sessionId) {
    stripMerlinQuery();
    return null;
  }
  grantMerlinPass("stripe", sessionId);
  stripMerlinQuery();
  return "granted";
}

function stripMerlinQuery(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("merlin");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Ignore a locked history stack.
  }
}

export function openMerlinCheckout(): boolean {
  const link = stripePaymentLink();
  if (!link) return false;
  window.location.assign(link);
  return true;
}
