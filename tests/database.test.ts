import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { addMonths, invoiceDates, monthOf, todaySP } from "../src/lib/finance";
import type { Snapshot } from "../src/lib/types";

test("migration real: isolamento, permissões, parcelas, calendário, pagamentos, exclusão e recorrências", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to public;`);
    await db.exec(
      await readFile("supabase/migrations/202610080001_initial.sql", "utf8"),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/202610080002_invoice_categories.sql",
        "utf8",
      ),
    );
    const a = crypto.randomUUID(),
      b = crypto.randomUUID(),
      today = todaySP(),
      month = monthOf(today);
    await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
    const as = async (id: string, role = "authenticated") => {
      await db.exec(`reset role; set role ${role}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
    };
    const rpc = async <T>(name: string, payload?: unknown): Promise<T> => {
      const result = await db.query<{ result: T }>(
        `select public.${name}(${payload === undefined ? "" : "$1::jsonb"}) as result`,
        payload === undefined ? [] : [JSON.stringify(payload)],
      );
      return result.rows[0].result;
    };
    const snapshot = async () =>
      (
        await db.query<{ result: Snapshot }>(
          "select public.snapshot($1::date) result",
          [month],
        )
      ).rows[0].result;
    await as(a);
    await rpc("bootstrap");
    const initial = await snapshot();
    assert.equal(initial.categories.length, 12);
    assert.equal(initial.accounts.length, 2);
    await rpc("bootstrap");
    assert.equal((await snapshot()).categories.length, 12);
    const account = initial.accounts[0].id,
      category = initial.categories[0].id;
    const cardId = crypto.randomUUID();
    const card = {
      id: cardId,
      name: "Teste",
      institution: "",
      color: "#214b38",
      limit_cents: 500000,
      last_four: "4829",
      closing_day: 25,
      due_day: 2,
    };
    await db.query("select public.save_entity('card',$1::jsonb)", [
      JSON.stringify(card),
    ]);
    const tx = {
      id: crypto.randomUUID(),
      kind: "expense",
      amount_cents: 10001,
      purchase_date: today,
      description: "Teste centavos",
      merchant: "Loja",
      category_id: category,
      payment_method: "credit",
      card_id: cardId,
      account_id: null,
      destination_account_id: null,
      installments_count: 3,
      status: "actual",
      recurrence_id: null,
      occurrence_date: null,
    };
    await rpc("save_transaction", tx);
    await rpc("save_transaction", tx);
    const installments = (
      await db.query<{ amount_cents: number; billing_month: string }>(
        "select amount_cents,billing_month::text from public.installments order by number",
      )
    ).rows;
    assert.deepEqual(
      installments.map((i) => i.amount_cents),
      [3334, 3334, 3333],
    );
    assert.equal(
      installments[0].billing_month,
      invoiceDates(today, card).billing_month,
    );
    const invoiceCategories = (
      await db.query<{ value: { total: number }[] }>(
        "select public.invoice_categories($1,$2::date) as value",
        [cardId, installments[0].billing_month],
      )
    ).rows[0].value;
    assert.equal(invoiceCategories[0].total, 3334);
    const before = await snapshot();
    assert.equal(before.monthly.at(-1)!.expense, 10001);
    await db.query("select public.delete_entity('transaction',$1::uuid)", [
      tx.id,
    ]);
    assert.equal((await snapshot()).monthly.at(-1)!.expense, 0);
    await db.query("select public.restore_transaction($1::uuid)", [tx.id]);
    assert.equal((await snapshot()).monthly.at(-1)!.expense, 10001);
    const payment = {
      id: crypto.randomUUID(),
      card_id: cardId,
      billing_month: installments[0].billing_month,
      amount_cents: 3000,
      paid_date: today,
      account_id: account,
    };
    await rpc("pay_invoice", payment);
    await rpc("pay_invoice", payment);
    const after = await snapshot();
    assert.equal(after.monthly.at(-1)!.expense, 10001);
    assert.equal(after.monthly.at(-1)!.cash_out, 3000);
    assert.equal(after.invoices[0].remaining, 334);
    await assert.rejects(
      rpc("pay_invoice", {
        ...payment,
        id: crypto.randomUUID(),
        amount_cents: 335,
      }),
    );
    await assert.rejects(
      rpc("save_transaction", { ...tx, amount_cents: 9000 }),
    );
    await assert.rejects(
      db.query("select public.delete_entity('transaction',$1::uuid)", [tx.id]),
    );
    await assert.rejects(
      db.query("update public.transactions set amount_cents=1"),
    );
    await as(b);
    await rpc("bootstrap");
    const own = await snapshot();
    assert.equal(own.cards.length, 0);
    assert.deepEqual((await db.query<{ value: unknown[] }>("select public.invoice_categories($1,$2::date) as value", [cardId, installments[0].billing_month])).rows[0].value, []);
    assert.equal(own.monthly.at(-1)!.expense, 0);
    assert.equal(
      (await db.query("select * from public.installments")).rows.length,
      0,
    );
    await assert.rejects(rpc("save_transaction", tx));
    await assert.rejects(
      db.query("select public.save_entity('card',$1::jsonb)", [
        JSON.stringify(card),
      ]),
    );
    await assert.rejects(
      rpc("save_transaction", {
        ...tx,
        id: crypto.randomUUID(),
        category_id: own.categories[0].id,
        card_id: cardId,
      }),
    );
    await assert.rejects(
      db.query("select public.generate_for_user($1::uuid)", [a]),
    );
    await assert.rejects(db.query("select public.generate_all_recurring()"));
    await as("", "anon");
    await assert.rejects(db.query("select * from public.transactions"));
    await assert.rejects(rpc("bootstrap"));
    await assert.rejects(rpc("save_transaction", tx));
    await as(a);
    const r = {
      id: crypto.randomUUID(),
      name: "Serviço",
      amount_cents: 1990,
      category_id: category,
      payment_method: "pix",
      card_id: null,
      account_id: account,
      interval_months: 1,
      next_date: addMonths(today, -2),
      anchor_day: Number(today.slice(8)),
      status: "active",
    };
    await db.query("select public.save_entity('recurrence',$1::jsonb)", [
      JSON.stringify(r),
    ]);
    await rpc("generate_recurring");
    await rpc("generate_recurring");
    const history = (
      await db.query<{ amount_cents: number }>(
        "select amount_cents,occurrence_date::text from public.transactions where recurrence_id=$1 order by occurrence_date",
        [r.id],
      )
    ).rows;
    assert.equal(history.length, 3);
    assert.ok(history.every((row) => row.amount_cents === 1990));
    const updated = (await snapshot()).recurrences.find(
      (item) => item.id === r.id,
    )!;
    await db.query("select public.save_entity('recurrence',$1::jsonb)", [
      JSON.stringify({ ...updated, amount_cents: 2990, next_date: today }),
    ]);
    await rpc("generate_recurring");
    assert.equal(
      (
        await db.query(
          "select * from public.transactions where recurrence_id=$1",
          [r.id],
        )
      ).rows.length,
      3,
    );
    await db.query("select public.save_entity('recurrence',$1::jsonb)", [
      JSON.stringify({
        ...updated,
        amount_cents: 2990,
        status: "paused",
        next_date: today,
      }),
    ]);
    await rpc("generate_recurring");
    assert.equal(
      (
        await db.query(
          "select * from public.transactions where recurrence_id=$1",
          [r.id],
        )
      ).rows.length,
      3,
    );
    const manual = {
      ...tx,
      id: crypto.randomUUID(),
      payment_method: "pix",
      card_id: null,
      account_id: account,
      installments_count: 1,
      make_recurring: true,
    };
    await rpc("save_transaction", manual);
    await rpc("save_transaction", manual);
    assert.equal(
      (
        await db.query("select * from public.transactions where id=$1", [
          manual.id,
        ])
      ).rows.length,
      1,
    );
    assert.equal((await snapshot()).recurrences.length, 2);
    // SQL and TypeScript agree on edge dates in leap years and year rollover.
    await db.exec("reset role");
    for (const [closing, due] of [
      [25, 2],
      [30, 31],
      [31, 1],
      [20, 28],
    ])
      for (const purchase of [
        "2024-02-28",
        "2024-02-29",
        "2026-02-28",
        "2026-12-25",
        "2026-12-26",
        "2026-12-31",
      ]) {
        const result = (
          await db.query<{ value: string }>(
            "select public.first_invoice($1::date,$2,$3)::text as value",
            [purchase, closing, due],
          )
        ).rows[0].value;
        assert.equal(
          result,
          invoiceDates(purchase, { closing_day: closing, due_day: due })
            .billing_month,
        );
      }
    await as(a);
    await db.query("select public.clear_data('EXCLUIR')");
    assert.equal((await snapshot()).transactions.length, 0);
    await as(b);
    assert.equal((await snapshot()).categories.length, 12); // A's deletion never touches B.
  } finally {
    await db.close();
  }
});
