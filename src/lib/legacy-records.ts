import { z } from "zod";
import {
  accountSchema,
  budgetSchema,
  legacyRecurrenceSchema as recurrenceSchema,
  categorySchema,
  date,
  paymentSchema,
  transactionSchema,
} from "./schemas";
import {
  addMonths,
  invoiceDates,
  splitInstallments,
  MAX_CENTS,
  todaySP,
} from "./finance";
import type { FinancialData, Recurrence } from "./types";
const cardSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(60),
  institution: z.string().trim().max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  limit_cents: z.number().int().min(1).max(MAX_CENTS).nullable(),
  last_four: z.string().regex(/^\d{4}$|^$/),
  closing_day: z.number().int().min(1).max(31),
  due_day: z.number().int().min(1).max(31),
});
export type LegacyFinancialData = Omit<
  FinancialData,
  "cards" | "recurrences" | "recurrence_types" | "transactions"
> & {
  cards: z.infer<typeof cardSchema>[] & { id: string }[];
  recurrences: Omit<Recurrence, "type_id">[];
  transactions: Omit<FinancialData["transactions"][number], "credit_month">[];
};

const id = z.uuid();
export const timestamp = z.iso.datetime({ offset: true });
const transaction = transactionSchema
  .safeExtend({
    id,
    recurrence_id: id.nullable(),
    occurrence_date: date.nullable(),
    deleted_at: timestamp.nullable(),
  })
  .strict();
