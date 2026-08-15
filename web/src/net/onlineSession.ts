/**
 * Peer-to-peer matchmaking and move relay.
 *
 * Trystero finds the other browser over public signalling (Nostr). The game
 * itself then travels encrypted over WebRTC, so a static host needs no backend.
 * Challenge codes are room IDs. The queue is a shared lobby that pairs the
 * first two seekers by sorting peer IDs.
 */

import { joinRoom, selfId, type MessageAction, type Room } from "trystero";

import type { ArmySkinId } from "../assets/generated";
import type { Faction, PieceKind, SquareId } from "../core/types";
import type { ArenaTheme } from "../scene/arena";

const APP_ID = "chess-of-warlords";
const QUEUE_ROOM = "queue-v1";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type OnlineLobbyPhase = "idle" | "seeking" | "hosting" | "joining" | "connecting";

export interface OnlineOffer {
  army: ArmySkinId;
  arena: ArenaTheme;
  clockMinutes: number | null;
}

export interface OnlineMatch {
  playerColor: Faction;
  skins: Record<Faction, ArmySkinId>;
  arena: ArenaTheme;
  clockMinutes: number | null;
  code: string;
  peerId: string;
}

export interface OnlineMove {
  from: SquareId;
  to: SquareId;
  promotion: PieceKind | null;
}

export interface OnlineLobbyState {
  phase: OnlineLobbyPhase;
  code: string | null;
  error: string | null;
}

export interface OnlineHandlers {
  onLobby: (state: OnlineLobbyState) => void;
  onMatch: (match: OnlineMatch) => void;
  onMove: (move: OnlineMove) => void;
  onResign: () => void;
  onDisconnect: () => void;
  onRematch: (fromPeer: boolean) => void;
  /** Peer rewound the shared game to this many half-moves. */
  onUndo: (to: number) => void;
}

type HelloPayload = {
  v: 1;
  army: string;
  arena: string;
  clockMinutes: number | null;
};
type MovePayload = {
  v: 1;
  from: string;
  to: string;
  promotion: string | null;
};
type SignalPayload = {
  v: 1;
  kind: "resign" | "rematch" | "undo";
  /** History length after an undo. */
  to?: number;
};

function randomCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 8);
}

function isOffer(value: unknown): value is HelloPayload {
  if (!value || typeof value !== "object") return false;
  const offer = value as HelloPayload;
  return typeof offer.army === "string" && typeof offer.arena === "string";
}

