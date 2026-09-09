import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { ARMY_SKINS, DEFAULT_ARMY_SKINS, type ArmySkinId } from "../assets/generated";
import { audio } from "../audio/audioManager";
import {
  DEFAULT_PREMOVE_DEPTH,
  DEFAULT_THINK_FLOOR_MS,
  GameController,
  PREMOVE_DEPTH_CHOICES,
  THINK_FLOOR_CHOICES,
} from "../core/gameController";
import type { Faction, PieceKind } from "../core/types";
import {
  OnlineSession,
  type OnlineLobbyState,
  type OnlineMatch,
  type OnlineOffer,
} from "../net/onlineSession";
import { Clapperboard } from "lucide-react";
import { ARENA_LOOKS, DEFAULT_ARENA } from "../scene/arena";
import { detectQualityPreset, type QualityPreset } from "../scene/quality";
import { SceneEngine, type CameraPreset, type ShowcaseCamera } from "../scene/sceneEngine";
import { AdBreakOverlay } from "../ads/AdBreakOverlay";
import { redoPointMax } from "../ads/redoPoints";
import { useAdBreak } from "../ads/useAdBreak";
import { useRedoPoints } from "../ads/useRedoPoints";
import { useMerlinPass } from "../pass/useMerlinPass";
import { GameOverModal } from "./GameOverModal";
import { Hud } from "./Hud";
import { LandscapeGate } from "./LandscapeGate";
import { useHasKeyboard } from "./inputMode";
import { useAppLifecycle } from "./useAppLifecycle";
import { useLandscapeLock, useNeedsLandscape } from "./useLandscape";
import { MainMenu, type MatchConfig } from "./MainMenu";
import type { MusterChoice } from "./Muster";
import { SettingsPanel, type GameSettings } from "./SettingsPanel";
import { useGameSnapshot } from "./useGameSnapshot";
import "./medieval.css";

type Phase = "loading" | "menu" | "playing";

const JOIN_QUERY = "join";
/**
 * How long a finished showcase is left alone before the verdict card rises.
 * The end cinematic dollies onto the fallen king for ~2.4s — in a duel that is
 * being watched (or recorded) that shot is the point, so the card waits for it
 * instead of landing on top of it.
 */
const SHOWCASE_VERDICT_DELAY_MS = 2200;
const RENDER_PREFS_KEY = "kg.render";
const ARMY_PREFS_KEY = "kg.armies";
const TABLE_PREFS_KEY = "kg.table";
const PREMOVE_PREFS_KEY = "kg.premove";
const PREMOVE_DEPTH_KEY = "kg.premovedepth";
const THINK_PREFS_KEY = "kg.think";

interface RenderPrefs {
  safeMode: boolean;
  brightness: number;
}

/** The armies chosen last visit — a skin is a taste, not a session setting. */
function loadArmyPrefs(): Record<Faction, ArmySkinId> {
  const fallback: Record<Faction, ArmySkinId> = { ...DEFAULT_ARMY_SKINS };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(ARMY_PREFS_KEY);
    if (!raw) return fallback;
    const stored = JSON.parse(raw) as Partial<Record<Faction, string>>;
    const pick = (value: string | undefined, side: Faction): ArmySkinId =>
      value && value in ARMY_SKINS ? (value as ArmySkinId) : fallback[side];
    return { w: pick(stored.w, "w"), b: pick(stored.b, "b") };
  } catch {
    return fallback;
  }
}

function saveArmyPrefs(skins: Record<Faction, ArmySkinId>): void {
  try {
    window.localStorage.setItem(ARMY_PREFS_KEY, JSON.stringify(skins));
  } catch {
    // Private browsing — the choice just will not survive the reload.
  }
}

/**
 * Whether a hotseat turn swings the camera round to the other side.
 *
 * Off by default, and remembered: a half turn of the whole hall between every
 * single ply is the most motion in the game, and on a shared screen it fires
 * twice a minute. Two players sitting side by side at one screen do not need the
 * board re-oriented — they need to keep their bearings. The swing stays one tap
 * away in settings, and the manual flip (`F`) is unaffected.
 */
function loadSeatSwing(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TABLE_PREFS_KEY) === "swing";
  } catch {
    return false;
  }
}

function saveSeatSwing(enabled: boolean): void {
  try {
    window.localStorage.setItem(TABLE_PREFS_KEY, enabled ? "swing" : "hold");
  } catch {
    // Private browsing — the choice just will not survive the reload.
  }
}

/**
 * Whether a move can be queued while the machine is still on the clock.
 *
 * On by default: the wait it fills is real (measured at ~0.7s per ply on
 * medium and ~3.1s on hard, before the move animation on top), and the queue
 * is invisible until the player actually aims something.
 */
