import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";

import { MERLIN_PASS_NAME, MERLIN_PASS_TAG } from "./merlinPass";
import type { LocalizedPrice } from "./price";

interface MerlinPassCardProps {
  active: boolean;
  price: LocalizedPrice;
  checkoutReady: boolean;
  onPurchase: () => void;
  onGrantDev?: () => void;
  onClearDev?: () => void;
}

export function MerlinPassCard({
  active,
  price,
  checkoutReady,
  onPurchase,
  onGrantDev,
  onClearDev,
}: MerlinPassCardProps) {
  if (active) {
    return (
      <div className="mc-pass-card" data-active="true">
        <p className="mc-display mc-pass-kicker">
          {MERLIN_PASS_NAME} · {MERLIN_PASS_TAG}
        </p>
        <p className="mt-1.5 text-xs italic text-[#c8ab74]">
          Banners stay down. Five take-backs a day, claimed in the Great Hall.
        </p>
        {onClearDev ? (
          <button type="button" className="mc-btn mt-3 flex w-full items-center justify-center gap-2" onClick={onClearDev}>
            Clear from this device (dev)
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mc-pass-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mc-display mc-pass-kicker">
            {MERLIN_PASS_NAME} · {MERLIN_PASS_TAG}
          </p>
          <p className="mt-1.5 text-xs italic leading-relaxed text-[#9c8b6c]">
            Silence every banner and claim up to five take-backs a day — no missive to watch.
          </p>
        </div>
        <p className="mc-display shrink-0 text-sm tracking-[0.08em] text-[#f4e3bd]">{price.formatted}</p>
      </div>
      <button
        type="button"
        className="mc-btn mc-btn-primary mt-3 flex w-full items-center justify-center gap-2"
        onClick={onPurchase}
        disabled={!checkoutReady}
      >
        <Sparkles size={14} />
        {checkoutReady ? `Buy ${MERLIN_PASS_NAME}` : "The pass is not on sale yet"}
      </button>
      {onGrantDev ? (
        <button type="button" className="mc-btn mt-2 flex w-full items-center justify-center gap-2" onClick={onGrantDev}>
          Grant on this device (dev)
        </button>
      ) : null}
    </div>
  );
}

/** Round hall mark. The panel only opens when the player asks for it. */
export function MerlinPassDock({
  active,
  price,
  checkoutReady,
  onPurchase,
  onGrantDev,
  onClearDev,
}: MerlinPassCardProps) {
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent): void => {
      if (!dockRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mc-pass-dock" ref={dockRef}>
      <button
        type="button"
        className="mc-pass-orb"
        data-active={active ? "true" : undefined}
        data-open={open ? "true" : undefined}
        aria-expanded={open}
        aria-label={active ? `${MERLIN_PASS_NAME}, ${MERLIN_PASS_TAG}` : `${MERLIN_PASS_NAME} (${MERLIN_PASS_TAG})`}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={16} /> : <Sparkles size={16} />}
      </button>
      {open ? (
        <div className="mc-pass-panel mc-slate mc-goldleaf" role="dialog" aria-label={MERLIN_PASS_NAME}>
          <MerlinPassCard
            active={active}
            price={price}
            checkoutReady={checkoutReady}
            onPurchase={onPurchase}
            onGrantDev={onGrantDev}
            onClearDev={onClearDev}
          />
        </div>
      ) : null}
    </div>
  );
}
