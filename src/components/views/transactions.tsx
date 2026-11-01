"use client";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { addMonths, formatDate, money } from "@/lib/finance";
import type { Entry, Snapshot, Transaction, Filters } from "@/lib/types";
import { emptyFilters } from "@/lib/types";
import type { Loader } from "./types";
import { Empty, TransactionRows } from "./shared";
const kinds: Record<string, string> = {
  expense: "Despesas",
  income: "Receitas",
};
const methods: Record<string, string> = {
  pix: "Pix",
  debit: "Débito",
  cash: "Dinheiro",
  credit: "Crédito",
};
const statuses: Record<string, string> = {
  actual: "Efetivos",
  planned: "Previsões",
};
export function Transactions({
  s,
  load,
  edit,
  reuse,
  remove,
  initialFilters,
}: {
  s: Snapshot;
  load: Loader;
  edit: (t: Transaction) => void;
  reuse: (t: Transaction) => void;
  remove: (t: Transaction) => void;
  initialFilters?: Partial<Filters>;
}) {
  const period = { from: s.month, to: addMonths(s.month, 0, 31) };
  const [filters, setFilters] = useState<Filters>({
    ...emptyFilters,
    ...period,
    ...initialFilters,
  });
  const [rows, setRows] = useState<Entry[]>([]),
    [count, setCount] = useState(0),
    [totals, setTotals] = useState<{ income: number; expense: number }>(),
    [days, setDays] = useState<Record<string, number>>({}),
    [page, setPage] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null),
    popover = useRef<HTMLDivElement>(null);
  const change = (patch: Partial<Filters>) => {
    setPage(0);
    setFilters((f) => ({ ...f, ...patch }));
  };
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      load(filters, page, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) {
            setRows(result.rows);
            setCount(result.count);
            setTotals(result.totals);
            setDays(result.days ?? {});
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, page, load, s]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !popover.current?.contains(target) &&
        !toggle.current?.contains(target)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const chips: { label: string; clear: Partial<Filters> }[] = [];
  if (filters.kind) chips.push({ label: kinds[filters.kind], clear: { kind: "" } });
  if (filters.category)
    chips.push({
      label:
        s.categories.find((c) => c.id === filters.category)?.name ??
        "Categoria",
      clear: { category: "" },
    });
  if (filters.card)
    chips.push({
      label:
        "Cartão: " + (s.cards.find((c) => c.id === filters.card)?.name ?? ""),
      clear: { card: "" },
    });
  if (filters.method)
    chips.push({ label: methods[filters.method], clear: { method: "" } });
  if (filters.status)
    chips.push({ label: statuses[filters.status], clear: { status: "" } });
  if (filters.from !== period.from || filters.to !== period.to)
    chips.push({
      label:
        !filters.from && !filters.to
          ? "Todo o período"
          : `${filters.from ? formatDate(filters.from) : "Início"} a ${filters.to ? formatDate(filters.to) : "hoje"}`,
      clear: period,
    });
  return (
    <section className="panel transactions-panel" aria-label="Lançamentos">
      <div className="filters">
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label="Buscar lançamentos"
            placeholder="Buscar descrição ou estabelecimento"
            value={filters.search}
            onChange={(e) => change({ search: e.target.value })}
          />
        </label>
        <button
          ref={toggle}
          className="button secondary filter-toggle"
          aria-expanded={open}
          aria-controls="transaction-filters"
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal size={17} />
          Filtros
          {chips.length > 0 && (
            <span className="filter-count">{chips.length}</span>
          )}
        </button>
        {open && (
          <div
            ref={popover}
            id="transaction-filters"
            className="filter-popover"
            role="group"
            aria-label="Filtros de lançamentos"
          >
            <div className="filter-grid">
              <label>
                Tipo
                <select
                  value={filters.kind}
                  onChange={(e) => change({ kind: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="expense">Despesas</option>
                  <option value="income">Receitas</option>
                </select>
              </label>
              <label>
                Pagamento
                <select
                  value={filters.method}
                  onChange={(e) => change({ method: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="pix">Pix</option>
                  <option value="debit">Débito</option>
                  <option value="cash">Dinheiro</option>
                  <option value="credit">Crédito</option>
                </select>
              </label>
              <label>
                Categoria
                <select
                  value={filters.category}
                  onChange={(e) => change({ category: e.target.value })}
                >
                  <option value="">Todas</option>
                  {s.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Apelido do cartão
                <select
                  value={filters.card}
                  onChange={(e) => change({ card: e.target.value })}
                >
                  <option value="">Todos</option>
                  {s.cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                De
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => change({ from: e.target.value })}
                />
              </label>
              <label>
                Até
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => change({ to: e.target.value })}
                />
              </label>
              <label>
                Estado
                <select
                  value={filters.status}
                  onChange={(e) => change({ status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="actual">Efetivos</option>
                  <option value="planned">Previsões</option>
                </select>
              </label>
            </div>
            <div className="filter-popover-footer">
              <button
                className="text-button"
                onClick={() =>
                  change({ ...emptyFilters, search: filters.search, ...period })
                }
              >
                Limpar filtros
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setOpen(false);
                  toggle.current?.focus();
                }}
              >
                {loading
                  ? "Ver lançamentos"
                  : `Ver ${count} ${count === 1 ? "lançamento" : "lançamentos"}`}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="filter-summary">
        {chips.map((chip) => (
          <button
            key={chip.label}
            className="filter-chip"
            aria-label={`Remover filtro ${chip.label}`}
            onClick={() => change(chip.clear)}
          >
            {chip.label}
            <X size={14} />
          </button>
        ))}
        {chips.length > 1 && (
          <button
            className="text-button"
            onClick={() =>
              change({ ...emptyFilters, search: filters.search, ...period })
            }
          >
            Limpar
          </button>
        )}
        <span className="filter-totals" aria-live="polite">
          {count} {count === 1 ? "lançamento" : "lançamentos"}
          {!!totals?.income && (
            <>
              {" · "}receitas{" "}
              <strong className="positive">{money(totals.income)}</strong>
            </>
          )}
          {!!totals?.expense && (
            <>
              {" · "}despesas <strong>{money(totals.expense)}</strong>
            </>
          )}
        </span>
      </div>
      {error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : loading ? (
        <div className="list-loading" role="status">
          Carregando lançamentos…
        </div>
      ) : rows.length ? (
        <TransactionRows
          rows={rows}
          s={s}
          edit={edit}
          reuse={reuse}
          remove={remove}
          days={days}
        />
      ) : (
        <Empty
          title="Nenhum lançamento por aqui"
          text="Experimente outro período ou adicione um lançamento."
        />
      )}
      {count > 30 && (
        <div className="pagination">
          <span>
            Página {page + 1} de {Math.max(1, Math.ceil(count / 30))}
          </span>
          <button
            className="icon-button"
            disabled={!page || loading}
            aria-label="Página anterior"
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            disabled={(page + 1) * 30 >= count || loading}
            aria-label="Próxima página"
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
