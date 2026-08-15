import { describe, expect, it } from "vitest";

import { GameController } from "./gameController";

describe("online take-back", () => {
  it("is closed until this warlord has moved, then rewinds to their turn", async () => {
    const game = new GameController();
    game.start({ mode: "online", difficulty: "medium", playerColor: "w", clockMinutes: null });
    expect(game.getSnapshot().canUndo).toBe(false);

    expect(await game.tryMove("e2", "e4")).toBe(true);
    expect(game.getSnapshot().canUndo).toBe(true);
    expect(game.getSnapshot().sanList).toEqual(["e4"]);

    expect(game.undo()).toBe(1);
    expect(game.getSnapshot().sanList).toEqual([]);
    expect(game.getSnapshot().turn).toBe("w");
    expect(game.getSnapshot().canUndo).toBe(false);
    game.dispose();
  });

  it("takes back the reply as well once the other warlord has moved", async () => {
    const game = new GameController();
    game.start({ mode: "online", difficulty: "medium", playerColor: "w", clockMinutes: null });
    expect(await game.tryMove("e2", "e4")).toBe(true);
    expect(await game.applyRemoteMove("e7", "e5")).toBe(true);
    expect(game.getSnapshot().sanList).toHaveLength(2);
    expect(game.getSnapshot().turn).toBe("w");

    expect(game.undo()).toBe(2);
    expect(game.getSnapshot().sanList).toEqual([]);
    expect(game.getSnapshot().turn).toBe("w");
    game.dispose();
  });

  it("rewinds a remote take-back even if we already answered", async () => {
    const game = new GameController();
    game.start({ mode: "online", difficulty: "medium", playerColor: "b", clockMinutes: null });
    expect(await game.applyRemoteMove("e2", "e4")).toBe(true);
    expect(await game.tryMove("e7", "e5")).toBe(true);
    expect(game.getSnapshot().sanList).toHaveLength(2);

    expect(await game.applyRemoteUndoTo(0)).toBe(true);
    expect(game.getSnapshot().sanList).toEqual([]);
    expect(game.getSnapshot().turn).toBe("w");
    game.dispose();
  });
});
