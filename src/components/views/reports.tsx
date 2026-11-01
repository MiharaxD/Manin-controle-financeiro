"use client";
import dynamic from "next/dynamic";
import { money, monthLabel } from "@/lib/finance";
import type { Snapshot } from "@/lib/types";
import { Panel, Categories } from "./shared";
const Charts = dynamic(() => import("../charts"), {
  ssr: false,
  loading: () => (
    <div className="chart-container skeleton" aria-label="Carregando gráfico" />
  ),
});

export function Reports({ s }: { s: Snapshot }) {
  const current = s.monthly.at(-1)!;
  return (
    <>
      <div className="metric-grid">
        <div className="metric">
          <span>Entrou − consumo</span>
          <strong>{money(current.income - current.expense)}</strong>
          <small>Receitas menos compras realizadas, crédito incluso</small>
        </div>
        <div className="metric">
          <span>Saiu (pago)</span>
          <strong>{money(current.cash_out)}</strong>
          <small>Despesas sem crédito + pagamentos de fatura</small>
        </div>
        <div className="metric">
          <span>Sobrou no mês</span>
          <strong>{money(current.cash_in - current.cash_out)}</strong>
          <small>Entrou − saiu (pago). Não é o saldo do banco</small>
        </div>
      </div>
      <div className="report-grid">
        <Panel
          title="Evolução financeira"
          action={<span className="muted small">Últimos 6 meses</span>}
        >
          <div className="chart-legend">
            <span>
              <i style={{ background: "var(--series-income)" }} />
              Entrou
            </span>
            <span>
              <i className="swatch-hatch" />
              Consumo
            </span>
          </div>
          <Charts monthly={s.monthly} />
        </Panel>
        <Panel title="Maiores fontes de despesa">
          <Categories s={s} />
        </Panel>
      </div>
      <Panel title="Mês a mês">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Entrou</th>
                <th>Consumo</th>
                <th>Recorrências realizadas</th>
                <th>Saiu (pago)</th>
                <th>Sobrou no mês</th>
              </tr>
            </thead>
            <tbody>
              {s.monthly.map((m) => (
                <tr key={m.month}>
                  <td>{monthLabel(m.month, true)}</td>
                  <td>{money(m.income)}</td>
                  <td>{money(m.expense)}</td>
                  <td>{money(m.recurring_expense)}</td>
                  <td>{money(m.cash_out)}</td>
                  <td
                    className={
                      m.cash_in >= m.cash_out ? "positive" : "warning-text"
                    }
                  >
                    {money(m.cash_in - m.cash_out)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
