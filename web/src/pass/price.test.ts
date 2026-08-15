import { describe, expect, it } from "vitest";

import { priceForRegion, regionFromLocale } from "./price";

describe("Merlin Pass price", () => {
  it("reads a region from a locale tag", () => {
    expect(regionFromLocale("en-GB")).toBe("GB");
    expect(regionFromLocale("fr-FR")).toBe("FR");
    expect(regionFromLocale("ja")).toBe("JP");
    expect(regionFromLocale("en", "Africa/Lagos")).toBe("NG");
  });

  it("falls back to US dollars", () => {
    expect(regionFromLocale("xx")).toBe("US");
    expect(priceForRegion("ZZ").currency).toBe("USD");
    expect(priceForRegion("US").amount).toBe(5);
  });

  it("formats a local equivalent of five dollars", () => {
    expect(priceForRegion("GB", "en-GB").currency).toBe("GBP");
    expect(priceForRegion("NG", "en-NG").currency).toBe("NGN");
    expect(priceForRegion("JP", "ja-JP").formatted).toMatch(/￥|¥|JPY/);
    expect(priceForRegion("FR", "fr-FR").formatted).toMatch(/€|EUR/);
  });
});
