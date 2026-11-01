"use client";
import { ArrowRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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
  const monthly = active.reduce(
    (n, r) => n + monthlyEquivalent(r.amount_cents, r.interval_months),
    0,
  );
  const max = Math.max(...s.monthly.map((m) => m.expense), 1);
  const monthName = monthLabel(s.month).split(" ")[0];
  return (
    <>
      <section className="month-card" aria-label={`Resumo de ${monthName}`}>
        <div className="hero-consumption">
          <h2 className="eyebrow">Consumo de {monthName}</h2>
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
                  {comparison <= 0 ? "a menos" : "a mais"}{" "}
                  {s.month === monthOf(s.today)
                    ? "que no mesmo período do mês anterior"
                    : "que no mês anterior"}
                </span>
              </>
            )}
          </div>
          <div className="mini-bars" aria-label="Consumo dos últimos seis meses">
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
            Compras efetivas pelo valor total na data da compra, crédito
            incluso.
          </p>
        </div>
        <div className="hero-cash">
          <h2 className="eyebrow eyebrow-red">Caixa do mês</h2>
          <dl className="cash-lines">
            <div>
              <dt>
                <span aria-hidden="true">+</span>Entrou
              </dt>
              <dd className="cash-in">{money(current.cash_in)}</dd>
            </div>
            <div>
              <dt>
                <span aria-hidden="true">−</span>Saiu (pago)
              </dt>
              <dd>{money(current.cash_out)}</dd>
            </div>
            <div className="cash-total">
              <dt>
                <span aria-hidden="true">=</span>Fluxo líquido
              </dt>
              <dd>{money(current.cash_in - current.cash_out)}</dd>
            </div>
          </dl>
          <p className="hero-footnote">
            Crédito entra no caixa quando você registra o pagamento da fatura.
          </p>
        </div>
      </section>
      <div className="content-grid">
        <div className="main-column">
          <Panel
            title="Últimas transações"
            className="recent-panel"
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
            className="categories-panel"
            action={<span className="muted small">Consumo realizado</span>}
          >
            <Categories s={s} />
          </Panel>
        </div>
        <div className="side-column">
          <Panel
            title="Vem pela frente"
            className="ahead-panel"
            action={
              <button
                className="text-button"
                onClick={() => onPage("recurrences")}
              >
                Recorrentes <ArrowRight size={15} />
              </button>
            }
          >
            <div className="ahead-totals">
              <div>
                <span>Crédito do mês, a pagar</span>
                <strong>{money(bills)}</strong>
              </div>
              <div>
                <span>Parcelas futuras</span>
                <strong>{money(future)}</strong>
              </div>
            </div>
            <h3 className="list-label">Próximas cobranças</h3>
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
              <p className="muted small">
                Nada agendado. Cadastre assinaturas em Recorrentes.
              </p>
            )}
            <div className="panel-footer">
              <span>
                {current.planned ? (
                  <>
                    Despesas previstas <strong>{money(current.planned)}</strong>
                  </>
                ) : (
                  "Nenhuma despesa prevista"
                )}
              </span>
              <span>
                Mensal <strong>{money(monthly)}</strong>
              </span>
            </div>
          </Panel>
          <Panel
            title="Orçamentos"
            className="budgets-panel"
            action={
              <button
                className="text-button"
                onClick={() => onPage("budgets")}
              >
                Ajustar <ArrowRight size={15} />
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
