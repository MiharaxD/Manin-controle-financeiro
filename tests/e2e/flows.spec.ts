import { test, expect, type Page } from "@playwright/test";
const nav = async (page: Page, name: string) => {
  await page
    .getByRole("navigation", {
      name:
        page.viewportSize()!.width <= 760
          ? "Navegação no celular"
          : "Navegação principal",
    })
    .getByRole("button", { name, exact: true })
    .click();
};
test("lançamento rápido, edição, busca, exclusão com desfazer e persistência da demonstração", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Seu mês, com clareza." }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/${info.project.name}-home.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Adicionar lançamento", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Valor", { exact: true }).fill("49,90");
  await dialog.getByLabel("Estabelecimento").fill("Café teste");
  await dialog
    .getByRole("button", { name: "Salvar lançamento", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await nav(page, "Transações");
  await page.getByLabel("Buscar lançamentos").fill("Café teste");
  await expect(page.locator(".transaction-row")).toHaveCount(1);
  await page.getByRole("button", { name: /^Café teste/ }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Valor", { exact: true }).fill("54,90");
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.locator(".transaction-row")).toContainText("54,90");
  await page.locator(".transaction-row summary").click();
  await page
    .locator(".row-menu")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await expect(page.locator(".transaction-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(page.locator(".transaction-row")).toHaveCount(1);
  await page.reload();
  await nav(page, "Transações");
  await page.getByLabel("Buscar lançamentos").fill("Café teste");
  await expect(page.locator(".transaction-row")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("cartão, compra parcelada, fatura e pagamento", async ({ page }) => {
  await page.goto("/demo");
  await nav(page, "Cartões");
  await page.getByRole("button", { name: "Novo cartão" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Cartão teste");
  await dialog.getByLabel("Instituição").fill("Banco teste");
  await dialog.getByLabel(/^Limite/).fill("5.000,00");
  await dialog.getByLabel("Dia do fechamento").fill("31");
  await dialog.getByLabel("Dia do vencimento").fill("1");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page
    .getByRole("button", { name: "Adicionar lançamento", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Valor", { exact: true }).fill("100,01");
  await dialog.getByLabel("Estabelecimento").fill("Compra em três vezes");
  await dialog.getByRole("button", { name: "Crédito", exact: true }).click();
  await dialog
    .getByLabel("Cartão", { exact: true })
    .selectOption({ label: "Cartão teste" });
  await dialog.getByLabel("Parcelas", { exact: true }).fill("3");
  await expect(dialog).toContainText("primeira de R$ 33,34");
  await dialog
    .getByRole("button", { name: "Salvar lançamento", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const card = page.locator(".card-panel").filter({ hasText: "Cartão teste" });
  await card.getByRole("button", { name: /Ver fatura/ }).click();
  dialog = page.getByRole("dialog");
  const options = await dialog
    .getByLabel("Competência da fatura")
    .locator("option")
    .allTextContents();
  expect(options.length).toBeGreaterThanOrEqual(3);
  await dialog.getByLabel("Competência da fatura").selectOption({ index: 1 });
  await expect(dialog).toContainText("Compra em três vezes");
  await dialog
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Registrar pagamento", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Pagamento registrado");
});
test("recorrência, orçamento, exportação, tema e relatórios", async ({
  page,
}, info) => {
  await page.goto("/demo");
  await nav(page, "Recorrências");
  await page.getByRole("button", { name: "Nova recorrência" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome", { exact: true }).fill("Serviço teste");
  await dialog.getByLabel("Valor da cobrança").fill("19,90");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.locator(".recurrence-row").filter({ hasText: "Serviço teste" }),
  ).toBeVisible();
  await page
    .locator(".recurrence-row")
    .filter({ hasText: "Serviço teste" })
    .locator("summary")
    .click();
  await page
    .locator(".recurrence-row")
    .filter({ hasText: "Serviço teste" })
    .getByRole("button", { name: "Pausar", exact: true })
    .click();
  await expect(
    page.locator(".recurrence-row").filter({ hasText: "Serviço teste" }),
  ).toContainText("Pausada");
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Preferências", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Abrir/ }).click();
  await page.getByRole("button", { name: "Novo orçamento" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Limite mensal").fill("150,00");
  await dialog
    .getByLabel("Categoria", { exact: true })
    .selectOption({ label: "Jogos" });
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    page.getByRole("progressbar", { name: "Orçamento Jogos" }),
  ).toBeVisible();
  await page
    .locator(".topbar")
    .getByRole("button", { name: "Preferências", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar JSON" }).click();
  const file = await downloadPromise;
  expect(file.suggestedFilename()).toBe("manin.json");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await nav(page, "Relatórios");
  await expect(
    page.getByRole("heading", { name: "Evolução financeira" }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page.getByRole("button", { name: /Ativar tema/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({
    path: `artifacts/${info.project.name}-dark.png`,
    fullPage: true,
  });
});
test("manifest, cache restrito, estados de configuração e tela pequena", async ({
  page,
  request,
}, info) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
  expect([401, 503]).toContain((await request.get("/api/data")).status());
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons).toHaveLength(3);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/demo");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Adicionar lançamento", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/320-entry.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/320-text-200-${info.project.name}.png`,
    fullPage: false,
  });
  await page
    .getByRole("button", { name: "Adicionar lançamento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  const cached = await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await fetch("/api/data");
    const keys = await caches.keys();
    const paths: string[] = [];
    for (const key of keys)
      for (const request of await (await caches.open(key)).keys())
        paths.push(new URL(request.url).pathname);
    return paths;
  });
  expect(cached).toContain("/offline.html");
  expect(
    cached.some(
      (path) => path.startsWith("/api/") || path === "/demo" || path === "/",
    ),
  ).toBe(false);
  await page.context().setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Vamos reconectar." }),
  ).toBeVisible();
  await page.context().setOffline(false);
});
