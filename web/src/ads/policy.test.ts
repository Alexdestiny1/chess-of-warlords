import { describe, expect, it } from "vitest";

import { classifyGoogleStatus, googleShowedAd, shouldPlayHouse, shouldProceed } from "./policy";

describe("ad policy", () => {
  it("treats viewed and dismissed as a shown Google ad", () => {
    expect(googleShowedAd("viewed")).toBe(true);
    expect(googleShowedAd("dismissed")).toBe(true);
    expect(googleShowedAd("noAdPreloaded")).toBe(false);
    expect(googleShowedAd("frequencyCapped")).toBe(false);
  });

  it("classifies known Google statuses", () => {
    expect(classifyGoogleStatus("viewed")).toBe("viewed");
    expect(classifyGoogleStatus("dismissed")).toBe("dismissed");
    expect(classifyGoogleStatus("timeout")).toBe("noFill");
    expect(classifyGoogleStatus("mystery")).toBe("noFill");
  });

  it("plays a house missive only when allowed and Google did not show", () => {
    expect(shouldPlayHouse({ forceHouse: true, allowHouse: false, googleStatus: "viewed" })).toBe(true);
    expect(shouldPlayHouse({ forceHouse: false, allowHouse: true, googleStatus: null })).toBe(true);
    expect(shouldPlayHouse({ forceHouse: false, allowHouse: true, googleStatus: "noAdPreloaded" })).toBe(true);
    expect(shouldPlayHouse({ forceHouse: false, allowHouse: true, googleStatus: "viewed" })).toBe(false);
    expect(shouldPlayHouse({ forceHouse: false, allowHouse: false, googleStatus: "noAdPreloaded" })).toBe(false);
  });

  it("always lets the player leave after a match-end break", () => {
    expect(shouldProceed("match-end", "viewed")).toBe(true);
    expect(shouldProceed("match-end", "dismissed")).toBe(true);
    expect(shouldProceed("match-end", "noFill")).toBe(true);
  });

  it("grants take-back only after a completed view or a no-fill", () => {
    expect(shouldProceed("undo", "viewed")).toBe(true);
    expect(shouldProceed("undo", "noFill")).toBe(true);
    expect(shouldProceed("undo", "dismissed")).toBe(false);
  });

  it("mints a hall take-back only after a completed view", () => {
    expect(shouldProceed("redo-point", "viewed")).toBe(true);
    expect(shouldProceed("redo-point", "dismissed")).toBe(false);
    expect(shouldProceed("redo-point", "noFill")).toBe(false);
  });
});
