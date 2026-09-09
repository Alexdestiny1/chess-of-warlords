import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Shared Capacitor config. Platform folders:
 *   android/  Play Store
 *   ios/      App Store (add with `npx cap add ios` on a Mac)
 *   desktop/  Microsoft Store — not Capacitor; see desktop/README.md
 * Game code is always `src/` + `webDir: dist`.
 */
const config: CapacitorConfig = {
  appId: "com.chessofwarlords.app",
  appName: "Chess of Warlords",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: "#05060a",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#05060a",
    },
  },
};

export default config;
