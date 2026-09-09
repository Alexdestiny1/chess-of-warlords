import { Capacitor } from "@capacitor/core";
import { AdMob } from "@capacitor-community/admob";

import { getAdMobInterstitialSlot, getAdMobRewardedSlot, isAdTestMode, isInterstitial, type AdKind } from "./config";

let started: Promise<void> | null = null;

export function nativeAdMobReady(): boolean {
  return Capacitor.isNativePlatform();
}

/** Starts the Google Mobile Ads SDK. Safe to call more than once. */
export function bootNativeAdMob(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  if (!started) {
    started = AdMob.initialize({
      initializeForTesting: isAdTestMode(),
    }).catch((error) => {
      console.warn("[ads] AdMob SDK failed to start", error);
      started = null;
    });
  }
  return started ?? Promise.resolve();
}

/**
 * Loads and shows a native AdMob interstitial or rewarded video.
 * Never rejects — same status strings as the H5 placement API.
 */
export async function requestNativeBreak(kind: AdKind): Promise<{ status: string }> {
  await bootNativeAdMob();
  const testing = isAdTestMode();
  const rewarded = !isInterstitial(kind);
  const adId = rewarded ? getAdMobRewardedSlot() : getAdMobInterstitialSlot();
  if (!adId) return { status: "notReady" };

  try {
    if (rewarded) {
      await AdMob.prepareRewardVideoAd({ adId, isTesting: testing, immersiveMode: true });
      await AdMob.showRewardVideoAd();
      return { status: "viewed" };
    }
    await AdMob.prepareInterstitial({ adId, isTesting: testing, immersiveMode: true });
    await AdMob.showInterstitial();
    return { status: "viewed" };
  } catch (error) {
    console.warn("[ads] AdMob break failed", kind, error);
    return { status: "noAdPreloaded" };
  }
}
