import { useEffect, useState } from "react";
import { Check, Copy, Crown, Globe2, Link2, Search, Settings as SettingsIcon, Swords, Users, X } from "lucide-react";

import type { Difficulty, Faction } from "../core/types";
import type { OnlineLobbyState, OnlineOffer } from "../net/onlineSession";
import { Crest } from "./Heraldry";
import { useHasKeyboard } from "./inputMode";
import { ArmyPicker, ArenaPicker, MusterSection, type MusterChoice } from "./Muster";

export interface MatchConfig {
  mode: "ai" | "hotseat" | "online";
  difficulty: Difficulty;
  playerColor: Faction;
  clockMinutes: number | null;
}

interface MainMenuProps {
  onStart: (config: MatchConfig) => void;
  onOpenSettings: () => void;
  /** Armies and battleground — settled here, before the first move. */
  muster: MusterChoice;
  onMuster: (choice: MusterChoice) => void;
  online: OnlineLobbyState;
  onFindOnline: (offer: OnlineOffer) => void;
  onHostOnline: (offer: OnlineOffer) => string;
  onJoinOnline: (code: string, offer: OnlineOffer) => void;
  onCancelOnline: () => void;
  initialJoinCode?: string;
}

const DIFFICULTY_COPY: Record<Difficulty, string> = {
  easy: "Squire — plays fast and loose",
  medium: "Knight — thinks three moves deep",
  hard: "Warlord — full search, no mercy",
};

const CLOCKS: { label: string; value: number | null }[] = [
  { label: "None", value: null },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
];