const installment = z.strictObject({
  id,
  transaction_id: id,
  card_id: id,
  number: z.number().int().min(1).max(60),
  amount_cents: z.number().int().min(1).max(MAX_CENTS),
  billing_month: date.refine((v) => v.endsWith("-01")),
  due_date: date,
});
export const legacyDataSchema = z.strictObject({
  categories: z.array(categorySchema.safeExtend({ id }).strict()).max(100000),
  accounts: z.array(accountSchema.safeExtend({ id }).strict()).max(100000),
  cards: z.array(cardSchema.safeExtend({ id }).strict()).max(100000),
  recurrences: z
    .array(recurrenceSchema.safeExtend({ id }).strict())
    .max(100000),
  budgets: z.array(budgetSchema.safeExtend({ id }).strict()).max(100000),
  transactions: z.array(transaction).max(100000),
  installments: z.array(installment).max(100000),
  payments: z.array(paymentSchema.safeExtend({ id }).strict()).max(100000),
});
export function validateLegacyData(input: unknown): LegacyFinancialData {
  if (
    new TextEncoder().encode(JSON.stringify(input)).byteLength >
    20 * 1024 * 1024 - 4096
  )
    throw new Error(
      "O conjunto excede o limite local de 20 MB. A operação foi cancelada para manter backups restauráveis.",
    );
  const parsed = legacyDataSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      "Dados inválidos em " +
        issue.path.join(".") +
        ". Confira os campos, datas e centavos inteiros.",
    );
  }
  const data = parsed.data;
  const fail = (message: string): never => {
    throw new Error("Dados inválidos: " + message);
  };
  let total = 0;
  for (const rows of Object.values(data)) {
    total += rows.length;
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      fail("IDs duplicados.");
  }
  if (total > 100000) fail("o conjunto excede 100 mil registros.");
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const accounts = new Set(data.accounts.map((a) => a.id));
  const cards = new Map(data.cards.map((c) => [c.id, c]));
  const recurrences = new Map(data.recurrences.map((r) => [r.id, r]));
  const transactions = new Map(data.transactions.map((t) => [t.id, t]));
  const ref = (
    value: string | null,
    exists: { has: (id: string) => boolean },
    label: string,
  ) => {
    if (value !== null && !exists.has(value))
      fail("vínculo inexistente em " + label + ".");
  };
  for (const c of data.categories) {
    ref(c.parent_id, categories, "categoria");
    if (
      c.parent_id &&
      (c.parent_id === c.id || categories.get(c.parent_id)?.parent_id)
    )
      fail("hierarquia de categorias inválida.");
  }
  for (const r of data.recurrences) {
    ref(r.category_id, categories, "recorrência");
    ref(r.card_id, cards, "recorrência");
    ref(r.account_id, accounts, "recorrência");
    if (
      r.payment_method === "credit" ? r.account_id !== null : r.card_id !== null
    )
      fail("conta/cartão de recorrência incompatível.");
  }
  const occurrences = new Set<string>();
  for (const t of data.transactions) {
    ref(t.category_id, categories, "lançamento");
    ref(t.card_id, cards, "lançamento");
    ref(t.account_id, accounts, "lançamento");
    ref(t.destination_account_id, accounts, "transferência");
    ref(t.recurrence_id, recurrences, "ocorrência");
    if (
      t.payment_method === "credit" ? t.account_id !== null : t.card_id !== null
    )
      fail("conta/cartão de lançamento incompatível.");
    if (
      t.kind === "transfer"
        ? t.category_id !== null
        : t.destination_account_id !== null
    )
      fail("transferência incompatível.");
    if (Boolean(t.recurrence_id) !== Boolean(t.occurrence_date))
      fail("ocorrência incompleta.");
    if ("make_recurring" in t)
      fail("campo de comando não é um registro financeiro.");
    if (t.recurrence_id) {
      const key = t.recurrence_id + "/" + t.occurrence_date;
      if (occurrences.has(key)) fail("ocorrência duplicada.");
      occurrences.add(key);
    }
  }
  const parts = new Map<string, typeof data.installments>();
  for (const i of data.installments) {
    ref(i.transaction_id, transactions, "parcela");
    ref(i.card_id, cards, "parcela");
    const tx = transactions.get(i.transaction_id)!;
    if (tx.payment_method !== "credit" || tx.card_id !== i.card_id)
      fail("parcela ligada a lançamento incompatível.");
    const list = parts.get(i.transaction_id) ?? [];
    list.push(i);
    parts.set(i.transaction_id, list);
  }
  const invoiceTotals = new Map<string, number>();
  for (const t of data.transactions) {
    const rows = parts.get(t.id) ?? [];
    if (t.payment_method !== "credit") {
      if (rows.length) fail("parcelas sem crédito.");
      continue;
    }
    const card = cards.get(t.card_id!)!;
    const first = invoiceDates(t.purchase_date, card);
    const amounts = splitInstallments(t.amount_cents, t.installments_count);
    if (rows.length !== amounts.length) fail("faltam parcelas.");
    const seen = new Set<number>();
    for (const i of rows) {
      const n = i.number - 1;
      if (
        seen.has(n) ||
        n >= amounts.length ||
        i.amount_cents !== amounts[n] ||
        i.billing_month !== addMonths(first.billing_month, n, 1) ||
        i.due_date !== addMonths(first.billing_month, n, card.due_day)
      )
        fail("valor ou calendário de parcela inválido.");
      seen.add(n);
      if (
        !t.deleted_at &&
        t.status === "actual" &&
        t.purchase_date <= todaySP()
      ) {
        const key = i.card_id + "/" + i.billing_month;
        invoiceTotals.set(key, (invoiceTotals.get(key) ?? 0) + i.amount_cents);
      }
    }
  }
  const paid = new Map<string, number>();
  for (const p of data.payments) {
    ref(p.card_id, cards, "pagamento");
    ref(p.account_id, accounts, "pagamento");
    if (p.paid_date > todaySP()) fail("pagamento em data futura.");
    const key = p.card_id + "/" + p.billing_month;
    paid.set(key, (paid.get(key) ?? 0) + p.amount_cents);
    if (paid.get(key)! > (invoiceTotals.get(key) ?? 0))
      fail("pagamentos excedem a fatura.");
  }
  const budgets = new Set<string>();
  for (const b of data.budgets) {
    ref(b.category_id, categories, "orçamento");
    const key = b.month + "/" + b.category_id;
    if (budgets.has(key)) fail("orçamento duplicado.");
    budgets.add(key);
  }
  return data;
}
