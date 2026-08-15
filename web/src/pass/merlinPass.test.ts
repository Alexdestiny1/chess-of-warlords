import { describe, expect, it } from "vitest";

import { emptyPass, isStripeSessionId, normalizePass } from "./merlinPass";

describe("Merlin Pass entitlement", () => {
  it("ignores a missing or empty record", () => {
    expect(normalizePass(null)).toEqual(emptyPass());
    expect(normalizePass({ active: false })).toEqual(emptyPass());
  });

  it("keeps a granted pass", () => {
    const granted = normalizePass({
      active: true,
      grantedAt: "2026-08-16T12:00:00.000Z",
      sessionId: "cs_test_abc",
      source: "stripe",
    });
    expect(granted.active).toBe(true);
    expect(granted.sessionId).toBe("cs_test_abc");
    expect(granted.source).toBe("stripe");
  });

  it("accepts only Stripe checkout session ids", () => {
    expect(isStripeSessionId("cs_test_a1b2c3")).toBe(true);
    expect(isStripeSessionId("cs_live_xyz789")).toBe(true);
    expect(isStripeSessionId("success")).toBe(false);
    expect(isStripeSessionId("cs_test_")).toBe(false);
  });
});