function loadPremoves(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PREMOVE_PREFS_KEY) !== "off";
  } catch {
    return true;
  }
}

function savePremoves(enabled: boolean): void {
  try {
    window.localStorage.setItem(PREMOVE_PREFS_KEY, enabled ? "queue" : "off");
  } catch {
    // Private browsing — the choice just will not survive the reload.
  }
}

/**
 * How many moves may be stacked in the queue at once.
 *
 * A taste, not a session setting: a bullet player who stacks five wants five
 * every visit. Anything outside the offered depths is ignored rather than
 * clamped — a stored value that is not one of the choices is a stale key, not a
 * preference.
 */
function loadPremoveDepth(): number {
  if (typeof window === "undefined") return DEFAULT_PREMOVE_DEPTH;
  try {
    const value = Number(window.localStorage.getItem(PREMOVE_DEPTH_KEY));
    return PREMOVE_DEPTH_CHOICES.includes(value as (typeof PREMOVE_DEPTH_CHOICES)[number])
      ? value
      : DEFAULT_PREMOVE_DEPTH;
  } catch {
    return DEFAULT_PREMOVE_DEPTH;
  }
}

function savePremoveDepth(depth: number): void {
  try {
    window.localStorage.setItem(PREMOVE_DEPTH_KEY, String(depth));
  } catch {
    // Private browsing — the choice just will not survive the reload.
  }
}

/**
 * How long the computer is held before it answers, in ms.
 *
 * Remembered because it is a pacing taste, not a session setting: a player who
 * wants the machine to take its time (to think, or to aim a queued move in)
 * wants that on every visit, not once.
 */
function loadThinkFloor(): number {
  if (typeof window === "undefined") return DEFAULT_THINK_FLOOR_MS;
  try {
    const raw = window.localStorage.getItem(THINK_PREFS_KEY);
    if (raw === null) return DEFAULT_THINK_FLOOR_MS;
    const value = Number(raw);
    return THINK_FLOOR_CHOICES.includes(value as (typeof THINK_FLOOR_CHOICES)[number])
      ? value
      : DEFAULT_THINK_FLOOR_MS;
  } catch {
    return DEFAULT_THINK_FLOOR_MS;
  }
}

function saveThinkFloor(ms: number): void {
  try {
    window.localStorage.setItem(THINK_PREFS_KEY, String(ms));
  } catch {
    // Private browsing — the choice just will not survive the reload.
  }
}

/**
 * Safe rendering and brightness are remembered across visits, and `?safe=1`
 * forces them on — a player whose driver blacks the hall out must not have to
 * find the toggle again on every reload.
 */
function loadRenderPrefs(): RenderPrefs {
  const fallback: RenderPrefs = { safeMode: false, brightness: 1 };
  if (typeof window === "undefined") return fallback;
  try {
    const forced = new URLSearchParams(window.location.search).has("safe");
    const raw = window.localStorage.getItem(RENDER_PREFS_KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<RenderPrefs>) : {};
    return {
      safeMode: forced || stored.safeMode === true,
      brightness: typeof stored.brightness === "number" ? Math.min(1.8, Math.max(0.6, stored.brightness)) : 1,
    };
  } catch {
    return fallback;
  }
}

