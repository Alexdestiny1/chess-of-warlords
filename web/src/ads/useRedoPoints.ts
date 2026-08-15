import { useCallback, useEffect, useState } from "react";

import {
  canEarnRedo,
  canSpendRedo,
  earnRedo,
  loadRedoPoints,
  REDO_POINT_MAX_FREE,
  saveRedoPoints,
  spendRedo,
  type RedoPointState,
} from "./redoPoints";

export interface RedoPurse extends RedoPointState {
  max: number;
  canEarn: boolean;
  canSpend: boolean;
  tryEarn: () => boolean;
  trySpend: () => boolean;
  refresh: () => void;
}

export function useRedoPoints(max: number = REDO_POINT_MAX_FREE): RedoPurse {
  const [state, setState] = useState<RedoPointState>(() => loadRedoPoints(new Date(), max));

  const read = useCallback((): RedoPointState => loadRedoPoints(new Date(), max), [max]);

  useEffect(() => {
    setState(read());
  }, [read]);

  const tryEarn = useCallback((): boolean => {
    const next = earnRedo(read(), max);
    if (!next) return false;
    saveRedoPoints(next);
    setState(next);
    return true;
  }, [max, read]);

  const trySpend = useCallback((): boolean => {
    const next = spendRedo(read());
    if (!next) return false;
    saveRedoPoints(next);
    setState(next);
    return true;
  }, [read]);

  const refresh = useCallback(() => {
    setState(read());
  }, [read]);

  return {
    ...state,
    max,
    canEarn: canEarnRedo(state, max),
    canSpend: canSpendRedo(state),
    tryEarn,
    trySpend,
    refresh,
  };
}
