import { validateLegacyData } from "./legacy-records";
import { validateData } from "./records";
import { createRecurrenceTypes } from "./initial-data";
import type { FinancialData } from "./types";

/** Validates the old ledger before dropping card metadata. Financial IDs/dates survive. */
export function migratePreviousData(input: unknown): FinancialData {
  const previous = validateLegacyData(input);
  const recurrence_types = createRecurrenceTypes();
  const other = recurrence_types.find((t) => t.name === "Outros")!;
  return validateData({
    ...previous,
    cards: previous.cards.map((c) => ({ id: c.id, name: c.name })),
    recurrence_types,
    recurrences: previous.recurrences.map((r) => ({ ...r, type_id: other.id })),
    transactions: previous.transactions.map((t) => ({
      ...t,
      credit_month:
        t.payment_method === "credit"
          ? (previous.installments.find(
              (i) => i.transaction_id === t.id && i.number === 1,
            )?.billing_month ?? null)
          : null,
    })),
  });
}
