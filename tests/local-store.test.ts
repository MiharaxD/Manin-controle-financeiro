import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { LocalStore } from "../src/lib/local-store";
import { createEmptyData } from "../src/lib/initial-data";
import { createDemo } from "../src/lib/demo";
import { applyMutation, generateDue } from "../src/lib/engine";
import { createBackup, parseBackup } from "../src/lib/backup";
import { validateData } from "../src/lib/records";
import { demoSnapshot, todaySP } from "../src/lib/finance";
import type { FinancialData, Mutation } from "../src/lib/types";
import { createLegacyData } from "./fixtures/legacy-data";

function tx(data: FinancialData, amount = 1234): Mutation {
  return {
    action: "transaction",
    payload: {
      id: crypto.randomUUID(),
      kind: "expense",
      amount_cents: amount,
      purchase_date: todaySP(),
      description: "Teste local",
      merchant: "Estabelecimento de teste",
      category_id: data.categories[0].id,
      payment_method: "pix",
      card_id: null,
      account_id: data.accounts[0].id,
      destination_account_id: null,
      installments_count: 1,
      status: "actual",
    },
  };
}
function store(mode: "local" | "demo" = "local", factory = new IDBFactory()) {
  return new LocalStore(mode, factory);
}
test("espaço pessoal começa vazio e persiste após fechar e reabrir", async () => {
  const factory = new IDBFactory(),
    first = store("local", factory);
  const initial = await first.read();
  assert.equal(initial.data.transactions.length, 0);
  assert.equal(initial.data.cards.length, 0);
  const saved = await first.mutate(tx(initial.data));
  first.close();
  const reopened = store("local", factory);
  assert.deepEqual((await reopened.read()).data, saved.data);
  reopened.close();
});
test("transações simultâneas em duas abas não perdem registros", async () => {
  const factory = new IDBFactory(),
    a = store("local", factory),
    b = store("local", factory);
  const initial = await a.read();
  await Promise.all(
    Array.from({ length: 16 }, (_, i) =>
      (i % 2 ? a : b).mutate(tx(initial.data, i + 1)),
    ),
  );
  const result = await a.read();
  assert.equal(result.data.transactions.length, 16);
  assert.equal(
    result.data.transactions.reduce((n, t) => n + t.amount_cents, 0),
    136,
  );
  a.close();
  b.close();
});
test("demonstração e dados pessoais têm IDs e conteúdo isolados", async () => {
  const factory = new IDBFactory(),
    personal = store("local", factory),
    demo = store("demo", factory);
  const a = await personal.read(),
    b = await demo.read();
  assert.notEqual(a.dataset_id, b.dataset_id);
  assert.equal(a.data.transactions.length, 0);
  assert.ok(b.data.transactions.length > 0);
  await personal.mutate(tx(a.data));
  await demo.reset();
  assert.equal((await personal.read()).data.transactions.length, 1);
  assert.throws(
    () =>
      parseBackup(JSON.stringify(createBackup(b.data, b.dataset_id, "demo"))),
    /demonstração/,
  );
  await assert.rejects(
    personal.replace(createBackup(b.data, b.dataset_id, "demo"), a.revision),
    /demonstração/,
  );
  personal.close();
  demo.close();
});
test("backup completo preserva IDs, vínculos, parcelas, pagamentos e tombstones", async () => {
  let data = createDemo("2026-10-08");
  const credit = data.transactions.find((t) => t.installments_count === 10)!;
  const installment = data.installments.find(
    (i) => i.transaction_id === credit.id,
  )!;
  data = applyMutation(data, {
    action: "payment",
    payload: {
      id: crypto.randomUUID(),
      card_id: installment.card_id,
      billing_month: installment.billing_month,
      amount_cents: 100,
      paid_date: "2026-10-08",
      account_id: data.accounts[0].id,
    },
  });
  const disposable = data.transactions.find(
    (t) => t.payment_method === "pix" && t.kind === "expense",
  )!;
  data = applyMutation(data, {
    action: "delete",
    payload: { entity: "transaction", id: disposable.id },
  });
  const backup = createBackup(data, crypto.randomUUID());
  const target = store();
  const old = await target.read();
  const restored = await target.replace(
    parseBackup(JSON.stringify(backup)),
    old.revision,
  );
  assert.deepEqual(restored.data, data);
  assert.equal(restored.dataset_id, backup.dataset_id);
  assert.deepEqual(
    parseBackup(JSON.stringify(await target.backup())).data,
    data,
  );
  const payment = restored.data.payments[0];
  const beforeRetry = await target.read();
  await target.mutate({ action: "payment", payload: { ...payment } });
  assert.deepEqual(await target.read(), beforeRetry);
  await assert.rejects(
    target.mutate({
      action: "payment",
      payload: { ...payment, amount_cents: payment.amount_cents + 1 },
    }),
    /outros dados/,
  );
  assert.deepEqual(await target.read(), beforeRetry);
  await assert.rejects(
    target.mutate({
      action: "transaction",
      payload: { ...credit, amount_cents: 12345 },
    }),
    /Histórico preservado/,
  );
  target.close();
});
test("JSON inválido, versão incompatível, campos extras e centavos fracionados são recusados", () => {
  const backup = createBackup(createEmptyData(), crypto.randomUUID());
  assert.throws(() => parseBackup("{"), /JSON válido/);
  assert.throws(
    () => parseBackup(JSON.stringify({ ...backup, version: 99 })),
    /incompatível/,
  );
  assert.throws(
    () => parseBackup(JSON.stringify({ ...backup, run: "alert(1)" })),
    /inválido/,
  );
  const data = applyMutation(backup.data, tx(backup.data));
  data.transactions[0].amount_cents = 1.5;
  assert.throws(
    () => parseBackup(JSON.stringify({ ...backup, data })),
    /inválido/,
  );
  assert.throws(
    () => parseBackup('{"__proto__":{"polluted":true},"version":2}'),
    /inválido/,
  );
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});
test("vínculos cruzados entre conjuntos, parcelas incompletas e duplicatas são recusados", () => {
  const a = createDemo("2026-10-08"),
    b = createEmptyData();
  a.transactions[0].category_id = b.categories[0].id;
  assert.throws(() => validateData(a), /vínculo/);
  const c = createDemo("2026-10-08");
  c.installments.pop();
  assert.throws(() => validateData(c), /faltam parcelas/);
  const d = createDemo("2026-10-08");
  d.installments[0].amount_cents++;
  assert.throws(() => validateData(d), /calendário de parcela/);
  const e = createEmptyData();
  e.categories.push(e.categories[0]);
  assert.throws(() => validateData(e), /IDs duplicados/);
});
test("restauração inválida preserva dados, metadados e revisão", async () => {
  const s = store();
  const initial = await s.read();
  await s.mutate(tx(initial.data));
  const before = await s.read(),
    invalid = createBackup(createEmptyData(), crypto.randomUUID());
  invalid.data.budgets = [
    {
      id: crypto.randomUUID(),
      month: "2026-10-01",
      category_id: crypto.randomUUID(),
      amount_cents: 100,
    },
  ];
  await assert.rejects(s.replace(invalid, before.revision), /vínculo/);
  assert.deepEqual(await s.read(), before);
  s.close();
});
test("restauração recusa confirmação obsoleta após alteração em outra aba", async () => {
  const factory = new IDBFactory(),
    a = store("local", factory),
    b = store("local", factory);
  const before = await a.read();
  const backup = createBackup(createEmptyData(), crypto.randomUUID());
  const changed = await b.mutate(tx(before.data));
  await assert.rejects(a.replace(backup, before.revision), /mudaram/);
  assert.deepEqual(await a.read(), changed);
  a.close();
  b.close();
});
test("data confirmada do Drive persiste, fica vinculada ao conjunto e é limpa na restauração", async () => {
  const factory = new IDBFactory(),
    first = store("local", factory);
  const original = await first.read();
  const receipt = {
    account: "local@example.com",
    file_id: "confirmed_A",
    confirmed_at: "2026-10-09T12:00:00Z",
  };
  await first.recordDriveBackup(receipt, original.dataset_id);
  first.close();
  const reopened = store("local", factory),
    before = await reopened.read();
  assert.deepEqual(before.driveReceipts, [receipt]);
  await assert.rejects(
    reopened.recordDriveBackup(
      { ...receipt, file_id: "wrong_dataset" },
      crypto.randomUUID(),
    ),
    /conta local mudou/,
  );
  assert.deepEqual(await reopened.read(), before);
  const restored = await reopened.replace(
    createBackup(createEmptyData(), crypto.randomUUID()),
    before.revision,
  );
  assert.deepEqual(restored.driveReceipts, []);
  reopened.close();
});
test("falha de gravação aborta a transação e mantém o conjunto anterior", async () => {
  const s = store(),
    before = await s.read();
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () {
    throw new DOMException("Sem espaço", "QuotaExceededError");
  };
  try {
    await assert.rejects(
      s.mutate(tx(before.data)),
      /dados anteriores foram mantidos/,
    );
  } finally {
    IDBObjectStore.prototype.put = original;
  }
  assert.deepEqual(await s.read(), before);
  s.close();
});
test("exportação antiga do Supabase migra sem trocar IDs e rejeita mistura de usuários", () => {
  const data = createLegacyData(),
    owner = crypto.randomUUID();
  const legacy: Record<string, unknown> = {
    version: 1,
    exported_at: new Date().toISOString(),
  };
  for (const [key, rows] of Object.entries(data))
    legacy[key === "payments" ? "invoice_payments" : key] = rows.map(
      (row: { id: string }) => ({ ...row, user_id: owner }),
    );
  const migrated = parseBackup(JSON.stringify(legacy));
  assert.equal(migrated.source, "supabase-v1");
  assert.deepEqual(migrated.data.installments, data.installments);
  assert.deepEqual(migrated.data.payments, data.payments);
  assert.deepEqual(
    migrated.data.cards,
    data.cards.map((c) => ({ id: c.id, name: c.name })),
  );
  assert.equal(migrated.data.transactions.length, data.transactions.length);
  (legacy.accounts as Record<string, unknown>[])[0].user_id =
    crypto.randomUUID();
  assert.throws(
    () => parseBackup(JSON.stringify(legacy)),
    /proprietários diferentes/,
  );
});
test("recorrência recupera o dia 31 após fevereiro bissexto e preserva ocorrência excluída", () => {
  const initial = createEmptyData();
  const recurrence = {
    id: crypto.randomUUID(),
    name: "Mensal teste",
    type_id: initial.recurrence_types[0].id,
    amount_cents: 101,
    category_id: initial.categories[0].id,
    payment_method: "pix",
    card_id: null,
    account_id: initial.accounts[0].id,
    interval_months: 1,
    next_date: "2024-01-31",
    anchor_day: 31,
    status: "active",
  };
  const seeded = applyMutation(initial, {
    action: "recurrence",
    payload: recurrence,
  });
  const generated = generateDue(seeded, "2024-03-31");
  assert.deepEqual(
    generated.transactions.map((t) => t.purchase_date),
    ["2024-01-31", "2024-02-29", "2024-03-31"],
  );
  const removed = applyMutation(generated, {
    action: "delete",
    payload: { entity: "transaction", id: generated.transactions[0].id },
  });
  removed.recurrences[0].next_date = "2024-01-31";
  const replay = generateDue(removed, "2024-03-31");
  assert.equal(replay.transactions.length, 3);
  assert.equal(
    replay.transactions[0].deleted_at,
    removed.transactions[0].deleted_at,
  );
});
test("desfazer expira e exclusão total remove também contas/categorias personalizadas", () => {
  const initial = createEmptyData(),
    saved = applyMutation(initial, tx(initial));
  const removed = applyMutation(
    saved,
    {
      action: "delete",
      payload: { entity: "transaction", id: saved.transactions[0].id },
    },
    todaySP(),
    "2026-10-09T12:00:00Z",
  );
  assert.throws(
    () =>
      applyMutation(
        removed,
        { action: "restore", payload: { id: saved.transactions[0].id } },
        todaySP(),
        "2026-10-09T12:11:00Z",
      ),
    /prazo/,
  );
  const cleared = applyMutation(saved, {
    action: "clear",
    payload: { confirmation: "EXCLUIR" },
  });
  assert.equal(cleared.transactions.length, 0);
  assert.ok(
    cleared.accounts.every(
      (a) => !initial.accounts.some((old) => old.id === a.id),
    ),
  );
});
test("pagamentos acima do saldo e referências inválidas nunca são persistidos", async () => {
  const s = store(),
    before = await s.read();
  await assert.rejects(
    s.mutate({
      ...tx(before.data),
      payload: { ...tx(before.data).payload, account_id: crypto.randomUUID() },
    }),
    /vínculo/,
  );
  await assert.rejects(
    s.mutate({
      action: "payment",
      payload: {
        id: crypto.randomUUID(),
        card_id: crypto.randomUUID(),
        billing_month: "2026-10-01",
        paid_date: todaySP(),
        account_id: before.data.accounts[0].id,
        amount_cents: 100,
      },
    }),
    /saldo da fatura/,
  );
  assert.deepEqual(await s.read(), before);
  s.close();
});
test("backup v3 sem parcelas não perde silenciosamente compromissos de crédito", () => {
  const data = createDemo("2026-10-08"),
    backup = createBackup(data, crypto.randomUUID());
  backup.data.installments = [];
  assert.throws(() => parseBackup(JSON.stringify(backup)), /faltam parcelas/);
});
test("leitura local incompatível não sobrescreve conteúdo existente", async () => {
  const factory = new IDBFactory(),
    s = store("local", factory);
  await s.read();
  s.close();
  await new Promise<void>((resolve, reject) => {
    const req = factory.open("manin-device-v1", 2);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result,
        t = db.transaction("datasets", "readwrite");
      t.objectStore("datasets").put(
        { version: 999, private: "conteúdo preservado" },
        "local",
      );
      t.oncomplete = () => {
        db.close();
        resolve();
      };
    };
  });
  const reader = store("local", factory);
  await assert.rejects(reader.read(), /incompatível ou danificado/);
  await new Promise<void>((resolve) => {
    const req = factory.open("manin-device-v1", 2);
    req.onsuccess = () => {
      const db = req.result,
        get = db.transaction("datasets").objectStore("datasets").get("local");
      get.onsuccess = () => {
        assert.equal(get.result.version, 999);
        db.close();
        resolve();
      };
    };
  });
  reader.close();
});
test("indicadores mantêm caixa separado de consumo após roundtrip", () => {
  const d = createDemo("2026-10-08"),
    b = parseBackup(JSON.stringify(createBackup(d, crypto.randomUUID())));
  assert.deepEqual(
    demoSnapshot(d, "2026-10-01", "2026-10-08"),
    demoSnapshot(b.data, "2026-10-01", "2026-10-08"),
  );
});
