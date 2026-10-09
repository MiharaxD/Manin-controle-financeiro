"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Repeat2 } from "lucide-react";
import {
  money,
  moneyInput,
  parseMoney,
  splitInstallments,
} from "@/lib/finance";
import { mutationSchema } from "@/lib/schemas";
import type {
  Card,
  Category,
  Invoice,
  Method,
  Mutation,
  Recurrence,
  Snapshot,
  Transaction,
} from "@/lib/types";
import { CategoryIcon } from "./icons";
export type Editor =
  | { type: "transaction"; value?: Transaction; recurrence?: Recurrence }
  | { type: "card"; value?: Card }
  | { type: "category"; value?: Category }
  | {
      type: "account" | "budget" | "recurrence";
      value?: Record<string, unknown>;
    }
  | { type: "payment"; invoice: Invoice };
type Save = (value: Mutation) => Promise<void>;
function Failure({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="form-error">
      {message}
    </p>
  ) : null;
}
export function TransactionForm({
  snapshot: s,
  editor,
  save,
  suggest,
}: {
  snapshot: Snapshot;
  editor: Extract<Editor, { type: "transaction" }>;
  save: Save;
  suggest: (merchant: string, fallback: string) => Promise<string>;
}) {
  const original = editor.value,
    recurrence = editor.recurrence;
  const submissionId = useRef(original?.id ?? crypto.randomUUID());
  const [kind, setKind] = useState(original?.kind ?? "expense");
  const [method, setMethod] = useState<Method>(
    original?.payment_method ?? recurrence?.payment_method ?? "pix",
  );
  const [amount, setAmount] = useState(
    original
      ? moneyInput(original.amount_cents)
      : recurrence
        ? moneyInput(recurrence.amount_cents)
        : "",
  );
  const [category, setCategory] = useState(
    original?.category_id ??
      recurrence?.category_id ??
      s.categories[0]?.id ??
      "",
  );
  const [merchant, setMerchant] = useState(
    original?.merchant ?? recurrence?.name ?? "",
  );
  const [manualCategory, setManualCategory] = useState(
    !!original || !!recurrence,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [count, setCount] = useState(original?.installments_count ?? 1);
  const [selectedRecurrence, setSelectedRecurrence] = useState(
    recurrence?.id ?? "",
  );
  const [card, setCard] = useState(
    original?.card_id ?? recurrence?.card_id ?? s.cards[0]?.id ?? "",
  );
  const [account, setAccount] = useState(
    original?.account_id ?? recurrence?.account_id ?? s.accounts[0]?.id ?? "",
  );
  const [purchaseDate, setPurchaseDate] = useState(
    original?.purchase_date ?? recurrence?.next_date ?? s.today,
  );
  useEffect(() => {
    if (!merchant.trim() || manualCategory) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const category = await suggest(merchant, "");
        if (!controller.signal.aborted && category) setCategory(category);
      } catch {
        /* A suggestion never blocks a transaction. */
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [merchant, manualCategory, suggest, s.transactions]);
  const reconcile = (id: string) => {
    setSelectedRecurrence(id);
    const r = s.recurrences.find((r) => r.id === id);
    if (!r) return;
    setAmount(moneyInput(r.amount_cents));
    setMerchant(r.name);
    setCategory(r.category_id);
    setManualCategory(true);
    setMethod(r.payment_method);
    setCard(r.card_id ?? "");
    setAccount(r.account_id ?? s.accounts[0]?.id ?? "");
    setCount(1);
    setPurchaseDate(r.next_date);
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    try {
      const form = new FormData(event.currentTarget),
        r = s.recurrences.find((r) => r.id === selectedRecurrence);
      const value: Mutation = {
        action: "transaction",
        payload: {
          id: submissionId.current,
          kind,
          amount_cents: parseMoney(amount),
          purchase_date: purchaseDate,
          description: String(form.get("description") ?? ""),
          merchant,
          category_id: kind === "transfer" ? null : category || null,
          payment_method: method,
          card_id: method === "credit" ? card || null : null,
          account_id: method === "credit" ? null : account || null,
          destination_account_id:
            kind === "transfer"
              ? String(form.get("destination") || "") || null
              : null,
          installments_count: method === "credit" ? count : 1,
          status: form.get("status") ?? "actual",
          recurrence_id: original?.recurrence_id ?? r?.id ?? null,
          occurrence_date: original?.occurrence_date ?? r?.next_date ?? null,
          make_recurring: !!form.get("make_recurring"),
        },
      };
      const parsed = mutationSchema.safeParse(value);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      setBusy(true);
      await save(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };
  let installmentHint = "";
  try {
    if (method === "credit" && amount && count > 1) {
      const parts = splitInstallments(parseMoney(amount), count);
      installmentHint = `${count} parcelas · primeira de ${money(parts[0])}${parts[0] !== parts.at(-1) ? `, última de ${money(parts.at(-1)!)}` : ""}`;
    }
  } catch {
    /* Incomplete amount while typing. */
  }
  return (
    <form onSubmit={submit} className="entry-form">
      <div className="segmented" aria-label="Tipo de lançamento">
        {(["expense", "income", "transfer"] as const).map((k) => (
          <button
            type="button"
            key={k}
            className={kind === k ? "selected" : ""}
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              if (k !== "expense" && method === "credit") setMethod("pix");
            }}
          >
            {k === "expense" ? (
              <ArrowUpRight size={16} />
            ) : k === "income" ? (
              <ArrowDownLeft size={16} />
            ) : (
              <Repeat2 size={16} />
            )}
            {
              {
                expense: "Despesa",
                income: "Receita",
                transfer: "Transferência",
              }[k]
            }
          </button>
        ))}
      </div>
      <label className="amount-label">
        Quanto?
        <span className="amount-input">
          <span>R$</span>
          <input
            aria-label="Valor"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
            maxLength={18}
            autoComplete="off"
          />
        </span>
      </label>
      {kind !== "transfer" && (
        <div className="field-group">
          <span className="field-label">Categoria</span>
          <div
            className="category-pills"
            role="group"
            aria-label="Categorias sugeridas"
          >
            {s.categories.slice(0, 6).map((c) => (
              <button
                type="button"
                key={c.id}
                aria-pressed={category === c.id}
                className={category === c.id ? "selected" : ""}
                onClick={() => {
                  setCategory(c.id);
                  setManualCategory(true);
                }}
              >
                <CategoryIcon name={c.icon} size={16} />
                {c.name}
              </button>
            ))}
          </div>
          <select
            aria-label="Todas as categorias"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setManualCategory(true);
            }}
            required
          >
            <option value="" disabled>
              Selecione
            </option>
            {s.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parent_id ? "↳ " : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="form-grid">
        <label>
          Estabelecimento
          <input
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            maxLength={100}
            placeholder="Ex.: café do bairro"
          />
        </label>
        <label>
          Data da compra
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />
        </label>
      </div>
      <label>
        Descrição <span className="optional">opcional</span>
        <input
          name="description"
          defaultValue={original?.description}
          placeholder="Algo que você quer lembrar"
          maxLength={120}
        />
      </label>
      <div className="field-group">
        <span className="field-label">Como foi pago?</span>
        <div
          className="method-pills"
          role="group"
          aria-label="Forma de pagamento"
        >
          {(["pix", "debit", "cash", "credit"] as const)
            .filter((m) => kind === "expense" || m !== "credit")
            .map((m) => (
              <button
                type="button"
                key={m}
                className={method === m ? "selected" : ""}
                aria-pressed={method === m}
                onClick={() => setMethod(m)}
              >
                {m === "credit" && <CreditCard size={16} />}
                {
                  {
                    pix: "Pix",
                    debit: "Débito",
                    cash: "Dinheiro",
                    credit: "Crédito",
                  }[m]
                }
              </button>
            ))}
        </div>
      </div>
      {method === "credit" ? (
        <div className="form-grid">
          <label>
            Cartão
            <select
              aria-label="Cartão"
              value={card}
              onChange={(e) => setCard(e.target.value)}
              required
            >
              <option value="">Selecione um cartão</option>
              {s.cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!s.cards.length && (
              <small>Cadastre um cartão na aba Cartões.</small>
            )}
          </label>
          <label>
            Parcelas
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              min={1}
              max={60}
              required
            />
          </label>
        </div>
      ) : (
        <label>
          Conta
          <select
            aria-label="Conta"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
          >
            <option value="">Selecione</option>
            {s.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {installmentHint && <p className="hint">{installmentHint}</p>}
      {kind === "transfer" && (
        <label>
          Conta de destino
          <select
            name="destination"
            defaultValue={original?.destination_account_id ?? ""}
            required
          >
            <option value="">Selecione</option>
            {s.accounts
              .filter((a) => a.id !== account)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </label>
      )}
      <label>
        Estado
        <select name="status" defaultValue={original?.status ?? "actual"}>
          <option value="actual">Lançamento efetivo</option>
          <option value="planned">Previsão · ainda não aconteceu</option>
        </select>
      </label>
      {!original && kind === "expense" && count === 1 && (
        <>
          <label>
            Conciliar uma recorrência <span className="optional">opcional</span>
            <select
              value={selectedRecurrence}
              onChange={(e) => reconcile(e.target.value)}
            >
              <option value="">Sem vínculo</option>
              {s.recurrences
                .filter((r) => r.status === "active")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.next_date.split("-").reverse().join("/")}
                  </option>
                ))}
            </select>
          </label>
          {!selectedRecurrence && (
            <label className="check-label">
              <input type="checkbox" name="make_recurring" /> Repetir
              mensalmente
            </label>
          )}
        </>
      )}
      <Failure message={error} />
      <button type="submit" className="button primary submit" disabled={busy}>
        {busy
          ? "Salvando…"
          : original
            ? "Salvar alterações"
            : "Salvar lançamento"}
      </button>
    </form>
  );
}
export function EntityForm({
  snapshot: s,
  editor,
  save,
}: {
  snapshot: Snapshot;
  editor: Exclude<Editor, { type: "transaction" }>;
  save: Save;
}) {
  const value: Record<string, unknown> =
    "value" in editor
      ? ((editor.value as unknown as Record<string, unknown>) ?? {})
      : {};
  const str = (key: string, fallback = "") => String(value[key] ?? fallback);
  const num = (key: string, fallback: number) => Number(value[key] ?? fallback);
  const [method, setMethod] = useState<Method>(
    (value.payment_method as Method) ?? "credit",
  );
  const submissionId = useRef(String(value.id ?? crypto.randomUUID()));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    try {
      const form = new FormData(event.currentTarget),
        get = (k: string) => String(form.get(k) ?? "");
      let payload: Record<string, unknown> = { id: submissionId.current };
      if (editor.type === "card")
        payload = {
          ...payload,
          name: get("name"),
          institution: get("institution"),
          color: get("color"),
          limit_cents: get("limit") ? parseMoney(get("limit")) : null,
          last_four: get("last_four"),
          closing_day: Number(get("closing_day")),
          due_day: Number(get("due_day")),
        };
      if (editor.type === "category")
        payload = {
          ...payload,
          name: get("name"),
          icon: get("icon"),
          color: get("color"),
          parent_id: get("parent") || null,
          position: Number(get("position")),
        };
      if (editor.type === "account")
        payload = { ...payload, name: get("name") };
      if (editor.type === "budget")
        payload = {
          ...payload,
          month: s.month,
          category_id: get("category") || null,
          amount_cents: parseMoney(get("amount")),
        };
      if (editor.type === "recurrence")
        payload = {
          ...payload,
          name: get("name"),
          amount_cents: parseMoney(get("amount")),
          category_id: get("category"),
          payment_method: method,
          card_id: method === "credit" ? get("card") || null : null,
          account_id: method === "credit" ? null : get("account") || null,
          interval_months: Number(get("interval")),
          next_date: get("next_date"),
          anchor_day:
            get("next_date") === str("next_date")
              ? num("anchor_day", Number(get("next_date").slice(8)))
              : Number(get("next_date").slice(8)),
          status: get("status"),
        };
      if (editor.type === "payment")
        payload = {
          id: submissionId.current,
          card_id: editor.invoice.card_id,
          billing_month: editor.invoice.billing_month,
          amount_cents: parseMoney(get("amount")),
          paid_date: get("paid_date"),
          account_id: get("account"),
        };
      const mutation = { action: editor.type, payload };
      const parsed = mutationSchema.safeParse(mutation);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      setBusy(true);
      await save(mutation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  };
  const categories = (
    <select
      name="category"
      aria-label="Categoria"
      defaultValue={str(
        "category_id",
        editor.type === "budget" ? "" : s.categories[0]?.id,
      )}
      required={editor.type !== "budget"}
    >
      {editor.type === "budget" && (
        <option value="">Geral · todas as categorias</option>
      )}
      {s.categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
  return (
    <form className="entry-form" onSubmit={submit}>
      {(["card", "category", "account", "recurrence"] as string[]).includes(
        editor.type,
      ) && (
        <label>
          Nome
          <input
            name="name"
            defaultValue={str("name")}
            maxLength={60}
            placeholder={
              editor.type === "recurrence"
                ? "Ex.: Spotify"
                : "Como você quer chamar?"
            }
            required
            autoFocus
          />
        </label>
      )}
      {editor.type === "card" && (
        <>
          <label>
            Instituição
            <input
              name="institution"
              defaultValue={str("institution")}
              maxLength={60}
              placeholder="Ex.: Nubank"
            />
          </label>
          <div className="form-grid">
            <label>
              Limite <span className="optional">opcional</span>
              <input
                name="limit"
                inputMode="decimal"
                defaultValue={
                  value.limit_cents ? moneyInput(Number(value.limit_cents)) : ""
                }
                placeholder="5.000,00"
              />
            </label>
            <label>
              Últimos 4 dígitos <span className="optional">opcional</span>
              <input
                name="last_four"
                inputMode="numeric"
                defaultValue={str("last_four")}
                maxLength={4}
                pattern="[0-9]{4}|"
                placeholder="0000"
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Dia do fechamento
              <input
                type="number"
                name="closing_day"
                defaultValue={num("closing_day", 25)}
                min={1}
                max={31}
                required
              />
            </label>
            <label>
              Dia do vencimento
              <input
                type="number"
                name="due_day"
                defaultValue={num("due_day", 2)}
                min={1}
                max={31}
                required
              />
            </label>
          </div>
          <p className="hint">
            Compras no dia do fechamento entram na fatura que está fechando.
            Dias inexistentes usam o último dia do mês.
          </p>
        </>
      )}
      {(editor.type === "card" || editor.type === "category") && (
        <label>
          Cor
          <input
            type="color"
            name="color"
            defaultValue={str("color", "#ff1828")}
          />
        </label>
      )}
      {editor.type === "category" && (
        <>
          <label>
            Ícone
            <select name="icon" defaultValue={str("icon", "circle")}>
              {Object.entries({
                utensils: "Alimentação",
                cart: "Mercado",
                car: "Transporte",
                home: "Casa",
                heart: "Saúde",
                sparkles: "Lazer",
                game: "Jogos",
                laptop: "Tecnologia",
                bag: "Compras",
                book: "Educação",
                cloud: "Digital",
                circle: "Outros",
              }).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoria principal{" "}
            <span className="optional">para subcategoria</span>
            <select name="parent" defaultValue={str("parent_id")}>
              <option value="">Categoria independente</option>
              {s.categories
                .filter((c) => !c.parent_id && c.id !== value.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Posição na lista
            <input
              name="position"
              type="number"
              min={0}
              max={999}
              defaultValue={num("position", s.categories.length + 1)}
              required
            />
          </label>
        </>
      )}
      {(editor.type === "budget" ||
        editor.type === "recurrence" ||
        editor.type === "payment") && (
        <label>
          {editor.type === "budget"
            ? "Limite mensal"
            : editor.type === "payment"
              ? "Valor pago"
              : "Valor da cobrança"}
          <input
            name="amount"
            inputMode="decimal"
            defaultValue={
              editor.type === "payment"
                ? moneyInput(editor.invoice.remaining)
                : value.amount_cents
                  ? moneyInput(Number(value.amount_cents))
                  : ""
            }
            placeholder="0,00"
            required
          />
        </label>
      )}
      {(editor.type === "budget" || editor.type === "recurrence") && (
        <label>Categoria{categories}</label>
      )}
      {editor.type === "recurrence" && (
        <>
          <div className="form-grid">
            <label>
              A cada quantos meses?
              <input
                type="number"
                name="interval"
                defaultValue={num("interval_months", 1)}
                min={1}
                max={12}
                required
              />
              <small>1 = mensal · 12 = anual</small>
            </label>
            <label>
              Próxima cobrança
              <input
                type="date"
                name="next_date"
                defaultValue={str("next_date", s.today)}
                required
              />
            </label>
          </div>
          <label>
            Pagamento
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
            >
              {Object.entries({
                credit: "Crédito",
                pix: "Pix",
                debit: "Débito",
                cash: "Dinheiro",
              }).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {method === "credit" ? (
            <label>
              Cartão
              <select
                name="card"
                defaultValue={str("card_id", s.cards[0]?.id)}
                required
              >
                <option value="">Selecione</option>
                {s.cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              Conta
              <select
                name="account"
                defaultValue={str("account_id", s.accounts[0]?.id)}
                required
              >
                {s.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Estado
            <select name="status" defaultValue={str("status", "active")}>
              <option value="active">Ativa</option>
              <option value="paused">Pausada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </label>
          <p className="hint">
            Cobranças vencidas são registradas automaticamente. Alterar o preço
            afeta só as próximas cobranças. Pausar e cancelar preservam o
            histórico.
          </p>
        </>
      )}
      {editor.type === "payment" && (
        <>
          <p className="hint">
            Saldo da fatura: {money(editor.invoice.remaining)}. Este pagamento
            reduz a obrigação e entra no fluxo de caixa; a compra não será
            contada de novo.
          </p>
          <label>
            Data do pagamento
            <input
              type="date"
              name="paid_date"
              defaultValue={s.today}
              max={s.today}
              required
            />
          </label>
          <label>
            Conta de origem
            <select name="account" defaultValue={s.accounts[0]?.id} required>
              {s.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      <Failure message={error} />
      <button className="button primary submit" type="submit" disabled={busy}>
        {busy
          ? "Salvando…"
          : editor.type === "payment"
            ? "Registrar pagamento"
            : "Salvar"}
      </button>
    </form>
  );
}
