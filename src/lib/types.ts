export type Kind = "expense" | "income" | "transfer";
export type Method = "pix" | "debit" | "cash" | "credit";
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  position: number;
}
export interface Account {
  id: string;
  name: string;
}
export interface Card {
  id: string;
  name: string;
  institution: string;
  color: string;
  limit_cents: number | null;
  last_four: string;
  closing_day: number;
  due_day: number;
}
export interface Transaction {
  id: string;
  kind: Kind;
  amount_cents: number;
  purchase_date: string;
  description: string;
  merchant: string;
  category_id: string | null;
  payment_method: Method;
  card_id: string | null;
  account_id: string | null;
  destination_account_id: string | null;
  installments_count: number;
  status: "actual" | "planned";
  recurrence_id: string | null;
  occurrence_date: string | null;
  deleted_at: string | null;
}
export interface Installment {
  id: string;
  transaction_id: string;
  card_id: string;
  number: number;
  amount_cents: number;
  billing_month: string;
  due_date: string;
}
export interface InvoicePayment {
  id: string;
  card_id: string;
  billing_month: string;
  amount_cents: number;
  paid_date: string;
  account_id: string;
}
export interface Recurrence {
  id: string;
  name: string;
  amount_cents: number;
  category_id: string;
  payment_method: Method;
  card_id: string | null;
  account_id: string | null;
  interval_months: number;
  next_date: string;
  anchor_day: number;
  status: "active" | "paused" | "cancelled";
}
export interface Budget {
  id: string;
  month: string;
  category_id: string | null;
  amount_cents: number;
}
export interface MonthlyTotal {
  month: string;
  expense: number;
  comparable_expense: number;
  income: number;
  cash_in: number;
  cash_out: number;
  planned: number;
  recurring_expense: number;
}
export interface Invoice {
  card_id: string;
  billing_month: string;
  due_date: string;
  total: number;
  paid: number;
  remaining: number;
}
export interface CategoryTotal {
  category_id: string;
  total: number;
}
export interface Snapshot {
  month: string;
  today: string;
  categories: Category[];
  accounts: Account[];
  cards: Card[];
  recurrences: Recurrence[];
  budgets: Budget[];
  monthly: MonthlyTotal[];
  category_totals: CategoryTotal[];
  invoices: Invoice[];
  transactions: Transaction[];
}
export interface FinancialData {
  categories: Category[];
  accounts: Account[];
  cards: Card[];
  recurrences: Recurrence[];
  budgets: Budget[];
  transactions: Transaction[];
  installments: Installment[];
  payments: InvoicePayment[];
}
export type DemoData = FinancialData;
export interface Filters {
  search: string;
  kind: string;
  category: string;
  card: string;
  method: string;
  status: string;
  from: string;
  to: string;
}
export const emptyFilters: Filters = {
  search: "",
  kind: "",
  category: "",
  card: "",
  method: "",
  status: "",
  from: "",
  to: "",
};
export type Mutation = { action: string; payload: Record<string, unknown> };
