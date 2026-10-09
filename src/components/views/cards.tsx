"use client";
import {
  CreditCard,
  Ellipsis,
  Plus,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { money, monthLabel } from "@/lib/finance";
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
        <p>
          Um apelido para organizar compras e recorrentes no crédito. Parcelas
          seguem os meses da compra.
        </p>
        <button
          className="button primary"
          onClick={() => open({ type: "card" })}
        >
          <Plus size={18} />
          Novo apelido
        </button>
      </div>
      {!s.cards.length ? (
        <Panel title="Seus apelidos">
          <Empty
            title="Como você chama seu cartão?"
            text="Crie só um apelido. Você também pode criá-lo ao cadastrar uma recorrente ou uma compra."
          />
        </Panel>
      ) : (
        <div className="cards-grid">
          {s.cards.map((c) => {
            const invoices = s.invoices.filter((i) => i.card_id === c.id),
              current = invoices.find((i) => i.billing_month === s.month),
              committed = invoices.reduce((n, i) => n + i.remaining, 0),
              recurring = s.recurrences.filter(
                (r) => r.card_id === c.id && r.status === "active",
              ).length;
            return (
              <section className="card-panel" key={c.id}>
                <div className="nickname-card">
                  <CreditCard size={25} />
                  <strong>{c.name}</strong>
                  <button
                    className="icon-button"
                    aria-label={`Editar ${c.name}`}
                    onClick={() => open({ type: "card", value: c })}
                  >
                    <Ellipsis size={22} />
                  </button>
                </div>
                <div className="card-body">
                  <span className="muted">
                    Crédito de {monthLabel(s.month, true)}
                  </span>
                  <div className="invoice-amount">
                    {money(current?.remaining ?? 0)}
                  </div>
                  <span className="badge">
                    {current && current.paid >= current.total
                      ? "Pago"
                      : current?.paid
                        ? "Parcialmente pago"
                        : "Em aberto"}
                  </span>
                  <div className="card-meta">
                    <div>
                      <span>Total em aberto</span>
                      <strong>{money(committed)}</strong>
                    </div>
                    <div>
                      <span>Recorrentes ativas</span>
                      <strong>{recurring}</strong>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      className="button secondary"
                      onClick={() => detail(c, s.month)}
                    >
                      Ver compras do mês
                      <ArrowRight size={15} />
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
                    Histórico de compras
                    <ArrowRight size={14} />
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
      <Panel title="Próximas parcelas">
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
          O total inclui compras e parcelas em aberto. Os meses antigos
          continuam disponíveis em “Ver compras do mês”. O Manin não acompanha
          fechamento ou vencimento bancário.
        </p>
      </Panel>
    </>
  );
}
