import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuickEntry } from "../src/lib/quick-entry";
import type { Card, Category } from "../src/lib/types";

const category = (id: string, name: string): Category => ({
  id,
  name,
  icon: "tag",
  color: "#000",
  parent_id: null,
  position: 0,
});
const categories = [
  category("food", "Alimentação"),
  category("market", "Mercado"),
  category("transport", "Transporte"),
  category("shopping", "Compras"),
  category("digital", "Serviços Digitais"),
];
const cards: Card[] = [
  { id: "home", name: "Compras de casa" } as Card,
  { id: "nu", name: "Nubank" } as Card,
];
const parse = (text: string, today = "2026-11-15") =>
  parseQuickEntry(text, { today, categories, cards });

test("frase curta vira despesa no crédito com parcelas", () => {
  const entry = parse("tenis 200 credito 1x");
  assert.equal(entry.kind, "expense");
  assert.equal(entry.amount_cents, 20000);
  assert.equal(entry.method, "credit");
  assert.equal(entry.installments, 1);
  assert.equal(entry.merchant, "Tenis");
  assert.equal(entry.category_id, "shopping");
  assert.equal(entry.purchase_date, null);
});

test("valores em centavos aceitam vírgula, milhar, R$ e ponto decimal do celular", () => {
  for (const [text, cents] of [
    ["mercado 384,72", 38472],
    ["aluguel 1.650,00", 165000],
    ["uber R$24,50", 2450],
    ["uber 24.50", 2450],
    ["lanche 30reais", 3000],
  ] as const)
    assert.equal(parse(text).amount_cents, cents, text);
  assert.equal(parse("café sem valor").amount_cents, null);
  assert.equal(parse("café 0").amount_cents, null);
});

test("o último número é o valor e os anteriores ficam no nome", () => {
  const entry = parse("99 taxi 18,90 pix");
  assert.equal(entry.amount_cents, 1890);
  assert.equal(entry.merchant, "99 taxi");
  assert.equal(entry.method, "pix");
  assert.equal(entry.category_id, "transport");
});

test("parcelas por extenso implicam crédito e ficam entre 1 e 60", () => {
  assert.deepEqual(
    [parse("geladeira 3000 em 10 vezes").installments, parse("geladeira 3000 em 10 vezes").method],
    [10, "credit"],
  );
  assert.equal(parse("sofá 2000 99x").installments, 60);
  assert.equal(parse("camisa 80 a vista").installments, 1);
  assert.equal(parse("camisa 80 a vista").merchant, "Camisa");
});

test("apelido de cartão escolhe o cartão, inclusive com várias palavras", () => {
  const entry = parse("panela 150 compras de casa 3x");
  assert.equal(entry.card_id, "home");
  assert.equal(entry.method, "credit");
  assert.equal(entry.merchant, "Panela");
  assert.equal(parse("livro 45 nubank").card_id, "nu");
});

test("datas relativas atravessam virada de mês e de ano", () => {
  assert.equal(parse("pão 8 ontem", "2026-03-01").purchase_date, "2026-02-28");
  assert.equal(parse("pão 8 ontem", "2028-03-01").purchase_date, "2028-02-29");
  assert.equal(parse("pão 8 anteontem", "2027-01-01").purchase_date, "2026-12-30");
  assert.equal(parse("pão 8 hoje").purchase_date, "2026-11-15");
  assert.equal(parse("pão 8 05/11").purchase_date, "2026-11-05");
  assert.equal(parse("pão 8 31/12/25").purchase_date, "2025-12-31");
  assert.equal(parse("pão 8 29/02/2027").purchase_date, null);
});

test("receita é reconhecida e nunca fica no crédito", () => {
  const salary = parse("salario 7200 credito");
  assert.equal(salary.kind, "income");
  assert.equal(salary.method, null);
  assert.equal(salary.merchant, "Salario");
  const plus = parse("+freela 500 pix");
  assert.equal(plus.kind, "income");
  assert.equal(plus.merchant, "Freela");
});

test("nome de categoria explícito vence a dica e sai do nome", () => {
  const entry = parse("pão de açúcar mercado 120");
  assert.equal(entry.category_id, "market");
  assert.equal(entry.merchant, "Pão de açúcar");
  assert.equal(parse("spotify 21,90").category_id, "digital");
  assert.equal(parse("mercado 50").merchant, "Mercado");
});
