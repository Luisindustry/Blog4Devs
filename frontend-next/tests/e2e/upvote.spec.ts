import { expect, test } from "@playwright/test";
import { authenticateBrowser, seedQuestion } from "./helpers";

test.describe("Botón de Upvote", () => {
  // Voting now persists and requires a session.
  test.beforeEach(async ({ context }) => {
    await authenticateBrowser(context);
  });

  test("incrementa el contador al hacer click", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E upvote: click en upvote incrementa el contador de votos",
    });

    await page.goto("/");

    const card = page.getByTestId("question-card").filter({ hasText: q.title });
    const btn = card.getByTestId("upvote-button");
    const count = card.getByTestId("vote-count");

    const before = parseInt((await count.textContent()) ?? "0");

    await btn.click();

    await expect(count).toHaveText(String(before + 1));
    await expect(btn).toHaveAttribute("aria-label", "Quitar voto");
  });

  test("decrementa el contador al votar dos veces (toggle)", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E upvote: segundo click en upvote revierte el voto anterior",
    });

    await page.goto("/");

    const card = page.getByTestId("question-card").filter({ hasText: q.title });
    const btn = card.getByTestId("upvote-button");
    const count = card.getByTestId("vote-count");

    const before = parseInt((await count.textContent()) ?? "0");

    await btn.click();
    await btn.click();

    await expect(count).toHaveText(String(before));
    await expect(btn).toHaveAttribute("aria-label", "Votar a favor");
  });

  test("el botón cambia de color al estar votado", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E upvote: el botón cambia de apariencia cuando el voto está activo",
    });

    await page.goto("/");

    const card = page.getByTestId("question-card").filter({ hasText: q.title });
    const btn = card.getByTestId("upvote-button");

    await btn.click();

    await expect(btn).toHaveClass(/text-blue-400/);
  });
});
