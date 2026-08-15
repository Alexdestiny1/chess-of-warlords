import { getAdSenseClient, googleBreakTimeoutMs, isAdTestMode, type AdKind } from "./config";

export interface AdConfigOptions {
  sound?: "on" | "off";
  preloadAdBreaks?: "on" | "off";
}

export interface AdBreakPlacement {
  type: "preroll" | "start" | "pause" | "next" | "browse" | "reward";
  name?: string;
  beforeAd?: () => void;
  afterAd?: () => void;
  beforeReward?: (showAdFn: () => void) => void;
  adDismissed?: () => void;
  adViewed?: () => void;
  adBreakDone?: (info: { breakStatus: string }) => void;
}

declare global {
  interface Window {
    adsbygoogle?: object[];
    adBreak?: (placement: AdBreakPlacement) => void;
    adConfig?: (options: AdConfigOptions) => void;
  }
}

let boot: Promise<void> | null = null;

function installStubs(): void {
  window.adsbygoogle = window.adsbygoogle ?? [];
  const push = (options: AdBreakPlacement | AdConfigOptions): void => {
    window.adsbygoogle?.push(options);
  };
  window.adBreak = push;
  window.adConfig = push;
}

function loadScript(): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById("mc-adsense")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "mc-adsense";
    script.async = true;
    script.crossOrigin = "anonymous";
    const client = getAdSenseClient();
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    script.setAttribute("data-ad-client", client);
    script.setAttribute("data-ad-frequency-hint", "30s");
    if (isAdTestMode()) script.setAttribute("data-adbreak-test", "on");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => resolve(), { once: true });
    document.head.appendChild(script);
  });
}

/** Loads the Ad Placement API once and asks it to preload breaks. */
export function bootAdPlacement(options: { sound: "on" | "off" }): Promise<void> {
  if (!boot) {
    boot = (async () => {
      installStubs();
      await loadScript();
      window.adConfig?.({ preloadAdBreaks: "on", sound: options.sound });
    })();
  }
  return boot;
}

export function configureAdSound(sound: "on" | "off"): void {
  window.adConfig?.({ sound });
}

/**
 * Asks Google for one break. Resolves with the placement status — including
 * `notReady` when the script never arrived — and never rejects.
 */
export async function requestGoogleBreak(
  kind: AdKind,
  hooks: { onBeforeAd?: () => void } = {},
): Promise<{ status: string }> {
  await bootAdPlacement({ sound: "on" });
  const adBreak = window.adBreak;
  if (!adBreak) return { status: "notReady" };

  return new Promise((resolve) => {
    let settled = false;
    const finish = (status: string): void => {
      if (settled) return;
      settled = true;
      resolve({ status });
    };
    const timer = window.setTimeout(() => finish("timeout"), googleBreakTimeoutMs());

    const rewarded = kind === "undo" || kind === "redo-point";
    const placement: AdBreakPlacement = {
      type: rewarded ? "reward" : "next",
      name: kind === "undo" ? "undo-move" : kind === "redo-point" ? "earn-redo" : "match-end",
      beforeAd: () => hooks.onBeforeAd?.(),
      adBreakDone: (info) => {
        window.clearTimeout(timer);
        finish(info.breakStatus);
      },
    };
    if (rewarded) {
      placement.beforeReward = (showAdFn) => showAdFn();
    }
    try {
      adBreak(placement);
    } catch (error) {
      console.warn("[ads] adBreak threw", error);
      window.clearTimeout(timer);
      finish("error");
    }
  });
}
