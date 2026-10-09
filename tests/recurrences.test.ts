import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { createEmptyData } from "../src/lib/initial-data";
import { applyMutation, generateDue } from "../src/lib/engine";
import { createBackup, parseBackup } from "../src/lib/backup";
import { validateData } from "../src/lib/records";
import { migratePreviousData } from "../src/lib/migrations";
import { LocalStore } from "../src/lib/local-store";
import { buildSnapshot } from "../src/lib/finance";
import { createLegacyData } from "./fixtures/legacy-data";

function creditData(date = "2024-01-31", count = 3) {
  let d = createEmptyData();
  const id = crypto.randomUUID();
  d = applyMutation(d, {
    action: "card",
    payload: { id, name: "Meu apelido" },
  });
  return applyMutation(d, {
    action: "transaction",
    payload: {
      kind: "expense",
      amount_cents: 10001,
      purchase_date: date,
      description: "",
      merchant: "Teste calendário",
      category_id: d.categories[0].id,
      payment_method: "credit",
      card_id: id,
      account_id: null,
      destination_account_id: null,
      installments_count: count,
      status: "actual",
    },
  });
}
test("crédito por mês da compra atravessa fevereiro bissexto e dezembro sem ciclo bancário", () => {
  const leap = creditData();
  assert.deepEqual(
    leap.installments.map((i) => [i.billing_month, i.due_date, i.amount_cents]),
    [
      ["2024-01-01", "2024-01-31", 3334],
      ["2024-02-01", "2024-02-29", 3334],
      ["2024-03-01", "2024-03-31", 3333],
    ],
  );
  assert.deepEqual(
    creditData("2025-12-31").installments.map((i) => i.billing_month),
    ["2025-12-01", "2026-01-01", "2026-02-01"],
  );
});
test("cartão aceita somente apelido e renomear não altera parcelas ou pagamentos", () => {
  const d = creditData(),
    before = structuredClone(d.installments);
  const changed = applyMutation(d, {
    action: "card",
    payload: { ...d.cards[0], name: "Casa" },
  });
  assert.deepEqual(changed.installments, before);
  for (const extra of [
    { last_four: "1234" },
    { institution: "Banco" },
    { limit_cents: 1000 },
    { closing_day: 25 },
    { due_day: 2 },
    { color: "#ffffff" },
  ])
    assert.throws(() =>
      applyMutation(d, {
        action: "card",
        payload: { ...d.cards[0], ...extra },
      }),
    );
});
test("tipos personalizados persistem no backup; duplicatas, vínculos cruzados e exclusão em uso são recusados", () => {
  let d = createEmptyData();
  const id = crypto.randomUUID();
  d = applyMutation(d, {
    action: "recurrence_type",
    payload: { id, name: "Academia" },
  });
  const recurrence = {
    id: crypto.randomUUID(),
    type_id: id,
    name: "Treino",
    amount_cents: 101,
    category_id: d.categories[0].id,
    payment_method: "pix",
    card_id: null,
    account_id: d.accounts[0].id,
    interval_months: 1,
    next_date: "2024-01-31",
    anchor_day: 31,
    status: "active",
  };
  d = applyMutation(d, { action: "recurrence", payload: recurrence });
  assert.throws(
    () =>
      applyMutation(d, {
        action: "recurrence_type",
        payload: { name: "  ACADEMIA  " },
      }),
    /nomes repetidos/,
  );
  assert.throws(
    () =>
      applyMutation(d, {
        action: "delete",
        payload: { entity: "recurrence_type", id },
      }),
    /Tipo em uso/,
  );
  assert.throws(
    () =>
      applyMutation(d, {
        action: "recurrence",
        payload: {
          ...recurrence,
          type_id: createEmptyData().recurrence_types[0].id,
        },
      }),
    /vínculo/,
  );
  d = applyMutation(d, {
    action: "recurrence_type",
    payload: { id, name: "Fitness" },
  });
  const generated = generateDue(d, "2024-03-31");
  assert.deepEqual(
    generated.transactions.map((t) => t.purchase_date),
    ["2024-01-31", "2024-02-29", "2024-03-31"],
  );
  assert.deepEqual(
    parseBackup(JSON.stringify(createBackup(generated, crypto.randomUUID())))
      .data,
    generated,
  );
});
test("lançamento recorrente exige tipo e alternar crédito/Pix preserva o histórico", () => {
  let d = creditData("2024-01-31", 1);
  const purchase = d.transactions[0];
  assert.throws(
    () =>
      applyMutation(d, {
        action: "transaction",
        payload: { ...purchase, id: crypto.randomUUID(), make_recurring: true },
      }),
    /tipo da recorrente/,
  );
  d = applyMutation(d, {
    action: "transaction",
    payload: {
      ...purchase,
      id: crypto.randomUUID(),
      make_recurring: true,
      recurrence_type_id: d.recurrence_types[1].id,
    },
  });
  const old = structuredClone(d.transactions),
    r = d.recurrences[0];
  d = applyMutation(d, {
    action: "recurrence",
    payload: {
      ...r,
      payment_method: "pix",
      card_id: null,
      account_id: d.accounts[0].id,
    },
  });
  assert.deepEqual(d.transactions, old);
  const generated = generateDue(d, "2024-02-29");
  assert.equal(generated.transactions.at(-1)!.payment_method, "pix");
  assert.equal(generated.recurrences[0].type_id, r.type_id);
  assert.equal(generated.recurrences[0].next_date, "2024-03-31");
});
test("backup v2 migra só metadados de cartão; preserva IDs, calendário, pagamentos e transferências antigas", () => {
  const old = createLegacyData(),
    original = structuredClone(old),
    dataset_id = crypto.randomUUID();
  const migrated = parseBackup(
    JSON.stringify({
      format: "manin-backup",
      version: 2,
      dataset_id,
      source: "local",
      exported_at: new Date().toISOString(),
      data: old,
    }),
  );
  assert.equal(migrated.version, 3);
  assert.equal(migrated.dataset_id, dataset_id);
  assert.deepEqual(old, original);
  assert.deepEqual(
    migrated.data.cards,
    old.cards.map((c) => ({ id: c.id, name: c.name })),
  );
  assert.deepEqual(migrated.data.installments, old.installments);
  assert.deepEqual(migrated.data.payments, old.payments);
  assert.deepEqual(
    migrated.data.transactions.map(({ credit_month, ...t }) => {
      void credit_month;
      return t;
    }),
    old.transactions,
  );
  assert.ok(
    migrated.data.recurrences.every(
      (r) =>
        migrated.data.recurrence_types.find((t) => t.id === r.type_id)?.name ===
        "Outros",
    ),
  );
  const before = buildSnapshot(migrated.data, "2026-10-01", "2026-10-08");
  const renamed = applyMutation(migrated.data, {
    action: "card",
    payload: { ...migrated.data.cards[0], name: "Novo nome" },
  });
  assert.deepEqual(
    buildSnapshot(renamed, "2026-10-01", "2026-10-08").monthly,
    before.monthly,
  );
});
async function seedOld(factory: IDBFactory, record: unknown) {
  await new Promise<void>((resolve, reject) => {
    const req = factory.open("manin-device-v1", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("datasets");
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result,
        tx = db.transaction("datasets", "readwrite");
      tx.objectStore("datasets").put(record, "local");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => reject(tx.error);
    };
  });
}
test("IndexedDB antigo migra atomicamente, grava versão nova e reabre com os mesmos tipos", async () => {
  const factory = new IDBFactory(),
    old = createLegacyData();
  const record = {
    version: 1,
    dataset_id: crypto.randomUUID(),
    revision: 7,
    data: old,
    noticeAcknowledged: true,
    driveReceipts: [
      {
        account: "teste@example.com",
        file_id: "verified",
        confirmed_at: "2026-10-09T12:00:00Z",
      },
    ],
  };
  await seedOld(factory, record);
  const s = new LocalStore("local", factory);
  const changed = await s.read();
  assert.equal(changed.version, 2);
  assert.equal(changed.revision, 8);
  assert.equal(changed.dataset_id, record.dataset_id);
  assert.deepEqual(changed.driveReceipts, record.driveReceipts);
  assert.deepEqual(changed.data.installments, old.installments);
  s.close();
  const reopen = new LocalStore("local", factory);
  assert.deepEqual(await reopen.read(), changed);
  reopen.close();
});
test("migração inválida ou falha de importação mantém o conjunto inteiro intacto", async () => {
  const s = new LocalStore("local", new IDBFactory());
  const before = await s.read();
  const old = createLegacyData();
  old.installments[0].billing_month = "2026-03-01";
  assert.throws(() => migratePreviousData(old), /calendário/);
  const invalid = createBackup(creditData(), crypto.randomUUID());
  invalid.data.recurrence_types.push({
    ...invalid.data.recurrence_types[0],
    id: crypto.randomUUID(),
  });
  await assert.rejects(s.replace(invalid, before.revision), /nomes repetidos/);
  assert.deepEqual(await s.read(), before);
  s.close();
});
test("tipos e cartões de um conjunto não podem ser usados em outro", () => {
  const a = creditData(),
    b = creditData();
  a.transactions[0].card_id = b.cards[0].id;
  assert.throws(() => validateData(a), /vínculo/);
});

test("leitura de dados antigos danificados não grava migração parcial", async () => {
  const factory = new IDBFactory(),
    data = createLegacyData();
  data.payments[0].account_id = crypto.randomUUID();
  const old = {
    version: 1,
    dataset_id: crypto.randomUUID(),
    revision: 4,
    noticeAcknowledged: true,
    driveReceipts: [],
    data,
  };
  await seedOld(factory, old);
  const s = new LocalStore("local", factory);
  await assert.rejects(s.read(), /vínculo/);
  s.close();
  await new Promise<void>((resolve, reject) => {
    const req = factory.open("manin-device-v1", 2);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result,
        get = db.transaction("datasets").objectStore("datasets").get("local");
      get.onsuccess = () => {
        assert.deepEqual(get.result, old);
        db.close();
        resolve();
      };
      get.onerror = () => reject(get.error);
    };
  });
});
