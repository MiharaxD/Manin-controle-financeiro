"use client";
import { useEffect, useRef, useState } from "react";
import { Cloud, Upload, FolderOpen } from "lucide-react";
import {
  parseBackup,
  backupSummary,
  MAX_BACKUP_BYTES,
  type Backup,
} from "@/lib/backup";
import { GoogleDrive, prepareGoogle, type DriveFile } from "@/lib/google-drive";
import type { LocalStore, LocalRecord, DriveReceipt } from "@/lib/local-store";
import { Dialog } from "./ui/dialog";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
function time(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
export function Backups({
  repository,
  onRestored,
}: {
  repository: LocalStore;
  onRestored: (record: LocalRecord) => void;
}) {
  const [account, setAccount] = useState("");
  const [driver] = useState(
    () => new GoogleDrive(clientId, fetch, () => setAccount("")),
  );
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]),
    [fileId, setFileId] = useState("");
  const [receipts, setReceipts] = useState<DriveReceipt[]>([]);
  const [pending, setPending] = useState<{
    backup: Backup;
    revision: number;
    origin: string;
    receipt?: DriveReceipt;
  } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const demo = repository.mode === "demo";
  useEffect(() => {
    let active = true;
    void repository
      .read()
      .then((record) => {
        if (active) setReceipts(record.driveReceipts);
      })
      .catch(() => {});
    if (clientId && !demo)
      void prepareGoogle()
        .then(() => {
          if (active) setReady(true);
        })
        .catch((e) => {
          if (active) setError((e as Error).message);
        });
    return () => {
      active = false;
      driver.disconnect();
    };
  }, [repository, driver, demo]);
  const task = async (name: string, work: () => Promise<void>) => {
    setBusy(name);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível concluir. Seus dados atuais foram mantidos.",
      );
    } finally {
      setBusy("");
    }
  };
  const prepare = async (
    text: string,
    origin: string,
    receipt?: DriveReceipt,
  ) => {
    const backup = parseBackup(text, repository.mode);
    const current = await repository.read();
    setPending({ backup, revision: current.revision, origin, receipt });
  };
  const last = receipts.find((r) => r.account === account);
  return (
    <>
      <section className="backup-section">
        <h3>
          <FolderOpen size={19} />
          Restaurar arquivo JSON
        </h3>
        <p>
          Recupere um backup completo deste app ou o JSON exportado pela versão
          anterior. O arquivo será validado antes da confirmação. A restauração
          substitui todos os dados deste espaço.
        </p>
        <input
          ref={input}
          aria-label="Arquivo de backup JSON"
          type="file"
          accept=".json,application/json"
          disabled={!!busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void task("file", async () => {
              if (file.size > MAX_BACKUP_BYTES)
                throw new Error("O backup excede 20 MB.");
              await prepare(await file.text(), file.name);
            });
          }}
        />
        <p className="hint">
          Nenhum conteúdo do arquivo é executado. Guarde backups como
          informações financeiras sensíveis.
        </p>
      </section>
      <section className="backup-section">
        <h3>
          <Cloud size={19} />
          Backup no Google Drive
        </h3>
        <p>
          Cópia manual, sem sincronização entre dispositivos. O envio sai deste
          navegador diretamente para o Google. O Manin acessa somente sua
          própria pasta privada de backups.
        </p>
        {demo ? (
          <p className="hint">
            O Drive fica disponível no seu espaço pessoal. Dados da demonstração
            permanecem separados.
          </p>
        ) : !clientId ? (
          <div className="setup-note">
            <strong>Google Drive não configurado</strong>
            <p>A exportação e restauração JSON local continuam disponíveis.</p>
            <ol>
              <li>
                No Google Cloud, crie um projeto e habilite a Google Drive API.
              </li>
              <li>
                Configure a tela de consentimento OAuth e adicione usuários de
                teste.
              </li>
              <li>
                Crie um cliente OAuth do tipo Aplicativo da Web e cadastre a
                origem exata deste app, como{" "}
                {typeof location === "undefined"
                  ? "http://localhost:3000"
                  : location.origin}
                .
              </li>
              <li>
                Defina NEXT_PUBLIC_GOOGLE_CLIENT_ID em .env.local e reinicie o
                desenvolvimento ou refaça a publicação. Não use um client secret
                no navegador.
              </li>
            </ol>
            <a
              href="https://developers.google.com/workspace/drive/api/guides/appdata"
              target="_blank"
              rel="noreferrer"
            >
              Guia oficial de acesso à pasta privada
            </a>
          </div>
        ) : (
          <>
            {account ? (
              <div className="backup-account">
                <strong>Conta conectada: {account}</strong>
                <button
                  className="text-button"
                  disabled={!!busy}
                  onClick={() => {
                    driver.disconnect();
                    setFiles([]);
                    setFileId("");
                    setMessage(
                      "Google Drive desconectado. Seus dados locais e backups foram mantidos.",
                    );
                  }}
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <button
                className="button secondary"
                disabled={!!busy || !ready}
                onClick={() => {
                  void task("connect", async () => {
                    setFiles([]);
                    setFileId("");
                    const connected = await driver.connect();
                    setAccount(connected);
                    setMessage(
                      "Conta Google conectada: " +
                        connected +
                        ". Nenhum backup foi enviado.",
                    );
                  });
                }}
              >
                Conectar Google Drive
              </button>
            )}
            {!ready && (
              <button
                className="text-button"
                disabled={!!busy}
                onClick={() => {
                  void task("prepare", async () => {
                    await prepareGoogle();
                    setReady(true);
                  });
                }}
              >
                Carregar conexão do Google
              </button>
            )}
            <div className="dialog-actions backup-actions">
              <button
                className="button primary"
                disabled={!!busy || !account}
                onClick={() => {
                  void task("upload", async () => {
                    const backup = await repository.backup();
                    const receipt = await driver.upload(backup);
                    setMessage(
                      "Backup confirmado pela API do Google Drive em " +
                        time(receipt.confirmed_at) +
                        ", na conta " +
                        receipt.account +
                        ".",
                    );
                    setReceipts((previous) => [
                      ...previous.filter((r) => r.account !== receipt.account),
                      receipt,
                    ]);
                    try {
                      await repository.recordDriveBackup(
                        receipt,
                        backup.dataset_id,
                      );
                    } catch {
                      setError(
                        "A cópia foi confirmada no Drive, mas não foi possível guardar a data neste navegador.",
                      );
                    }
                  });
                }}
              >
                <Upload size={16} />
                {busy === "upload" ? "Enviando…" : "Enviar backup agora"}
              </button>
              <button
                className="button secondary"
                disabled={!!busy || !account}
                onClick={() => {
                  void task("list", async () => {
                    const found = await driver.list();
                    setFiles(found);
                    setFileId(found[0]?.id ?? "");
                    if (!found.length)
                      setMessage(
                        "Nenhum backup criado pelo Manin foi encontrado nesta conta.",
                      );
                  });
                }}
              >
                Listar backups
              </button>
            </div>
            {!!files.length && (
              <>
                <label>
                  Backup do Google Drive
                  <select
                    value={fileId}
                    onChange={(e) => setFileId(e.target.value)}
                    disabled={!!busy}
                  >
                    {files.map((file) => (
                      <option key={file.id} value={file.id}>
                        {time(file.createdTime)} · {file.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="button secondary"
                  disabled={!!busy || !account || !fileId}
                  onClick={() => {
                    void task("download", async () => {
                      const file = files.find((f) => f.id === fileId)!;
                      await prepare(
                        await driver.download(fileId),
                        "Google Drive · " + account + " · " + file.name,
                        {
                          account,
                          file_id: file.id,
                          confirmed_at: file.createdTime,
                        },
                      );
                    });
                  }}
                >
                  Restaurar backup do Drive
                </button>
              </>
            )}
            <p className="hint">
              {last
                ? "Último backup confirmado nesta conta: " +
                  time(last.confirmed_at) +
                  "."
                : "Nenhum envio confirmado nesta conta neste navegador."}
            </p>
          </>
        )}
      </section>
      {busy && (
        <p role="status" className="hint">
          Aguarde…
        </p>
      )}
      {message && (
        <p role="status" className="auth-success">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {pending && (
        <Dialog
          open
          title="Substituir dados locais?"
          onClose={() => {
            if (!busy) setPending(null);
          }}
        >
          <p className="dialog-copy">
            Origem: {pending.origin}. Backup de{" "}
            {time(pending.backup.exported_at)}.
          </p>
          <p className="dialog-copy">{backupSummary(pending.backup)}</p>
          <p className="dialog-copy">
            Todos os lançamentos, parcelas, pagamentos, contas, cartões,
            recorrências, categorias e orçamentos atuais deste espaço serão
            substituídos. Os dados não serão mesclados. Exporte o JSON atual
            antes, se quiser preservá-lo. Outros espaços, a demonstração e
            arquivos do Drive não serão alterados.
          </p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              className="button secondary"
              disabled={!!busy}
              onClick={() => setPending(null)}
            >
              Cancelar
            </button>
            <button
              className="button danger"
              disabled={!!busy}
              onClick={() => {
                void task("restore", async () => {
                  const record = await repository.replace(
                    pending.backup,
                    pending.revision,
                  );
                  onRestored(record);
                  if (pending.receipt) {
                    setReceipts([pending.receipt]);
                    try {
                      await repository.recordDriveBackup(
                        pending.receipt,
                        record.dataset_id,
                      );
                    } catch {
                      setError(
                        "Os dados foram restaurados, mas a data do backup não pôde ser guardada neste navegador.",
                      );
                    }
                  } else setReceipts([]);
                  setPending(null);
                  setMessage(
                    "Backup restaurado neste dispositivo. " +
                      backupSummary(pending.backup),
                  );
                });
              }}
            >
              {busy === "restore" ? "Restaurando…" : "Substituir e restaurar"}
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
