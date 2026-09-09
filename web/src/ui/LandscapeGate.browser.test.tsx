import { render } from "vitest-browser-react";
import { expect } from "vitest";

import { LandscapeGate } from "./LandscapeGate";

test("asks a hand-held player to turn the hall", async () => {
  const screen = await render(<LandscapeGate />);
  await expect.element(screen.getByRole("dialog", { name: /turn the hall/i })).toBeInTheDocument();
  await expect.element(screen.getByText(/hold the phone on its side/i)).toBeInTheDocument();
});
