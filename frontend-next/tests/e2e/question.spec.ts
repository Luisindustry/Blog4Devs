import { expect, test } from "@playwright/test";
import { seedQuestion } from "./helpers";

test.describe("Página de detalle de pregunta", () => {
  test("muestra el título, autor y tags de la pregunta", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E detail: página muestra título autor y tags correctamente",
      tags: ["python", "fastapi"],
    });

    await page.goto(`/preguntas/${q.slug}`);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(q.title);
    await expect(page.getByText("e2e_tester")).toBeVisible();
    await expect(page.getByText("python")).toBeVisible();
    await expect(page.getByText("fastapi")).toBeVisible();
  });

  test("muestra la sección de Respuestas", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E detail: página tiene sección de respuestas visible al usuario",
    });

    await page.goto(`/preguntas/${q.slug}`);

    await expect(page.locator("#answers-heading")).toBeVisible();
  });

  test("muestra mensaje cuando no hay respuestas", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E detail: estado vacío cuando pregunta no tiene respuestas aún",
    });

    await page.goto(`/preguntas/${q.slug}`);

    await expect(page.getByText("Aun no hay respuestas publicadas.")).toBeVisible();
  });

  test("muestra la fecha de creación de la pregunta", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E detail: la fecha de creación aparece en el meta de la pregunta",
    });

    await page.goto(`/preguntas/${q.slug}`);

    // "ahora" or a time like "2h" — any short timestamp
    await expect(page.locator("time")).toBeVisible();
  });

  test("muestra 404 para un slug inexistente", async ({ page }) => {
    const response = await page.goto("/preguntas/este-slug-absolutamente-no-existe-jamas-en-la-db");
    expect(response?.status()).toBe(404);
  });

  test("la navbar sigue visible en la página de pregunta", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E detail: la navbar aparece también en la página de detalle",
    });

    await page.goto(`/preguntas/${q.slug}`);

    await expect(page.getByRole("link", { name: "blog4devs" })).toBeVisible();
  });
});
