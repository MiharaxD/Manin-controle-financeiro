import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Backup } from "../../src/lib/backup";
async function nav(page: Page) {
  await page
    .getByRole("navigation", {
      name:
        page.viewportSize()!.width <= 760
          ? "Navegação no celular"
          : "Navegação principal",
    })
    .getByRole("button", { name: "Recorrentes", exact: true })
    .click();
}
async function settings(page: Page) {
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Preferências", exact: true })
    .click();
  return page.getByRole("dialog");
}
test("recorrentes têm tipo personalizado, crédito por apelido, filtros e backup completo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Entendi, abrir Manin" }).click();
  await page
    .locator(page.viewportSize()!.width <= 760 ? ".fab" : ".desktop-add")
    .click();
  let modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("button", { name: "Transferência", exact: true }),
  ).toHaveCount(0);
  await expect(modal.locator(".segmented button")).toHaveCount(2);
  await modal.getByRole("button", { name: "Fechar", exact: true }).click();
  let preferences = await settings(page);
  await preferences
    .getByRole("button", { name: "Novo tipo", exact: true })
    .click();
  modal = page.getByRole("dialog", { name: "Tipo de recorrente", exact: true });
  await modal.getByLabel("Nome do tipo").fill("Academia");
  await modal.getByRole("button", { name: "Salvar", exact: true }).click();
  preferences = page.getByRole("dialog", {
    name: "Seu espaço, do seu jeito",
    exact: true,
  });
  await expect(
    preferences.getByRole("button", {
      name: "Editar tipo Academia",
      exact: true,
    }),
  ).toBeVisible();
  await preferences
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await nav(page);
  await page
    .getByRole("button", { name: "Nova recorrente", exact: true })
    .click();
  modal = page.getByRole("dialog");
  await modal.getByLabel("Nome", { exact: true }).fill("Treino mensal");
  await modal.getByLabel("Valor da cobrança").fill("100,01");
  await modal
    .getByLabel("Tipo de recorrente")
    .selectOption({ label: "Academia" });
  await modal.getByLabel("Pagamento", { exact: true }).selectOption("credit");
  await modal
    .getByRole("button", { name: "Novo apelido de cartão", exact: true })
    .click();
  await modal
    .getByLabel("Novo apelido", { exact: true })
    .fill("Compras pessoais");
  await modal
    .getByRole("button", { name: "Criar apelido", exact: true })
    .click();
  await expect(
    modal.getByLabel("Apelido do cartão", { exact: true }),
  ).not.toHaveValue("");
  await expect(modal.getByLabel("Nome", { exact: true })).toHaveValue(
    "Treino mensal",
  );
  for (const label of [
    "Instituição",
    "Últimos 4 dígitos",
    "Dia do fechamento",
    "Dia do vencimento",
    "Limite",
  ])
    await expect(modal.getByLabel(label, { exact: true })).toHaveCount(0);
  await modal.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(modal).toHaveCount(0);
  const row = page
    .locator(".recurrence-row")
    .filter({ hasText: "Treino mensal" });
  await expect(row).toContainText("Academia");
  await expect(row).toContainText("Crédito · Compras pessoais");
  await expect(
    page.locator(".card-panel").filter({ hasText: "Compras pessoais" }),
  ).toContainText("100,01");
  await page.getByLabel("Filtrar por tipo").selectOption({ label: "Seguro" });
  await expect(row).toHaveCount(0);
  await page.getByLabel("Filtrar por tipo").selectOption({ label: "Academia" });
  await expect(row).toBeVisible();
  await page.getByLabel("Filtrar por pagamento").selectOption("pix");
  await expect(row).toHaveCount(0);
  await page.getByLabel("Filtrar por pagamento").selectOption("credit");
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: /Treino mensal/ }).click();
  modal = page.getByRole("dialog");
  await modal.getByLabel("Pagamento", { exact: true }).selectOption("pix");
  await modal.getByRole("button", { name: "Salvar", exact: true }).click();
  await page.getByLabel("Filtrar por pagamento").selectOption("pix");
  await expect(row).toContainText("Pix");
  preferences = await settings(page);
  await preferences
    .getByRole("button", { name: "Excluir tipo Academia", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Tipo em uso");
  await preferences
    .getByRole("button", { name: "Editar tipo Academia", exact: true })
    .click();
  modal = page.getByRole("dialog", { name: "Tipo de recorrente", exact: true });
  await modal.getByLabel("Nome do tipo").fill("Fitness");
  await modal.getByRole("button", { name: "Salvar", exact: true }).click();
  preferences = page.getByRole("dialog", {
    name: "Seu espaço, do seu jeito",
    exact: true,
  });
  const pending = page.waitForEvent("download");
  await preferences
    .getByRole("button", { name: "Exportar JSON", exact: true })
    .click();
  const downloaded = await pending;
  const text = await readFile((await downloaded.path())!, "utf8"),
    backup = JSON.parse(text) as Backup;
  expect(backup.version).toBe(3);
  expect(backup.data.cards).toEqual([
    { id: expect.any(String), name: "Compras pessoais" },
  ]);
  expect(
    backup.data.recurrence_types.find((t) => t.name === "Fitness")?.id,
  ).toBe(backup.data.recurrences[0].type_id);
  expect(backup.data.transactions[0].payment_method).toBe("credit");
  expect(backup.data.recurrences[0].payment_method).toBe("pix");
  await preferences.getByLabel("Digite EXCLUIR para confirmar").fill("EXCLUIR");
  await preferences
    .getByRole("button", { name: "Excluir todos os dados", exact: true })
    .click();
  await expect(
    preferences.getByRole("button", {
      name: "Editar tipo Fitness",
      exact: true,
    }),
  ).toHaveCount(0);
  await preferences.getByLabel("Arquivo de backup JSON").setInputFiles({
    name: "recorrentes.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  const confirm = page.getByRole("dialog", {
    name: "Substituir dados locais?",
    exact: true,
  });
  await confirm
    .getByRole("button", { name: "Substituir e restaurar", exact: true })
    .click();
  await expect(confirm).toHaveCount(0);
  await preferences
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await page.reload();
  await nav(page);
  await expect(row).toContainText("Fitness");
  await expect(row).toContainText("Pix");
  await expect(
    page.locator(".card-panel").filter({ hasText: "Compras pessoais" }),
  ).toContainText("100,01");
  expect(errors).toEqual([]);
});

