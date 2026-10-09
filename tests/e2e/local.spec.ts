import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Backup } from "../../src/lib/backup";
async function enter(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Entendi, abrir Manin" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function preferences(page: Page) {
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Preferências", exact: true })
    .click();
  return page.getByRole("dialog", {
    name: "Seu espaço, do seu jeito",
    exact: true,
  });
}
async function add(page: Page, merchant: string, amount: string) {
  await page
    .locator(page.viewportSize()!.width <= 760 ? ".fab" : ".desktop-add")
    .click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Valor", { exact: true }).fill(amount);
  await modal.getByLabel("Estabelecimento").fill(merchant);
  await modal
    .getByRole("button", { name: "Salvar lançamento", exact: true })
    .click();
  await expect(modal).toBeHidden();
}
test("dados pessoais começam vazios, persistem entre abas e não aparecem na demonstração", async ({
  page,
  context,
  browser,
}) => {
  const financialRequests: string[] = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).pathname.startsWith("/api/") ||
      request.url().includes(".supabase.co")
    )
      financialRequests.push(request.url());
  });
  await enter(page);
  await expect(page.locator(".hero-amount")).toContainText("0,00");
  await expect(page.locator(".transaction-row")).toHaveCount(0);
  await add(page, "Registro pessoal do teste", "49,90");
  await expect(page.locator(".hero-amount")).toContainText("49,90");
  const other = await context.newPage();
  await other.goto("/");
  await expect(
    other.getByRole("button", { name: /Registro pessoal do teste/ }),
  ).toBeVisible();
  const isolated = await browser.newContext();
  const empty = await isolated.newPage();
  await enter(empty);
  await expect(empty.locator(".transaction-row")).toHaveCount(0);
  await isolated.close();
  const demo = await context.newPage();
  await demo.goto("/demo/");
  await expect(demo.locator(".demo-banner")).toContainText("Demonstração");
  await expect(
    demo.getByRole("button", { name: /Registro pessoal do teste/ }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: /Registro pessoal do teste/ }),
  ).toBeVisible();
  expect(financialRequests).toEqual([]);
});
test("JSON exige confirmação; cancelar ou importar inválido preserva os dados e não executa HTML", async ({
  page,
}) => {
  await enter(page);
  await add(page, "Backup original do teste", "49,90");
  let settings = await preferences(page);
  await expect(
    settings.getByRole("heading", { name: "Backup no Google Drive" }),
  ).toBeVisible();
  const wait = page.waitForEvent("download");
  await settings
    .getByRole("button", { name: "Exportar JSON", exact: true })
    .click();
  const download = await wait;
  const text = await readFile((await download.path())!, "utf8");
  const backup = JSON.parse(text) as Backup;
  expect(backup.version).toBe(3);
  expect(backup.source).toBe("local");
  await settings.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: /Backup original do teste/ }).click();
  const edit = page.getByRole("dialog");
  await edit.getByLabel("Valor", { exact: true }).fill("56,70");
  await edit.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.locator(".hero-amount")).toContainText("56,70");
  settings = await preferences(page);
  const upload = settings.getByLabel("Arquivo de backup JSON");
  await upload.setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  let confirm = page.getByRole("dialog", {
    name: "Substituir dados locais?",
    exact: true,
  });
  await expect(confirm).toContainText("Os dados não serão mesclados");
  await confirm.getByRole("button", { name: "Cancelar", exact: true }).click();
  await upload.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(settings.getByRole("alert")).toContainText("incompatível");
  await expect(confirm).toHaveCount(0);
  await settings.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.locator(".hero-amount")).toContainText("56,70");
  settings = await preferences(page);
  backup.data.transactions[0].merchant =
    "<img src=x onerror=window.maninInjected=true>";
  await settings.getByLabel("Arquivo de backup JSON").setInputFiles({
    name: "literal.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  confirm = page.getByRole("dialog", {
    name: "Substituir dados locais?",
    exact: true,
  });
  await confirm
    .getByRole("button", { name: "Substituir e restaurar", exact: true })
    .click();
  await expect(confirm).toHaveCount(0);
  await expect(settings.getByRole("status")).toContainText("Backup restaurado");
  await settings.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.locator(".hero-amount")).toContainText("49,90");
  await expect(page.locator(".transaction-list")).toContainText(
    "<img src=x onerror=window.maninInjected=true>",
  );
  expect(await page.evaluate(() => "maninInjected" in window)).toBe(false);
  await page.reload();
  await expect(page.locator(".hero-amount")).toContainText("49,90");
});
test("dados pessoais continuam separados ao reiniciar ou restaurar a demonstração", async ({
  page,
  context,
}) => {
  await enter(page);
  await add(page, "Não misturar", "1,01");
  const demo = await context.newPage();
  await demo.goto("/demo/");
  const settings = await preferences(demo);
  const pending = demo.waitForEvent("download");
  await settings
    .getByRole("button", { name: "Exportar JSON", exact: true })
    .click();
  const file = await pending;
  const text = await readFile((await file.path())!, "utf8");
  await settings.getByRole("button", { name: "Fechar", exact: true }).click();
  await demo.getByRole("button", { name: "Reiniciar", exact: true }).click();
  const personal = await preferences(page);
  await personal.getByLabel("Arquivo de backup JSON").setInputFiles({
    name: "demo.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  await expect(personal.getByRole("alert")).toContainText("demonstração");
  await personal.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.locator(".hero-amount")).toContainText("1,01");
  await expect(
    page.getByRole("button", { name: /Não misturar/ }),
  ).toBeVisible();
});
