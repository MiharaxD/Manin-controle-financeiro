import { z } from "zod";
import { dataSchema, timestamp, validateData } from "./records";
import type { FinancialData } from "./types";
import { migratePreviousData } from "./migrations";

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export const backupSchema = z.strictObject({
  format: z.literal("manin-backup"),
  version: z.literal(3),
  dataset_id: z.uuid(),
  source: z.enum(["local", "demo", "supabase-v1"]),
  exported_at: timestamp,
  data: dataSchema,
});
export type Backup = Omit<z.infer<typeof backupSchema>, "data"> & {
  data: FinancialData;
};
export function createBackup(
  data: FinancialData,
  datasetId: string,
  source: Backup["source"] = "local",
): Backup {
  return backupSchema.parse({
    format: "manin-backup",
    version: 3,
    dataset_id: datasetId,
    source,
    exported_at: new Date().toISOString(),
    data: validateData(data),
  });
}
export function parseBackup(
  text: string,
  mode: "local" | "demo" = "local",
): Backup {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES)
    throw new Error("O backup excede o limite de 20 MB.");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error(
      "O arquivo não contém um JSON válido. Seus dados atuais foram mantidos.",
    );
  }
  let backup: Backup;
  const version = z.object({ version: z.number() }).safeParse(input);
  if (!version.success)
    throw new Error("Este arquivo não é um backup do Manin.");
  if (version.data.version === 1) backup = migrateLegacy(input);
  else if (version.data.version === 2) {
    const old = backupSchema
      .omit({ version: true, data: true })
      .extend({ version: z.literal(2), data: z.unknown() })
      .safeParse(input);
    if (!old.success)
      throw new Error(
        "Backup antigo inválido. Seus dados atuais foram mantidos.",
      );
    backup = {
      ...old.data,
      version: 3,
      data: migratePreviousData(old.data.data),
    };
  } else {
    const result = backupSchema.safeParse(input);
    if (!result.success)
      throw new Error(
        "Backup inválido ou versão incompatível. Seus dados atuais foram mantidos.",
      );
    backup = result.data;
  }
  if (mode === "local" && backup.source === "demo")
    throw new Error(
      "Backup de demonstração não pode substituir seus dados pessoais.",
    );
  backup.data = validateData(backup.data);
  return backup;
}
function migrateLegacy(input: unknown): Backup {
  const legacy = z
    .strictObject({
      version: z.literal(1),
      exported_at: timestamp,
      accounts: z.array(z.record(z.string(), z.unknown())),
      categories: z.array(z.record(z.string(), z.unknown())),
      cards: z.array(z.record(z.string(), z.unknown())),
      transactions: z.array(z.record(z.string(), z.unknown())),
      installments: z.array(z.record(z.string(), z.unknown())),
      invoice_payments: z.array(z.record(z.string(), z.unknown())),
      recurrences: z.array(z.record(z.string(), z.unknown())),
      budgets: z.array(z.record(z.string(), z.unknown())),
    })
    .safeParse(input);
  if (!legacy.success)
    throw new Error(
      "Backup antigo incompatível. Exporte o JSON completo da versão anterior do Manin.",
    );
  const owners = new Set<string>();
  const clean = (rows: Record<string, unknown>[]) =>
    rows.map((row) => {
      if (!z.uuid().safeParse(row.user_id).success)
        throw new Error(
          "Backup antigo sem identificação válida do proprietário.",
        );
      owners.add(String(row.user_id));
      if (
        row.created_at !== undefined &&
        !timestamp.safeParse(row.created_at).success
      )
        throw new Error("Data inválida no backup antigo.");
      return Object.fromEntries(
        Object.entries(row).filter(
          ([key]) => key !== "user_id" && key !== "created_at",
        ),
      );
    });
  const data = migratePreviousData({
    accounts: clean(legacy.data.accounts),
    categories: clean(legacy.data.categories),
    cards: clean(legacy.data.cards),
    transactions: clean(legacy.data.transactions),
    installments: clean(legacy.data.installments),
    payments: clean(legacy.data.invoice_payments),
    recurrences: clean(legacy.data.recurrences),
    budgets: clean(legacy.data.budgets),
  });
  if (owners.size > 1)
    throw new Error("O backup mistura dados de proprietários diferentes.");
  return {
    format: "manin-backup",
    version: 3,
    dataset_id: crypto.randomUUID(),
    source: "supabase-v1",
    exported_at: legacy.data.exported_at,
    data,
  };
}
export function backupSummary(backup: Backup) {
  const d = backup.data;
  return `${d.transactions.length} lançamentos, ${d.installments.length} parcelas, ${d.payments.length} pagamentos, ${d.accounts.length} contas, ${d.cards.length} apelidos de cartões, ${d.recurrences.length} recorrentes, ${d.recurrence_types.length} tipos, ${d.categories.length} categorias e ${d.budgets.length} orçamentos.`;
}