test("despesa vira recorrente com tipo e apelido criado no lançamento", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Entendi, abrir Manin" }).click();
  await page
    .locator(page.viewportSize()!.width <= 760 ? ".fab" : ".desktop-add")
    .click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Valor", { exact: true }).fill("19,90");
  await modal.getByLabel("Estabelecimento").fill("Seguro do teste");
  await modal.getByRole("button", { name: "Crédito", exact: true }).click();
  await modal
    .getByRole("button", { name: "Novo apelido de cartão", exact: true })
    .click();
  await modal.getByLabel("Novo apelido", { exact: true }).fill("Meu crédito");
  await modal
    .getByRole("button", { name: "Criar apelido", exact: true })
    .click();
  await modal.getByLabel("Repetir mensalmente").check();
  await modal
    .getByLabel("Tipo de recorrente")
    .selectOption({ label: "Seguro" });
  await modal.getByRole("button", { name: "Receita", exact: true }).click();
  await expect(modal.getByLabel("Tipo de recorrente")).toHaveCount(0);
  await modal.getByRole("button", { name: "Despesa", exact: true }).click();
  await expect(modal.getByLabel("Repetir mensalmente")).not.toBeChecked();
  await modal.getByRole("button", { name: "Crédito", exact: true }).click();
  await modal.getByLabel("Repetir mensalmente").check();
  await modal
    .getByLabel("Tipo de recorrente")
    .selectOption({ label: "Seguro" });
  await modal
    .getByRole("button", { name: "Salvar lançamento", exact: true })
    .click();
  await expect(modal).toHaveCount(0);
  await nav(page);
  const row = page
    .locator(".recurrence-row")
    .filter({ hasText: "Seguro do teste" });
  await expect(row).toContainText("Seguro");
  await expect(row).toContainText("Crédito · Meu crédito");
  await page.reload();
  await nav(page);
  await expect(row).toBeVisible();
});
