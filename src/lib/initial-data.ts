import type { FinancialData } from "./types";
export function createRecurrenceTypes() {
  return [
    "Assinatura",
    "Seguro",
    "Plano",
    "Conta",
    "Mensalidade",
    "Outros",
  ].map((name) => ({ id: crypto.randomUUID(), name }));
}
export function createEmptyData(): FinancialData {
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
  return {
    categories: labels.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      icon: icons[i],
      color: colors[i],
      parent_id: null,
      position: i + 1,
    })),
    accounts: [
      { id: crypto.randomUUID(), name: "Conta principal" },
      { id: crypto.randomUUID(), name: "Carteira" },
    ],
    cards: [],
    transactions: [],
    installments: [],
    payments: [],
    recurrences: [],
    recurrence_types: createRecurrenceTypes(),
    budgets: [],
  };
}
