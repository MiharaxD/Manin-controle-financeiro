"use client";
import { useEffect, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths } from "@/lib/finance";
import type { Snapshot, Transaction, Filters } from "@/lib/types";
import { emptyFilters } from "@/lib/types";
import type { Loader } from "./types";
import { Panel, Empty, TransactionRows } from "./shared";
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
  const [filters, setFilters] = useState<Filters>({
    ...emptyFilters,
    from: s.month,
    to: addMonths(s.month, 0, 31),
    ...initialFilters,
  });
  const [rows, setRows] = useState<Transaction[]>([]),
    [count, setCount] = useState(0),
    [page, setPage] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const change = (key: keyof Filters, value: string) => {
    setPage(0);
    setFilters((f) => ({ ...f, [key]: value }));
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
  return (
    <Panel
      title="Todos os lançamentos"
      action={<span className="muted small">{count} registros</span>}
    >
      <div className="filters">
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label="Buscar lançamentos"
            placeholder="Buscar descrição ou estabelecimento"
            value={filters.search}
            onChange={(e) => change("search", e.target.value)}
          />
        </label>
        <div className="filter-grid">
          <label>
            Tipo
            <select
              value={filters.kind}
              onChange={(e) => change("kind", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="expense">Despesas</option>
              <option value="income">Receitas</option>
            </select>
          </label>
          <label>
            Categoria
            <select
              value={filters.category}
              onChange={(e) => change("category", e.target.value)}
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
              onChange={(e) => change("card", e.target.value)}
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
            Pagamento
            <select
              value={filters.method}
              onChange={(e) => change("method", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="pix">Pix</option>
              <option value="debit">Débito</option>
              <option value="cash">Dinheiro</option>
              <option value="credit">Crédito</option>
            </select>
          </label>
          <label>
            De
            <input
              type="date"
              value={filters.from}
              onChange={(e) => change("from", e.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              value={filters.to}
              onChange={(e) => change("to", e.target.value)}
            />
          </label>
          <label>
            Estado
            <select
              value={filters.status}
              onChange={(e) => change("status", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="actual">Efetivos</option>
              <option value="planned">Previsões</option>
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => {
              setPage(0);
              setFilters({ ...emptyFilters });
            }}
          >
            Limpar filtros
          </button>
        </div>
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
        />
      ) : (
        <Empty
          title="Nenhum lançamento por aqui"
          text="Experimente outro período ou adicione um lançamento."
        />
      )}
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
    </Panel>
  );
}
