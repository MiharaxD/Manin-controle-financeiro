import type {
  CategoryTotal,
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
) => Promise<{ rows: Transaction[]; count: number }>;
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