export function MainMenu({
  onStart,
  onOpenSettings,
  muster,
  onMuster,
  online,
  onFindOnline,
  onHostOnline,
  onJoinOnline,
  onCancelOnline,
  initialJoinCode = "",
}: MainMenuProps) {
  const hasKeyboard = useHasKeyboard();
  const [tab, setTab] = useState<"ai" | "hotseat" | "online">(initialJoinCode ? "online" : "ai");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerColor, setPlayerColor] = useState<Faction>("w");
  const [clock, setClock] = useState<number | null>(null);
  const [joinCode, setJoinCode] = useState(initialJoinCode);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [onlineError, setOnlineError] = useState<string | null>(null);

  const waiting = online.phase !== "idle";
  const offer = (): OnlineOffer => ({
    army: playerColor === "w" ? muster.skins.w : muster.skins.b,
    arena: muster.arena,
    clockMinutes: clock,
  });

  useEffect(() => {
    setOnlineError(online.error);
  }, [online.error]);

  useEffect(() => {
    if (initialJoinCode) setJoinCode(initialJoinCode);
  }, [initialJoinCode]);

  const start = (): void =>
    onStart({
      mode: tab === "online" ? "ai" : tab,
      difficulty,
      playerColor,
      clockMinutes: clock,
    });

  const copyText = async (value: string, kind: "code" | "link"): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch (error) {
      console.warn("[ui] clipboard unavailable", error);
    }
  };

  const challengeLink = online.code
    ? `${window.location.origin}${window.location.pathname}?join=${online.code}`
    : "";

  return (
    <div className="mc-menu mc-modal-pad pointer-events-auto absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
      <div className="mc-unfurl mc-menu-hero mb-6 shrink-0 text-center">
        <p className="mc-display text-[0.68rem] tracking-[0.55em] text-[#c8ab74]">Anno Domini MCDXCII</p>
        <h1 className="mc-display mc-title-glow mt-2 text-5xl font-bold text-[#f4e3bd] sm:text-6xl">
          CHESS OF WARLORDS
        </h1>
        <div className="mc-rule mx-auto mt-3 w-64" />
        <p className="mt-3 text-sm italic text-[#c5b28d]">Three armies. One board. Take the field.</p>
      </div>

      <div className="mc-slate mc-goldleaf mc-rise flex w-full min-h-0 max-w-md flex-col p-5 sm:p-6">
        <div className="mb-5 grid shrink-0 grid-cols-3 gap-2">
          <button
            type="button"
            className="mc-chip flex items-center justify-center gap-1.5 px-1 py-3"
            data-active={tab === "ai"}
            disabled={waiting}
            onClick={() => setTab("ai")}
          >
            <Swords size={14} /> Computer
          </button>
          <button
            type="button"
            className="mc-chip flex items-center justify-center gap-1.5 px-1 py-3"
            data-active={tab === "hotseat"}
            disabled={waiting}
            onClick={() => setTab("hotseat")}
          >
            <Users size={14} /> 2 Players
          </button>
          <button
            type="button"
            className="mc-chip flex items-center justify-center gap-1.5 px-1 py-3"
            data-active={tab === "online"}
            onClick={() => setTab("online")}
          >
            <Globe2 size={14} /> Online
          </button>
        </div>

        <div className="mc-scroll -mr-2 min-h-0 flex-auto overflow-y-auto pr-2">
          {tab === "ai" ? (
            <div className="mc-fade space-y-5">
              <div>
                <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">Opponent</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as Difficulty[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      className="mc-chip py-2.5"
                      data-active={difficulty === level}
                      onClick={() => setDifficulty(level)}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs italic text-[#9c8b6c]">{DIFFICULTY_COPY[difficulty]}</p>
              </div>

              <div>
                <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">Your banner</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["w", "b"] as Faction[]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="mc-chip flex items-center justify-center gap-2 py-2.5"
                      data-active={playerColor === color}
                      onClick={() => setPlayerColor(color)}
                    >
                      <Crest faction={color} size={18} active={playerColor === color} />
                      {color === "w" ? "Ivory" : "Obsidian"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : tab === "hotseat" ? (
            <p className="mc-fade text-sm italic leading-relaxed text-[#b7a88a]">
              Two commanders, one board. The view holds its angle between turns —{" "}
              {hasKeyboard ? (
                <>
                  flip it whenever you like with <span className="mc-display text-[#e2c98f]">F</span>, or
                </>
              ) : (
                <>flip it whenever you like from the camera menu, or</>
              )}{" "}
              switch on the automatic swing in settings.
            </p>
          ) : (
            <div className="mc-fade space-y-5">
              {online.phase === "hosting" && online.code ? (
                <div className="space-y-3">
                  <p className="text-sm italic leading-relaxed text-[#b7a88a]">
                    Send this code — or the link — to the warlord you want across the board.
                  </p>
                  <p className="mc-display text-center text-4xl tracking-[0.28em] text-[#f4e3bd]">{online.code}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="mc-chip flex items-center justify-center gap-1.5 py-2.5"
                      onClick={() => void copyText(online.code ?? "", "code")}
                    >
                      {copied === "code" ? <Check size={14} /> : <Copy size={14} />}
                      {copied === "code" ? "Copied" : "Copy code"}
                    </button>
                    <button
                      type="button"
                      className="mc-chip flex items-center justify-center gap-1.5 py-2.5"
                      onClick={() => void copyText(challengeLink, "link")}
                    >
                      {copied === "link" ? <Check size={14} /> : <Link2 size={14} />}
                      {copied === "link" ? "Copied" : "Copy link"}
                    </button>
                  </div>
                  <p className="mc-pulse text-center text-xs italic text-[#9c8b6c]">Waiting for them to join…</p>
                </div>
              ) : online.phase === "seeking" || online.phase === "connecting" ? (
                <div className="space-y-3 py-2 text-center">
                  <p className="mc-display text-sm tracking-[0.24em] text-[#f2e2bd]">
                    {online.phase === "connecting" ? "A WARLORD STEPS FORWARD" : "SEARCHING THE FIELD"}
                  </p>
                  <p className="text-sm italic text-[#b7a88a]">
                    {online.phase === "connecting"
                      ? "Locking banners and taking sides…"
                      : "Looking for another commander who wants a fight."}
                  </p>
                </div>
              ) : online.phase === "joining" ? (
                <p className="mc-pulse text-center text-sm italic text-[#b7a88a]">Joining the challenge…</p>
              ) : (
                <>
                  <p className="text-sm italic leading-relaxed text-[#b7a88a]">
                    Face a stranger on the field, or send a code to someone you already want to fight.
                  </p>
                  <div>
                    <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">Your army</p>
                    <ArmyPicker
                      side={playerColor}
                      name={playerColor === "w" ? "Ivory banner" : "Obsidian banner"}
                      chosen={playerColor === "w" ? muster.skins.w : muster.skins.b}
                      onChoose={(skin) =>
                        onMuster({
                          ...muster,
                          skins: { ...muster.skins, [playerColor]: skin },
                        })
                      }
                    />
                    <p className="mt-2 text-xs italic text-[#9c8b6c]">
                      Colour is drawn when the match is made. The host&apos;s battleground and hourglass stand.
                    </p>
                  </div>
                  <div>
                    <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">If you host — battleground</p>
                    <ArenaPicker chosen={muster.arena} onChoose={(arena) => onMuster({ ...muster, arena })} />
                  </div>
                </>
              )}

              {onlineError ? <p className="text-center text-xs italic text-[#d27a6a]">{onlineError}</p> : null}
            </div>
          )}

          {tab === "online" && waiting ? null : (
            <div className="mt-5">
              <p className="mc-display mb-2 text-[0.62rem] tracking-[0.3em] text-[#a89268]">Hourglass</p>
              <div className="grid grid-cols-4 gap-2">
                {CLOCKS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    className="mc-chip py-2.5"
                    data-active={clock === option.value}
                    onClick={() => setClock(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "online" ? null : (
            <>
              <div className="mc-rule my-5" />
              <MusterSection choice={muster} onChange={onMuster} />
            </>
          )}
        </div>

        <div className="mc-panel-foot mc-actions mt-5 shrink-0">
          {tab === "online" ? (
            waiting ? (
              <button type="button" className="mc-btn flex items-center justify-center gap-2" onClick={onCancelOnline}>
                <X size={15} /> Withdraw
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="mc-btn mc-btn-primary flex items-center justify-center gap-2"
                  onClick={() => onFindOnline(offer())}
                >
                  <Search size={15} /> Find opponent
                </button>
                <button
                  type="button"
                  className="mc-btn flex items-center justify-center gap-2"
                  onClick={() => onHostOnline(offer())}
                >
                  <Crown size={15} /> Create challenge
                </button>
                <div className="flex gap-2">
                  <input
                    className="mc-chip mc-code-input min-w-0 flex-1 px-3 py-2.5 uppercase tracking-[0.2em] text-[#f2e2bd] outline-none"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onJoinOnline(joinCode, offer());
                    }}
                    placeholder="ENTER CODE"
                    spellCheck={false}
                    autoCapitalize="characters"
                    aria-label="Challenge code"
                  />
                  <button
                    type="button"
                    className="mc-btn shrink-0 px-3"
                    onClick={() => onJoinOnline(joinCode, offer())}
                    disabled={joinCode.trim().length < 4}
                  >
                    Join
                  </button>
                </div>
              </>
            )
          ) : (
            <button type="button" className="mc-btn mc-btn-primary flex items-center justify-center gap-2" onClick={start}>
              <Crown size={15} /> Take the field
            </button>
          )}

          <button
            type="button"
            className="mc-btn flex items-center justify-center gap-2"
            onClick={onOpenSettings}
            disabled={waiting}
          >
            <SettingsIcon size={14} /> Settings
          </button>
        </div>
      </div>

      <p className="mc-menu-hint mt-5 shrink-0 text-[0.68rem] tracking-[0.2em] text-[#7d6f57]">
        {hasKeyboard
          ? "DRAG TO ORBIT · SCROLL TO ZOOM · CLICK A FIGURE TO COMMAND IT"
          : "DRAG TO ORBIT · PINCH TO ZOOM · TAP A FIGURE TO COMMAND IT"}
      </p>
    </div>
  );
}
