import { useCallback, useEffect, useRef, useState } from "react";

import { allowHouseFallback, HOUSE_DURATION_MS, HOUSE_SKIP_AFTER_MS, readForceHouse, type AdKind } from "./config";
import { bootAdPlacement, configureAdSound, requestGoogleBreak } from "./googleAds";
import { classifyGoogleStatus, googleShowedAd, shouldPlayHouse, shouldProceed, type AdFill } from "./policy";
import type { AdSession } from "./AdBreakOverlay";

export interface AdResult {
  proceed: boolean;
  fill: AdFill;
}

interface UseAdBreakOptions {
  gameMuted: boolean;
  applyGameMute: (muted: boolean) => void;
}

export function useAdBreak({ gameMuted, applyGameMute }: UseAdBreakOptions): {
  session: AdSession | null;
  playing: boolean;
  play: (kind: AdKind) => Promise<AdResult>;
} {
  const [session, setSession] = useState<AdSession | null>(null);
  const inflight = useRef<Promise<AdResult> | null>(null);
  const gameMutedRef = useRef(gameMuted);
  const applyMuteRef = useRef(applyGameMute);
  gameMutedRef.current = gameMuted;
  applyMuteRef.current = applyGameMute;

  useEffect(() => {
    void bootAdPlacement({ sound: gameMuted ? "off" : "on" });
  }, [gameMuted]);

  useEffect(() => {
    configureAdSound(gameMuted ? "off" : "on");
  }, [gameMuted]);

  const playHouse = useCallback((kind: AdKind): Promise<AdFill> => {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (fill: AdFill): void => {
        if (settled) return;
        settled = true;
        window.clearTimeout(limit);
        resolve(fill);
      };
      const started = performance.now();
      const skipAfter = kind === "match-end" ? HOUSE_SKIP_AFTER_MS : null;
      const limit = window.setTimeout(() => finish("viewed"), HOUSE_DURATION_MS);
      setSession({
        kind,
        phase: "house",
        started,
        duration: HOUSE_DURATION_MS,
        skipAfter,
        onSkip: skipAfter === null ? null : () => finish("dismissed"),
      });
    });
  }, []);

  const play = useCallback(
    (kind: AdKind): Promise<AdResult> => {
      if (inflight.current) return inflight.current;

      const run = (async (): Promise<AdResult> => {
        const forceHouse = readForceHouse();
        const allowHouse = allowHouseFallback();
        applyMuteRef.current(true);

        try {
          if (!forceHouse) {
            setSession({
              kind,
              phase: "seeking",
              started: performance.now(),
              duration: HOUSE_DURATION_MS,
              skipAfter: null,
              onSkip: null,
            });
            const google = await requestGoogleBreak(kind, {
              onBeforeAd: () => setSession(null),
            });
            const fill = classifyGoogleStatus(google.status);
            if (googleShowedAd(google.status) || !shouldPlayHouse({ forceHouse, allowHouse, googleStatus: google.status })) {
              return { proceed: shouldProceed(kind, fill), fill };
            }
          }

          const fill = await playHouse(kind);
          return { proceed: shouldProceed(kind, fill), fill };
        } finally {
          setSession(null);
          applyMuteRef.current(gameMutedRef.current);
          inflight.current = null;
        }
      })();

      inflight.current = run;
      return run;
    },
    [playHouse],
  );

  return { session, playing: session !== null, play };
}
