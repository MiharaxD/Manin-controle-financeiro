import { addDays, isDate, parseMoney } from "./finance";
import type { Card, Category, Method } from "./types";

export interface QuickEntry {
  kind: "expense" | "income";
  amount_cents: number | null;
  merchant: string;
  method: Method | null;
  installments: number | null;
  card_id: string | null;
  category_id: string | null;
  purchase_date: string | null;
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR");

const METHODS: Record<string, Method> = {
  pix: "pix",
  debito: "debit",
  dinheiro: "cash",
  especie: "cash",
  credito: "credit",
  cartao: "credit",
};
const INCOME = new Set(["recebi", "receita", "salario", "entrada", "ganhei"]);
const FILLER = new Set([
  "no",
  "na",
  "em",
  "de",
  "com",
  "por",
  "pelo",
  "pela",
  "a",
  "o",
  "vista",
  "reais",
  "r$",
  "vezes",
  "parcelas",
  "parcelado",
  "parcelada",
]);
// Words that point to one of the starter categories, used only when it exists.
const HINTS: Record<string, string[]> = {
  alimentacao: ["ifood", "restaurante", "lanche", "almoco", "jantar", "cafe", "padaria", "pizza", "bar"],
  mercado: ["supermercado", "feira", "hortifruti", "atacadao", "assai"],
  transporte: ["uber", "taxi", "onibus", "metro", "gasolina", "combustivel", "estacionamento", "pedagio"],
  moradia: ["aluguel", "condominio", "luz", "agua", "gas", "internet"],
  saude: ["farmacia", "remedio", "medico", "consulta", "dentista", "exame"],
  lazer: ["cinema", "show", "ingresso", "viagem"],
  jogos: ["steam", "jogo", "playstation", "xbox", "nintendo"],
  compras: ["tenis", "roupa", "sapato", "camisa", "calca", "presente"],
  educacao: ["curso", "livro", "faculdade", "escola"],
  "servicos digitais": ["netflix", "spotify", "icloud", "youtube", "prime"],
};

function parseDate(token: string, today: string): string | null {
  if (token === "hoje") return today;
  if (token === "ontem") return addDays(today, -1);
  if (token === "anteontem") return addDays(today, -2);
  const match = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(token);
  if (!match) return null;
  const [, d, m, y] = match;
  const year = !y ? today.slice(0, 4) : y.length === 2 ? `20${y}` : y;
  const date = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return isDate(date) ? date : null;
}

function parseAmount(token: string): number | null {
  let clean = token.replace(/^r\$/, "").replace(/(reais|r\$)$/, "");
  // Teclados de celular costumam dar ponto decimal: "200.50" vira 200,50.
  if (/^\d+\.\d{2}$/.test(clean)) clean = clean.replace(".", ",");
  if (!/^\d/.test(clean)) return null;
  try {
    return parseMoney(clean);
  } catch {
    return null;
  }
}

/** Lê frases como "tênis 200 crédito 3x" e devolve só o que reconheceu. */
export function parseQuickEntry(
  text: string,
  context: { today: string; categories: Category[]; cards: Card[] },
): QuickEntry {
  const raw = text.trim().split(/\s+/).filter(Boolean);
  const words = raw.map(fold);
  const used = new Set<number>();
  const entry: QuickEntry = {
    kind: text.trim().startsWith("+") ? "income" : "expense",
    amount_cents: null,
    merchant: "",
    method: null,
    installments: null,
    card_id: null,
    category_id: null,
    purchase_date: null,
  };
  const take = (i: number) => used.add(i);
  const phrase = (start: number, length: number) =>
    words.slice(start, start + length).join(" ");

  // Multi-word names first so "compras de casa" wins over "compras".
  for (const card of [...context.cards].sort(
    (a, b) => b.name.length - a.name.length,
  )) {
    const name = fold(card.name).split(/\s+/);
    for (let i = 0; i + name.length <= words.length; i++)
      if (
        phrase(i, name.length) === name.join(" ") &&
        name.every((_, k) => !used.has(i + k))
      ) {
        name.forEach((_, k) => take(i + k));
        entry.card_id = card.id;
        entry.method = "credit";
        break;
      }
    if (entry.card_id) break;
  }

  words.forEach((word, i) => {
    if (used.has(i)) return;
    const bare = word.replace(/^\+/, "");
    if (INCOME.has(bare)) {
      entry.kind = "income";
      if (bare !== "salario") take(i);
      return;
    }
    if (bare in METHODS) {
      entry.method = METHODS[bare];
      take(i);
      return;
    }
    const times = /^(\d{1,2})x$/.exec(bare);
    if (times) {
      entry.installments = Number(times[1]);
      take(i);
      return;
    }
    if (
      /^\d{1,2}$/.test(bare) &&
      (words[i + 1] === "vezes" || words[i + 1] === "parcelas")
    ) {
      entry.installments = Number(bare);
      take(i);
      take(i + 1);
      return;
    }
    if (bare === "vista" && words[i - 1] === "a") {
      entry.installments = 1;
      take(i);
      take(i - 1);
      return;
    }
    const date = parseDate(bare, context.today);
    if (date) {
      entry.purchase_date = date;
      take(i);
    }
  });

  // The last money-looking number is the amount; earlier ones stay in the name.
  for (let i = words.length - 1; i >= 0; i--) {
    if (used.has(i)) continue;
    const cents = parseAmount(words[i].replace(/^\+/, ""));
    if (cents !== null) {
      entry.amount_cents = cents;
      take(i);
      break;
    }
  }

  const categoryWords = new Set<number>();
  for (const category of context.categories) {
    const name = fold(category.name).split(/\s+/);
    for (let i = 0; i + name.length <= words.length; i++)
      if (
        phrase(i, name.length) === name.join(" ") &&
        name.every((_, k) => !used.has(i + k))
      ) {
        entry.category_id = category.id;
        name.forEach((_, k) => categoryWords.add(i + k));
      }
    if (entry.category_id) break;
  }
  if (!entry.category_id)
    for (const [name, hints] of Object.entries(HINTS)) {
      const category = context.categories.find((c) => fold(c.name) === name);
      if (category && words.some((w, i) => !used.has(i) && hints.includes(w))) {
        entry.category_id = category.id;
        break;
      }
    }

  // Filler words only go away when they touch something already recognized.
  let changed = true;
  while (changed) {
    changed = false;
    words.forEach((word, i) => {
      if (used.has(i) || !FILLER.has(word)) return;
      if (used.has(i - 1) || used.has(i + 1) || i === 0 || i === words.length - 1) {
        take(i);
        changed = true;
      }
    });
  }
  const rest = raw.map((_, i) => i).filter((i) => !used.has(i));
  const named = rest.filter((i) => !categoryWords.has(i));
  const merchant = (named.length ? named : rest)
    .map((i) => raw[i])
    .join(" ")
    .replace(/^\+/, "");
  entry.merchant = merchant.charAt(0).toLocaleUpperCase("pt-BR") + merchant.slice(1);

  if (entry.kind === "income" && entry.method === "credit") {
    entry.method = null;
    entry.card_id = null;
  }
  if (entry.installments !== null) {
    entry.installments = Math.min(Math.max(entry.installments, 1), 60);
    if (entry.installments > 1 && entry.kind === "expense" && !entry.method)
      entry.method = "credit";
  }
  return entry;
}
