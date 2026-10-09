import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  demoSnapshot,
  invoiceDates,
  isDate,
  moneyInput,
  monthOf,
  parseMoney,
  splitInstallments,
} from "../src/lib/finance";
import {
  applyDemoMutation,
  createDemo,
  generateDemoDue,
} from "../src/lib/demo";
import { csv } from "../src/lib/export";
import { transactionSchema } from "../src/lib/schemas";
test("centavos brasileiros são exatos e entrada ambígua é recusada", () => {
  for (const [text, cents] of [
    ["0,01", 1],
    ["1.234,56", 123456],
    ["49,9", 4990],
    ["20000000", 2000000000],
  ] as const)
    assert.equal(parseMoney(text), cents);
  for (const text of [
    "1.25",
    "1,234",
    "-2",
    "0",
    "1e6",
    "20000000,01",
    "NaN",
    "1.2.3",
  ])
    assert.throws(() => parseMoney(text));
  assert.equal(moneyInput(10001), "100,01");
});
test("parcelas preservam soma até para centavos não divisíveis", () => {
  assert.deepEqual(splitInstallments(10001, 3), [3334, 3334, 3333]);
  assert.deepEqual(splitInstallments(120000, 12), Array(12).fill(10000));
  for (const total of [1, 99, 10000, 2000000000])
    for (const n of [1, 3, 12, 60].filter((n) => n <= total))
      assert.equal(
        splitInstallments(total, n).reduce((a, b) => a + b, 0),
        total,
      );
  assert.throws(() => splitInstallments(2, 3));
});
test("datas puras preservam âncora, ano e fevereiro bissexto", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2026-02-28", 1, 31), "2026-03-31");
  assert.equal(addMonths("2024-01-31", 1), "2024-02-29");
  assert.equal(addMonths("2026-12-31", 1), "2027-01-31");
  assert.equal(monthOf("2026-10-08"), "2026-10-01");
  assert.equal(isDate("2026-02-29"), false);
  assert.equal(isDate("2024-02-29"), true);
});
test("fechamento é inclusivo; vencimento e competência cruzam o ano", () => {
  const c = { closing_day: 25, due_day: 2 };
  assert.deepEqual(invoiceDates("2026-12-25", c), {
    billing_month: "2027-01-01",
    due_date: "2027-01-02",
  });
  assert.deepEqual(invoiceDates("2026-12-26", c), {
    billing_month: "2027-02-01",
    due_date: "2027-02-02",
  });
  assert.deepEqual(
    invoiceDates("2026-02-28", { closing_day: 30, due_day: 31 }),
    { billing_month: "2026-03-01", due_date: "2026-03-31" },
  );
  assert.equal(
    invoiceDates("2026-02-10", { closing_day: 20, due_day: 28 }).due_date,
    "2026-02-28",
  );
});
test("fatura paga afeta caixa e nunca duplica consumo", () => {
  const data = createDemo("2026-10-08"),
    before = demoSnapshot(data, "2026-10-01", "2026-10-08"),
    invoice = before.invoices.find((i) => i.billing_month === "2026-10-01")!;
  const afterData = applyDemoMutation(data, {
    action: "payment",
    payload: {
      id: crypto.randomUUID(),
      card_id: invoice.card_id,
      billing_month: invoice.billing_month,
      amount_cents: invoice.total,
      paid_date: "2026-10-01",
      account_id: data.accounts[0].id,
    },
  });
  const after = demoSnapshot(afterData, "2026-10-01", "2026-10-08");
  assert.equal(after.monthly.at(-1)!.expense, before.monthly.at(-1)!.expense);
  assert.equal(
    after.monthly.at(-1)!.cash_out,
    before.monthly.at(-1)!.cash_out + invoice.total,
  );
  assert.equal(
    after.invoices.find(
      (i) =>
        i.billing_month === invoice.billing_month &&
        i.card_id === invoice.card_id,
    )!.remaining,
    0,
  );
  const source = afterData.installments.find(
    (i) =>
      i.billing_month === invoice.billing_month &&
      i.card_id === invoice.card_id,
  )!;
  assert.throws(() =>
    applyDemoMutation(afterData, {
      action: "delete",
      payload: { entity: "transaction", id: source.transaction_id },
    }),
  );
});
test("exclusão e desfazer restauram exatamente totais e parcelas", () => {
  const data = createDemo("2026-10-08"),
    tx = data.transactions.find((t) => t.purchase_date === "2026-10-04")!;
  const before = demoSnapshot(data, "2026-10-01", "2026-10-08");
  const removed = applyDemoMutation(data, {
    action: "delete",
    payload: { id: tx.id, entity: "transaction" },
  });
  assert.equal(
    demoSnapshot(removed, "2026-10-01", "2026-10-08").monthly.at(-1)!.expense,
    before.monthly.at(-1)!.expense - tx.amount_cents,
  );
  const restored = applyDemoMutation(removed, {
    action: "restore",
    payload: { id: tx.id },
  });
  assert.deepEqual(
    demoSnapshot(restored, "2026-10-01", "2026-10-08").monthly,
    before.monthly,
  );
});
test("recorrências são idempotentes e pausa preserva histórico", () => {
  const data = createDemo("2026-10-08");
  data.recurrences[0].next_date = "2026-09-12";
  const first = generateDemoDue(data, "2026-10-08"),
    second = generateDemoDue(first, "2026-10-08");
  assert.equal(first.transactions.length, second.transactions.length);
  assert.equal(first.recurrences[0].next_date, "2026-10-12");
  first.recurrences[0].status = "paused";
  assert.equal(
    generateDemoDue(first, "2026-11-08").transactions.filter(
      (t) => t.recurrence_id === first.recurrences[0].id,
    ).length,
    first.transactions.filter(
      (t) => t.recurrence_id === first.recurrences[0].id,
    ).length,
  );
});
test("transferências e previsões não viram receitas ou consumo", () => {
  const data = createDemo("2026-10-08"),
    before = demoSnapshot(data, "2026-10-01", "2026-10-08");
  let next = applyDemoMutation(data, {
    action: "transaction",
    payload: {
      kind: "transfer",
      amount_cents: 15000,
      purchase_date: "2026-10-08",
      description: "",
      merchant: "",
      category_id: null,
      payment_method: "pix",
      card_id: null,
      account_id: data.accounts[0].id,
      destination_account_id: data.accounts[1].id,
      installments_count: 1,
      status: "actual",
    },
  });
  assert.deepEqual(
    demoSnapshot(next, "2026-10-01", "2026-10-08").monthly,
    before.monthly,
  );
  next = applyDemoMutation(next, {
    action: "transaction",
    payload: {
      kind: "expense",
      amount_cents: 5000,
      purchase_date: "2026-10-20",
      description: "",
      merchant: "",
      category_id: data.categories[0].id,
      payment_method: "pix",
      card_id: null,
      account_id: data.accounts[0].id,
      destination_account_id: null,
      installments_count: 1,
      status: "planned",
    },
  });
  const total = demoSnapshot(next, "2026-10-01", "2026-10-08").monthly.at(-1)!;
  assert.equal(total.expense, before.monthly.at(-1)!.expense);
  assert.equal(total.planned, 5000);
});
test("validação rejeita transferências para a mesma conta e centavos fracionados", () => {
  const data = createDemo("2026-10-08"),
    tx = data.transactions[0];
  assert.equal(
    transactionSchema.safeParse({ ...tx, amount_cents: 1.1 }).success,
    false,
  );
  assert.equal(
    transactionSchema.safeParse({
      ...tx,
      kind: "transfer",
      category_id: null,
      destination_account_id: tx.account_id,
    }).success,
    false,
  );
});
test("exportação CSV neutraliza fórmulas e preserva escape", () => {
  const data = createDemo("2026-10-08");
  data.transactions[0].description = '=HYPERLINK("x")';
  const text = csv([data.transactions[0]], data.categories);
  assert.ok(text.includes("'=HYPERLINK"));
  assert.ok(text.includes('""x""'));
  assert.ok(text.startsWith("\uFEFF"));
});
test("editar compra não paga refaz parcelas; data futura não vira fatura confirmada", () => {
  const data = createDemo("2026-10-08"),
    tx = data.transactions.find((t) => t.installments_count === 10)!;
  const updated = applyDemoMutation(data, {
    action: "transaction",
    payload: { ...tx, amount_cents: 10001, installments_count: 3 },
  });
  assert.deepEqual(
    updated.installments
      .filter((i) => i.transaction_id === tx.id)
      .map((i) => i.amount_cents),
    [3334, 3334, 3333],
  );
  const future = applyDemoMutation(updated, {
    action: "transaction",
    payload: {
      ...tx,
      id: crypto.randomUUID(),
      amount_cents: 99999,
      purchase_date: "2026-10-20",
      installments_count: 1,
    },
  });
  const before = demoSnapshot(updated, "2026-10-01", "2026-10-08"),
    after = demoSnapshot(future, "2026-10-01", "2026-10-08");
  assert.deepEqual(before.invoices, after.invoices);
  assert.equal(after.monthly.at(-1)!.planned, 99999);
});
