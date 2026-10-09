import { z } from "zod";
import { isDate, MAX_CENTS } from "./finance";
const id = z.uuid();
const nullableId = id.nullable();
export const date = z.string().refine(isDate, "Data inválida.");
const cents = z.number().int().min(1).max(MAX_CENTS);
const method = z.enum(["pix", "debit", "cash", "credit"]);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const transactionSchema = z
  .object({
    id: id.optional(),
    kind: z.enum(["expense", "income", "transfer"]),
    amount_cents: cents,
    purchase_date: date,
    description: z.string().trim().max(120),
    merchant: z.string().trim().max(100),
    category_id: nullableId,
    payment_method: method,
    card_id: nullableId,
    account_id: nullableId,
    destination_account_id: nullableId,
    installments_count: z.number().int().min(1).max(60),
    status: z.enum(["actual", "planned"]),
    recurrence_id: nullableId.optional(),
    occurrence_date: date.nullable().optional(),
    make_recurring: z.boolean().optional(),
    recurrence_type_id: nullableId.optional(),
  })
  .superRefine((v, ctx) => {
    const error = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (v.kind !== "transfer" && !v.category_id)
      error("Selecione uma categoria.");
    if (v.payment_method === "credit" && (v.kind !== "expense" || !v.card_id))
      error("Selecione um cartão para a despesa.");
    if (v.payment_method !== "credit" && !v.account_id)
      error("Selecione uma conta.");
    if (v.payment_method !== "credit" && v.installments_count !== 1)
      error("Parcelas exigem cartão de crédito.");
    if (v.installments_count > v.amount_cents)
      error("Cada parcela deve ter ao menos um centavo.");
    if (
      v.kind === "transfer" &&
      (!v.destination_account_id ||
        v.destination_account_id === v.account_id ||
        v.payment_method === "credit")
    )
      error("Escolha duas contas diferentes.");
    if (
      v.make_recurring &&
      (v.kind !== "expense" || v.installments_count !== 1)
    )
      error("Recorrência exige despesa sem parcelamento.");
    if (v.make_recurring && !v.recurrence_type_id)
      error("Selecione o tipo da recorrente.");
    if (v.recurrence_id && !v.occurrence_date)
      error("Informe a data da ocorrência.");
    if (v.recurrence_id && (v.kind !== "expense" || v.installments_count !== 1))
      error("Uma ocorrência deve ser despesa sem parcelamento.");
  });
export const cardSchema = z
  .object({
    id: id.optional(),
    name: z.string().trim().min(1).max(60),
  })
  .strict();
export const recurrenceTypeSchema = z
  .object({
    id: id.optional(),
    name: z.string().trim().min(1).max(60),
  })
  .strict();
export const categorySchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(1).max(60),
  icon: z.enum([
    "utensils",
    "cart",
    "car",
    "home",
    "heart",
    "sparkles",
    "game",
    "laptop",
    "bag",
    "book",
    "cloud",
    "circle",
  ]),
  color,
  parent_id: nullableId,
  position: z.number().int().min(0).max(999),
});
export const accountSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(1).max(60),
});
export const budgetSchema = z.object({
  id: id.optional(),
  month: date.refine((v) => v.endsWith("-01")),
  category_id: nullableId,
  amount_cents: cents,
});
export const legacyRecurrenceSchema = z
  .object({
    id: id.optional(),
    name: z.string().trim().min(1).max(80),
    amount_cents: cents,
    category_id: id,
    payment_method: method,
    card_id: nullableId,
    account_id: nullableId,
    interval_months: z.number().int().min(1).max(12),
    next_date: date,
    anchor_day: z.number().int().min(1).max(31),
    status: z.enum(["active", "paused", "cancelled"]),
  })
  .refine(
    (v) => (v.payment_method === "credit" ? !!v.card_id : !!v.account_id),
    "Selecione a conta ou cartão.",
  );
export const recurrenceSchema = legacyRecurrenceSchema.safeExtend({
  type_id: id,
});
export const paymentSchema = z.object({
  id: id.optional(),
  card_id: id,
  billing_month: date.refine((v) => v.endsWith("-01")),
  amount_cents: cents,
  paid_date: date,
  account_id: id,
});
export const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("transaction"),
    payload: transactionSchema.refine(
      (v) => v.kind !== "transfer",
      "Novos lançamentos devem ser despesa ou receita.",
    ),
  }),
  z.object({ action: z.literal("card"), payload: cardSchema }),
  z.object({ action: z.literal("category"), payload: categorySchema }),
  z.object({ action: z.literal("account"), payload: accountSchema }),
  z.object({ action: z.literal("budget"), payload: budgetSchema }),
  z.object({ action: z.literal("recurrence"), payload: recurrenceSchema }),
  z.object({
    action: z.literal("recurrence_type"),
    payload: recurrenceTypeSchema,
  }),
  z.object({ action: z.literal("payment"), payload: paymentSchema }),
  z.object({
    action: z.literal("delete"),
    payload: z.object({
      id,
      entity: z.enum([
        "transaction",
        "card",
        "category",
        "budget",
        "account",
        "recurrence_type",
      ]),
    }),
  }),
  z.object({ action: z.literal("restore"), payload: z.object({ id }) }),
  z.object({
    action: z.literal("clear"),
    payload: z.object({ confirmation: z.literal("EXCLUIR") }),
  }),
]);