function pairRoomId(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  let hash = 2166136261;
  const seed = `${x}|${y}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `m${(hash >>> 0).toString(36)}`;
}

function openRoom(roomId: string): Room {
  return joinRoom({ appId: APP_ID, password: APP_ID }, roomId);
}

export class OnlineSession {
  private handlers: OnlineHandlers;
  private offer: OnlineOffer | null = null;
  private lobby: Room | null = null;
  private game: Room | null = null;
  private lobbyPeers = new Set<string>();
  private paired = false;
  private matched = false;
  private matchPeer: string | null = null;
  private generation = 0;
  private phase: OnlineLobbyPhase = "idle";
  private code: string | null = null;
  private hello: MessageAction<HelloPayload> | null = null;
  private moves: MessageAction<MovePayload> | null = null;
  private signals: MessageAction<SignalPayload> | null = null;
  private theirOffer: OnlineOffer | null = null;
  private announceTimer: ReturnType<typeof setInterval> | null = null;

  constructor(handlers: OnlineHandlers) {
    this.handlers = handlers;
  }

  getState(): OnlineLobbyState {
    return { phase: this.phase, code: this.code, error: null };
  }

  findMatch(offer: OnlineOffer): void {
    void this.begin("seeking", offer, async (gen) => {
      const room = openRoom(QUEUE_ROOM);
      this.lobby = room;
      this.lobbyPeers = new Set(Object.keys(room.getPeers()));
      room.onPeerJoin = (id) => {
        if (gen !== this.generation) return;
        this.lobbyPeers.add(id);
        this.tryPair(gen);
      };
      room.onPeerLeave = (id) => {
        this.lobbyPeers.delete(id);
        this.tryPair(gen);
      };
      this.tryPair(gen);
    });
  }

  hostChallenge(offer: OnlineOffer): string {
    const code = randomCode();
    void this.begin("hosting", offer, async (gen) => {
      await this.enterGameRoom(`c-${code}`, gen);
    }, code);
    return code;
  }

  joinChallenge(raw: string, offer: OnlineOffer): void {
    const code = normalizeCode(raw);
    if (code.length < 4) {
      this.handlers.onLobby({ phase: "idle", code: null, error: "That code is too short." });
      return;
    }
    void this.begin("joining", offer, async (gen) => {
      await this.enterGameRoom(`c-${code}`, gen);
    }, code);
  }

  cancel(): void {
    this.tearDown();
    this.handlers.onLobby({ phase: "idle", code: null, error: null });
  }

  sendMove(move: OnlineMove): void {
    void this.moves?.send({ v: 1, from: move.from, to: move.to, promotion: move.promotion });
  }

  sendResign(): void {
    void this.signals?.send({ v: 1, kind: "resign" });
  }

  sendRematch(): void {
    void this.signals?.send({ v: 1, kind: "rematch" });
  }

  sendUndo(to: number): void {
    void this.signals?.send({ v: 1, kind: "undo", to });
  }

  dispose(): void {
    this.tearDown();
  }

  private async begin(
    phase: OnlineLobbyPhase,
    offer: OnlineOffer,
    run: (gen: number) => Promise<void>,
    code: string | null = null,
  ): Promise<void> {
    this.tearDown();
    this.offer = offer;
    this.phase = phase;
    this.code = code;
    this.emitLobby();
    const gen = this.generation;
    try {
      await run(gen);
    } catch (error) {
      if (gen !== this.generation) return;
      console.error("[online] failed to open a room", error);
      this.tearDown();
      this.handlers.onLobby({
        phase: "idle",
        code: null,
        error: "Could not reach the field. Check the connection and try again.",
      });
    }
  }

  private tryPair(gen: number): void {
    if (this.paired || gen !== this.generation) return;
    const ids = [selfId, ...this.lobbyPeers].sort();
    const index = ids.indexOf(selfId);
    if (index < 0) return;
    const partner = index % 2 === 0 ? ids[index + 1] : ids[index - 1];
    if (!partner) return;
    this.paired = true;
    this.phase = "connecting";
    this.emitLobby();
    void this.enterGameRoom(pairRoomId(selfId, partner), gen).catch((error) => {
      console.error("[online] match room failed", error);
    });
  }

  private async enterGameRoom(roomId: string, gen: number): Promise<void> {
    if (gen !== this.generation) return;
    const previousLobby = this.lobby;
    this.lobby = null;
    try {
      await previousLobby?.leave();
    } catch {
      // The lobby may already have dropped.
    }
    if (gen !== this.generation) return;

    const room = openRoom(roomId);
    this.game = room;
    this.hello = room.makeAction<HelloPayload>("hello");
    this.moves = room.makeAction<MovePayload>("move");
    this.signals = room.makeAction<SignalPayload>("sig");

    this.hello.onMessage = (data, { peerId }) => {
      if (gen !== this.generation || !isOffer(data)) return;
      this.theirOffer = {
        army: data.army as ArmySkinId,
        arena: data.arena as ArenaTheme,
        clockMinutes: data.clockMinutes,
      };
      this.matchPeer = peerId;
      this.maybeMatch();
    };
    this.moves.onMessage = (data) => {
      if (!this.matched || data?.v !== 1) return;
      this.handlers.onMove({
        from: data.from,
        to: data.to,
        promotion: (data.promotion as PieceKind | null) ?? null,
      });
    };
    this.signals.onMessage = (data) => {
      if (!this.matched || data?.v !== 1) return;
      if (data.kind === "resign") this.handlers.onResign();
      if (data.kind === "rematch") this.handlers.onRematch(true);
      if (data.kind === "undo" && typeof data.to === "number") this.handlers.onUndo(data.to);
    };

    room.onPeerJoin = (id) => {
      if (gen !== this.generation) return;
      this.matchPeer = id;
      this.announce();
    };
    room.onPeerLeave = (id) => {
      if (id !== this.matchPeer) return;
      if (this.matched) this.handlers.onDisconnect();
    };

    for (const id of Object.keys(room.getPeers())) {
      this.matchPeer = id;
    }
    this.announce();
    this.announceTimer = setInterval(() => {
      if (this.matched || gen !== this.generation) return;
      this.announce();
    }, 1200);
  }

  private announce(): void {
    if (!this.offer || !this.hello) return;
    const payload: HelloPayload = {
      v: 1,
      army: this.offer.army,
      arena: this.offer.arena,
      clockMinutes: this.offer.clockMinutes,
    };
    if (this.matchPeer) void this.hello.send(payload, { target: this.matchPeer });
    else void this.hello.send(payload);
  }

  private maybeMatch(): void {
    if (this.matched || !this.offer || !this.theirOffer || !this.matchPeer) return;
    this.matched = true;
    if (this.announceTimer !== null) {
      clearInterval(this.announceTimer);
      this.announceTimer = null;
    }
    const white = selfId < this.matchPeer;
    const playerColor: Faction = white ? "w" : "b";
    this.handlers.onMatch({
      playerColor,
      skins: {
        w: white ? this.offer.army : this.theirOffer.army,
        b: white ? this.theirOffer.army : this.offer.army,
      },
      arena: white ? this.offer.arena : this.theirOffer.arena,
      clockMinutes: white ? this.offer.clockMinutes : this.theirOffer.clockMinutes,
      code: this.code ?? "field",
      peerId: this.matchPeer,
    });
  }

  private emitLobby(): void {
    this.handlers.onLobby({ phase: this.phase, code: this.code, error: null });
  }

  private tearDown(): void {
    this.generation += 1;
    if (this.announceTimer !== null) {
      clearInterval(this.announceTimer);
      this.announceTimer = null;
    }
    const lobby = this.lobby;
    const game = this.game;
    this.lobby = null;
    this.game = null;
    this.hello = null;
    this.moves = null;
    this.signals = null;
    this.lobbyPeers.clear();
    this.paired = false;
    this.matched = false;
    this.matchPeer = null;
    this.theirOffer = null;
    this.offer = null;
    this.phase = "idle";
    this.code = null;
    void lobby?.leave();
    void game?.leave();
  }
}
