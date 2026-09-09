import { useEffect, useState } from "react";

import type { AdKind } from "./config";

export interface AdSession {
  kind: AdKind;
  phase: "seeking" | "house";
  started: number;
  duration: number;
  skipAfter: number | null;
  onSkip: (() => void) | null;
}

interface AdBreakOverlayProps {
  session: AdSession;
}

export function AdBreakOverlay({ session }: AdBreakOverlayProps) {
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (session.phase !== "house") return;
    const timer = window.setInterval(() => setNow(performance.now()), 80);
    return () => window.clearInterval(timer);
  }, [session.phase, session.started]);

  const elapsed = Math.max(0, now - session.started);
  const remainMs = Math.max(0, session.duration - elapsed);
  const remainSec = Math.max(1, Math.ceil(remainMs / 1000));
  const ratio = session.phase === "house" ? Math.min(1, elapsed / session.duration) : 0;
  const canSkip =
    session.phase === "house" && session.skipAfter !== null && elapsed >= session.skipAfter && session.onSkip;

  const title =
    session.kind === "undo"
      ? "Take back"
      : session.kind === "redo-point"
        ? "A banner for the field"
        : session.kind === "new-duel"
          ? "Returning to the hall"
          : "Leaving the field";
  const subtitle =
    session.phase === "seeking"
      ? "Unfurling a sponsored missive…"
      : session.kind === "undo"
        ? "Watch to the end — the last move will then be taken back."
        : session.kind === "redo-point"
          ? "Watch to the end — one take-back is added to today's purse."
          : session.kind === "new-duel"
            ? "When this missive ends you return to the Great Hall."
            : "When this missive ends you may leave the field.";

  return (
    <div
      className="mc-ad-break pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={title}
      data-testid="ad-break"
      data-ad-kind={session.kind}
      data-ad-phase={session.phase}
    >
      <div className="mc-ad-break-card mc-parchment mc-goldleaf">
        <p className="mc-display mc-ad-break-kicker">Advertisement</p>
        <h2 className="mc-display mc-ad-break-title">{title}</h2>
        <div className="mc-rule mx-auto mt-2 w-32 opacity-70" />
        <p className="mc-ad-break-copy">{subtitle}</p>

        <div className="mc-ad-break-slot" aria-hidden="true">
          <div className="mc-ad-break-slot-inner">
            <p className="mc-display text-[0.62rem] tracking-[0.38em] text-[#c8ab74]">CHESS OF WARLORDS</p>
            <p className="mt-2 text-sm italic text-[#e4d3ac]">Three armies. One board. Take the field.</p>
          </div>
        </div>

        {session.phase === "house" ? (
          <>
            <div className="mc-ad-break-meter">
              <div className="mc-ad-break-meter-fill" style={{ width: `${ratio * 100}%` }} />
            </div>
            <p className="mc-display mt-2 text-[0.55rem] tracking-[0.28em] text-[#7d6236]">
              {remainMs <= 0 ? "CLOSING" : `${remainSec}s REMAINING`}
            </p>
          </>
        ) : (
          <div className="mc-ad-break-seek" />
        )}

        {canSkip ? (
          <button type="button" className="mc-btn mt-4 w-full" onClick={() => session.onSkip?.()}>
            Skip
          </button>
        ) : null}
      </div>
    </div>
  );
}
