import type { Transaction, Category } from "./types";
export function csv(rows: Transaction[], categories: Category[]) {
  const field = (value: unknown) => {
    let text = String(value ?? "");
    // Prevent spreadsheet formula execution for descriptions entered by the user.
    if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return (
    "\uFEFF" +
    [
      [
        "ID",
        "Data da compra",
        "Tipo",
        "Valor (BRL)",
        "Descrição",
        "Estabelecimento",
        "Categoria",
        "Pagamento",
        "Cartão ID",
        "Parcelas",
        "Estado",
      ],
      ...rows.map((t) => [
        t.id,
        t.purchase_date,
        t.kind,
        `${Math.trunc(t.amount_cents / 100)},${String(t.amount_cents % 100).padStart(2, "0")}`,
        t.description,
        t.merchant,
        categories.find((c) => c.id === t.category_id)?.name,
        t.payment_method,
        t.card_id,
        t.installments_count,
        t.status,
      ]),
    ]
      .map((row) => row.map(field).join(";"))
      .join("\r\n")
  );
}
export function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
