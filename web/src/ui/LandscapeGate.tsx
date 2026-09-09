import { Smartphone } from "lucide-react";

import { requestLandscapeLock } from "./useLandscape";

/**
 * The board is a wide hall. On a phone held upright the files vanish behind
 * the colonnade, so the gate waits for the wide view instead of squeezing.
 */
export function LandscapeGate() {
  return (
    <div className="mc-landscape-gate" role="dialog" aria-modal="true" aria-label="Turn the hall">
      <button type="button" className="mc-landscape-card mc-slate mc-goldleaf" onClick={() => void requestLandscapeLock()}>
        <span className="mc-landscape-phone" aria-hidden="true">
          <Smartphone size={36} />
        </span>
        <p className="mc-display text-[0.62rem] tracking-[0.4em] text-[#c8ab74]">TURN THE HALL</p>
        <h2 className="mc-display mt-2 text-2xl font-bold tracking-[0.12em] text-[#f2e2bd]">LANDSCAPE</h2>
        <div className="mc-rule mx-auto mt-2 w-28 opacity-70" />
        <p className="mt-3 text-sm italic leading-relaxed text-[#b7a88a]">
          Hold the phone on its side. The board needs the wide view.
        </p>
      </button>
    </div>
  );
}
