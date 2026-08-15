/**
 * Daily take-back purse for live opponents.
 *
 * Free players earn up to three points a day by watching a banner in the
 * Great Hall. A Merlin Pass raises the cap to five and lets them claim
 * without an ad. Points are spent one-for-one on the field and die at midnight.
 */

export const REDO_POINT_MAX_FREE = 3;
export const REDO_POINT_MAX_PASS = 5;
export const REDO_POINT_MAX = REDO_POINT_MAX_FREE;
export const REDO_POINTS_KEY = "kg.redo";

export function redoPointMax(pass: boolean): number {
  return pass ? REDO_POINT_MAX_PASS : REDO_POINT_MAX_FREE;
}

export interface RedoPointState {
  /** Local calendar day, `YYYY-MM-DD`. */
  day: string;
  /** Points claimed today, up to the day's cap. */
  earned: number;
  /** Unspent take-backs left today (never above `earned`). */
  remaining: number;
}

export function todayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clampCount(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, Math.floor(value)));
}

export function emptyState(now: Date = new Date()): RedoPointState {
  return { day: todayKey(now), earned: 0, remaining: 0 };
}

export function normalizeRedoState(
  raw: unknown,
  now: Date = new Date(),
  max: number = REDO_POINT_MAX_FREE,
): RedoPointState {
  const day = todayKey(now);
  if (!raw || typeof raw !== "object") return emptyState(now);
  const stored = raw as Partial<RedoPointState>;
  if (stored.day !== day) return emptyState(now);
  const earned = clampCount(stored.earned, max);
  const remaining = Math.min(earned, clampCount(stored.remaining, max));
  return { day, earned, remaining };
}

export function canEarnRedo(state: RedoPointState, max: number = REDO_POINT_MAX_FREE): boolean {
  return state.earned < max;
}

export function canSpendRedo(state: RedoPointState): boolean {
  return state.remaining > 0;
}

export function earnRedo(state: RedoPointState, max: number = REDO_POINT_MAX_FREE): RedoPointState | null {
  if (!canEarnRedo(state, max)) return null;
  return { ...state, earned: state.earned + 1, remaining: state.remaining + 1 };
}

export function spendRedo(state: RedoPointState): RedoPointState | null {
  if (!canSpendRedo(state)) return null;
  return { ...state, remaining: state.remaining - 1 };
}

export function loadRedoPoints(now: Date = new Date(), max: number = REDO_POINT_MAX_FREE): RedoPointState {
  if (typeof window === "undefined") return emptyState(now);
  try {
    const raw = window.localStorage.getItem(REDO_POINTS_KEY);
    return normalizeRedoState(raw ? JSON.parse(raw) : null, now, max);
  } catch {
    return emptyState(now);
  }
}

export function saveRedoPoints(state: RedoPointState): void {
  try {
    window.localStorage.setItem(REDO_POINTS_KEY, JSON.stringify(state));
  } catch {
    // Private browsing — the purse lasts only for this visit.
  }
}
