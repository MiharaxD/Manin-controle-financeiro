import { addMonths, demoSnapshot, monthOf, schedule, todaySP } from "./finance";
import { mutationSchema } from "./schemas";
import type { DemoData, Mutation, Transaction } from "./types";
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
export function applyDemoMutation(
  input: DemoData,
  mutation: Mutation,
): DemoData {
  const parsed = mutationSchema.parse(mutation),
    data = structuredClone(input);
  const paid = (id: string) =>
    data.installments.some(
      (i) =>
        i.transaction_id === id &&
        data.payments.some(
          (payment) =>
            payment.card_id === i.card_id &&
            payment.billing_month === i.billing_month,
        ),
    );
  if (parsed.action === "transaction") {
    const value = parsed.payload,
      id = value.id ?? uid(),
      old = data.transactions.find((t) => t.id === id);
    if (paid(id))
      throw new Error(
        "Compra vinculada a uma fatura com pagamento. Histórico preservado.",
      );
    let recurrence_id = value.recurrence_id ?? null,
      occurrence_date = value.occurrence_date ?? null;
    if (value.make_recurring) {
      if (
        old?.recurrence_id &&
        old.amount_cents === value.amount_cents &&
        old.purchase_date === value.purchase_date &&
        old.category_id === value.category_id &&
        old.payment_method === value.payment_method &&
        old.card_id === value.card_id &&
        old.account_id === value.account_id &&
        old.description === value.description &&
        old.merchant === value.merchant &&
        old.status === value.status
      )
        return data;
      if (old) throw new Error("Crie uma nova despesa para tornar recorrente.");
      const anchor = Number(value.purchase_date.slice(8, 10));
      recurrence_id = uid();
      occurrence_date = value.purchase_date;
      data.recurrences.push({
        id: recurrence_id,
        name: value.merchant || value.description || "Despesa recorrente",
        amount_cents: value.amount_cents,
        category_id: value.category_id!,
        payment_method: value.payment_method,
        card_id: value.card_id,
        account_id: value.account_id,
        interval_months: 1,
        next_date: addMonths(value.purchase_date, 1, anchor),
        anchor_day: anchor,
        status: "active",
      });
    } else if (recurrence_id && !old) {
      const r = data.recurrences.find((r) => r.id === recurrence_id);
      if (!r || r.status !== "active" || r.next_date !== occurrence_date)
        throw new Error("Selecione a próxima ocorrência ativa.");
      if (
        data.transactions.some(
          (t) =>
            t.recurrence_id === recurrence_id &&
            t.occurrence_date === occurrence_date,
        )
      )
        throw new Error("Ocorrência já registrada.");
      r.next_date = addMonths(r.next_date, r.interval_months, r.anchor_day);
    }
    const t: Transaction = {
      ...value,
      id,
      recurrence_id,
      occurrence_date,
      deleted_at: null,
    };
    data.transactions = [...data.transactions.filter((t) => t.id !== id), t];
    data.installments = data.installments.filter(
      (i) => i.transaction_id !== id,
    );
    if (t.payment_method === "credit")
      data.installments.push(
        ...schedule(
          t,
          data.cards.find((c) => c.id === t.card_id)!,
        ),
      );
  } else if (parsed.action === "payment") {
    const value = parsed.payload;
    if (value.paid_date > todaySP())
      throw new Error("Informe uma data efetiva, até hoje.");
    if (value.id && data.payments.some((payment) => payment.id === value.id))
      return data;
    const invoice = demoSnapshot(
      data,
      value.billing_month,
      todaySP(),
    ).invoices.find(
      (i) =>
        i.card_id === value.card_id && i.billing_month === value.billing_month,
    );
    if (!invoice || value.amount_cents > invoice.remaining)
      throw new Error("Valor excede o saldo da fatura.");
    data.payments.push({ ...value, id: value.id ?? uid() });
  } else if (parsed.action === "delete") {
    const value = parsed.payload;
    if (value.entity === "transaction") {
      if (paid(value.id))
        throw new Error(
          "Compra vinculada a fatura com pagamento; histórico preservado.",
        );
      const t = data.transactions.find((t) => t.id === value.id);
      if (t) t.deleted_at = new Date().toISOString();
    } else {
      const key = {
        card: "cards",
        category: "categories",
        budget: "budgets",
        account: "accounts",
      }[value.entity] as "cards" | "categories" | "budgets" | "accounts";
      if (
        key === "cards" &&
        (data.transactions.some((t) => t.card_id === value.id) ||
          data.recurrences.some((r) => r.card_id === value.id))
      )
        throw new Error("Cartão em uso.");
      if (
        key === "categories" &&
        (data.transactions.some((t) => t.category_id === value.id) ||
          data.recurrences.some((r) => r.category_id === value.id) ||
          data.categories.some((c) => c.parent_id === value.id) ||
          data.budgets.some((b) => b.category_id === value.id))
      )
        throw new Error("Categoria em uso.");
      if (
        key === "accounts" &&
        (data.transactions.some(
          (t) =>
            t.account_id === value.id || t.destination_account_id === value.id,
        ) ||
          data.recurrences.some((r) => r.account_id === value.id) ||
          data.payments.some((payment) => payment.account_id === value.id))
      )
        throw new Error("Conta em uso.");
      data[key] = data[key].filter((item) => item.id !== value.id) as never;
    }
  } else if (parsed.action === "restore") {
    const t = data.transactions.find((t) => t.id === parsed.payload.id);
    if (t) t.deleted_at = null;
  } else if (parsed.action === "clear") {
    return {
      ...data,
      cards: [],
      recurrences: [],
      transactions: [],
      installments: [],
      budgets: [],
      payments: [],
    };
  } else {
    const key = {
      card: "cards",
      category: "categories",
      account: "accounts",
      budget: "budgets",
      recurrence: "recurrences",
    }[parsed.action] as
      "cards" | "categories" | "accounts" | "budgets" | "recurrences";
    if (parsed.action === "card") {
      const old = data.cards.find((c) => c.id === parsed.payload.id);
      if (
        old &&
        (old.closing_day !== parsed.payload.closing_day ||
          old.due_day !== parsed.payload.due_day) &&
        data.transactions.some((t) => t.card_id === old.id)
      )
        throw new Error(
          "Cartão com compras: mantenha os dias do ciclo ou cadastre outro cartão.",
        );
    }
    if (parsed.action === "category" && parsed.payload.parent_id) {
      const parent = data.categories.find(
        (c) => c.id === parsed.payload.parent_id,
      );
      if (
        !parent ||
        parent.parent_id ||
        parent.id === parsed.payload.id ||
        data.categories.some((c) => c.parent_id === parsed.payload.id)
      )
        throw new Error("Use apenas um nível de subcategorias, sem ciclos.");
    }
    if (
      parsed.action === "budget" &&
      data.budgets.some(
        (b) =>
          b.id !== parsed.payload.id &&
          b.month === parsed.payload.month &&
          b.category_id === parsed.payload.category_id,
      )
    )
      throw new Error("Já existe um orçamento para esta categoria e mês.");
    const value = parsed.payload;
    data[key] = [
      ...data[key].filter((item) => item.id !== value.id),
      { ...value, id: value.id ?? uid() },
    ] as never;
  }
  return data;
}
export function generateDemoDue(input: DemoData, today = todaySP()): DemoData {
  let data = structuredClone(input);
  for (const r of [...data.recurrences]) {
    let count = 0;
    while (r.status === "active" && r.next_date <= today && count++ < 400) {
      const existing = data.transactions.find(
        (t) => t.recurrence_id === r.id && t.occurrence_date === r.next_date,
      );
      if (!existing)
        data = applyDemoMutation(data, {
          action: "transaction",
          payload: {
            kind: "expense",
            amount_cents: r.amount_cents,
            purchase_date: r.next_date,
            description: r.name,
            merchant: r.name,
            category_id: r.category_id,
            payment_method: r.payment_method,
            card_id: r.card_id,
            account_id: r.account_id,
            destination_account_id: null,
            installments_count: 1,
            status: "actual",
            recurrence_id: r.id,
            occurrence_date: r.next_date,
          },
        });
      else
        data.recurrences.find((item) => item.id === r.id)!.next_date =
          addMonths(r.next_date, r.interval_months, r.anchor_day);
      r.next_date = data.recurrences.find(
        (item) => item.id === r.id,
      )!.next_date;
    }
  }
  return data;
}
