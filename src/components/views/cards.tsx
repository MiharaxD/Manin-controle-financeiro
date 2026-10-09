"use client";
import type { CSSProperties } from "react";
import {
  CreditCard,
  Ellipsis,
  Plus,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { money, formatDate, monthLabel } from "@/lib/finance";
import type { Card, Snapshot } from "@/lib/types";
import type { Editor } from "../forms";
import { Panel, Empty } from "./shared";
export function Cards({
  s,
  open,
  detail,
  history,
}: {
  s: Snapshot;
  open: (editor: Editor) => void;
  detail: (card: Card, month: string) => void;
  history: (card: Card) => void;
}) {
  return (
    <>
      <div className="section-intro">
        <p>Compras, faturas e parcelas. Tudo no seu ciclo.</p>
        <button
          className="button primary"
          onClick={() => open({ type: "card" })}
        >
          <Plus size={18} />
          Novo cartão
        </button>
      </div>
      {!s.cards.length ? (
        <Panel title="Seus cartões">
          <Empty
            title="Seu primeiro cartão"
            text="Informe só os dias do ciclo. Sem número completo ou CVV."
            action={
              <button
                className="button primary"
                onClick={() => open({ type: "card" })}
              >
                Cadastrar cartão
              </button>
            }
          />
        </Panel>
      ) : (
        <div className="cards-grid">
          {s.cards.map((c) => {
            const invoices = s.invoices.filter((i) => i.card_id === c.id),
              current = invoices.find((i) => i.billing_month === s.month),
              committed = invoices.reduce((n, i) => n + i.remaining, 0);
            return (
              <section className="card-panel" key={c.id}>
                <div
                  className="credit-card"
                  style={{ "--card-color": c.color } as CSSProperties}
                >
                  <div className="between">
                    <span className="card-institution">
                      {c.institution || "Meu cartão"}
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Editar ${c.name}`}
                      onClick={() => open({ type: "card", value: c })}
                    >
                      <Ellipsis size={22} />
                    </button>
                  </div>
                  <div className="chip-art" aria-hidden="true">
                    <span />
                    <span />
                  </div>
                  <div className="between">
                    <strong>{c.name}</strong>
                    <span className="card-digits">
                      •••• {c.last_four || "••••"}
                    </span>
                  </div>
                </div>
                <div className="card-body">
                  <span className="muted">
                    Fatura de {monthLabel(s.month, true)}
                  </span>
                  <div className="invoice-amount">
                    {money(current?.remaining ?? 0)}
                  </div>
                  <div className="between small">
                    <span className="muted">
                      {current
                        ? `Vence ${formatDate(current.due_date)}`
                        : `Vencimento: dia ${c.due_day}`}
                    </span>
                    <span className="badge">
                      {current && current.paid >= current.total
                        ? "Paga"
                        : current?.paid
                          ? "Parcialmente paga"
                          : "Em aberto"}
                    </span>
                  </div>
                  <div className="card-meta">
                    <div>
                      <span>Comprometido</span>
                      <strong>{money(committed)}</strong>
                    </div>
                    <div>
                      <span>Disponível</span>
                      <strong>
                        {c.limit_cents === null
                          ? "Sem limite informado"
                          : money(Math.max(0, c.limit_cents - committed))}
                      </strong>
                    </div>
                  </div>
                  {c.limit_cents !== null && (
                    <div className="progress">
                      <span
                        style={{
                          width: `${Math.min(100, (committed * 100) / c.limit_cents)}%`,
                        }}
                      />
                    </div>
                  )}
                  {c.limit_cents !== null && committed > c.limit_cents && (
                    <p className="warning-text small">
                      Compromissos acima do limite informado.
                    </p>
                  )}
                  <div className="card-actions">
                    <button
                      className="button secondary"
                      onClick={() => detail(c, s.month)}
                    >
                      Ver fatura <ArrowRight size={15} />
                    </button>
                    {current && current.remaining > 0 && (
                      <button
                        className="text-button"
                        onClick={() =>
                          open({ type: "payment", invoice: current })
                        }
                      >
                        Registrar pagamento
                      </button>
                    )}
                  </div>
                  <button
                    className="text-button card-history"
                    onClick={() => history(c)}
                  >
                    Histórico de compras <ArrowRight size={14} />
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
      <Panel title="Próximas faturas">
        <div className="future-invoices">
          {s.invoices
            .filter((i) => i.billing_month > s.month && i.remaining > 0)
            .slice(0, 24)
            .map((i) => (
              <button
                key={`${i.card_id}${i.billing_month}`}
                onClick={() =>
                  detail(
                    s.cards.find((c) => c.id === i.card_id)!,
                    i.billing_month,
                  )
                }
              >
                <span>
                  <CreditCard size={17} />
                  {s.cards.find((c) => c.id === i.card_id)?.name}
                  <small>{monthLabel(i.billing_month, true)}</small>
                </span>
                <strong>{money(i.remaining)}</strong>
                <ChevronRight size={17} />
              </button>
            ))}
          {!s.invoices.some(
            (i) => i.billing_month > s.month && i.remaining > 0,
          ) && <p className="muted">Nenhuma parcela futura registrada.</p>}
        </div>
        <p className="hint">
          Total comprometido inclui todas as parcelas em aberto. Faturas
          anteriores ficam disponíveis em “Ver fatura”.
        </p>
      </Panel>
    </>
  );
}
