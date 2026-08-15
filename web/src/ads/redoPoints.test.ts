import { describe, expect, it } from "vitest";

import {
  canEarnRedo,
  canSpendRedo,
  earnRedo,
  emptyState,
  normalizeRedoState,
  REDO_POINT_MAX_FREE,
  REDO_POINT_MAX_PASS,
  redoPointMax,
  spendRedo,
  todayKey,
} from "./redoPoints";

const noon = new Date(2026, 7, 16, 12, 0, 0);

describe("redo points", () => {
  it("starts empty on a new day", () => {
    expect(emptyState(noon)).toEqual({ day: "2026-08-16", earned: 0, remaining: 0 });
    expect(normalizeRedoState({ day: "2026-08-15", earned: 3, remaining: 2 }, noon)).toEqual({
      day: "2026-08-16",
      earned: 0,
      remaining: 0,
    });
  });

  it("keeps today's purse and clamps leftover remaining to earned", () => {
    expect(normalizeRedoState({ day: todayKey(noon), earned: 2, remaining: 9 }, noon)).toEqual({
      day: "2026-08-16",
      earned: 2,
      remaining: 2,
    });
  });

  it("earns up to three and refuses a fourth", () => {
    let state = emptyState(noon);
    for (let i = 0; i < REDO_POINT_MAX_FREE; i += 1) {
      expect(canEarnRedo(state, REDO_POINT_MAX_FREE)).toBe(true);
      const next = earnRedo(state, REDO_POINT_MAX_FREE);
      expect(next).not.toBeNull();
      state = next!;
    }
    expect(state).toEqual({ day: "2026-08-16", earned: 3, remaining: 3 });
    expect(canEarnRedo(state, REDO_POINT_MAX_FREE)).toBe(false);
    expect(earnRedo(state, REDO_POINT_MAX_FREE)).toBeNull();
  });

  it("lets a Merlin Pass claim two more after the free three", () => {
    expect(redoPointMax(true)).toBe(REDO_POINT_MAX_PASS);
    let state = { day: "2026-08-16", earned: 3, remaining: 3 };
    expect(canEarnRedo(state, REDO_POINT_MAX_PASS)).toBe(true);
    state = earnRedo(state, REDO_POINT_MAX_PASS)!;
    state = earnRedo(state, REDO_POINT_MAX_PASS)!;
    expect(state).toEqual({ day: "2026-08-16", earned: 5, remaining: 5 });
    expect(earnRedo(state, REDO_POINT_MAX_PASS)).toBeNull();
  });

  it("spends remaining one at a time without touching earned", () => {
    let state = { day: "2026-08-16", earned: 3, remaining: 2 };
    expect(canSpendRedo(state)).toBe(true);
    state = spendRedo(state)!;
    expect(state).toEqual({ day: "2026-08-16", earned: 3, remaining: 1 });
    state = spendRedo(state)!;
    expect(state.remaining).toBe(0);
    expect(canSpendRedo(state)).toBe(false);
    expect(spendRedo(state)).toBeNull();
  });
});
