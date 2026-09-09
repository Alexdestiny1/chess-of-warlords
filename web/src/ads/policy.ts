import { isInterstitial, type AdKind } from "./config";

/** Statuses that mean Google did not put a creative on screen. */
const NO_FILL = new Set([
  "notReady",
  "timeout",
  "invalid",
  "error",
  "noAdPreloaded",
  "frequencyCapped",
  "ignored",
  "other",
]);

export type AdFill = "viewed" | "dismissed" | "noFill";

export function classifyGoogleStatus(status: string): AdFill {
  if (status === "viewed") return "viewed";
  if (status === "dismissed") return "dismissed";
  if (NO_FILL.has(status)) return "noFill";
  return "noFill";
}

export function googleShowedAd(status: string): boolean {
  return status === "viewed" || status === "dismissed";
}

export function shouldPlayHouse(options: {
  forceHouse: boolean;
  allowHouse: boolean;
  googleStatus: string | null;
}): boolean {
  if (options.forceHouse) return true;
  if (!options.allowHouse) return false;
  if (options.googleStatus === null) return true;
  return !googleShowedAd(options.googleStatus);
}

/**
 * Whether the gated action should run after the break.
 *
 * Match-end and new-duel are interstitials: skip, view or no-fill all let the
 * player leave. AI take-back is rewarded: a completed view (or a no-fill, so
 * the button never bricks) grants the undo. Hall banners that mint a take-back
 * point only pay out on a completed view.
 */
export function shouldProceed(kind: AdKind, fill: AdFill): boolean {
  if (isInterstitial(kind)) return true;
  if (kind === "redo-point") return fill === "viewed";
  return fill === "viewed" || fill === "noFill";
}
