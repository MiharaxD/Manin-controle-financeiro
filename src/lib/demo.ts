import { addMonths, monthOf, schedule, todaySP } from "./finance";

import type { DemoData, Transaction } from "./types";
const uid = () => crypto.randomUUID();
export function createDemo(today = todaySP()): DemoData {
  const month = monthOf(today),
    previous = addMonths(month, -1, 1);
  const labels = [
    "Alimentação",
    "Mercado",
    "Transporte",
    "Moradia",
    "Saúde",
    "Lazer",
    "Jogos",
    "Tecnologia",
    "Compras",
    "Educação",
    "Serviços Digitais",
    "Outros",
  ];
  const icons = [
    "utensils",
    "cart",
    "car",
    "home",
    "heart",
    "sparkles",
    "game",
    "laptop",
    "bag",
    "book",
    "cloud",
    "circle",
  ];
  const colors = [
    "#d88652",
    "#739d76",
    "#7294b5",
    "#aa91b9",
    "#c77d8a",
    "#bba35d",
    "#8c85b7",
    "#709ba1",
    "#bc9272",
    "#87a468",
    "#678b9f",
    "#939b91",
  ];
  const data: DemoData = {
    categories: labels.map((name, i) => ({
      id: uid(),
      name,
      icon: icons[i],
      color: colors[i],
      parent_id: null,
      position: i + 1,
    })),
    accounts: [
      { id: uid(), name: "Conta principal" },
      { id: uid(), name: "Carteira" },
    ],
    cards: [
      {
        id: uid(),
        name: "Meu Nubank",
        institution: "Nubank",
        color: "#514079",
        last_four: "4829",
        closing_day: 25,
        due_day: 2,
        limit_cents: 1000000,
      },
      {
        id: uid(),
        name: "Inter Black",
        institution: "Inter",
        color: "#293d36",
        last_four: "9031",
        closing_day: 18,
        due_day: 25,
        limit_cents: 1500000,
      },
    ],
    transactions: [],
    installments: [],
    payments: [],
    recurrences: [],
    budgets: [],
  };
  const add = (
    amount: number,
    title: string,
    cat: number,
    when: string,
    method: "credit" | "pix" | "debit" = "pix",
    count = 1,
    kind: "expense" | "income" = "expense",
  ) => {
    const t: Transaction = {
      id: uid(),
      amount_cents: amount,
      merchant: title,
      description: "",
      kind,
      purchase_date: when,
      category_id: data.categories[cat].id,
      payment_method: method,
      card_id: method === "credit" ? data.cards[0].id : null,
      account_id: method === "credit" ? null : data.accounts[0].id,
      destination_account_id: null,
      installments_count: count,
      status: "actual",
      recurrence_id: null,
      occurrence_date: null,
      deleted_at: null,
    };
    data.transactions.push(t);
    if (method === "credit")
      data.installments.push(...schedule(t, data.cards[0]));
    return t;
  };
  for (let n = 5; n >= 1; n--) {
    const m = addMonths(month, -n, 1);
    add(720000, "Salário", 11, m, "pix", 1, "income");
    add(180000 + n * 12300, "Despesas do mês", 3, addMonths(m, 0, 6));
    add(42800 + n * 2110, "Mercado", 1, addMonths(m, 0, 12));
    add(13200 + n * 400, "Restaurantes", 0, addMonths(m, 0, 17));
  }
  add(
    349990,
    "MacBook • compra parcelada",
    7,
    addMonths(previous, 0, 20),
    "credit",
    10,
  );
  add(720000, "Salário", 11, month, "pix", 1, "income");
  add(165000, "Aluguel", 3, month);
  const current = (day: number) =>
    `${month.slice(0, 8)}${String(Math.min(day, Number(today.slice(8, 10)))).padStart(2, "0")}`;
  add(38472, "Pão de Açúcar", 1, current(3), "debit");
  add(8990, "Um café e uma conversa", 0, current(4), "credit");
  add(2450, "Uber", 2, current(5));
  add(12800, "Jantar no bairro", 0, current(6), "credit");
  add(5990, "Hollow Knight", 6, current(7), "credit");
  for (const [name, amount, cat, day] of [
    ["Spotify", 2190, 10, 12],
    ["Netflix", 4490, 10, 16],
    ["iCloud+", 1490, 10, 21],
  ] as const) {
    let next = addMonths(month, 0, day);
    if (next <= today) next = addMonths(next, 1, day);
    data.recurrences.push({
      id: uid(),
      name,
      amount_cents: amount,
      category_id: data.categories[cat].id,
      payment_method: "credit",
      card_id: data.cards[0].id,
      account_id: null,
      interval_months: 1,
      next_date: next,
      anchor_day: day,
      status: "active",
    });
  }
  data.budgets = [
    { id: uid(), month, category_id: null, amount_cents: 400000 },
    {
      id: uid(),
      month,
      category_id: data.categories[0].id,
      amount_cents: 40000,
    },
    {
      id: uid(),
      month,
      category_id: data.categories[1].id,
      amount_cents: 50000,
    },
  ];
  return data;
}

export {
  applyMutation as applyDemoMutation,
  generateDue as generateDemoDue,
} from "./engine";
