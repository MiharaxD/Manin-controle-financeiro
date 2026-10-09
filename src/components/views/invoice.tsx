"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { money, formatDate, monthLabel } from "@/lib/finance";
import type { Card, Snapshot, Transaction } from "@/lib/types";
import type { Editor } from "../forms";
import type { InvoiceLoader } from "./types";
export function InvoiceDetail({
  s,
  card,
  initialMonth,
  load,
  open,
  edit,
}: {
  s: Snapshot;
  card: Card;
  initialMonth: string;
  load: InvoiceLoader;
  open: (e: Editor) => void;
  edit: (t: Transaction) => void;
}) {
  const [month, setMonth] = useState(initialMonth),
    [page, setPage] = useState(0),
    [detail, setDetail] = useState<Awaited<ReturnType<InvoiceLoader>> | null>(
      null,
    ),
    [error, setError] = useState("");
  const invoice = s.invoices.find(
    (i) => i.card_id === card.id && i.billing_month === month,
  );
  useEffect(() => {
    let cancelled = false;
    load(card.id, month, page)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [card.id, month, page, load, s]);
  const choices = [
    ...new Set([
      initialMonth,
      ...s.invoices
        .filter((i) => i.card_id === card.id)
        .map((i) => i.billing_month),
    ]),
  ].sort();
  return (
    <div className="invoice-detail">
      <label>
        Competência da fatura
        <select
          value={month}
          onChange={(e) => {
            setMonth(e.target.value);
            setPage(0);
            setDetail(null);
            setError("");
          }}
        >
          {choices.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </label>
      <div className="invoice-detail-total">
        <span>Saldo a pagar</span>
        <strong>{money(invoice?.remaining ?? 0)}</strong>
        <small>
          {invoice
            ? `Vencimento: ${formatDate(invoice.due_date)}`
            : "Nenhuma compra nesta competência"}
        </small>
      </div>
      <div className="between small">
        <span>Compras: {money(invoice?.total ?? 0)}</span>
        <span>Pagamentos: {money(invoice?.paid ?? 0)}</span>
      </div>
      {invoice && invoice.remaining > 0 && (
        <button
          className="button primary"
          onClick={() => open({ type: "payment", invoice })}
        >
          Registrar pagamento
        </button>
      )}
      <h3>Compras desta fatura</h3>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : !detail ? (
        <p role="status">Carregando…</p>
      ) : detail.rows.length ? (
        <>
          {detail.rows.map((i) => (
            <button
              className="invoice-line"
              key={i.id}
              onClick={() => edit(i.transaction)}
            >
              <span>
                <strong>
                  {i.transaction.merchant ||
                    i.transaction.description ||
                    "Compra"}
                </strong>
                <small>
                  Compra {formatDate(i.transaction.purchase_date)} · parcela{" "}
                  {i.number}/{i.transaction.installments_count}
                </small>
              </span>
              <strong>{money(i.amount_cents)}</strong>
            </button>
          ))}
          <div className="pagination">
            <span>{detail.count} parcelas</span>
            <button
              className="icon-button"
              disabled={!page}
              aria-label="Parcelas anteriores"
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              disabled={(page + 1) * 30 >= detail.count}
              aria-label="Próximas parcelas"
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      ) : (
        <p className="muted">Nenhuma compra.</p>
      )}
      {detail && detail.category_totals.length > 0 && (
        <>
          <h3>Categorias desta fatura · valor das parcelas</h3>
          <div className="invoice-category-list">
            {s.categories
              .map((c) => ({
                ...c,
                amount:
                  detail.category_totals.find(
                    (item) => item.category_id === c.id,
                  )?.total ?? 0,
              }))
              .filter((c) => c.amount > 0)
              .map((c) => (
                <div className="between" key={c.id}>
                  <span>{c.name}</span>
                  <strong>{money(c.amount)}</strong>
                </div>
              ))}
          </div>
        </>
      )}
      <h3>Pagamentos registrados</h3>
      {detail?.payments.length ? (
        detail.payments.map((p) => (
          <div className="between payment-row" key={p.id}>
            <span>
              {formatDate(p.paid_date)} ·{" "}
              {s.accounts.find((a) => a.id === p.account_id)?.name}
            </span>
            <strong>{money(p.amount_cents)}</strong>
          </div>
        ))
      ) : (
        <p className="muted">Nenhum pagamento registrado.</p>
      )}
    </div>
  );
}
