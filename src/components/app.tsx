"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  House,
  Moon,
  Plus,
  RefreshCw,
  Repeat2,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sun,
  Target,
  Trash2,
  Wallet,
  X,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  addMonths,
  buildSnapshot,
  monthLabel,
  suggestCategory,
  todaySP,
} from "@/lib/finance";
import { csv, download } from "@/lib/export";
import type { LocalStore, LocalRecord } from "@/lib/local-store";
import { Backups } from "./backups";
import type {
  Card,
  DemoData,
  Filters,
  Mutation,
  Snapshot,
  Transaction,
} from "@/lib/types";
import { Dialog } from "./ui/dialog";
import { CategoryIcon, Logo } from "./icons";
import { EntityForm, TransactionForm, type Editor } from "./forms";
import { Dashboard } from "./views/dashboard";
import { Transactions } from "./views/transactions";
import { Cards } from "./views/cards";
import { Recurrences } from "./views/recurrences";
import { Reports } from "./views/reports";
import { InvoiceDetail } from "./views/invoice";
import { Panel, Empty, BudgetBar } from "./views/shared";
import type { Page, Loader, InvoiceLoader } from "./views/types";
const navigation = [
  { id: "home", title: "Início", icon: House },
  { id: "transactions", title: "Transações", icon: Wallet },
  { id: "cards", title: "Cartões", icon: CreditCard },
  { id: "recurrences", title: "Recorrências", icon: Repeat2 },
  { id: "reports", title: "Relatórios", icon: ChartNoAxesCombined },
] as const;
export function FinanceApp({
  initial,
  repository,
  initialData,
  needNotice,
}: {
  initial: Snapshot;
  repository: LocalStore;
  initialData: DemoData;
  needNotice: boolean;
}) {
  const mobileNavRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = mobileNavRef.current;
    if (!nav) return;
    const measure = () =>
      document.documentElement.style.setProperty(
        "--mobile-nav-height",
        `${Math.max(74, nav.getBoundingClientRect().height)}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--mobile-nav-height");
    };
  }, []);
  const demo = repository.mode === "demo",
    dataRef = useRef(initialData),
    monthRef = useRef(initial.month);
  const [s, setSnapshot] = useState(initial),
    [page, setPage] = useState<Page>("home"),
    [editor, setEditor] = useState<Editor | null>(null);
  const [settings, setSettings] = useState(false),
    [toast, setToast] = useState<{
      text: string;
      undo?: string;
      error?: boolean;
    } | null>(null);
  const [refreshing, setRefreshing] = useState(false),
    [theme, setTheme] = useState("light"),
    [history, setHistory] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<{ card: Card; month: string } | null>(
      null,
    ),
    [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null),
    [deleteBusy, setDeleteBusy] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(""),
    [settingsBusy, setSettingsBusy] = useState(false),
    [failure, setFailure] = useState("");
  const [pageFilters, setPageFilters] = useState<Partial<Filters>>({});
  const [notice, setNotice] = useState(needNotice && !demo);
  const commit = useCallback(
    (record: LocalRecord, month = monthRef.current) => {
      dataRef.current = record.data;
      if (month === monthRef.current)
        setSnapshot(buildSnapshot(record.data, month, todaySP()));
    },
    [],
  );
  const reload = useCallback(
    async (month = monthRef.current) => {
      monthRef.current = month;
      const record = await repository.refresh();
      commit(record, month);
      setFailure("");
    },
    [repository, commit],
  );
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setTheme(document.documentElement.dataset.theme ?? "light"),
    );
    const refresh = () => {
      void reload().catch(() => {
        setFailure(
          "Não foi possível ler os dados deste navegador. Nenhum dado foi substituído.",
        );
      });
    };
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const unsubscribe = repository.subscribe(refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    let day = todaySP();
    const timer = setInterval(() => {
      if (day !== todaySP()) {
        day = todaySP();
        refresh();
      }
    }, 60000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
      unsubscribe();
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [repository, reload]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? 12000 : 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  const mutate = useCallback(
    async (mutation: Mutation) => {
      const record = await repository.mutate(mutation);
      commit(record);
      setFailure("");
    },
    [repository, commit],
  );
  const save = async (mutation: Mutation) => {
    await mutate(mutation);
    setEditor(null);
    setToast({
      text:
        mutation.action === "payment"
          ? "Pagamento registrado."
          : "Salvo neste dispositivo.",
    });
  };
  const safeMutate = async (mutation: Mutation) => {
    try {
      await mutate(mutation);
      setToast({ text: "Atualizado." });
    } catch (e) {
      setToast({ text: (e as Error).message, error: true });
    }
  };
  const suggest = useCallback(
    async (merchant: string, fallback: string) =>
      suggestCategory(
        merchant,
        dataRef.current.transactions
          .filter((t) => !t.deleted_at)
          .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date)),
        fallback,
      ),
    [],
  );
  const loadTransactions = useCallback<Loader>(
    async (filters, page, signal) => {
      if (signal?.aborted)
        throw new DOMException("Consulta cancelada", "AbortError");
      const record = await repository.read();
      const rows = record.data.transactions
        .filter(
          (t) =>
            !t.deleted_at &&
            (!filters.from || t.purchase_date >= filters.from) &&
            (!filters.to || t.purchase_date <= filters.to) &&
            (!filters.kind || t.kind === filters.kind) &&
            (!filters.category || t.category_id === filters.category) &&
            (!filters.card || t.card_id === filters.card) &&
            (!filters.method || t.payment_method === filters.method) &&
            (!filters.status || t.status === filters.status) &&
            (!filters.recurrence || t.recurrence_id === filters.recurrence) &&
            (!filters.search ||
              (t.description + " " + t.merchant)
                .toLocaleLowerCase("pt-BR")
                .includes(filters.search.toLocaleLowerCase("pt-BR"))),
        )
        .sort((a, b) => b.purchase_date.localeCompare(a.purchase_date));
      return {
        rows: rows.slice(page * 30, page * 30 + 30),
        count: rows.length,
      };
    },
    [repository],
  );
  const loadInvoice = useCallback<InvoiceLoader>(
    async (card, month, page) => {
      const data = (await repository.read()).data;
      const live = new Map(
        data.transactions
          .filter(
            (t) =>
              !t.deleted_at &&
              t.status === "actual" &&
              t.purchase_date <= todaySP(),
          )
          .map((t) => [t.id, t]),
      );
      const rows = data.installments
        .filter(
          (i) =>
            i.card_id === card &&
            i.billing_month === month &&
            live.has(i.transaction_id),
        )
        .map((i) => ({ ...i, transaction: live.get(i.transaction_id)! }));
      return {
        rows: rows.slice(page * 30, page * 30 + 30),
        count: rows.length,
        category_totals: data.categories
          .map((c) => ({
            category_id: c.id,
            total: rows
              .filter((i) => i.transaction.category_id === c.id)
              .reduce((n, i) => n + i.amount_cents, 0),
          }))
          .filter((c) => c.total > 0),
        payments: data.payments.filter(
          (p) => p.card_id === card && p.billing_month === month,
        ),
      };
    },
    [repository],
  );
  const changeMonth = async (offset: number) => {
    const next = addMonths(s.month, offset, 1);
    if (next < "2000-01-01" || next > "2100-12-01") return;
    setRefreshing(true);
    setFailure("");
    try {
      await reload(next);
    } catch (e) {
      monthRef.current = s.month;
      setFailure((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };
  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("manin-theme", next);
    } catch {
      /* Preference cannot be persisted in some private browsers. */
    }
  };
  const onPage = (next: Page) => {
    setPage(next);
    setPageFilters({});
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const edit = (t: Transaction) => setEditor({ type: "transaction", value: t });
  const reuse = (t: Transaction) => {
    const { id: _id, ...copy } = t;
    void _id;
    setEditor({
      type: "transaction",
      value: {
        ...copy,
        id: undefined as unknown as string,
        purchase_date: s.today,
        recurrence_id: null,
        occurrence_date: null,
        status: "actual",
      },
    });
  };
  const exportData = async (format: "csv" | "json") => {
    setSettingsBusy(true);
    try {
      const backup = await repository.backup();
      download(
        format === "csv"
          ? csv(
              backup.data.transactions.filter((t) => !t.deleted_at),
              backup.data.categories,
            )
          : JSON.stringify(backup, null, 2),
        "manin." + format,
        format === "csv" ? "text/csv;charset=utf-8" : "application/json",
      );
      setToast({
        text: "Arquivo preparado para download. Guarde-o em um lugar seguro.",
      });
    } catch (e) {
      setToast({ text: (e as Error).message, error: true });
    } finally {
      setSettingsBusy(false);
    }
  };
  const editorTitle = editor
    ? {
        transaction:
          editor.type === "transaction" && editor.value?.id
            ? "Editar lançamento"
            : "Novo lançamento",
        card: "Seu cartão",
        category: "Categoria",
        account: "Conta",
        budget: "Orçamento do mês",
        recurrence: "Recorrência",
        payment: "Pagar fatura",
      }[editor.type]
    : "";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="workspace-label">SEU ESPAÇO FINANCEIRO</div>
        <nav aria-label="Navegação principal">
          {navigation.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "active" : ""}
              aria-current={page === n.id ? "page" : undefined}
              onClick={() => onPage(n.id)}
            >
              <n.icon size={20} strokeWidth={1.7} />
              {n.title}
              {page === n.id && <span className="nav-dot" aria-hidden="true" />}
            </button>
          ))}
          <span className="nav-divider" />
          <button
            className={page === "budgets" ? "active" : ""}
            aria-current={page === "budgets" ? "page" : undefined}
            onClick={() => onPage("budgets")}
          >
            <Target size={20} />
            Orçamentos
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setSettings(true)}>
            <Settings2 size={18} />
            Preferências
          </button>
          <div className="privacy-note">
            <ShieldCheck size={17} />
            <span>
              Seu dinheiro.
              <br />
              Seu espaço.
            </span>
          </div>
          <div className="profile">
            <span className="avatar">M</span>
            <div>
              <strong>{demo ? "Modo demonstração" : "Conta local"}</strong>
              <span>{demo ? "Dados fictícios" : "Neste navegador"}</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="mobile-brand">
            <Logo compact />
          </div>
          <div className="breadcrumb">
            Meu espaço <ChevronRight size={14} />
            <strong>
              {page === "budgets"
                ? "Orçamentos"
                : navigation.find((n) => n.id === page)?.title}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="connection">
              <span className="dot" />
              {demo
                ? "Demonstração"
                : refreshing
                  ? "Atualizando"
                  : failure
                    ? "Revisar armazenamento"
                    : "Salvo neste dispositivo"}
            </span>
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={
                theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"
              }
            >
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button
              className="icon-button"
              onClick={() => setSettings(true)}
              aria-label="Preferências"
            >
              <Settings2 size={19} />
            </button>
            <span className="avatar">M</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <span className="overline">
                {page === "home" ? "UM PASSO DE CADA VEZ" : "MEU ESPAÇO"}
              </span>
              <h1>
                {page === "home"
                  ? "Seu mês, com clareza."
                  : page === "budgets"
                    ? "Seus orçamentos"
                    : navigation.find((n) => n.id === page)?.title}
              </h1>
              <p>
                {page === "home"
                  ? "Um olhar tranquilo para o que entra, sai e vem pela frente."
                  : ""}
              </p>
            </div>
            <button
              className="button primary desktop-add"
              onClick={() => setEditor({ type: "transaction" })}
            >
              <Plus size={18} />
              Adicionar lançamento
            </button>
          </div>
          {demo && (
            <div className="demo-banner">
              <span className="demo-dot" />
              <span>
                Demonstração com dados fictícios. Alterações ficam no espaço de
                demonstração deste navegador, separadas dos seus dados pessoais.
              </span>
              <button
                className="text-button"
                onClick={() => {
                  void repository
                    .reset()
                    .then((record) => commit(record))
                    .catch((error) =>
                      setToast({ text: (error as Error).message, error: true }),
                    );
                }}
              >
                Reiniciar
              </button>
            </div>
          )}
          {!demo && (
            <div className="demo-banner local-banner">
              <ShieldCheck size={17} />
              <span>
                Dados neste dispositivo e navegador. Limpar o navegador ou
                trocar de dispositivo pode remover seu acesso. Faça backups.
              </span>
              <button className="text-button" onClick={() => setSettings(true)}>
                Backups
              </button>
            </div>
          )}
          <div className="month-toolbar">
            <div className="month-navigation">
              <button
                className="icon-button"
                disabled={refreshing}
                aria-label="Mês anterior"
                onClick={() => {
                  void changeMonth(-1);
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <span>{monthLabel(s.month)}</span>
              <button
                className="icon-button"
                disabled={refreshing}
                aria-label="Próximo mês"
                onClick={() => {
                  void changeMonth(1);
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              className="text-button refresh-button"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                try {
                  await reload();
                  setFailure("");
                } catch (e) {
                  setFailure((e as Error).message);
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              <RefreshCw size={14} className={refreshing ? "spinning" : ""} />
              {refreshing ? "Atualizando…" : "Atualizar"}
            </button>
          </div>
          {failure && (
            <p role="alert" className="form-error">
              {failure}
            </p>
          )}
          {page === "home" && (
            <Dashboard
              s={s}
              onPage={onPage}
              add={() => setEditor({ type: "transaction" })}
              edit={edit}
              reuse={reuse}
              remove={setDeleteTarget}
            />
          )}
          {page === "transactions" && (
            <Transactions
              key={`${s.month}${JSON.stringify(pageFilters)}`}
              s={s}
              load={loadTransactions}
              edit={edit}
              reuse={reuse}
              remove={setDeleteTarget}
              initialFilters={pageFilters}
            />
          )}
          {page === "cards" && (
            <Cards
              s={s}
              open={setEditor}
              detail={(card, month) => setInvoice({ card, month })}
              history={(card) => {
                setPageFilters({ card: card.id, from: "", to: "" });
                setPage("transactions");
              }}
            />
          )}
          {page === "recurrences" && (
            <Recurrences
              s={s}
              open={setEditor}
              mutate={safeMutate}
              history={setHistory}
            />
          )}
          {page === "reports" && <Reports s={s} />}
          {page === "budgets" && (
            <>
              <div className="section-intro">
                <p>Limites para o que já aconteceu. Previsões ficam de fora.</p>
                <button
                  className="button primary"
                  onClick={() => setEditor({ type: "budget" })}
                >
                  <Plus size={18} />
                  Novo orçamento
                </button>
              </div>
              <Panel title={monthLabel(s.month)}>
                {s.budgets.length ? (
                  s.budgets.map((b) => (
                    <div className="budget-edit-row" key={b.id}>
                      <BudgetBar
                        budget={b}
                        s={s}
                        onEdit={() =>
                          setEditor({ type: "budget", value: { ...b } })
                        }
                      />
                      <button
                        className="icon-button danger-text"
                        aria-label="Excluir orçamento"
                        onClick={() => {
                          void safeMutate({
                            action: "delete",
                            payload: { entity: "budget", id: b.id },
                          });
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty
                    title="Qual é seu plano para o mês?"
                    text="Defina um limite geral ou um limite por categoria."
                  />
                )}
              </Panel>
            </>
          )}
          <footer className="app-footer">
            <Logo compact />
            <span>Um pouco mais de clareza, todos os dias.</span>
            <span>BRL · São Paulo</span>
          </footer>
        </main>
      </div>
      <nav
        ref={mobileNavRef}
        className="mobile-nav"
        aria-label="Navegação no celular"
      >
        {navigation.map((n) => (
          <button
            key={n.id}
            className={page === n.id ? "active" : ""}
            aria-current={page === n.id ? "page" : undefined}
            onClick={() => onPage(n.id)}
          >
            <n.icon size={21} strokeWidth={1.7} />
            <span>{n.title}</span>
          </button>
        ))}
      </nav>
      <button
        className="fab"
        aria-label="Adicionar lançamento"
        onClick={() => setEditor({ type: "transaction" })}
      >
        <Plus size={26} />
      </button>
      {notice && (
        <Dialog
          open
          onClose={() => {
            void repository
              .acknowledge()
              .then(() => setNotice(false))
              .catch((error) =>
                setToast({ text: (error as Error).message, error: true }),
              );
          }}
          title="Seus dados ficam neste dispositivo"
        >
          <p className="dialog-copy">
            O Manin funciona sem conta e guarda suas finanças somente neste
            dispositivo e navegador. Não enviamos os registros a um servidor do
            Manin.
          </p>
          <p className="dialog-copy">
            Limpar os dados do navegador, usar outro navegador ou trocar de
            dispositivo pode remover seus dados ou impedir o acesso a eles.
            Exporte backups JSON regularmente. O Google Drive é opcional e
            recebe uma cópia apenas quando você solicitar.
          </p>
          <button
            className="button primary"
            onClick={() => {
              void repository
                .acknowledge()
                .then(() => setNotice(false))
                .catch((error) =>
                  setToast({ text: (error as Error).message, error: true }),
                );
            }}
          >
            Entendi, abrir Manin
          </button>
        </Dialog>
      )}
      {editor && (
        <Dialog open onClose={() => setEditor(null)} title={editorTitle}>
          {editor.type === "transaction" ? (
            <TransactionForm
              snapshot={s}
              editor={editor}
              save={save}
              suggest={suggest}
            />
          ) : (
            <>
              <EntityForm snapshot={s} editor={editor} save={save} />
              {editor.type === "card" && editor.value && (
                <button
                  className="text-button danger-text"
                  style={{ marginTop: 20 }}
                  onClick={async () => {
                    try {
                      await mutate({
                        action: "delete",
                        payload: { entity: "card", id: editor.value!.id },
                      });
                      setEditor(null);
                      setToast({ text: "Cartão excluído." });
                    } catch (e) {
                      setToast({ text: (e as Error).message, error: true });
                    }
                  }}
                >
                  Excluir cartão
                </button>
              )}
            </>
          )}
        </Dialog>
      )}
      {invoice && !editor && (
        <Dialog
          open
          onClose={() => setInvoice(null)}
          title={invoice.card.name}
          wide
        >
          <InvoiceDetail
            s={s}
            card={invoice.card}
            initialMonth={invoice.month}
            load={loadInvoice}
            open={(e) => {
              if (e.type === "payment")
                setInvoice({
                  card: invoice.card,
                  month: e.invoice.billing_month,
                });
              setEditor(e);
            }}
            edit={edit}
          />
        </Dialog>
      )}
      {history && !editor && (
        <Dialog
          open
          onClose={() => setHistory(null)}
          title={`Histórico · ${s.recurrences.find((r) => r.id === history)?.name ?? "Recorrência"}`}
          wide
        >
          <Transactions
            s={s}
            load={(filters, page, signal) =>
              loadTransactions(
                { ...filters, recurrence: history },
                page,
                signal,
              )
            }
            initialFilters={{ from: "", to: "" }}
            edit={edit}
            reuse={reuse}
            remove={setDeleteTarget}
          />
        </Dialog>
      )}
      {deleteTarget && (
        <Dialog
          open
          onClose={() => setDeleteTarget(null)}
          title="Excluir lançamento?"
        >
          <p className="dialog-copy">
            A compra e suas parcelas serão removidas dos totais. Você pode
            desfazer por alguns instantes.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setDeleteTarget(null)}
            >
              Voltar
            </button>
            <button
              className="button danger"
              disabled={deleteBusy}
              onClick={async () => {
                setDeleteBusy(true);
                try {
                  await mutate({
                    action: "delete",
                    payload: { entity: "transaction", id: deleteTarget.id },
                  });
                  setToast({
                    text: "Lançamento excluído.",
                    undo: deleteTarget.id,
                  });
                  setDeleteTarget(null);
                } catch (e) {
                  setToast({ text: (e as Error).message, error: true });
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              {deleteBusy ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </Dialog>
      )}
      {settings && !editor && (
        <Dialog
          open
          onClose={() => setSettings(false)}
          title="Seu espaço, do seu jeito"
        >
          <div className="settings-content">
            <section>
              <h3>
                <Smartphone size={19} />
                No seu iPhone
              </h3>
              <p>
                No Safari, toque em Compartilhar e depois em{" "}
                <strong>Adicionar à Tela de Início</strong>. Abra pelo ícone
                para usar como aplicativo.
              </p>
              <p className="hint">
                Após a primeira abertura da versão publicada, seus dados e o app
                ficam disponíveis offline. A instalação exige HTTPS. Não há
                sincronização entre dispositivos.
              </p>
            </section>
            <section>
              <div className="between">
                <h3>Orçamentos</h3>
                <button
                  className="text-button"
                  onClick={() => {
                    setSettings(false);
                    onPage("budgets");
                  }}
                >
                  Abrir <ArrowRight size={15} />
                </button>
              </div>
            </section>
            <section>
              <div className="between">
                <h3>Categorias</h3>
                <button
                  className="text-button"
                  onClick={() => setEditor({ type: "category" })}
                >
                  <Plus size={15} />
                  Nova
                </button>
              </div>
              <div className="settings-list">
                {s.categories.map((c) => (
                  <div key={c.id}>
                    <button
                      onClick={() => setEditor({ type: "category", value: c })}
                    >
                      <CategoryIcon name={c.icon} />
                      <span>
                        {c.parent_id ? "↳ " : ""}
                        {c.name}
                      </span>
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Excluir categoria ${c.name}`}
                      onClick={() => {
                        void safeMutate({
                          action: "delete",
                          payload: { entity: "category", id: c.id },
                        });
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <div className="between">
                <h3>Contas</h3>
                <button
                  className="text-button"
                  onClick={() => setEditor({ type: "account" })}
                >
                  <Plus size={15} />
                  Nova
                </button>
              </div>
              <div className="settings-list">
                {s.accounts.map((a) => (
                  <div key={a.id}>
                    <button
                      onClick={() =>
                        setEditor({ type: "account", value: { ...a } })
                      }
                    >
                      <Wallet size={18} />
                      {a.name}
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Excluir conta ${a.name}`}
                      onClick={() => {
                        void safeMutate({
                          action: "delete",
                          payload: { entity: "account", id: a.id },
                        });
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h3>
                <Download size={18} />
                Seus dados com você
              </h3>
              <p>
                CSV exporta os lançamentos. JSON inclui cartões, parcelas,
                pagamentos, recorrências, categorias e orçamentos. O arquivo
                contém informações financeiras sensíveis; guarde-o em um lugar
                seguro.
              </p>
              <div className="dialog-actions">
                <button
                  className="button secondary"
                  disabled={settingsBusy}
                  onClick={() => {
                    void exportData("csv");
                  }}
                >
                  Exportar CSV
                </button>
                <button
                  className="button secondary"
                  disabled={settingsBusy}
                  onClick={() => {
                    void exportData("json");
                  }}
                >
                  Exportar JSON
                </button>
              </div>
            </section>
            <Backups
              repository={repository}
              onRestored={(record) => {
                commit(record);
                setInvoice(null);
                setHistory(null);
                setDeleteTarget(null);
                setPageFilters({});
                setPage("home");
                setToast(null);
              }}
            />
            <section>
              <h3 className="danger-text">Excluir meus dados</h3>
              <p>
                Remove todos os registros financeiros desta conta. Exporte antes
                se quiser guardar uma cópia. Contas e categorias personalizadas
                também serão removidas; o app volta às opções iniciais vazias.
                Backups no Drive não são apagados.
              </p>
              <label>
                Digite EXCLUIR para confirmar
                <input
                  value={clearConfirm}
                  onChange={(e) => setClearConfirm(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                className="button danger"
                disabled={clearConfirm !== "EXCLUIR" || settingsBusy}
                onClick={async () => {
                  setSettingsBusy(true);
                  try {
                    await mutate({
                      action: "clear",
                      payload: { confirmation: "EXCLUIR" },
                    });
                    setClearConfirm("");
                    setToast({ text: "Dados financeiros excluídos." });
                  } catch (e) {
                    setToast({ text: (e as Error).message, error: true });
                  } finally {
                    setSettingsBusy(false);
                  }
                }}
              >
                Excluir todos os dados
              </button>
            </section>
          </div>
        </Dialog>
      )}
      {toast &&
        createPortal(
          <div
            aria-live={toast.error ? "assertive" : "polite"}
            className={`toast ${toast.error ? "error" : ""}`}
            role={toast.error ? "alert" : "status"}
          >
            {toast.error ? <X size={18} /> : <Check size={18} />}
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                onClick={async () => {
                  try {
                    await mutate({
                      action: "restore",
                      payload: { id: toast.undo },
                    });
                    setToast({ text: "Lançamento restaurado." });
                  } catch (e) {
                    setToast({ text: (e as Error).message, error: true });
                  }
                }}
              >
                Desfazer
              </button>
            )}
            <button aria-label="Fechar aviso" onClick={() => setToast(null)}>
              <X size={16} />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
