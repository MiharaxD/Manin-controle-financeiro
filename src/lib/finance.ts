import type { Card, FinancialData, Snapshot, Transaction } from "./types";

export const MAX_CENTS = 2_000_000_000;
export function parseMoney(value: string): number {
  const clean = value.trim().replace(/^R\$\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(clean))
    throw new Error("Use um valor como 49,90.");
  const [whole, decimal = ""] = clean.replaceAll(".", "").split(",");
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS)
    throw new Error("Informe um valor positivo de até R$ 20 milhões.");
  return cents;
}
export function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
export function moneyInput(cents: number) {
  return `${Math.trunc(cents / 100)},${String(cents % 100).padStart(2, "0")}`;
}
export function todaySP(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function monthOf(date: string) {
  return `${date.slice(0, 7)}-01`;
}
export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
export function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  return (
    y >= 2000 &&
    y <= 2100 &&
    m >= 1 &&
    m <= 12 &&
    d >= 1 &&
    d <= daysInMonth(y, m)
  );
}
export function addMonths(
  date: string,
  months: number,
  anchor = Number(date.slice(8, 10)),
): string {
  const [y, m] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + months, 1));
  const year = next.getUTCFullYear(),
    month = next.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(anchor, daysInMonth(year, month))).padStart(2, "0")}`;
}
export function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}
export function monthLabel(month: string, short = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: short ? "short" : "long",
    year: "numeric",
  }).format(new Date(`${month}T12:00:00Z`));
}
export function splitInstallments(total: number, count: number): number[] {
  if (
    !Number.isSafeInteger(total) ||
    total <= 0 ||
    total > MAX_CENTS ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 60 ||
    count > total
  )
    throw new Error("Parcelamento inválido.");
  const base = Math.floor(total / count),
    rest = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < rest ? 1 : 0));
}
export function invoiceDates(
  purchase: string,
  card: Pick<Card, "closing_day" | "due_day">,
) {
  const day = Number(purchase.slice(8, 10));
  let closingMonth = monthOf(purchase);
  if (day > card.closing_day) closingMonth = addMonths(closingMonth, 1, 1);
  const [year, mon] = closingMonth.split("-").map(Number);
  const closeDay = Math.min(card.closing_day, daysInMonth(year, mon));
  let dueMonth = closingMonth;
  // The contractual day, rather than February's clamp, determines the next cycle.
  if (card.due_day <= card.closing_day) dueMonth = addMonths(dueMonth, 1, 1);
  let due = addMonths(dueMonth, 0, card.due_day);
  const close = `${closingMonth.slice(0, 8)}${String(closeDay).padStart(2, "0")}`;
  if (due <= close) {
    dueMonth = addMonths(dueMonth, 1, 1);
    due = addMonths(dueMonth, 0, card.due_day);
  }
  return { billing_month: dueMonth, due_date: due };
}
export function schedule(transaction: Transaction, card: Card) {
  const first = invoiceDates(transaction.purchase_date, card);
  return splitInstallments(
    transaction.amount_cents,
    transaction.installments_count,
  ).map((amount, i) => ({
    id: crypto.randomUUID(),
    transaction_id: transaction.id,
    card_id: card.id,
    number: i + 1,
    amount_cents: amount,
    billing_month: addMonths(first.billing_month, i, 1),
    due_date: addMonths(first.billing_month, i, card.due_day),
  }));
}
export function monthlyEquivalent(cents: number, interval: number) {
  return Math.round(cents / interval);
}
export function annualEquivalent(cents: number, interval: number) {
  return Math.round((cents * 12) / interval);
}
export function suggestCategory(
  merchant: string,
  history: Transaction[],
  fallback: string,
): string {
  const normalized = merchant.trim().toLocaleLowerCase("pt-BR");
  return (
    history.find(
      (t) =>
        normalized &&
        t.merchant.toLocaleLowerCase("pt-BR") === normalized &&
        t.category_id,
    )?.category_id ?? fallback
  );
}
export function buildSnapshot(
  data: FinancialData,
  month: string,
  today: string,
): Snapshot {
  const live = data.transactions.filter((t) => !t.deleted_at);
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(month, i - 5, 1);
    const actual = live.filter(
      (t) =>
        monthOf(t.purchase_date) === m &&
        t.status === "actual" &&
        t.purchase_date <= today,
    );
    const sum = (tx: Transaction[]) =>
      tx.reduce((n, t) => n + t.amount_cents, 0);
    return {
      month: m,
      expense: sum(actual.filter((t) => t.kind === "expense")),
      comparable_expense: sum(
        actual.filter(
          (t) =>
            t.kind === "expense" &&
            (month !== monthOf(today) ||
              Number(t.purchase_date.slice(8, 10)) <=
                Number(today.slice(8, 10))),
        ),
      ),
      income: sum(actual.filter((t) => t.kind === "income")),
      recurring_expense: sum(
        actual.filter((t) => t.kind === "expense" && t.recurrence_id),
      ),
      cash_in: sum(actual.filter((t) => t.kind === "income")),
      cash_out:
        sum(
          actual.filter(
            (t) => t.kind === "expense" && t.payment_method !== "credit",
          ),
        ) +
        data.payments
          .filter((p) => monthOf(p.paid_date) === m && p.paid_date <= today)
          .reduce((n, p) => n + p.amount_cents, 0),
      planned: sum(
        live.filter(
          (t) =>
            monthOf(t.purchase_date) === m &&
            t.kind === "expense" &&
            (t.status === "planned" || t.purchase_date > today),
        ),
      ),
    };
  });
  const category_totals = data.categories
    .map((c) => ({
      category_id: c.id,
      total: live
        .filter(
          (t) =>
            t.category_id === c.id &&
            t.kind === "expense" &&
            t.status === "actual" &&
            t.purchase_date <= today &&
            monthOf(t.purchase_date) === month,
        )
        .reduce((n, t) => n + t.amount_cents, 0),
    }))
    .filter((c) => c.total > 0);
  const groups = new Map<
    string,
    { card_id: string; billing_month: string; due_date: string; total: number }
  >();
  data.installments
    .filter((i) =>
      live.some(
        (t) =>
          t.id === i.transaction_id &&
          t.status === "actual" &&
          t.purchase_date <= today,
      ),
    )
    .forEach((i) => {
      const key = `${i.card_id}/${i.billing_month}`;
      const previous = groups.get(key);
      groups.set(key, {
        card_id: i.card_id,
        billing_month: i.billing_month,
        due_date: i.due_date,
        total: (previous?.total ?? 0) + i.amount_cents,
      });
    });
  const invoices = [...groups.values()]
    .map((i) => {
      const paid = data.payments
        .filter(
          (p) => p.card_id === i.card_id && p.billing_month === i.billing_month,
        )
        .reduce((n, p) => n + p.amount_cents, 0);
      return { ...i, paid, remaining: i.total - paid };
    })
    .sort((a, b) => a.billing_month.localeCompare(b.billing_month));
  return {
    month,
    today,
    categories: [...data.categories].sort((a, b) => a.position - b.position),
    accounts: data.accounts,
    cards: data.cards,
    recurrences: [...data.recurrences].sort((a, b) =>
      a.next_date.localeCompare(b.next_date),
    ),
    budgets: data.budgets.filter((b) => b.month === month),
    monthly,
    category_totals,
    invoices,
    transactions: live
      .filter((t) => monthOf(t.purchase_date) === month)
      .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date))
      .slice(0, 8),
  };
}
export const demoSnapshot = buildSnapshot;