function saveRenderPrefs(prefs: RenderPrefs): void {
  try {
    window.localStorage.setItem(RENDER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Private browsing — the session still works, it just will not be remembered.
  }
}

function readJoinCode(): string {
  if (typeof window === "undefined") return "";
  try {
    return new URLSearchParams(window.location.search).get(JOIN_QUERY)?.trim().toUpperCase() ?? "";
  } catch {
    return "";
  }
}

export function GameShell() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SceneEngine | null>(null);
  const sessionRef = useRef<OnlineSession | null>(null);
  const matchRef = useRef<OnlineMatch | null>(null);

  const controller = useMemo(() => new GameController(), []);
  const snapshot = useGameSnapshot(controller);

  const detected = useMemo<QualityPreset>(() => detectQualityPreset(), []);
  const initialRender = useMemo<RenderPrefs>(() => loadRenderPrefs(), []);
  const initialArmies = useMemo<Record<Faction, ArmySkinId>>(() => loadArmyPrefs(), []);
  const initialSeatSwing = useMemo<boolean>(() => loadSeatSwing(), []);
  const initialPremoves = useMemo<boolean>(() => loadPremoves(), []);
  const initialPremoveDepth = useMemo<number>(() => loadPremoveDepth(), []);
  const initialThinkFloor = useMemo<number>(() => loadThinkFloor(), []);
  /** Whether to print key hints at all — a phone has no `F` to press. */
  const hasKeyboard = useHasKeyboard();
  const needsLandscape = useNeedsLandscape();
  useLandscapeLock();
  const [settings, setSettings] = useState<GameSettings>(() => ({
    quality: detected,
    arena: DEFAULT_ARENA,
    skins: initialArmies,
    captureCinematics: true,
    rotateBoard: initialSeatSwing,
    premoves: initialPremoves,
    premoveDepth: initialPremoveDepth,
    thinkFloorMs: initialThinkFloor,
    rankBadges: true,
    muted: false,
    safeMode: initialRender.safeMode,
    brightness: initialRender.brightness,
  }));
  const [gpu, setGpu] = useState<string>("");

  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [introPlaying, setIntroPlaying] = useState(false);
  const [promotionOpen, setPromotionOpen] = useState(false);
  const [fps, setFps] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  const [cameraFlipped, setCameraFlipped] = useState(false);
  /** Flat overhead map: no 3D figure can hide a square. */
  const [tactical, setTactical] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Showcase recording: strips every panel so the capture is board-only. */
  const [cinema, setCinema] = useState(false);
  /** How the camera behaves during a showcase duel: held, orbiting or following. */
  const [showcaseCamera, setShowcaseCamera] = useState<ShowcaseCamera>("follow");
  const [onlineLobby, setOnlineLobby] = useState<OnlineLobbyState>({
    phase: "idle",
    code: null,
    error: null,
  });
  const [rematchPending, setRematchPending] = useState(false);
  const [peerWantsRematch, setPeerWantsRematch] = useState(false);
  const [initialJoinCode] = useState<string>(() => readJoinCode());
  const adLock = useRef(false);
  const backgroundPaused = useRef(false);

  const onAppBackground = useCallback(() => {
    audio.holdForBackground();
    if (!controller.isPaused() && controller.getSnapshot().status === "playing") {
      backgroundPaused.current = true;
      controller.setPaused(true);
    }
  }, [controller]);

  const onAppForeground = useCallback(() => {
    audio.releaseFromBackground();
    if (backgroundPaused.current) {
      backgroundPaused.current = false;
      controller.setPaused(false);
    }
  }, [controller]);
  useAppLifecycle({ onBackground: onAppBackground, onForeground: onAppForeground });

  const applyGameMute = useCallback((muted: boolean) => {
    audio.setMuted(muted);
  }, []);
  const { session: adSession, playing: adPlaying, play: playAd } = useAdBreak({
    gameMuted: settings.muted,
    applyGameMute,
  });
  const merlin = useMerlinPass();
  const redoPurse = useRedoPoints(redoPointMax(merlin.active));

  // ------------------------------------------------------------ boot the scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Headless/blocked environments cannot create a WebGL context — fail loudly
    // with a readable message instead of a black screen.
    const probe = document.createElement("canvas");
    const supported = Boolean(probe.getContext("webgl2") ?? probe.getContext("webgl"));
    if (!supported) {
      setUnsupported(true);
      return;
    }

    let engine: SceneEngine;
    try {
      engine = new SceneEngine(
        canvas,
        controller,
        {
          onLoadProgress: (ratio) => setProgress(ratio),
          onReady: () => setPhase("menu"),
          onPromotionOpen: (open) => setPromotionOpen(open),
          onQualityAdjusted: (preset) => {
            setSettings((current) => ({ ...current, quality: preset }));
            setNotice(`Graphics stepped down to ${preset} to hold a smooth frame rate.`);
            setTimeout(() => setNotice(null), 5000);
          },
          onFps: (value) => setFps(value),
          onContextLost: () => setContextLost(true),
          onCameraFlipped: (flipped) => setCameraFlipped(flipped),
          onTacticalView: (active) => setTactical(active),
          onRenderFallback: (message, safe) => {
            if (safe) setSettings((current) => ({ ...current, safeMode: true }));
            setNotice(message);
            setTimeout(() => setNotice(null), 9000);
          },
        },
        detected,
        DEFAULT_ARENA,
      );
    } catch (error) {
      console.error("[ui] could not start the renderer", error);
      setUnsupported(true);
      return;
    }

    engineRef.current = engine;
    engine.setInteractive(false);
    // Set before the first load so the chosen armies are the ones downloaded.
    engine.setArmySkins(initialArmies);
    audio.setArmyCries({ w: ARMY_SKINS[initialArmies.w].cries, b: ARMY_SKINS[initialArmies.b].cries });
    engine.setSafeMode(initialRender.safeMode);
    engine.setBrightness(initialRender.brightness);
    setGpu(engine.getGpuSummary());
    engine.start();

    void engine.load().then(async () => {
      setIntroPlaying(true);
      await engine.playIntro();
      setIntroPlaying(false);
    });

    return () => {
      engineRef.current = null;
      engine.dispose();
    };
  }, [controller, detected, initialArmies, initialRender]);

  useEffect(() => () => controller.dispose(), [controller]);

  useEffect(() => {
    const result = merlin.consumeReturn();
    if (result === "granted") {
      setNotice("The Merlin Pass is yours. The banners fall silent.");
      setTimeout(() => setNotice(null), 6000);
    } else if (result === "cleared") {
      setNotice("The Merlin Pass was cleared from this device.");
      setTimeout(() => setNotice(null), 4000);
    }
  }, [merlin.consumeReturn]);

  useEffect(() => {
    if (phase === "menu") redoPurse.refresh();
  }, [phase, redoPurse.refresh]);

  // ----------------------------------------------------- audio unlock on input
  useEffect(() => {
    const unlock = (): void => {
      void audio.unlock();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // ----------------------------------------------------------- apply settings
  //
  // The muster (armies + battleground) is deliberately pushed only outside a
  // live duel. The pickers are already locked in the interface while playing;
  // this is the second lock, so no future caller can swap an army out from under
  // figures that are mid-fight.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setQuality(settings.quality);
    if (phase !== "playing") {
      engine.setArena(settings.arena);
      // The map brings its own music; the mixer crossfades to it, and remembers
      // the choice if the player has not made a sound yet.
      audio.setArena(settings.arena);
      engine.setArmySkins(settings.skins);
    }
    engine.setCaptureCinematics(settings.captureCinematics);
    engine.setRotateBoard(settings.rotateBoard);
    controller.setPremovesEnabled(settings.premoves);
    controller.setPremoveDepth(settings.premoveDepth);
    controller.setThinkFloorMs(settings.thinkFloorMs);
    engine.setRankBadges(settings.rankBadges);
    engine.setSafeMode(settings.safeMode);
    engine.setBrightness(settings.brightness);
    if (!adPlaying) audio.setMuted(settings.muted);
    saveRenderPrefs({ safeMode: settings.safeMode, brightness: settings.brightness });
    saveArmyPrefs(settings.skins);
    saveSeatSwing(settings.rotateBoard);
    savePremoves(settings.premoves);
    savePremoveDepth(settings.premoveDepth);
    saveThinkFloor(settings.thinkFloorMs);
  }, [settings, phase, controller, adPlaying]);

  const startMatch = useCallback(
    (config: MatchConfig) => {
      void audio.unlock();
      audio.blip("press");
      const engine = engineRef.current;
      engine?.setAttract(false);
      engine?.setInteractive(true);
      engine?.setShowcase(false);
      engine?.setCameraPreset(
        (config.mode === "ai" || config.mode === "online") && config.playerColor === "b" ? "black" : "white",
      );
      controller.start({
        mode: config.mode,
        difficulty: config.difficulty,
        playerColor: config.playerColor,
        clockMinutes: config.clockMinutes,
      });
      setPhase("playing");
    },
    [controller],
  );

  const startOnlineMatch = useCallback(
    (match: OnlineMatch) => {
      matchRef.current = match;
      setRematchPending(false);
      setPeerWantsRematch(false);
      setSettings((current) => ({ ...current, skins: match.skins, arena: match.arena }));
      const engine = engineRef.current;
      engine?.setArmySkins(match.skins);
      engine?.setArena(match.arena);
      audio.setArena(match.arena);
      startMatch({
        mode: "online",
        difficulty: "medium",
        playerColor: match.playerColor,
        clockMinutes: match.clockMinutes,
      });
    },
    [startMatch],
  );

  const closeOnline = useCallback(() => {
    sessionRef.current?.cancel();
    sessionRef.current = null;
    matchRef.current = null;
    setOnlineLobby({ phase: "idle", code: null, error: null });
    setRematchPending(false);
    setPeerWantsRematch(false);
  }, []);

  const ensureSession = useCallback((): OnlineSession => {
    if (sessionRef.current) return sessionRef.current;
    const session = new OnlineSession({
      onLobby: (state) => setOnlineLobby(state),
      onMatch: (match) => startOnlineMatch(match),
      onMove: (move) => {
        void controller.applyRemoteMove(move.from, move.to, move.promotion);
      },
      onResign: () => controller.applyRemoteResign(),
      onDisconnect: () => {
        controller.applyDisconnect();
        setNotice("The other warlord left the field.");
        setTimeout(() => setNotice(null), 5000);
      },
      onRematch: () => {
        setPeerWantsRematch(true);
      },
      onUndo: (to) => {
        void controller.applyRemoteUndoTo(to).then((ok) => {
          if (!ok) return;
          engineRef.current?.resync();
          setNotice("The other warlord took a move back.");
          setTimeout(() => setNotice(null), 4000);
        });
      },
    });
    sessionRef.current = session;
    return session;
  }, [controller, startOnlineMatch]);

  useEffect(() => () => sessionRef.current?.dispose(), []);

  useEffect(() => {
    return controller.on("move", (event) => {
      if (controller.getSnapshot().mode !== "online") return;
      if (event.color !== controller.getSnapshot().playerColor) return;
      sessionRef.current?.sendMove({
        from: event.from,
        to: event.to,
        promotion: event.promotion,
      });
    });
  }, [controller]);

  const returnToMenu = useCallback(() => {
    closeOnline();
    controller.stop();
    const engine = engineRef.current;
    engine?.setTacticalView(false);
    engine?.setInteractive(false);
    engine?.setShowcase(false);
    engine?.setCameraPreset("cinematic");
    setCinema(false);
    setPhase("menu");
  }, [closeOnline, controller]);

  // -------------------------------------------------------- showcase controls
  const handleTogglePause = useCallback(() => {
    audio.blip("press");
    controller.togglePaused();
  }, [controller]);

  const handleDemoSpeed = useCallback(
    (speed: number) => {
      audio.blip("press");
      controller.setDemoSpeed(speed);
    },
    [controller],
  );

  const handleDemoLoop = useCallback(
    (loop: boolean) => {
      audio.blip("press");
      controller.setDemoAutoRematch(loop);
    },
    [controller],
  );

  const handleDemoRestart = useCallback(() => {
    audio.blip("press");
    controller.restartDemo();
  }, [controller]);

  const handleShowcaseCamera = useCallback((mode: ShowcaseCamera) => {
    audio.blip("press");
    setShowcaseCamera(mode);
    engineRef.current?.setShowcaseCamera(mode);
  }, []);

  const handleUndo = useCallback(() => {
    const current = controller.getSnapshot();
    if (!current.canUndo) {
      audio.blip("deny");
      return;
    }
    if (current.mode === "online") {
      if (!redoPurse.canSpend) {
        audio.blip("deny");
        setNotice("No take-backs left today. Earn them in the Great Hall.");
        setTimeout(() => setNotice(null), 4000);
        return;
      }
      const before = current.sanList.length;
      const plies = controller.undo();
      if (!plies) {
        audio.blip("deny");
        return;
      }
      redoPurse.trySpend();
      sessionRef.current?.sendUndo(before - plies);
      audio.blip("press");
      engineRef.current?.resync();
      return;
    }
    if (current.mode !== "ai") {
      if (controller.undo()) {
        audio.blip("press");
        engineRef.current?.resync();
      } else {
        audio.blip("deny");
      }
      return;
    }
    if (merlin.active) {
      if (controller.undo()) {
        audio.blip("press");
        engineRef.current?.resync();
      } else {
        audio.blip("deny");
      }
      return;
    }
    if (adLock.current) return;

    const wasPaused = controller.isPaused();
    controller.setPaused(true);
    adLock.current = true;
    void playAd("undo")
      .then((result) => {
        if (result.proceed && controller.undo()) {
          audio.blip("press");
          engineRef.current?.resync();
        } else if (!result.proceed) {
          audio.blip("deny");
          setNotice("The banner was dismissed — the move stands.");
          setTimeout(() => setNotice(null), 4000);
        } else {
          audio.blip("deny");
        }
      })
      .finally(() => {
        if (!wasPaused) controller.setPaused(false);
        adLock.current = false;
      });
  }, [controller, merlin.active, playAd, redoPurse]);

  const handleResign = useCallback(() => {
    audio.blip("deny");
    if (controller.getSnapshot().mode === "online") {
      sessionRef.current?.sendResign();
    }
    controller.resign();
  }, [controller]);

  const handleEarnRedo = useCallback(() => {
    if (!redoPurse.canEarn || adLock.current) return;
    if (merlin.active) {
      if (redoPurse.tryEarn()) audio.blip("press");
      else audio.blip("deny");
      return;
    }
    adLock.current = true;
    void playAd("redo-point")
      .then((result) => {
        if (result.proceed && redoPurse.tryEarn()) {
          audio.blip("press");
        } else {
          audio.blip("deny");
          if (!result.proceed) {
            setNotice("The banner was dismissed — no take-back was added.");
            setTimeout(() => setNotice(null), 4000);
          }
        }
      })
      .finally(() => {
        adLock.current = false;
      });
  }, [merlin.active, playAd, redoPurse]);

  const handleBuyMerlin = useCallback(() => {
    audio.blip("press");
    if (merlin.purchase()) return;
    if (import.meta.env.DEV) {
      setNotice("Add VITE_STRIPE_PAYMENT_LINK to take real payments, or grant the pass below.");
      setTimeout(() => setNotice(null), 5000);
    }
  }, [merlin]);

  const afterInterstitial = useCallback(
    (kind: "match-end" | "new-duel", then: () => void) => {
      if (merlin.active) {
        then();
        return;
      }
      if (adLock.current) return;
      adLock.current = true;
      void playAd(kind)
        .then(() => then())
        .finally(() => {
          adLock.current = false;
        });
    },
    [merlin.active, playAd],
  );

  const handleNewDuel = useCallback(() => {
    if (adLock.current && !merlin.active) return;
    audio.blip("press");
    const current = controller.getSnapshot();
    if (current.status === "playing" && !controller.isPaused()) {
      controller.setPaused(true);
    }
    afterInterstitial("new-duel", returnToMenu);
  }, [afterInterstitial, controller, merlin.active, returnToMenu]);

  const handleRematch = useCallback(() => {
    const current = controller.getSnapshot();
    if (current.mode === "demo") {
      audio.blip("press");
      controller.restartDemo();
      return;
    }
    if (current.mode === "online") {
      audio.blip("press");
      sessionRef.current?.sendRematch();
      setRematchPending(true);
      return;
    }
    startMatch({
      mode: current.mode === "hotseat" ? "hotseat" : "ai",
      difficulty: current.difficulty,
      playerColor: current.playerColor,
      clockMinutes: current.clock.enabled ? current.clock.initialMs / 60_000 : null,
    });
  }, [controller, startMatch]);

  useEffect(() => {
    if (!rematchPending || !peerWantsRematch) return;
    const match = matchRef.current;
    if (!match) return;
    startOnlineMatch(match);
  }, [peerWantsRematch, rematchPending, startOnlineMatch]);

  const handleFindOnline = useCallback(
    (offer: OnlineOffer) => {
      void audio.unlock();
      audio.blip("press");
      ensureSession().findMatch(offer);
    },
    [ensureSession],
  );

  const handleHostOnline = useCallback(
    (offer: OnlineOffer) => {
      void audio.unlock();
      audio.blip("press");
      return ensureSession().hostChallenge(offer);
    },
    [ensureSession],
  );

  const handleJoinOnline = useCallback(
    (code: string, offer: OnlineOffer) => {
      void audio.unlock();
      audio.blip("press");
      ensureSession().joinChallenge(code, offer);
    },
    [ensureSession],
  );

  const handleFullscreen = useCallback(() => {
    const element = document.documentElement;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void element.requestFullscreen().catch((error) => console.warn("[ui] fullscreen refused", error));
  }, []);

  const handleCamera = useCallback((preset: CameraPreset) => {
    audio.blip("press");
    engineRef.current?.setCameraPreset(preset);
  }, []);

  const handleFlipCamera = useCallback(() => {
    audio.blip("press");
    engineRef.current?.flipCamera();
  }, []);

  const handleToggleTactical = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    audio.blip("press");
    engine.setTacticalView(!engine.isTacticalView());
  }, []);

  /** War-table choice from the menu — armies and ground, before the first move. */
  const handleMuster = useCallback((choice: MusterChoice) => {
    audio.blip("press");
    setSettings((current) =>
      current.arena === choice.arena && current.skins.w === choice.skins.w && current.skins.b === choice.skins.b
        ? current
        : { ...current, arena: choice.arena, skins: choice.skins },
    );
  }, []);

  /** Live per-side clock for the tally, read on its own tick. */
  const getElapsed = useCallback(() => controller.getElapsed(), [controller]);

  /** Live countdown on the queued showcase rematch, read on the dialog's tick. */
  const getRematchRemaining = useCallback(() => controller.getDemoRematchRemaining(), [controller]);

  /** Stop the showcase loop so the final position stays on the board. */
  const holdShowcase = useCallback(() => {
    audio.blip("press");
    controller.setDemoAutoRematch(false);
  }, [controller]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setShowSettings(false);
        // Same key, two jobs, in the order the player expects: a panel first,
        // then the whole chain queued on the board behind it. Esc is the bin;
        // the X over the last square is the one-step undo.
        if (!showSettings) controller.clearPremove();
      }
      const target = event.target as HTMLElement | null;
      const typing = target ? /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable : false;
      if (typing || event.metaKey || event.ctrlKey || event.altKey || phase !== "playing") return;
      // While a pawn waits on the last rank the keyboard belongs to the picker:
      // the shortcut is printed on each candidate's own name plate.
      if (promotionOpen) {
        const key = event.key.toLowerCase();
        const byLetter: Record<string, PieceKind | undefined> = { q: "q", r: "r", b: "b", n: "n" };
        const byIndex: Record<string, PieceKind | undefined> = { "1": "q", "2": "r", "3": "b", "4": "n" };
        const choice = byLetter[key] ?? byIndex[key];
        if (choice && engineRef.current?.choosePromotion(choice)) event.preventDefault();
        return;
      }
      if (event.key === "f" || event.key === "F") handleFlipCamera();
      if (event.key === "t" || event.key === "T") handleToggleTactical();
      if (event.key === "c" || event.key === "C") setCinema((hidden) => !hidden);
      if (event.key === " " && snapshot.mode === "demo") {
        event.preventDefault();
        controller.togglePaused();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [controller, handleFlipCamera, handleToggleTactical, phase, promotionOpen, showSettings, snapshot.mode]);

  const skipIntro = useCallback(() => {
    engineRef.current?.skipIntro();
  }, []);

  // ------------------------------------------------------- showcase verdict
  const showcaseFinished = phase === "playing" && snapshot.mode === "demo" && snapshot.status === "over";
  const [verdictReady, setVerdictReady] = useState(false);

  useEffect(() => {
    if (!showcaseFinished) {
      setVerdictReady(false);
      return;
    }
    const timer = setTimeout(() => setVerdictReady(true), SHOWCASE_VERDICT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [showcaseFinished]);

  return (
    <div
      className="mc-root fixed inset-0 select-none overflow-hidden bg-[#05060a]"
      data-arena={settings.arena}
      style={{ "--mc-vignette": ARENA_LOOKS[settings.arena].screenVignette } as CSSProperties}
    >
      <div className="mc-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
      <div className="mc-vignette" />

      {/* The screen half of the check alarm — the 3D half is the red lamp over
          the king itself. Keyed on the ply count so every checking move replays
          the surge instead of only the first check of the game. It stays out in
          the menu and the attract loop, where no player is under threat. */}
      {phase === "playing" && snapshot.status === "playing" && snapshot.inCheck ? (
        <div key={snapshot.moves.length} className="mc-check-wash" aria-hidden="true" />
      ) : null}

      {/* Overlay layer */}
      <div className="pointer-events-none absolute inset-0">
        {phase === "loading" && !unsupported ? <LoadingScreen progress={progress} /> : null}

        {unsupported ? (
          <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center px-6 text-center">
            <div className="mc-slate mc-goldleaf max-w-sm p-6">
              <h2 className="mc-display text-lg text-[#f2e2bd]">The hall needs WebGL</h2>
              <p className="mt-2 text-sm text-[#b7a88a]">
                This browser or preview surface cannot open a 3D context. Open the game in a desktop or tablet browser
                with hardware acceleration enabled.
              </p>
            </div>
          </div>
        ) : null}

        {phase === "menu" && !introPlaying ? (
          <MainMenu
            onStart={startMatch}
            onOpenSettings={() => setShowSettings(true)}
            muster={{ skins: settings.skins, arena: settings.arena }}
            onMuster={handleMuster}
            online={onlineLobby}
            onFindOnline={handleFindOnline}
            onHostOnline={handleHostOnline}
            onJoinOnline={handleJoinOnline}
            onCancelOnline={closeOnline}
            initialJoinCode={initialJoinCode}
            redoPurse={{
              remaining: redoPurse.remaining,
              earned: redoPurse.earned,
              max: redoPurse.max,
              canEarn: redoPurse.canEarn,
            }}
            earningRedo={adPlaying}
            onEarnRedo={handleEarnRedo}
            merlin={{
              active: merlin.active,
              price: merlin.price,
              checkoutReady: merlin.checkoutReady,
            }}
            onBuyMerlin={handleBuyMerlin}
            onGrantMerlinDev={import.meta.env.DEV ? merlin.grantForDevelopment : undefined}
            onClearMerlinDev={import.meta.env.DEV ? merlin.clearForDevelopment : undefined}
          />
        ) : null}

        {phase === "playing" && !cinema ? (
          <Hud
            snapshot={snapshot}
            muted={settings.muted}
            fps={fps}
            onNewGame={handleNewDuel}
            onUndo={handleUndo}
            undoPending={adPlaying}
            adPending={adPlaying}
            redoPurse={
              snapshot.mode === "online"
                ? { remaining: redoPurse.remaining, max: redoPurse.max }
                : null
            }
            adsExempt={merlin.active}
            onResign={handleResign}
            onToggleSound={() => setSettings((current) => ({ ...current, muted: !current.muted }))}
            onFullscreen={handleFullscreen}
            onSettings={() => setShowSettings(true)}
            onCamera={handleCamera}
            onFlipCamera={handleFlipCamera}
            cameraFlipped={cameraFlipped}
            tactical={tactical}
            onToggleTactical={handleToggleTactical}
            onTogglePause={handleTogglePause}
            onDemoSpeed={handleDemoSpeed}
            onDemoLoop={handleDemoLoop}
            onDemoRestart={handleDemoRestart}
            showcaseCamera={showcaseCamera}
            onShowcaseCamera={handleShowcaseCamera}
            onToggleCinema={() => setCinema(true)}
            getElapsed={getElapsed}
          />
        ) : null}

        {phase === "playing" && cinema ? (
          <button
            type="button"
            className="mc-cinema-restore pointer-events-auto"
            onClick={() => setCinema(false)}
            title={hasKeyboard ? "Show the interface again (C)" : "Show the interface again"}
            aria-label="Show the interface again"
          >
            <Clapperboard size={15} />
          </button>
        ) : null}

        {/* The picker itself is in the scene — every candidate stands on a plinth
            over a plate naming the rank. This banner only sets the moment and
            repeats the shortcuts, and sits high so it never covers a candidate. */}
        {promotionOpen ? (
          <div className="mc-fade pointer-events-none absolute inset-x-0 top-[13%] flex flex-col items-center gap-1.5">
            <p className="mc-display mc-slate px-4 py-2 text-xs tracking-[0.28em] text-[#f0dfb6]">
              CHOOSE THE NEW CHAMPION
            </p>
            <p className="mc-display text-[0.6rem] tracking-[0.3em] text-[#c8ab74]">
              {hasKeyboard ? "TAP A FIGURE · OR PRESS Q R B N" : "TAP A FIGURE"}
            </p>
          </div>
        ) : null}

        {introPlaying ? (
          <button
            type="button"
            onClick={skipIntro}
            className="pointer-events-auto absolute inset-0 flex cursor-pointer items-end justify-center bg-transparent pb-10"
          >
            <span className="mc-display mc-pulse text-[0.68rem] tracking-[0.4em] text-[#c8ab74]">
              {hasKeyboard ? "CLICK TO SKIP" : "TAP TO SKIP"}
            </span>
          </button>
        ) : null}

        {showSettings ? (
          <SettingsPanel
            settings={settings}
            autoDetected={detected}
            gpu={gpu}
            fps={fps}
            matchInProgress={phase === "playing"}
            onChange={setSettings}
            onClose={() => setShowSettings(false)}
            merlin={{
              active: merlin.active,
              price: merlin.price,
              checkoutReady: merlin.checkoutReady,
            }}
            onBuyMerlin={handleBuyMerlin}
            onGrantMerlinDev={import.meta.env.DEV ? merlin.grantForDevelopment : undefined}
            onClearMerlinDev={import.meta.env.DEV ? merlin.clearForDevelopment : undefined}
          />
        ) : null}

        {/* The result dialog is shown for a showcase too, looping or not: the
            viewer is told who won and given the way out. Only a clean capture
            (cinema) keeps it off screen. */}
        {phase === "playing" &&
        !cinema &&
        snapshot.status === "over" &&
        snapshot.result &&
        (snapshot.mode !== "demo" || verdictReady) ? (
          <GameOverModal
            result={snapshot.result}
            playerColor={snapshot.playerColor}
            versusComputer={snapshot.mode === "ai"}
            moveCount={snapshot.history.length}
            rematchPending={snapshot.mode === "online" && rematchPending}
            adPending={adPlaying}
            adsExempt={merlin.active}
            showcase={
              snapshot.demo
                ? {
                    round: snapshot.demoRound,
                    white: snapshot.demo.white,
                    black: snapshot.demo.black,
                    autoRematch: snapshot.demo.autoRematch,
                    getRematchRemaining,
                    onHold: holdShowcase,
                  }
                : null
            }
            onRematch={() => afterInterstitial("match-end", handleRematch)}
            onMenu={() => afterInterstitial("match-end", returnToMenu)}
          />
        ) : null}

        {notice ? (
          <div className="mc-fade mc-slate pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 text-xs text-[#e4d3ac]">
            {notice}
          </div>
        ) : null}

        {contextLost ? (
          <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/80 px-6 text-center">
            <div className="mc-slate mc-goldleaf max-w-sm p-6">
              <h2 className="mc-display text-lg text-[#f2e2bd]">The hall went dark</h2>
              <p className="mt-2 text-sm text-[#b7a88a]">
                The graphics context was lost. Reload to relight the torches.
              </p>
              <button type="button" className="mc-btn mc-btn-primary mt-4 w-full" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {adSession ? <AdBreakOverlay session={adSession} /> : null}
      {needsLandscape ? <LandscapeGate /> : null}
    </div>
  );
}

function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="mc-fade absolute inset-0 flex flex-col items-center justify-center gap-5 bg-[#05060a]/85 px-6">
      <p className="mc-display text-[0.62rem] tracking-[0.5em] text-[#a89268]">MUSTERING THE ARMIES</p>
      <h1 className="mc-display mc-title-glow text-4xl text-[#f4e3bd]">CHESS OF WARLORDS</h1>
      <div className="h-[3px] w-64 overflow-hidden rounded-full bg-[#2a251c]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8a6522] via-[#f6dfa5] to-[#8a6522] transition-[width] duration-300"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <p className="text-xs italic text-[#7d6f57]">Carving {Math.round(progress * 6)} of 6 figures…</p>
    </div>
  );
}
