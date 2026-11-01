"use client";
import { Fragment, useId, useState, type CSSProperties } from "react";
import { ArrowDownLeft, Repeat2, Wallet, Ellipsis } from "lucide-react";
import { formatDate, money } from "@/lib/finance";
import type { Budget, Snapshot, Transaction } from "@/lib/types";
import { CategoryIcon } from "../icons";
export function Panel({
  title,
  action,
  children,
  className = "",
  preview,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  // On phones the panel starts closed, showing this line instead of the body.
  preview?: string;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <section
      className={`panel ${className}`}
      data-collapsed={preview && !open ? "true" : undefined}
    >
      <div className="panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {preview ? (
        <>
          <button
            className="panel-toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen(!open)}
          >
            <span>{preview}</span>
            <span aria-hidden="true">{open ? "−" : "+"}</span>
            <span className="sr-only">{open ? "Recolher" : "Mostrar"}</span>
          </button>
          <div id={bodyId} className="panel-body">
            {children}
          </div>
        </>
      ) : (
        children
      )}
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
export function BudgetMeter({
  spent,
  limit,
  label = "Uso do orçamento geral",
}: {
  spent: number;
  limit: number;
  label?: string;
}) {
  const percentage = Math.round((spent * 100) / limit),
    over = percentage >= 100;
  return (
    <div
      className={`progress ${over ? "over" : percentage >= 80 ? "warning" : ""}`}
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.min(percentage, 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <i
          key={i}
          className={i < Math.round(percentage / 10) ? "filled" : ""}
          style={{ "--i": i } as CSSProperties}
        />
      ))}
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
      <BudgetMeter
        spent={spent}
        limit={budget.amount_cents}
        label={`Orçamento ${category?.name ?? "geral"}`}
      />
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
  days,
}: {
  rows: Transaction[];
  s: Snapshot;
  edit: (t: Transaction) => void;
  reuse: (t: Transaction) => void;
  remove: (t: Transaction) => void;
  // Net per purchase date; when present, rows are grouped by day.
  days?: Record<string, number>;
}) {
  return (
    <div className="transaction-list">
      {rows.map((t, i) => {
        const c = s.categories.find((c) => c.id === t.category_id),
          projected = t.status === "planned" || t.purchase_date > s.today,
          net = days?.[t.purchase_date] ?? 0;
        return (
          <Fragment key={t.id}>
            {days && t.purchase_date !== rows[i - 1]?.purchase_date && (
              <div className="day-heading">
                <span className="day-stamp">
                  <span className="sr-only">
                    {formatDate(t.purchase_date, { weekday: "short" })}
                  </span>
                  <b aria-hidden="true">{t.purchase_date.slice(8)}</b>
                  <span aria-hidden="true">
                    {formatDate(t.purchase_date, {
                      weekday: "short",
                      day: undefined,
                      month: undefined,
                    }).replace(".", "")}
                  </span>
                </span>
                <span className={net > 0 ? "positive" : ""}>
                  {net > 0 ? "+ " : net < 0 ? "− " : ""}
                  {money(Math.abs(net))}
                </span>
              </div>
            )}
          <div
            className="transaction-row"
            style={{ "--i": Math.min(i, 12) } as CSSProperties}
          >
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
                {!days && (
                  <>
                    <span className="separator">·</span>
                    {formatDate(t.purchase_date)}
                  </>
                )}
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
          </Fragment>
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
  const items = sorted.map((item) => ({
    ...item,
    category: s.categories.find((c) => c.id === item.category_id),
    percentage: expense ? Math.round((item.total * 100) / expense) : 0,
  }));
  return (
    <div className="category-breakdown">
      <div className="category-stack" aria-hidden="true">
        {items.map((item) => (
          <span
            key={item.category_id}
            style={{
              flexGrow: item.total,
              background: item.category?.color,
            }}
          />
        ))}
      </div>
      <ul>
        {items.map((item) => (
          <li key={item.category_id}>
            <span className="category-caption">
              <span
                className="dot"
                style={{ background: item.category?.color }}
              />
              {item.category?.name ?? "Outros"}
            </span>
            <strong>{money(item.total)}</strong>
            <small className="muted">{item.percentage}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
