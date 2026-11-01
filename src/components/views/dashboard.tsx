"use client";
import { ArrowRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import {
  daysInMonth,
  money,
  formatDate,
  monthLabel,
  monthlyEquivalent,
  monthOf,
} from "@/lib/finance";
import type { Snapshot, Transaction } from "@/lib/types";
import type { Page } from "./types";
import {
  Panel,
  Empty,
  TransactionRows,
  Categories,
  BudgetBar,
  BudgetMeter,
} from "./shared";
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
  const history = s.monthly.slice(0, -1).filter((m) => m.expense > 0),
    average = history.length
      ? Math.round(
          history.reduce((n, m) => n + m.expense, 0) / history.length,
        )
      : 0;
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
  const overall = s.budgets.find((b) => !b.category_id);
  const isCurrent = s.month === monthOf(s.today);
  const daysLeft = isCurrent
    ? daysInMonth(Number(s.today.slice(0, 4)), Number(s.today.slice(5, 7))) -
      Number(s.today.slice(8))
    : 0;
  const next = active.find((r) => r.next_date >= s.today);
  const top = [...s.category_totals].sort((a, b) => b.total - a.total)[0];
  const topName = s.categories.find((c) => c.id === top?.category_id)?.name;
  return (
    <>
      <section className="month-pulse" aria-label="Como está o mês">
        {overall ? (
          <div className="pulse-budget">
            <span className="pulse-label">
              {current.expense > overall.amount_cents
                ? "Passou do orçamento"
                : "Ainda dá pra gastar"}
            </span>
            <strong
              className={
                current.expense > overall.amount_cents ? "over" : "positive"
              }
            >
              {money(Math.abs(overall.amount_cents - current.expense))}
            </strong>
            <BudgetMeter spent={current.expense} limit={overall.amount_cents} />
            <span className="pulse-detail">
              {Math.round((current.expense * 100) / overall.amount_cents)}% de{" "}
              {money(overall.amount_cents)}
              {isCurrent &&
                ` · ${daysLeft === 0 ? "último dia" : daysLeft === 1 ? "falta 1 dia" : `faltam ${daysLeft} dias`}`}
            </span>
          </div>
        ) : (
          <div className="pulse-budget">
            <span className="pulse-label">Quanto quer gastar em {monthName}?</span>
            <p className="pulse-detail">
              Com um orçamento geral, o Manin mostra aqui quanto ainda dá pra
              gastar.
            </p>
            <button
              className="text-button"
              onClick={() => onPage("budgets")}
            >
              Definir orçamento <ArrowRight size={15} />
            </button>
          </div>
        )}
        {next && (
          <button
            className="pulse-next"
            onClick={() => onPage("recurrences")}
            aria-label={`Próxima cobrança: ${next.name}, ${formatDate(next.next_date)}, ${money(next.amount_cents)}`}
          >
            <b>Próxima</b>
            <span>
              {next.name} · {formatDate(next.next_date)}
            </span>
            <strong>{money(next.amount_cents)}</strong>
          </button>
        )}
      </section>
      <section className="month-card" aria-label={`Resumo de ${monthName}`}>
        <div className="hero-consumption">
          <h2 className="eyebrow">Consumo de {monthName}</h2>
          <div className="hero-amount">{money(current.expense)}</div>
          <div className="comparison">
            {comparison === null ? (
              <span>
                {history.length ? (
                  <>
                    {history.length === 1
                      ? "Mês anterior"
                      : `Média dos últimos ${history.length} meses`}
                    : <strong>{money(average)}</strong>
                  </>
                ) : (
                  "Comece a construir seu histórico."
                )}
              </span>
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
                <span aria-hidden="true">=</span>Sobrou no mês
              </dt>
              <dd>{money(current.cash_in - current.cash_out)}</dd>
            </div>
          </dl>
          <p className="hero-footnote">
            Compras no crédito só entram aqui quando você paga a fatura.
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
            preview={
              top && topName && current.expense
                ? `${topName} ${Math.round((top.total * 100) / current.expense)}% do consumo`
                : "Nada consumido ainda"
            }
            action={<span className="muted small">Consumo realizado</span>}
          >
            <Categories s={s} />
          </Panel>
        </div>
        <div className="side-column">
          <Panel
            title="Vem pela frente"
            className="ahead-panel"
            preview={`${money(bills)} no crédito do mês · ${active.length} ${active.length === 1 ? "recorrente" : "recorrentes"}`}
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
              {current.planned > 0 && (
                <span>
                  Lançamentos previstos{" "}
                  <strong>{money(current.planned)}</strong>
                </span>
              )}
              <span>
                Mensal <strong>{money(monthly)}</strong>
              </span>
            </div>
          </Panel>
          <Panel
            title="Orçamentos"
            className="budgets-panel"
            preview={
              s.budgets.length
                ? `${s.budgets.length} ${s.budgets.length === 1 ? "orçamento" : "orçamentos"} neste mês`
                : "Nenhum orçamento neste mês"
            }
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
