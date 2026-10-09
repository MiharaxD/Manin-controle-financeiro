"use client";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Repeat2,
  Target,
  Wallet,
} from "lucide-react";
import {
  money,
  formatDate,
  monthLabel,
  monthlyEquivalent,
  monthOf,
} from "@/lib/finance";
import type { Snapshot, Transaction } from "@/lib/types";
import type { Page } from "./types";
import { Panel, Empty, TransactionRows, Categories, BudgetBar } from "./shared";
export function Dashboard({
  s,
  onPage,
  add,
  edit,
  reuse,
  remove,
}: {
  s: Snapshot;
  onPage: (page: Page) => void;
  add: () => void;
  edit: (t: Transaction) => void;
  reuse: (t: Transaction) => void;
  remove: (t: Transaction) => void;
}) {
  const current = s.monthly.at(-1)!,
    previous = s.monthly.at(-2),
    comparison =
      previous?.comparable_expense && s.month <= monthOf(s.today)
        ? Math.round(
            ((current.expense - previous.comparable_expense) * 100) /
              previous.comparable_expense,
          )
        : null;
  const bills = s.invoices
    .filter((i) => i.billing_month === s.month)
    .reduce((n, i) => n + i.remaining, 0);
  const future = s.invoices
    .filter((i) => i.billing_month > s.month)
    .reduce((n, i) => n + i.remaining, 0);
  const active = s.recurrences
    .filter((r) => r.status === "active")
    .sort((a, b) => a.next_date.localeCompare(b.next_date));
  const max = Math.max(...s.monthly.map((m) => m.expense), 1);
  return (
    <>
      <div className="overview-grid">
        <section className="month-card">
          <div className="between">
            <span className="eyebrow">GASTOS DO MÊS</span>
            <span className="month-chip">{monthLabel(s.month, true)}</span>
          </div>
          <div className="hero-amount">{money(current.expense)}</div>
          <div className="comparison">
            {comparison === null ? (
              <span>Comece a construir seu histórico.</span>
            ) : (
              <>
                <span className={comparison <= 0 ? "trend-good" : "trend-high"}>
                  {comparison <= 0 ? (
                    <ArrowDownLeft size={15} />
                  ) : (
                    <ArrowUpRight size={15} />
                  )}
                  {Math.abs(comparison)}%
                </span>
                <span>
                  {comparison <= 0 ? "menos" : "mais"}{" "}
                  {s.month === monthOf(s.today)
                    ? "no mesmo período do mês anterior"
                    : "que no mês anterior"}
                </span>
              </>
            )}
          </div>
          <div className="mini-bars" aria-label="Gastos dos últimos seis meses">
            {s.monthly.map((m) => (
              <div key={m.month}>
                <div className="mini-bar-track">
                  <span
                    style={{
                      height: `${Math.max(3, (m.expense * 100) / max)}%`,
                    }}
                    className={m.month === s.month ? "current" : ""}
                  />
                </div>
                <span>
                  {monthLabel(m.month, true).split(" ")[0].replace(".", "")}
                </span>
              </div>
            ))}
          </div>
          <p className="hero-footnote">
            Compras efetivas · pelo valor total na data da compra
          </p>
        </section>
        <section className="balance-panel">
          <div className="summary-row">
            <span className="summary-icon positive">
              <ArrowDownLeft size={20} />
            </span>
            <div>
              <span>Receitas</span>
              <strong>{money(current.income)}</strong>
            </div>
          </div>
          <div className="summary-row">
            <span className="summary-icon expense-tone">
              <ArrowUpRight size={20} />
            </span>
            <div>
              <span>Despesas de consumo</span>
              <strong>{money(current.expense)}</strong>
            </div>
          </div>
          <div className="summary-row balance-row">
            <span className="summary-icon">
              <Wallet size={20} />
            </span>
            <div>
              <span>Fluxo líquido do mês</span>
              <strong>{money(current.cash_in - current.cash_out)}</strong>
            </div>
          </div>
          <p className="hint">
            Entradas menos saídas pagas. Crédito entra no caixa quando a fatura
            é paga.
          </p>
        </section>
      </div>
      <div className="metric-grid">
        <button className="metric" onClick={() => onPage("cards")}>
          <span>
            <CreditCard size={18} />
            Faturas do mês <ArrowRight size={16} />
          </span>
          <strong>{money(bills)}</strong>
          <small>Ainda a pagar</small>
        </button>
        <button className="metric" onClick={() => onPage("cards")}>
          <span>
            <Repeat2 size={18} />
            Parcelas futuras <ArrowRight size={16} />
          </span>
          <strong>{money(future)}</strong>
          <small>Compromissos após este mês</small>
        </button>
        <button className="metric" onClick={() => onPage("transactions")}>
          <span>
            <Target size={18} />
            Despesas previstas <ArrowRight size={16} />
          </span>
          <strong>{money(current.planned)}</strong>
          <small>Estimativa · fora do realizado</small>
        </button>
      </div>
      <div className="content-grid">
        <div className="main-column">
          <Panel
            title="Últimas transações"
            action={
              <button
                className="text-button"
                onClick={() => onPage("transactions")}
              >
                Ver todas <ArrowRight size={15} />
              </button>
            }
          >
            {s.transactions.length ? (
              <TransactionRows
                rows={s.transactions.slice(0, 5)}
                s={s}
                edit={edit}
                reuse={reuse}
                remove={remove}
              />
            ) : (
              <Empty
                title="Seu primeiro lançamento"
                text="Uma despesa, uma receita. Leva só alguns segundos."
                action={
                  <button className="button primary" onClick={add}>
                    Adicionar lançamento
                  </button>
                }
              />
            )}
          </Panel>
          <Panel
            title="Onde seu dinheiro foi"
            action={<span className="muted small">Consumo realizado</span>}
          >
            <Categories s={s} />
          </Panel>
        </div>
        <div className="side-column">
          <Panel
            title="Próximas cobranças"
            action={
              <button
                className="icon-button"
                aria-label="Ver recorrências"
                onClick={() => onPage("recurrences")}
              >
                <ArrowRight size={17} />
              </button>
            }
          >
            {active.length ? (
              <div className="subscription-list">
                {active.slice(0, 3).map((r) => (
                  <div key={r.id}>
                    <span className="service-mark">{r.name.slice(0, 1)}</span>
                    <div>
                      <strong>{r.name}</strong>
                      <span>{formatDate(r.next_date)}</span>
                    </div>
                    <strong>{money(r.amount_cents)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                title="Nada agendado"
                text="Cadastre suas assinaturas para acompanhar as próximas cobranças."
              />
            )}
            <div className="panel-footer">
              <span>Mensal equivalente</span>
              <strong>
                {money(
                  active.reduce(
                    (n, r) =>
                      n + monthlyEquivalent(r.amount_cents, r.interval_months),
                    0,
                  ),
                )}
              </strong>
            </div>
          </Panel>
          <Panel
            title="Seus orçamentos"
            action={
              <button
                className="icon-button"
                aria-label="Ver orçamentos"
                onClick={() => onPage("budgets")}
              >
                <ArrowRight size={17} />
              </button>
            }
          >
            {s.budgets.length ? (
              s.budgets
                .slice(0, 3)
                .map((b) => <BudgetBar key={b.id} budget={b} s={s} />)
            ) : (
              <Empty
                title="Um plano para o mês"
                text="Defina limites e acompanhe seus gastos."
                action={
                  <button
                    className="text-button"
                    onClick={() => onPage("budgets")}
                  >
                    Criar orçamento
                  </button>
                }
              />
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
