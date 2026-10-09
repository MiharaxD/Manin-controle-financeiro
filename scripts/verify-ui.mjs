import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const baseURL = process.env.MANIN_PREVIEW_URL ?? "http://localhost:3000";
const out = "artifacts/redesign";
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const checks = [];
const pageErrors = [];
const views = ["Início", "Transações", "Recorrentes", "Relatórios"];
const slug = ["home", "transactions", "recurrences", "reports"];
async function fit(page, label) {
  const result = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    modal: [...document.querySelectorAll('[role="dialog"]')].map((e) => ({
      width: e.clientWidth,
      scroll: e.scrollWidth,
    })),
  }));
  assert(
    result.scroll <= result.width,
    label + ": horizontal page overflow " + JSON.stringify(result),
  );
  assert(
    result.modal.every((m) => m.scroll <= m.width + 1),
    label + ": horizontal modal overflow",
  );
  checks.push(label);
}
async function navigate(page, view, mobile) {
  await page
    .getByRole("navigation", {
      name: mobile ? "Navegação no celular" : "Navegação principal",
    })
    .getByRole("button", { name: view, exact: true })
    .click();
  await page
    .getByRole("heading", {
      level: 1,
      name: view === "Início" ? "Seu mês, com clareza." : view,
      exact: true,
    })
    .waitFor();
  if (view === "Transações")
    await page.getByLabel("Buscar lançamentos").waitFor();
  if (view === "Relatórios")
    await page.locator(".recharts-bar").first().waitFor();
}
try {
  for (const width of [1440, 390, 320]) {
    const mobile = width < 760;
    const page = await browser.newPage({
      viewport: { width, height: mobile ? 844 : 1000 },
    });
    page.on("pageerror", (e) => pageErrors.push(e.message));
    await page.goto(baseURL + "/demo");
    // Wait for the client effect that measures navigation: the server HTML alone isn't interactive.
    await page.waitForFunction(() =>
      document.documentElement.style.getPropertyValue("--mobile-nav-height"),
    );
    await page.evaluate(() => document.fonts.ready);
    for (const theme of ["light", "dark"]) {
      console.log("Checking " + width + " / " + theme);
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        localStorage.setItem("manin-theme", t);
      }, theme);
      for (let i = 0; i < views.length; i++) {
        await navigate(page, views[i], mobile);
        await fit(page, width + "/" + theme + "/" + slug[i]);
        await page.screenshot({
          animations: "disabled",
          path: out + "/" + width + "-" + theme + "-" + slug[i] + ".png",
        });
        if (views[i] === "Transações" || views[i] === "Recorrentes") {
          const menu = page.locator(".row-menu").first();
          await menu.locator("summary").click();
          const bounds = await menu.locator("div").boundingBox();
          assert(
            bounds && bounds.x >= 0 && bounds.x + bounds.width <= width,
            "Menu outside viewport",
          );
          await menu.locator("summary").click();
        }
        if (views[i] === "Relatórios") {
          const colors = await page.evaluate(() => ({
            legend: [...document.querySelectorAll(".chart-legend i")].map(
              (e) => getComputedStyle(e).backgroundColor,
            ),
            bars: [...document.querySelectorAll(".recharts-bar")].map(
              (e) => getComputedStyle(e.querySelector("path")).fill,
            ),
          }));
          assert.deepEqual(
            colors.legend,
            colors.bars,
            "Chart and legend series differ",
          );
        }
      }
      // Budget view lives in preferences on mobile.
      await navigate(page, "Recorrentes", mobile);
      await page.locator(".credit-section").scrollIntoViewIfNeeded();
      await page.screenshot({
        animations: "disabled",
        path: out + "/" + width + "-" + theme + "-credit.png",
      });
      await page
        .getByRole("button", { name: "Nova recorrente", exact: true })
        .click();
      const recurring = page.getByRole("dialog");
      await recurring
        .getByLabel("Pagamento", { exact: true })
        .selectOption("credit");
      await recurring
        .getByRole("button", { name: "Novo apelido de cartão", exact: true })
        .click();
      await recurring
        .getByLabel("Novo apelido", { exact: true })
        .fill("Compras pessoais e assinaturas da família");
      await fit(page, width + "/" + theme + "/recurrence-credit-form");
      await page.screenshot({
        animations: "disabled",
        path: out + "/" + width + "-" + theme + "-recurrence-form.png",
      });
      await page.keyboard.press("Escape");
      await page
        .locator(".topbar")
        .getByRole("button", { name: "Preferências", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: /Abrir/ })
        .click();
      await page
        .getByRole("heading", { name: "Seus orçamentos", exact: true })
        .waitFor();
      await fit(page, width + "/" + theme + "/budgets");
      await page.screenshot({
        animations: "disabled",
        path: out + "/" + width + "-" + theme + "-budgets.png",
      });
      await navigate(page, "Início", mobile);
      const add = page.getByRole("button", {
        name: "Adicionar lançamento",
        exact: true,
      });
      await add.click();
      await page.getByLabel("Valor", { exact: true }).fill("9.999.999.999,99");
      await fit(page, width + "/" + theme + "/entry");
      assert(
        (await page.getByLabel("Valor", { exact: true }).inputValue()) ===
          "9.999.999.999,99",
        "Typing changed",
      );
      await page.screenshot({
        animations: "disabled",
        path: out + "/" + width + "-" + theme + "-entry.png",
      });
      for (let tab = 0; tab < 20; tab++) {
        await page.keyboard.press("Tab");
        assert(
          await page.evaluate(
            () => !!document.activeElement?.closest('[role="dialog"]'),
          ),
          "Keyboard focus escaped the modal",
        );
      }
      checks.push(width + "/" + theme + "/focus-trap");
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await expect(add).toBeFocused();
      checks.push(width + "/" + theme + "/focus-restoration");
      // Display stress fixture: DOM only, no financial records are changed.
      const original = await page.locator(".hero-amount").innerText();
      await page
        .locator(".hero-amount")
        .evaluate((e) => (e.textContent = "R$ 9.999.999.999,99"));
      await fit(page, width + "/" + theme + "/long-value");
      assert(
        await page
          .locator(".hero-amount")
          .evaluate((e) => e.scrollWidth <= e.clientWidth),
        "Value clipped",
      );
      await page
        .locator(".hero-amount")
        .evaluate((e, text) => (e.textContent = text), original);
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      for (const view of views) {
        await navigate(page, view, mobile);
        await fit(page, width + "/" + theme + "/text-200/" + view);
      }
      await page
        .locator(".topbar")
        .getByRole("button", { name: "Preferências", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: /Abrir/ })
        .click();
      await page
        .getByRole("heading", { name: "Seus orçamentos", exact: true })
        .waitFor();
      await fit(page, width + "/" + theme + "/text-200/budgets");
      await navigate(page, "Início", mobile);
      if (mobile) {
        await page.evaluate(() =>
          scrollTo(0, document.documentElement.scrollHeight),
        );
        const footer = await page.locator(".app-footer").boundingBox();
        const nav = await page.locator(".mobile-nav").boundingBox();
        const fab = await page.locator(".fab").boundingBox();
        assert(
          footer &&
            nav &&
            fab &&
            footer.y + footer.height < nav.y &&
            fab.y + fab.height < nav.y,
          "Footer/FAB obscured by nav",
        );
        checks.push(width + "/" + theme + "/bottom-nav-clearance");
      }
      await add.click();
      await fit(page, width + "/" + theme + "/text-200/modal");
      await page.screenshot({
        animations: "disabled",
        path: out + "/" + width + "-" + theme + "-text-200.png",
      });
      await page.keyboard.press("Escape");
      await navigate(page, "Recorrentes", mobile);
      await page
        .getByRole("button", { name: "Nova recorrente", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByLabel("Pagamento", { exact: true })
        .selectOption("credit");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Novo apelido de cartão", exact: true })
        .click();
      await fit(page, width + "/" + theme + "/text-200/recurrence-credit-form");
      await page.keyboard.press("Escape");
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("button", { name: "Adicionar lançamento", exact: true })
      .click();
    const motion = await page.getByRole("dialog").evaluate((e) => ({
      animation: getComputedStyle(e).animationName,
      transition: getComputedStyle(e.querySelector("button"))
        .transitionDuration,
    }));
    assert.equal(motion.animation, "none");
    assert.equal(motion.transition, "0s");
    checks.push(width + "/reduced-motion");
    await page.keyboard.press("Escape");
    await page.goto(baseURL + "/login");
    await page.evaluate(() => document.fonts.ready);
    for (const theme of ["light", "dark"]) {
      await page.evaluate(
        (t) => (document.documentElement.dataset.theme = t),
        theme,
      );
      await fit(page, width + "/" + theme + "/login");
      await page.screenshot({
        animations: "disabled",
        path: out + "/" + width + "-" + theme + "-login.png",
      });
    }
    await page.close();
  }
  assert.deepEqual(pageErrors, [], "Browser errors");
  await writeFile(
    out + "/verification.json",
    JSON.stringify(
      { checkedAt: new Date().toISOString(), checks, pageErrors },
      null,
      2,
    ),
  );
  console.log(checks.length + " visual checks passed; captures in " + out);
} finally {
  await browser.close();
}
