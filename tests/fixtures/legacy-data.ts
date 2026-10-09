import { createDemo } from "../../src/lib/demo";
import {
  addMonths,
  invoiceDates,
  splitInstallments,
} from "../../src/lib/finance";
import { validateLegacyData } from "../../src/lib/legacy-records";

/** Historical format fixture, never used by the app or personal datasets. */
export function createLegacyData() {
  const current = createDemo("2026-10-08");
  const cards = current.cards.map((c) => ({
    ...c,
    institution: "Banco de teste",
    color: "#ff1828",
    limit_cents: 100000,
    last_four: "1234",
    closing_day: 25,
    due_day: 2,
  }));
  const { recurrence_types: types, ...data } = current;
  void types;
  const transactions = current.transactions.map(({ credit_month, ...t }) => {
    void credit_month;
    return t;
  });
  const installments = transactions
    .filter((t) => t.payment_method === "credit")
    .flatMap((t) => {
      const card = cards.find((c) => c.id === t.card_id)!;
      const first = invoiceDates(t.purchase_date, card);
      return splitInstallments(t.amount_cents, t.installments_count).map(
        (amount_cents, n) => ({
          id: crypto.randomUUID(),
          transaction_id: t.id,
          card_id: card.id,
          number: n + 1,
          amount_cents,
          billing_month: addMonths(first.billing_month, n, 1),
          due_date: addMonths(first.due_date, n, card.due_day),
        }),
      );
    });
  transactions.push({
    ...transactions.find((t) => t.payment_method === "pix")!,
    id: crypto.randomUUID(),
    kind: "transfer",
    category_id: null,
    recurrence_id: null,
    occurrence_date: null,
    installments_count: 1,
    account_id: data.accounts[0].id,
    destination_account_id: data.accounts[1].id,
  });
  const paid = installments.find((i) => i.billing_month === "2026-10-01")!;
  return validateLegacyData({
    ...data,
    cards,
    transactions,
    installments,
    payments: [
      {
        id: crypto.randomUUID(),
        card_id: paid.card_id,
        billing_month: paid.billing_month,
        amount_cents: 100,
        account_id: data.accounts[0].id,
        paid_date: "2026-10-01",
      },
    ],
    recurrences: current.recurrences.map(({ type_id, ...r }) => {
      void type_id;
      return r;
    }),
  });
}
