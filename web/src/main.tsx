import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { createRoot } from "react-dom/client";

import { bootNativeAdMob } from "./ads/nativeAdMob";
import App from "./App.tsx";
import "./index.css";

async function bootNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add("mc-native");
  void bootNativeAdMob();
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.hide();
  } catch {
    // Browser / missing plugin — the hall still loads.
  }
  try {
    await SplashScreen.hide({ fadeOutDuration: 400 });
  } catch {
    // ignore
  }
}

void bootNative();

createRoot(document.getElementById("root")!).render(<App />);
