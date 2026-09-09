import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";

/**
 * Foreground / background for the native shell (and browser tabs).
 * The Android activity already holds the screen on while visible.
 */
export function useAppLifecycle(handlers: {
  onBackground: () => void;
  onForeground: () => void;
}): void {
  const { onBackground, onForeground } = handlers;

  useEffect(() => {
    const onVisibility = (): void => {
      if (document.hidden) onBackground();
      else onForeground();
    };
    document.addEventListener("visibilitychange", onVisibility);

    let removeCapacitor: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      const handle = App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) onForeground();
        else onBackground();
      });
      removeCapacitor = () => {
        void handle.then((listener) => listener.remove());
      };
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      removeCapacitor?.();
    };
  }, [onBackground, onForeground]);
}
