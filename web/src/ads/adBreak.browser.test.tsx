import { render } from "vitest-browser-react";
import { afterEach, beforeEach, vi } from "vitest";

import { AdBreakOverlay } from "./AdBreakOverlay";
import { useAdBreak } from "./useAdBreak";

vi.mock("./config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./config")>();
  return {
    ...actual,
    readForceHouse: () => true,
    allowHouseFallback: () => true,
  };
});

function Harness() {
  const { session, play } = useAdBreak({
    gameMuted: true,
    applyGameMute: () => undefined,
  });
  return (
    <div>
      <button type="button" onClick={() => void play("match-end")}>
        Leave
      </button>
      <button type="button" onClick={() => void play("undo")}>
        Redo
      </button>
      {session ? <AdBreakOverlay session={session} /> : null}
    </div>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("plays a match-end missive before leaving, skippable after the wait", async () => {
  const screen = await render(<Harness />);
  await screen.getByRole("button", { name: "Leave" }).click();
  await expect.element(screen.getByTestId("ad-break")).toBeInTheDocument();
  await expect.poll(() => screen.getByTestId("ad-break").element().getAttribute("data-ad-kind")).toBe("match-end");

  await vi.advanceTimersByTimeAsync(4_100);
  await expect.element(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  await screen.getByRole("button", { name: "Skip" }).click();
  await expect.element(screen.getByTestId("ad-break")).not.toBeInTheDocument();
});

test("plays a take-back missive then removes it when the timer ends", async () => {
  const screen = await render(<Harness />);
  await screen.getByRole("button", { name: "Redo" }).click();
  await expect.element(screen.getByTestId("ad-break")).toBeInTheDocument();
  await expect.poll(() => screen.getByTestId("ad-break").element().getAttribute("data-ad-kind")).toBe("undo");
  expect(screen.getByRole("button", { name: "Skip" }).query()).toBeNull();

  await vi.advanceTimersByTimeAsync(6_200);
  await expect.element(screen.getByTestId("ad-break")).not.toBeInTheDocument();
});
