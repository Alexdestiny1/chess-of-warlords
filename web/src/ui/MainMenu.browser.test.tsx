import { render } from "vitest-browser-react";
import { expect, vi } from "vitest";

import { DEFAULT_ARMY_SKINS } from "../assets/generated";
import { DEFAULT_ARENA } from "../scene/arena";
import { MainMenu } from "./MainMenu";

test("the online tab offers hall banners before a live match", async () => {
  const onEarnRedo = vi.fn();
  const screen = await render(
    <MainMenu
      onStart={() => undefined}
      onOpenSettings={() => undefined}
      muster={{ skins: { ...DEFAULT_ARMY_SKINS }, arena: DEFAULT_ARENA }}
      onMuster={() => undefined}
      online={{ phase: "idle", code: null, error: null }}
      onFindOnline={() => undefined}
      onHostOnline={() => ""}
      onJoinOnline={() => undefined}
      onCancelOnline={() => undefined}
      redoPurse={{ remaining: 0, earned: 0, max: 3, canEarn: true }}
      onEarnRedo={onEarnRedo}
      merlin={{
        active: false,
        price: { currency: "USD", amount: 5, locale: "en-US", region: "US", formatted: "$5.00" },
        checkoutReady: false,
      }}
      onBuyMerlin={() => undefined}
    />,
  );

  await screen.getByRole("button", { name: /online/i }).click();
  await expect.element(screen.getByText(/take-backs today/i)).toBeInTheDocument();
  await expect.element(screen.getByText(/no points, no redo/i)).toBeInTheDocument();
  await screen.getByRole("button", { name: /watch a banner/i }).click();
  expect(onEarnRedo).toHaveBeenCalledOnce();
  await screen.getByRole("button", { name: /merlin pass/i }).click();
  await expect.element(screen.getByText(/silence every banner/i)).toBeInTheDocument();
});

test("a Merlin Pass holder claims take-backs without a banner", async () => {
  const onEarnRedo = vi.fn();
  const screen = await render(
    <MainMenu
      onStart={() => undefined}
      onOpenSettings={() => undefined}
      muster={{ skins: { ...DEFAULT_ARMY_SKINS }, arena: DEFAULT_ARENA }}
      onMuster={() => undefined}
      online={{ phase: "idle", code: null, error: null }}
      onFindOnline={() => undefined}
      onHostOnline={() => ""}
      onJoinOnline={() => undefined}
      onCancelOnline={() => undefined}
      redoPurse={{ remaining: 1, earned: 1, max: 5, canEarn: true }}
      onEarnRedo={onEarnRedo}
      merlin={{
        active: true,
        price: { currency: "USD", amount: 5, locale: "en-US", region: "US", formatted: "$5.00" },
        checkoutReady: true,
      }}
      onBuyMerlin={() => undefined}
    />,
  );

  await screen.getByRole("button", { name: /online/i }).click();
  await expect.element(screen.getByRole("button", { name: /claim a take-back/i })).toBeInTheDocument();
  await screen.getByRole("button", { name: /claim a take-back/i }).click();
  expect(onEarnRedo).toHaveBeenCalledOnce();
});
