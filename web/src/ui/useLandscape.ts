import { useEffect, useSyncExternalStore } from "react";

/**
 * A hand-held screen held upright. Desktops and laptops stay out of this —
 * they already have the wide view, and a window that happens to be tall
 * should not be blocked.
 */
const HANDHELD = "(pointer: coarse) and (hover: none)";
const PORTRAIT = "(orientation: portrait)";

let handheldQuery: MediaQueryList | null = null;
let portraitQuery: MediaQueryList | null = null;
const listeners = new Set<() => void>();

function announce(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined" && typeof window.matchMedia === "function") {
    handheldQuery = window.matchMedia(HANDHELD);
    portraitQuery = window.matchMedia(PORTRAIT);
    handheldQuery.addEventListener("change", announce);
    portraitQuery.addEventListener("change", announce);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      handheldQuery?.removeEventListener("change", announce);
      portraitQuery?.removeEventListener("change", announce);
      handheldQuery = null;
      portraitQuery = null;
    }
  };
}

function readNeedsLandscape(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(HANDHELD).matches && window.matchMedia(PORTRAIT).matches;
}

function readHandheld(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(HANDHELD).matches;
}

/** True when a phone or tablet is held upright and the hall should wait. */
export function useNeedsLandscape(): boolean {
  return useSyncExternalStore(subscribe, readNeedsLandscape, () => false);
}

/** Phone or tablet — coarse pointer, no hover. Native Android counts. */
export function useHandheld(): boolean {
  return useSyncExternalStore(subscribe, readHandheld, () => false);
}

/**
 * Ask the browser for a landscape lock. Regular tabs often refuse; standalone
 * and fullscreen sessions are the ones that honour it. Safe to call often.
 */
export async function requestLandscapeLock(): Promise<void> {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (type: string) => Promise<void>;
  };
  if (!orientation?.lock) return;
  try {
    await orientation.lock("landscape");
  } catch {
    // Not allowed in this document — the rotate gate covers the rest.
  }
}

/** Tries the lock after a tap, when browsers are most willing. */
export function useLandscapeLock(): void {
  useEffect(() => {
    void requestLandscapeLock();
    const onGesture = (): void => {
      void requestLandscapeLock();
    };
    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("orientationchange", onGesture);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("orientationchange", onGesture);
    };
  }, []);
}
