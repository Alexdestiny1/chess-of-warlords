import { Capacitor } from "@capacitor/core";

/**
 * Where this build is running. The hall in `src/` is shared; store wrappers
 * live beside it (`android/`, `ios/`, `desktop/`) so a change can be scoped.
 *
 * - `web` — browser / Vercel
 * - `android` — Play Store / sideload APK
 * - `ios` — App Store (shell not added yet)
 * - `desktop` — Windows / Microsoft Store (shell not added yet)
 */
export type StoreTarget = "web" | "android" | "ios" | "desktop";

export function currentStore(): StoreTarget {
  const platform = Capacitor.getPlatform();
  if (platform === "android") return "android";
  if (platform === "ios") return "ios";
  if (platform === "electron") return "desktop";
  return "web";
}

export function isNativeStore(): boolean {
  const store = currentStore();
  return store === "android" || store === "ios" || store === "desktop";
}
