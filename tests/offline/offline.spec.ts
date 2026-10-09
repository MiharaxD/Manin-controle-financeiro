import { test, expect, type Page } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import type { Backup } from "../../src/lib/backup";
async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation", {
      name:
        page.viewportSize()!.width <= 760
          ? "Navegação no celular"
          : "Navegação principal",
    })
    .getByRole("button", { name, exact: true })
    .click();
}
test("PWA cria, edita, consulta, exclui e restaura backup offline com servidor desligado", async ({
  page,
  context,
}) => {
  const port = 3107;
  const child = spawn(
    process.execPath,
    ["scripts/serve-static.mjs", "--port", String(port)],
    { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
  );
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    await new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
      child.kill();
    });
  };
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Servidor estático não iniciou.")),
        10000,
      );
      child.once("error", reject);
      child.once("exit", (code) => {
        if (code !== 0) reject(new Error("Servidor estático encerrou."));
      });
      child.stdout.on("data", (chunk) => {
        if (String(chunk).includes("Manin estático:")) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    await page.goto("http://localhost:" + port + "/");
    await page.getByRole("button", { name: "Entendi, abrir Manin" }).click();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect(page.locator(".hero-amount")).toContainText("0,00");
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const paths: string[] = [];
      for (const key of keys)
        if (key.startsWith("manin-shell-"))
          for (const request of await (await caches.open(key)).keys())
            paths.push(new URL(request.url).pathname);
      return paths;
    });
    expect(cached).toContain("/");
    expect(cached.some((path) => path.startsWith("/_next/"))).toBe(true);
    expect(
      cached.some(
        (path) => path.startsWith("/api/") || path.includes("backup.json"),
      ),
    ).toBe(false);
    await stop();
    await context.setOffline(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Seu mês, com clareza." }),
    ).toBeVisible();
    await page
      .locator(page.viewportSize()!.width <= 760 ? ".fab" : ".desktop-add")
      .click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Valor", { exact: true }).fill("12,34");
    await dialog.getByLabel("Estabelecimento").fill("Offline verificado");
    await dialog
      .getByRole("button", { name: "Salvar lançamento", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("button", { name: /Offline verificado/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Offline verificado/ }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Valor", { exact: true }).fill("19,90");
    await dialog.getByRole("button", { name: "Salvar alterações" }).click();
    await nav(page, "Transações");
    await page.getByLabel("Buscar lançamentos").fill("Offline verificado");
    await expect(page.locator(".transaction-row")).toHaveCount(1);
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
    await nav(page, "Cartões");
    await page.getByRole("button", { name: "Novo cartão" }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nome", { exact: true }).fill("Cartão offline");
    await dialog.getByLabel("Dia do fechamento").fill("31");
    await dialog.getByLabel("Dia do vencimento").fill("1");
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await page
      .locator(page.viewportSize()!.width <= 760 ? ".fab" : ".desktop-add")
      .click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Valor", { exact: true }).fill("100,01");
    await dialog.getByLabel("Estabelecimento").fill("Parcelas offline");
    await dialog.getByRole("button", { name: "Crédito", exact: true }).click();
    await dialog.getByLabel("Parcelas", { exact: true }).fill("3");
    await dialog
      .getByRole("button", { name: "Salvar lançamento", exact: true })
      .click();
    await page.getByRole("button", { name: /Ver fatura/ }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Competência da fatura").selectOption({ index: 1 });
    await dialog
      .getByRole("button", { name: "Registrar pagamento", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Valor pago", { exact: true }).fill("10,00");
    await dialog
      .getByRole("button", { name: "Registrar pagamento", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Fechar", exact: true })
      .click();
    await nav(page, "Relatórios");
    await expect(page.locator(".recharts-bar")).toHaveCount(2);
    await expect(page.locator("tbody tr")).toHaveCount(6);
    await page
      .locator(".topbar")
      .getByRole("button", { name: "Preferências", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    const downloading = page.waitForEvent("download");
    await dialog
      .getByRole("button", { name: "Exportar JSON", exact: true })
      .click();
    const downloaded = await downloading;
    const text = await readFile((await downloaded.path())!, "utf8");
    const backup = JSON.parse(text) as Backup;
    expect(backup.data.transactions).toHaveLength(2);
    expect(backup.data.installments).toHaveLength(3);
    expect(backup.data.payments).toHaveLength(1);
    await dialog.getByLabel("Digite EXCLUIR para confirmar").fill("EXCLUIR");
    await dialog
      .getByRole("button", { name: "Excluir todos os dados", exact: true })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Dados financeiros excluídos." }),
    ).toBeVisible();
    await dialog
      .getByLabel("Arquivo de backup JSON")
      .setInputFiles({
        name: "offline.json",
        mimeType: "application/json",
        buffer: Buffer.from(text),
      });
    const confirmation = page.getByRole("dialog", {
      name: "Substituir dados locais?",
      exact: true,
    });
    await confirmation
      .getByRole("button", { name: "Substituir e restaurar", exact: true })
      .click();
    await expect(confirmation).toHaveCount(0);
    await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.reload();
    await expect(page.locator(".transaction-row")).toHaveCount(2);
    await page.goto("http://localhost:" + port + "/login/");
    await expect(page.getByRole("heading", { level: 2 })).toContainText(
      "neste dispositivo",
    );
    await page.getByRole("link", { name: "Abrir meu espaço local" }).click();
    await expect(page.locator(".transaction-row")).toHaveCount(2);
    await page.screenshot({
      path: "artifacts/offline-" + test.info().project.name + ".png",
      animations: "disabled",
    });
  } finally {
    await stop();
  }
});
