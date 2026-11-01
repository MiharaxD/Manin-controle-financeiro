import type {
  CategoryTotal,
  Entry,
  Filters,
  Installment,
  InvoicePayment,
  Transaction,
} from "@/lib/types";
export type Page =
  "home" | "transactions" | "recurrences" | "reports" | "budgets";
export type Loader = (
  filters: Partial<Filters> & { recurrence?: string },
  page: number,
  signal?: AbortSignal,
) => Promise<{
  rows: Entry[];
  count: number;
  // Over every filtered row, not only the current page.
  totals?: { income: number; expense: number };
  days?: Record<string, number>;
}>;
export type InvoiceLoader = (
  card: string,
  month: string,
  page: number,
) => Promise<{
  rows: (Installment & { transaction: Transaction })[];
  payments: InvoicePayment[];
  category_totals: CategoryTotal[];
  count: number;
}>;
