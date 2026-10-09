"use client";
import { useState } from "react";
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
  const [type, setType] = useState(""),
    [payment, setPayment] = useState("");
  const visible = s.recurrences.filter(
    (r) =>
      (!type || r.type_id === type) &&
      (!payment || r.payment_method === payment),
  );
  const methods = {
    credit: "Crédito",
    pix: "Pix",
    debit: "Débito",
    cash: "Dinheiro",
  };
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
          Nova recorrente
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
      <Panel title="Suas recorrentes">
        <div className="recurrence-filters">
          <label>
            Filtrar por tipo
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Todos os tipos</option>
              {s.recurrence_types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Filtrar por pagamento
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
            >
              <option value="">Todos os pagamentos</option>
              {Object.entries(methods).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {visible.length ? (
          <div className="recurrence-list">
            {visible.map((r) => (
              <div className="recurrence-row" key={r.id}>
                <span className="service-mark">{r.name.slice(0, 1)}</span>
                <button
                  className="transaction-text"
                  onClick={() => open({ type: "recurrence", value: { ...r } })}
                >
                  <strong>
                    {r.name}{" "}
                    <span className="badge">
                      {s.recurrence_types.find((t) => t.id === r.type_id)?.name}
                    </span>{" "}
                    {r.status !== "active" && (
                      <span className="badge">
                        {r.status === "paused" ? "Pausada" : "Cancelada"}
                      </span>
                    )}
                  </strong>
                  <span>
                    {methods[r.payment_method]} ·{" "}
                    {r.card_id
                      ? s.cards.find((c) => c.id === r.card_id)?.name
                      : s.accounts.find((a) => a.id === r.account_id)
                          ?.name}{" "}
                    ·{" "}
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
            title={
              s.recurrences.length
                ? "Nenhuma recorrente neste filtro"
                : "Sem surpresas nas renovações"
            }
            text={
              s.recurrences.length
                ? "Escolha outro tipo ou pagamento para ver suas recorrentes."
                : "Cadastre uma assinatura, seguro, plano ou outra despesa que se repete."
            }
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
