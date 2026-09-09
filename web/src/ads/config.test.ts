import { describe, expect, it } from "vitest";

import { normalizeAdSenseClient } from "./config";

describe("AdSense client", () => {
  it("prefixes a bare pub- id", () => {
    expect(normalizeAdSenseClient("pub-3845995896948168")).toBe("ca-pub-3845995896948168");
  });

  it("keeps a ca-pub- id", () => {
    expect(normalizeAdSenseClient("ca-pub-3845995896948168")).toBe("ca-pub-3845995896948168");
  });

  it("falls back to the live publisher when empty", () => {
    expect(normalizeAdSenseClient(undefined)).toBe("ca-pub-3845995896948168");
    expect(normalizeAdSenseClient("  ")).toBe("ca-pub-3845995896948168");
  });
});
