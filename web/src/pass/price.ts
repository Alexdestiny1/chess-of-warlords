/**
 * Display price for the Merlin Pass.
 *
 * The pass is priced at five US dollars. The figure on the button is that
 * amount in the player's own currency so a buyer in Lagos or Tokyo sees naira
 * or yen, not a dollar sign. Stripe Adaptive Pricing (or the Payment Link)
 * is what actually charges them; this table is the label only.
 */

export const MERLIN_PASS_USD = 5;

export interface LocalizedPrice {
  currency: string;
  amount: number;
  locale: string;
  region: string;
  formatted: string;
}

/** Local amount that equals about five US dollars. */
const BY_REGION: Record<string, { currency: string; amount: number }> = {
  US: { currency: "USD", amount: 5 },
  PR: { currency: "USD", amount: 5 },
  GU: { currency: "USD", amount: 5 },
  CA: { currency: "CAD", amount: 6.85 },
  MX: { currency: "MXN", amount: 90 },
  BR: { currency: "BRL", amount: 27 },
  AR: { currency: "ARS", amount: 5500 },
  CL: { currency: "CLP", amount: 4700 },
  CO: { currency: "COP", amount: 20000 },
  PE: { currency: "PEN", amount: 19 },
  GB: { currency: "GBP", amount: 3.9 },
  IE: { currency: "EUR", amount: 4.6 },
  FR: { currency: "EUR", amount: 4.6 },
  DE: { currency: "EUR", amount: 4.6 },
  ES: { currency: "EUR", amount: 4.6 },
  IT: { currency: "EUR", amount: 4.6 },
  NL: { currency: "EUR", amount: 4.6 },
  BE: { currency: "EUR", amount: 4.6 },
  PT: { currency: "EUR", amount: 4.6 },
  AT: { currency: "EUR", amount: 4.6 },
  FI: { currency: "EUR", amount: 4.6 },
  GR: { currency: "EUR", amount: 4.6 },
  LU: { currency: "EUR", amount: 4.6 },
  SK: { currency: "EUR", amount: 4.6 },
  SI: { currency: "EUR", amount: 4.6 },
  EE: { currency: "EUR", amount: 4.6 },
  LV: { currency: "EUR", amount: 4.6 },
  LT: { currency: "EUR", amount: 4.6 },
  CY: { currency: "EUR", amount: 4.6 },
  MT: { currency: "EUR", amount: 4.6 },
  HR: { currency: "EUR", amount: 4.6 },
  CH: { currency: "CHF", amount: 4.4 },
  SE: { currency: "SEK", amount: 52 },
  NO: { currency: "NOK", amount: 54 },
  DK: { currency: "DKK", amount: 34 },
  PL: { currency: "PLN", amount: 20 },
  CZ: { currency: "CZK", amount: 115 },
  HU: { currency: "HUF", amount: 1800 },
  RO: { currency: "RON", amount: 23 },
  BG: { currency: "BGN", amount: 9 },
  TR: { currency: "TRY", amount: 170 },
  UA: { currency: "UAH", amount: 205 },
  NG: { currency: "NGN", amount: 7500 },
  GH: { currency: "GHS", amount: 75 },
  KE: { currency: "KES", amount: 650 },
  ZA: { currency: "ZAR", amount: 90 },
  EG: { currency: "EGP", amount: 245 },
  AE: { currency: "AED", amount: 18.4 },
  SA: { currency: "SAR", amount: 18.75 },
  IL: { currency: "ILS", amount: 18.5 },
  IN: { currency: "INR", amount: 420 },
  PK: { currency: "PKR", amount: 1400 },
  BD: { currency: "BDT", amount: 600 },
  PH: { currency: "PHP", amount: 280 },
  TH: { currency: "THB", amount: 170 },
  ID: { currency: "IDR", amount: 80000 },
  MY: { currency: "MYR", amount: 22 },
  SG: { currency: "SGD", amount: 6.7 },
  VN: { currency: "VND", amount: 125000 },
  JP: { currency: "JPY", amount: 750 },
  KR: { currency: "KRW", amount: 6800 },
  CN: { currency: "CNY", amount: 36 },
  HK: { currency: "HKD", amount: 39 },
  TW: { currency: "TWD", amount: 160 },
  AU: { currency: "AUD", amount: 7.6 },
  NZ: { currency: "NZD", amount: 8.3 },
};

const BY_LANGUAGE: Record<string, string> = {
  en: "US",
  fr: "FR",
  de: "DE",
  es: "ES",
  it: "IT",
  pt: "BR",
  nl: "NL",
  sv: "SE",
  no: "NO",
  nb: "NO",
  da: "DK",
  pl: "PL",
  cs: "CZ",
  hu: "HU",
  ro: "RO",
  tr: "TR",
  uk: "UA",
  ar: "SA",
  he: "IL",
  hi: "IN",
  bn: "BD",
  ur: "PK",
  ja: "JP",
  ko: "KR",
  zh: "CN",
  th: "TH",
  id: "ID",
  ms: "MY",
  vi: "VN",
  fil: "PH",
  sw: "KE",
};

const BY_TIMEZONE: Record<string, string> = {
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Mexico_City": "MX",
  "America/Sao_Paulo": "BR",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Santiago": "CL",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Paris": "FR",
  "Europe/Berlin": "DE",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Zurich": "CH",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Copenhagen": "DK",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO",
  "Europe/Istanbul": "TR",
  "Europe/Kyiv": "UA",
  "Africa/Lagos": "NG",
  "Africa/Accra": "GH",
  "Africa/Nairobi": "KE",
  "Africa/Johannesburg": "ZA",
  "Africa/Cairo": "EG",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Jerusalem": "IL",
  "Asia/Kolkata": "IN",
  "Asia/Karachi": "PK",
  "Asia/Dhaka": "BD",
  "Asia/Manila": "PH",
  "Asia/Bangkok": "TH",
  "Asia/Jakarta": "ID",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Singapore": "SG",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Taipei": "TW",
  "Australia/Sydney": "AU",
  "Pacific/Auckland": "NZ",
};

export function regionFromLocale(locale: string, timeZone?: string): string {
  const tag = locale.trim().replace("_", "-");
  const parts = tag.split("-");
  const region = parts.find((part) => part.length === 2 && part === part.toUpperCase());
  if (region && BY_REGION[region]) return region;
  if (timeZone && BY_TIMEZONE[timeZone]) return BY_TIMEZONE[timeZone];
  const language = (parts[0] ?? "en").toLowerCase();
  if (BY_LANGUAGE[language] && BY_REGION[BY_LANGUAGE[language]]) return BY_LANGUAGE[language];
  return "US";
}

export function detectRegion(): string {
  const locale = typeof navigator === "undefined" ? "en-US" : navigator.language || "en-US";
  let timeZone: string | undefined;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    timeZone = undefined;
  }
  return regionFromLocale(locale, timeZone);
}

export function priceForRegion(region: string, locale = "en"): LocalizedPrice {
  const entry = BY_REGION[region] ?? BY_REGION.US;
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: entry.currency,
  }).format(entry.amount);
  return { currency: entry.currency, amount: entry.amount, locale, region, formatted };
}

export function localizeMerlinPrice(): LocalizedPrice {
  const locale = typeof navigator === "undefined" ? "en-US" : navigator.language || "en-US";
  return priceForRegion(detectRegion(), locale);
}
