"use client";
import type { CSSProperties } from "react";
import { ArrowDownLeft, Repeat2, Wallet, Ellipsis } from "lucide-react";
import { formatDate, money } from "@/lib/finance";
import type { Budget, Snapshot, Transaction } from "@/lib/types";
import { CategoryIcon } from "../icons";
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Wallet size={24} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}
export function BudgetBar({
  budget,
  s,
  onEdit,
}: {
  budget: Budget;
  s: Snapshot;
  onEdit?: () => void;
}) {
  const category = s.categories.find((c) => c.id === budget.category_id);
  const spent = budget.category_id
    ? (s.category_totals.find((c) => c.category_id === budget.category_id)
        ?.total ?? 0)
    : (s.monthly.at(-1)?.expense ?? 0);
  const percentage = Math.round((spent * 100) / budget.amount_cents),
    over = percentage >= 100;
  return (
    <div className="budget-row">
      <div className="between">
        <button
          className="text-button budget-name"
          onClick={onEdit}
          disabled={!onEdit}
        >
          {category?.name ?? "Orçamento geral"}
        </button>
        <span className={percentage >= 80 ? "warning-text" : "muted"}>
          {percentage}%
        </span>
      </div>
      <div
        className={`progress ${percentage >= 80 ? "warning" : ""}`}
        role="progressbar"
        aria-label={`Orçamento ${category?.name ?? "geral"}`}
        aria-valuenow={Math.min(percentage, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
      <div className="between budget-values">
        <span>
          {money(spent)}{" "}
          <span className="muted">de {money(budget.amount_cents)}</span>
        </span>
        <span className="muted">
          {over
            ? `Excedido em ${money(spent - budget.amount_cents)}`
            : `Restam ${money(budget.amount_cents - spent)}`}
        </span>
      </div>
      {percentage >= 80 && (
        <p className="warning-text small">
          {over ? "Limite atingido" : "Próximo do limite"}
        </p>
      )}
    </div>
  );
}
export function TransactionRows({
  rows,
  s,
  edit,
  reuse,
  remove,
}: {
  rows: Transaction[];
  s: Snapshot;
  edit: (t: Transaction) => void;
  reuse: (t: Transaction) => void;
  remove: (t: Transaction) => void;
}) {
  return (
    <div className="transaction-list">
      {rows.map((t) => {
        const c = s.categories.find((c) => c.id === t.category_id),
          projected = t.status === "planned" || t.purchase_date > s.today;
        return (
          <div className="transaction-row" key={t.id}>
            <span
              className="category-icon"
              style={
                {
                  "--category-color": c?.color,
                } as CSSProperties
              }
            >
              {t.kind === "income" ? (
                <ArrowDownLeft size={20} />
              ) : t.kind === "transfer" ? (
                <Repeat2 size={20} />
              ) : (
                <CategoryIcon name={c?.icon ?? "circle"} size={20} />
              )}
            </span>
            <button
              className="transaction-text"
              onClick={() => edit(t)}
              disabled={t.kind === "transfer"}
            >
              <strong>
                {t.merchant || t.description || c?.name || "Transferência"}
              </strong>
              <span>
                {c?.name ?? "Transferência antiga · entre suas contas"}
                <span className="separator">·</span>
                {formatDate(t.purchase_date)}
                {t.payment_method === "credit" && (
                  <>
                    <span className="separator">·</span>Crédito{" "}
                    {t.installments_count > 1 ? `${t.installments_count}×` : ""}
                  </>
                )}
                {projected && <span className="badge forecast">Previsão</span>}
              </span>
            </button>
            <strong
              className={`transaction-amount ${t.kind === "income" ? "positive" : ""}`}
            >
              {t.kind === "income" ? "+ " : t.kind === "expense" ? "− " : ""}
              {money(t.amount_cents)}
            </strong>
            <details className="row-menu">
              <summary
                aria-label={`Ações: ${t.merchant || t.description || "lançamento"}`}
              >
                <Ellipsis size={19} />
              </summary>
              <div>
                {t.kind !== "transfer" && (
                  <button onClick={() => edit(t)}>Editar</button>
                )}
                {t.kind !== "transfer" && (
                  <button onClick={() => reuse(t)}>Reutilizar</button>
                )}
                <button className="danger-text" onClick={() => remove(t)}>
                  Excluir
                </button>
              </div>
            </details>
          </div>
        );
      })}
    </div>
  );
}
export function Categories({ s }: { s: Snapshot }) {
  const expense = s.monthly.at(-1)?.expense ?? 0;
  const sorted = [...s.category_totals].sort((a, b) => b.total - a.total);
  if (!sorted.length)
    return (
      <Empty
        title="Cada gasto tem seu lugar"
        text="Suas categorias aparecem aqui quando você registrar despesas."
      />
    );
  return (
    <div className="category-breakdown">
      {sorted.map((item) => {
        const c = s.categories.find((c) => c.id === item.category_id);
        const percentage = expense
          ? Math.round((item.total * 100) / expense)
          : 0;
        return (
          <div key={item.category_id}>
            <div className="between">
              <span className="category-caption">
                <span className="dot" style={{ background: c?.color }} />
                {c?.name ?? "Outros"}
              </span>
              <strong>{money(item.total)}</strong>
            </div>
            <div className="category-track">
              <span style={{ width: `${percentage}%`, background: c?.color }} />
            </div>
            <small className="muted">{percentage}% dos gastos do mês</small>
          </div>
        );
      })}
    </div>
  );
}
