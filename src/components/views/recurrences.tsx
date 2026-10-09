"use client";
import { Plus, Ellipsis } from "lucide-react";
import {
  annualEquivalent,
  monthlyEquivalent,
  formatDate,
  money,
} from "@/lib/finance";
import type { Mutation, Recurrence, Snapshot } from "@/lib/types";
import type { Editor } from "../forms";
import { Panel, Empty } from "./shared";
export function Recurrences({
  s,
  open,
  mutate,
  history,
}: {
  s: Snapshot;
  open: (editor: Editor) => void;
  mutate: (value: Mutation) => Promise<void>;
  history: (id: string) => void;
}) {
  const active = s.recurrences.filter((r) => r.status === "active"),
    monthly = active.reduce(
      (n, r) => n + monthlyEquivalent(r.amount_cents, r.interval_months),
      0,
    ),
    annual = active.reduce(
      (n, r) => n + annualEquivalent(r.amount_cents, r.interval_months),
      0,
    );
  const change = async (r: Recurrence, status: Recurrence["status"]) =>
    mutate({ action: "recurrence", payload: { ...r, status } });
  return (
    <>
      <div className="section-intro">
        <p>Acompanhe o que se repete, sem perder de vista o total.</p>
        <button
          className="button primary"
          onClick={() => open({ type: "recurrence" })}
        >
          <Plus size={18} />
          Nova recorrência
        </button>
      </div>
      <div className="metric-grid">
        <div className="metric">
          <span>Mensal equivalente</span>
          <strong>{money(monthly)}</strong>
          <small>Estimativa das recorrências ativas</small>
        </div>
        <div className="metric">
          <span>Anual equivalente</span>
          <strong>{money(annual)}</strong>
          <small>Ao preço atual · sem somar ao realizado</small>
        </div>
        <div className="metric">
          <span>Serviços ativos</span>
          <strong>{active.length.toString().padStart(2, "0")}</strong>
          <small>
            {s.recurrences.length - active.length} pausados ou cancelados
          </small>
        </div>
      </div>
      <Panel title="Suas recorrências">
        {s.recurrences.length ? (
          <div className="recurrence-list">
            {s.recurrences.map((r) => (
              <div className="recurrence-row" key={r.id}>
                <span className="service-mark">{r.name.slice(0, 1)}</span>
                <button
                  className="transaction-text"
                  onClick={() => open({ type: "recurrence", value: { ...r } })}
                >
                  <strong>
                    {r.name}{" "}
                    {r.status !== "active" && (
                      <span className="badge">
                        {r.status === "paused" ? "Pausada" : "Cancelada"}
                      </span>
                    )}
                  </strong>
                  <span>
                    {r.interval_months === 1
                      ? "Mensal"
                      : r.interval_months === 12
                        ? "Anual"
                        : `A cada ${r.interval_months} meses`}{" "}
                    ·{" "}
                    {r.status === "active"
                      ? `Próxima: ${formatDate(r.next_date)}`
                      : "Sem geração de cobranças"}
                  </span>
                </button>
                <strong>{money(r.amount_cents)}</strong>
                <details className="row-menu">
                  <summary aria-label={`Ações de ${r.name}`}>
                    <Ellipsis size={20} />
                  </summary>
                  <div>
                    <button
                      onClick={() =>
                        open({ type: "recurrence", value: { ...r } })
                      }
                    >
                      Editar preço e dados
                    </button>
                    <button onClick={() => history(r.id)}>Histórico</button>
                    {r.status === "active" ? (
                      <button
                        onClick={() => {
                          void change(r, "paused");
                        }}
                      >
                        Pausar
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          void change(r, "active");
                        }}
                      >
                        Reativar
                      </button>
                    )}
                    {r.status !== "cancelled" && (
                      <button
                        className="danger-text"
                        onClick={() => {
                          void change(r, "cancelled");
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      onClick={() =>
                        open({ type: "transaction", recurrence: r })
                      }
                      disabled={r.status !== "active"}
                    >
                      Registrar próxima cobrança
                    </button>
                  </div>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Sem surpresas nas renovações"
            text="Cadastre uma assinatura ou qualquer despesa que se repete."
          />
        )}
      </Panel>
      <p className="hint">
        Ao reativar, confira a próxima data: cobranças vencidas serão geradas.
        Registre cobranças manuais pela opção de conciliação para evitar
        duplicidade.
      </p>
    </>
  );
}
