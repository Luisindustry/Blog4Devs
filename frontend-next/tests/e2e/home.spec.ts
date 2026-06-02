import { expect, test } from "@playwright/test";
import { seedQuestion } from "./helpers";

test.describe("Página de inicio", () => {
  test("muestra el hero con el título correcto", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Preguntas técnicas profundas",
    );
  });

  test("muestra la descripción del hero", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("sin Stack Overflow genérico")).toBeVisible();
  });

  test("muestra la navbar con logo y botón Sign In", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "blog4devs" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("el logo de la navbar es un link a la raíz", async ({ page }) => {
    await page.goto("/preguntas/slug-cualquiera-404");
    await page.getByRole("link", { name: "blog4devs" }).click();
    await expect(page).toHaveURL("/");
  });

  test("muestra la sección de Preguntas Recientes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Preguntas Recientes")).toBeVisible();
  });

  test("las tarjetas de preguntas aparecen con título y tags", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E home: tarjeta con título y tags visibles en el feed",
      tags: ["typescript", "nextjs"],
    });

    await page.goto("/");

    const card = page.getByTestId("question-card").filter({ hasText: q.title });
    await expect(card).toBeVisible();
    await expect(card.getByText("[typescript]")).toBeVisible();
    await expect(card.getByText("[nextjs]")).toBeVisible();
  });

  test("las tarjetas muestran el autor y el conteo de respuestas", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E home: tarjeta muestra autor y respuestas en la fila meta",
    });

    await page.goto("/");

    const card = page.getByTestId("question-card").filter({ hasText: q.title });
    await expect(card.getByText("e2e_tester")).toBeVisible();
    await expect(card.getByText(/resp\./)).toBeVisible();
  });

  test("la tarjeta navega a la pregunta al hacer click en el título", async ({ page }) => {
    const q = await seedQuestion({
      title: "E2E home: click en tarjeta navega a la página de la pregunta",
    });

    await page.goto("/");

    const card = page.getByTestId("question-card").filter({ hasText: q.title });
    await card.getByRole("link").click();

    await expect(page).toHaveURL(`/preguntas/${q.slug}`);
  });
});
