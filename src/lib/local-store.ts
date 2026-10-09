import { z } from "zod";
import { validateData, timestamp } from "./records";
import { createEmptyData } from "./initial-data";
import { createDemo } from "./demo";
import { applyMutation, generateDue } from "./engine";
import { migratePreviousData } from "./migrations";
import { createBackup, parseBackup, type Backup } from "./backup";
import type { FinancialData, Mutation } from "./types";

export type StoreMode = "local" | "demo";
const receiptSchema = z.strictObject({
  account: z.string().email(),
  file_id: z.string().min(1).max(256),
  confirmed_at: timestamp,
});
export type DriveReceipt = z.infer<typeof receiptSchema>;
export interface LocalRecord {
  version: 2;
  dataset_id: string;
  revision: number;
  data: FinancialData;
  noticeAcknowledged: boolean;
  driveReceipts: DriveReceipt[];
}
const metadata = z.object({
  version: z.union([z.literal(1), z.literal(2)]),
  dataset_id: z.uuid(),
  revision: z.number().int().nonnegative(),
  noticeAcknowledged: z.boolean(),
  driveReceipts: z.array(receiptSchema),
  data: z.unknown(),
});
function validateRecord(value: unknown): LocalRecord {
  const r = metadata.safeParse(value);
  if (!r.success)
    throw new Error(
      "Armazenamento local incompatível ou danificado. Nenhum dado foi substituído.",
    );
  return {
    ...r.data,
    version: 2,
    data:
      r.data.version === 1
        ? migratePreviousData(r.data.data)
        : validateData(r.data.data),
  };
}
function storageError(error: unknown): Error {
  if (error instanceof Error && !(error instanceof DOMException)) return error;
  return new Error(
    "Não foi possível gravar no navegador. Confira espaço disponível e permissões de armazenamento. Seus dados anteriores foram mantidos.",
  );
}
export class LocalStore {
  private db?: Promise<IDBDatabase>;
  constructor(
    readonly mode: StoreMode = "local",
    private factory: IDBFactory = globalThis.indexedDB,
    private dbName = "manin-device-v1",
  ) {}
  private open(): Promise<IDBDatabase> {
    if (!this.factory)
      return Promise.reject(
        new Error(
          "Este navegador não oferece armazenamento local. Nenhum registro será salvo apenas em memória.",
        ),
      );
    return (this.db ??= new Promise((resolve, reject) => {
      const request = this.factory.open(this.dbName, 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("datasets"))
          request.result.createObjectStore("datasets");
      };
      request.onerror = () => reject(storageError(request.error));
      request.onblocked = () =>
        reject(
          new Error(
            "Feche outras abas do Manin para atualizar o armazenamento.",
          ),
        );
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          this.db = undefined;
        };
        resolve(request.result);
      };
    }));
  }
  private seed(): LocalRecord {
    if (this.mode === "demo" && process.env.NODE_ENV === "production")
      throw new Error(
        "A demonstração está disponível somente em desenvolvimento.",
      );
    return {
      version: 2,
      dataset_id: crypto.randomUUID(),
      revision: 0,
      data: this.mode === "demo" ? createDemo() : createEmptyData(),
      noticeAcknowledged: false,
      driveReceipts: [],
    };
  }
  private async edit(
    change: (current: LocalRecord) => LocalRecord,
  ): Promise<LocalRecord> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("datasets", "readwrite");
      const store = tx.objectStore("datasets");
      let next: LocalRecord;
      let changed = false;
      let failure: unknown;
      const get = store.get(this.mode);
      get.onsuccess = () => {
        try {
          const current =
            get.result === undefined ? this.seed() : validateRecord(get.result);
          next = validateRecord(change(structuredClone(current)));
          changed =
            get.result === undefined ||
            JSON.stringify(next) !== JSON.stringify(get.result);
          if (changed) {
            next.revision = current.revision + 1;
            store.put(next, this.mode);
          }
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };
      tx.onabort = () => reject(storageError(failure ?? tx.error));
      tx.onerror = () => {
        failure ??= tx.error;
      };
      tx.oncomplete = () => {
        if (changed) this.notify();
        resolve(structuredClone(next));
      };
    });
  }
  read() {
    return this.edit((r) => r);
  }
  refresh() {
    return this.edit((r) => ({ ...r, data: generateDue(r.data) }));
  }
  mutate(mutation: Mutation) {
    return this.edit((r) => ({
      ...r,
      data: generateDue(applyMutation(r.data, mutation)),
    }));
  }
  acknowledge() {
    return this.edit((r) => ({ ...r, noticeAcknowledged: true }));
  }
  reset() {
    return this.edit((r) => ({
      ...this.seed(),
      noticeAcknowledged: r.noticeAcknowledged,
    }));
  }
  async backup(): Promise<Backup> {
    const r = await this.refresh();
    return createBackup(
      r.data,
      r.dataset_id,
      this.mode === "demo" ? "demo" : "local",
    );
  }
  async replace(backup: Backup, expectedRevision: number) {
    // Revalidate before opening a write transaction; no partial import occurs.
    const checked = parseBackup(JSON.stringify(backup), this.mode);
    const data = checked.data;
    if (this.mode === "local" && backup.source === "demo")
      return Promise.reject(
        new Error("A demonstração não pode substituir seus dados pessoais."),
      );
    return this.edit((r) => {
      if (r.revision !== expectedRevision)
        throw new Error(
          "Os dados mudaram desde a confirmação. Selecione o backup novamente para revisar a substituição.",
        );
      return { ...r, dataset_id: checked.dataset_id, data, driveReceipts: [] };
    });
  }
  recordDriveBackup(receipt: DriveReceipt, datasetId: string) {
    const checked = receiptSchema.parse(receipt);
    return this.edit((r) => {
      if (r.dataset_id !== datasetId)
        throw new Error(
          "A conta local mudou durante o envio. A cópia foi enviada, mas não corresponde ao conjunto atual.",
        );
      return {
        ...r,
        driveReceipts: [
          ...r.driveReceipts.filter((x) => x.account !== checked.account),
          checked,
        ],
      };
    });
  }
  subscribe(listener: () => void): () => void {
    if (typeof BroadcastChannel === "undefined") return () => {};
    const channel = new BroadcastChannel("manin-local-updates");
    channel.onmessage = (event) => {
      if (event.data === this.mode) listener();
    };
    return () => channel.close();
  }
  private notify() {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const c = new BroadcastChannel("manin-local-updates");
        c.postMessage(this.mode);
        c.close();
      }
    } catch {
      /* Notifications must not change a committed write's result. */
    }
  }
  close() {
    void this.db?.then((db) => db.close());
    this.db = undefined;
  }
}
