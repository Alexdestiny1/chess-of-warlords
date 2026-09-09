/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADMOB_INTERSTITIAL?: string;
  readonly VITE_ADMOB_REWARDED?: string;
  readonly VITE_ADS_TEST?: string;
  readonly VITE_ADS_HOUSE?: string;
  readonly VITE_STRIPE_PAYMENT_LINK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
