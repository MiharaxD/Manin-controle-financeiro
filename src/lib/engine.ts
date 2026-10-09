import {
  addMonths,
  buildSnapshot,
  schedule,
  todaySP,
  monthOf,
} from "./finance";
import { mutationSchema } from "./schemas";
import { validateData } from "./records";
import { createEmptyData } from "./initial-data";
import type { FinancialData, Mutation, Transaction } from "./types";
const uid = () => crypto.randomUUID();
export function applyMutation(
  input: FinancialData,
  mutation: Mutation,
  today = todaySP(),
  now = new Date().toISOString(),
): FinancialData {
  validateData(input);
  const parsed = mutationSchema.parse(mutation),
    data = structuredClone(input);
  const paid = (id: string) =>
    data.installments.some(
      (i) =>
        i.transaction_id === id &&
        data.payments.some(
          (payment) =>
            payment.card_id === i.card_id &&
            payment.billing_month === i.billing_month,
        ),
    );
  if (parsed.action === "transaction") {
    const value = parsed.payload,
      id = value.id ?? uid(),
      old = data.transactions.find((t) => t.id === id);
    if (old?.kind === "transfer")
      throw new Error(
        "Transferência antiga preservada no histórico. Crie uma despesa ou receita nova.",
      );
    if (old?.deleted_at)
      throw new Error("Restaure o lançamento antes de editar.");
    if (paid(id))
      throw new Error(
        "Compra vinculada a uma fatura com pagamento. Histórico preservado.",
      );
    let recurrence_id = value.recurrence_id ?? null,
      occurrence_date = value.occurrence_date ?? null;
    if (value.make_recurring) {
      if (
        old?.recurrence_id &&
        old.amount_cents === value.amount_cents &&
        old.purchase_date === value.purchase_date &&
        old.category_id === value.category_id &&
        old.payment_method === value.payment_method &&
        old.card_id === value.card_id &&
        old.account_id === value.account_id &&
        old.description === value.description &&
        old.merchant === value.merchant &&
        old.status === value.status
      )
        return data;
      if (old) throw new Error("Crie uma nova despesa para tornar recorrente.");
      const anchor = Number(value.purchase_date.slice(8, 10));
      recurrence_id = uid();
      occurrence_date = value.purchase_date;
      data.recurrences.push({
        id: recurrence_id,
        name: value.merchant || value.description || "Despesa recorrente",
        type_id: value.recurrence_type_id!,
        amount_cents: value.amount_cents,
        category_id: value.category_id!,
        payment_method: value.payment_method,
        card_id: value.card_id,
        account_id: value.account_id,
        interval_months: 1,
        next_date: addMonths(value.purchase_date, 1, anchor),
        anchor_day: anchor,
        status: "active",
      });
    } else if (recurrence_id && !old) {
      const r = data.recurrences.find((r) => r.id === recurrence_id);
      if (!r || r.status !== "active" || r.next_date !== occurrence_date)
        throw new Error("Selecione a próxima ocorrência ativa.");
      if (
        data.transactions.some(
          (t) =>
            t.recurrence_id === recurrence_id &&
            t.occurrence_date === occurrence_date,
        )
      )
        throw new Error("Ocorrência já registrada.");
      r.next_date = addMonths(r.next_date, r.interval_months, r.anchor_day);
    }
    const {
      make_recurring: command,
      recurrence_type_id: typeCommand,
      ...fields
    } = value;
    void command;
    void typeCommand;
    const t: Transaction = {
      ...fields,
      id,
      recurrence_id,
      occurrence_date,
      deleted_at: null,
      credit_month:
        value.payment_method === "credit"
          ? old?.purchase_date === value.purchase_date &&
            old.card_id === value.card_id
            ? old.credit_month
            : monthOf(value.purchase_date)
          : null,
    };
    data.transactions = [...data.transactions.filter((t) => t.id !== id), t];
    data.installments = data.installments.filter(
      (i) => i.transaction_id !== id,
    );
    if (t.payment_method === "credit")
      data.installments.push(
        ...schedule(
          t,
          data.cards.find((c) => c.id === t.card_id)!,
        ).map((i) => {
          const previous = input.installments.find(
            (oldPart) =>
              oldPart.transaction_id === id &&
              oldPart.number === i.number &&
              oldPart.billing_month === i.billing_month,
          );
          return previous &&
            old?.purchase_date === t.purchase_date &&
            old.card_id === t.card_id &&
            old.installments_count === t.installments_count
            ? { ...i, due_date: previous.due_date }
            : i;
        }),
      );
  } else if (parsed.action === "payment") {
    const value = parsed.payload;
    if (value.paid_date > today)
      throw new Error("Informe uma data efetiva, até hoje.");
    const previous = data.payments.find((payment) => payment.id === value.id);
    if (previous) {
      const fields = [
        "card_id",
        "billing_month",
        "amount_cents",
        "paid_date",
        "account_id",
      ] as const;
      if (fields.some((key) => previous[key] !== value[key]))
        throw new Error(
          "Pagamento já existe com outros dados. Histórico preservado.",
        );
      return data;
    }
    const invoice = buildSnapshot(
      data,
      value.billing_month,
      today,
    ).invoices.find(
      (i) =>
        i.card_id === value.card_id && i.billing_month === value.billing_month,
    );
    if (!invoice || value.amount_cents > invoice.remaining)
      throw new Error("Valor excede o saldo da fatura.");
    data.payments.push({ ...value, id: value.id ?? uid() });
  } else if (parsed.action === "delete") {
    const value = parsed.payload;
    if (value.entity === "transaction") {
      if (paid(value.id))
        throw new Error(
          "Compra vinculada a fatura com pagamento; histórico preservado.",
        );
      const t = data.transactions.find((t) => t.id === value.id);
      if (t && !t.deleted_at) t.deleted_at = now;
    } else {
      const key = {
        card: "cards",
        category: "categories",
        budget: "budgets",
        account: "accounts",
        recurrence_type: "recurrence_types",
      }[value.entity] as
        "cards" | "categories" | "budgets" | "accounts" | "recurrence_types";
      if (
        key === "recurrence_types" &&
        data.recurrences.some((r) => r.type_id === value.id)
      )
        throw new Error(
          "Tipo em uso por uma recorrente. Troque o tipo dela antes de excluir.",
        );
      if (
        key === "cards" &&
        (data.transactions.some((t) => t.card_id === value.id) ||
          data.recurrences.some((r) => r.card_id === value.id))
      )
        throw new Error("Cartão em uso.");
      if (
        key === "categories" &&
        (data.transactions.some((t) => t.category_id === value.id) ||
          data.recurrences.some((r) => r.category_id === value.id) ||
          data.categories.some((c) => c.parent_id === value.id) ||
          data.budgets.some((b) => b.category_id === value.id))
      )
        throw new Error("Categoria em uso.");
      if (
        key === "accounts" &&
        (data.transactions.some(
          (t) =>
            t.account_id === value.id || t.destination_account_id === value.id,
        ) ||
          data.recurrences.some((r) => r.account_id === value.id) ||
          data.payments.some((payment) => payment.account_id === value.id))
      )
        throw new Error("Conta em uso.");
      data[key] = data[key].filter((item) => item.id !== value.id) as never;
    }
  } else if (parsed.action === "restore") {
    const t = data.transactions.find((t) => t.id === parsed.payload.id);
    if (!t?.deleted_at || Date.parse(now) - Date.parse(t.deleted_at) > 600000)
      throw new Error("O prazo de 10 minutos para desfazer terminou.");
    t.deleted_at = null;
  } else if (parsed.action === "clear") {
    return createEmptyData();
  } else {
    const key = {
      card: "cards",
      category: "categories",
      account: "accounts",
      budget: "budgets",
      recurrence: "recurrences",
      recurrence_type: "recurrence_types",
    }[parsed.action] as
      | "cards"
      | "categories"
      | "accounts"
      | "budgets"
      | "recurrences"
      | "recurrence_types";
    if (parsed.action === "category" && parsed.payload.parent_id) {
      const parent = data.categories.find(
        (c) => c.id === parsed.payload.parent_id,
      );
      if (
        !parent ||
        parent.parent_id ||
        parent.id === parsed.payload.id ||
        data.categories.some((c) => c.parent_id === parsed.payload.id)
      )
        throw new Error("Use apenas um nível de subcategorias, sem ciclos.");
    }
    if (
      parsed.action === "budget" &&
      data.budgets.some(
        (b) =>
          b.id !== parsed.payload.id &&
          b.month === parsed.payload.month &&
          b.category_id === parsed.payload.category_id,
      )
    )
      throw new Error("Já existe um orçamento para esta categoria e mês.");
    const value = parsed.payload;
    data[key] = [
      ...data[key].filter((item) => item.id !== value.id),
      { ...value, id: value.id ?? uid() },
    ] as never;
  }
  return validateData(data);
}
export function generateDue(
  input: FinancialData,
  today = todaySP(),
): FinancialData {
  let data = structuredClone(input);
  for (const r of [...data.recurrences]) {
    let count = 0;
    while (r.status === "active" && r.next_date <= today) {
      if (count++ >= 1400) throw new Error("Período de recorrência excedido.");
      const existing = data.transactions.find(
        (t) => t.recurrence_id === r.id && t.occurrence_date === r.next_date,
      );
      if (!existing)
        data = applyMutation(
          data,
          {
            action: "transaction",
            payload: {
              kind: "expense",
              amount_cents: r.amount_cents,
              purchase_date: r.next_date,
              description: r.name,
              merchant: r.name,
              category_id: r.category_id,
              payment_method: r.payment_method,
              card_id: r.card_id,
              account_id: r.account_id,
              destination_account_id: null,
              installments_count: 1,
              status: "actual",
              recurrence_id: r.id,
              occurrence_date: r.next_date,
            },
          },
          today,
        );
      else
        data.recurrences.find((item) => item.id === r.id)!.next_date =
          addMonths(r.next_date, r.interval_months, r.anchor_day);
      r.next_date = data.recurrences.find(
        (item) => item.id === r.id,
      )!.next_date;
    }
  }
  return data;
}
