import { z } from "zod";
import { MAX_BACKUP_BYTES, type Backup } from "./backup";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const API = "https://www.googleapis.com/drive/v3";
const marker = "manin-backup-v2";
const fileSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/),
  name: z.string().min(1).max(250),
  mimeType: z.literal("application/json"),
  createdTime: z.iso.datetime({ offset: true }),
  size: z
    .string()
    .regex(/^\d+$/)
    .refine((v) => Number(v) <= MAX_BACKUP_BYTES),
  appProperties: z.object({ maninFormat: z.literal(marker) }),
});
export type DriveFile = z.infer<typeof fileSchema>;
interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
}
interface GoogleOAuth {
  initTokenClient(options: {
    client_id: string;
    scope: string;
    include_granted_scopes: boolean;
    callback: (response: TokenResponse) => void;
    error_callback: () => void;
  }): { requestAccessToken: (options: { prompt: string }) => void };
  hasGrantedAllScopes(response: TokenResponse, ...scopes: string[]): boolean;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth } };
  }
}
let library: Promise<void> | undefined;
export function prepareGoogle(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve();
  return (library ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.referrerPolicy = "no-referrer";
    const timeout = setTimeout(() => failed(), 15000);
    const failed = () => {
      clearTimeout(timeout);
      script.remove();
      library = undefined;
      reject(
        new Error(
          "Não foi possível carregar a conexão do Google. Confira a internet e tente novamente.",
        ),
      );
    };
    script.onerror = failed;
    script.onload = () => {
      clearTimeout(timeout);
      if (window.google?.accounts.oauth2) resolve();
      else failed();
    };
    document.head.appendChild(script);
  }));
}
interface Session {
  token: string;
  expires: number;
  account: string;
}
export class GoogleDrive {
  private session?: Session;
  private allowed = new Set<string>();
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private clientId: string,
    private request: typeof fetch = fetch,
    private onDisconnect: () => void = () => {},
  ) {}
  get account() {
    return this.session?.account;
  }
  get connected() {
    return !!this.session && this.session.expires > Date.now();
  }
  async connect(): Promise<string> {
    if (!this.clientId)
      throw new Error(
        "Configure NEXT_PUBLIC_GOOGLE_CLIENT_ID para conectar o Google Drive.",
      );
    const google = window.google?.accounts.oauth2;
    if (!google)
      throw new Error("A conexão do Google ainda não foi carregada.");
    const token = await new Promise<TokenResponse>((resolve, reject) => {
      const client = google.initTokenClient({
        client_id: this.clientId,
        scope: DRIVE_SCOPE,
        include_granted_scopes: false,
        callback: (response) =>
          response.error
            ? reject(new Error("A autorização do Google não foi concluída."))
            : resolve(response),
        error_callback: () =>
          reject(
            new Error(
              "A janela do Google foi fechada ou bloqueada. Tente conectar novamente.",
            ),
          ),
      });
      client.requestAccessToken({ prompt: "select_account" });
    });
    if (
      !token.access_token ||
      !token.expires_in ||
      !google.hasGrantedAllScopes(token, DRIVE_SCOPE)
    )
      throw new Error(
        "O Google não concedeu acesso à pasta de backups do Manin.",
      );
    this.disconnect();
    const session = {
      token: token.access_token,
      expires: Date.now() + token.expires_in * 1000 - 30000,
      account: "",
    };
    const response = await this.call(
      session,
      API + "/about?fields=user(emailAddress)",
    );
    const info = z
      .object({ user: z.object({ emailAddress: z.string().email() }) })
      .safeParse(await response.json());
    if (!info.success)
      throw new Error("Não foi possível confirmar a conta conectada.");
    session.account = info.data.user.emailAddress;
    this.session = session;
    this.timer = setTimeout(
      () => this.disconnect(),
      Math.max(0, session.expires - Date.now()),
    );
    return session.account;
  }
  disconnect() {
    clearTimeout(this.timer);
    this.session = undefined;
    this.allowed.clear();
    this.onDisconnect();
  }
  private active(): Session {
    if (!this.connected) {
      this.disconnect();
      throw new Error("Conecte novamente o Google Drive para continuar.");
    }
    return this.session!;
  }
  private async call(
    session: Session,
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    let response: Response;
    try {
      response = await this.request(url, {
        ...options,
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        headers: {
          ...options.headers,
          Authorization: "Bearer " + session.token,
        },
      });
    } catch {
      throw new Error(
        "Não foi possível acessar o Google Drive. Confira a internet. Seus dados locais foram mantidos.",
      );
    }
    if (!response.ok) {
      if (response.status === 401 && this.session?.token === session.token)
        this.disconnect();
      throw new Error(
        response.status === 401
          ? "A autorização expirou. Conecte novamente o Google Drive."
          : "O Google Drive não confirmou a operação. Tente novamente.",
      );
    }
    return response;
  }
  async list(): Promise<DriveFile[]> {
    const session = this.active();
    const files: DriveFile[] = [];
    let page: string | undefined;
    do {
      const params = new URLSearchParams({
        spaces: "appDataFolder",
        q:
          "trashed = false and appProperties has { key='maninFormat' and value='" +
          marker +
          "' }",
        fields:
          "nextPageToken,files(id,name,mimeType,size,createdTime,appProperties)",
        orderBy: "createdTime desc",
        pageSize: "100",
      });
      if (page) params.set("pageToken", page);
      const response = await this.call(session, API + "/files?" + params);
      const result = z
        .object({
          files: z.array(fileSchema),
          nextPageToken: z.string().optional(),
        })
        .safeParse(await response.json());
      if (!result.success)
        throw new Error("O Google retornou uma lista de backups inválida.");
      files.push(...result.data.files);
      page = result.data.nextPageToken;
      if (files.length > 10000)
        throw new Error(
          "Muitos backups nesta conta. Organize as cópias antes de continuar.",
        );
    } while (page);
    this.allowed = new Set(files.map((f) => f.id));
    return files;
  }
  async upload(
    backup: Backup,
  ): Promise<{ account: string; file_id: string; confirmed_at: string }> {
    const session = this.active();
    const text = JSON.stringify(backup);
    const bytes = new TextEncoder().encode(text).byteLength;
    if (bytes > MAX_BACKUP_BYTES) throw new Error("O backup excede 20 MB.");
    const metadata = {
      name: "manin-" + backup.exported_at.replaceAll(":", "-") + ".json",
      mimeType: "application/json",
      parents: ["appDataFolder"],
      appProperties: { maninFormat: marker },
    };
    let response: Response;
    if (bytes <= 5 * 1024 * 1024) {
      const boundary = "manin_" + crypto.randomUUID();
      const body = new Blob([
        "--" +
          boundary +
          "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n",
        JSON.stringify(metadata),
        "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n",
        text,
        "\r\n--" + boundary + "--",
      ]);
      response = await this.call(
        session,
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
        {
          method: "POST",
          headers: {
            "Content-Type": "multipart/related; boundary=" + boundary,
          },
          body,
        },
      );
    } else {
      const started = await this.call(
        session,
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Upload-Content-Type": "application/json",
            "X-Upload-Content-Length": String(bytes),
          },
          body: JSON.stringify(metadata),
        },
      );
      const location = started.headers.get("Location");
      if (!location)
        throw new Error("O Google não confirmou o início do envio.");
      const url = new URL(location);
      if (
        url.origin !== "https://www.googleapis.com" ||
        !url.pathname.startsWith("/upload/drive/v3/files")
      )
        throw new Error("Endereço de envio inválido retornado pelo Google.");
      response = await this.call(session, url.href, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
    }
    const sent = z
      .object({ id: fileSchema.shape.id })
      .safeParse(await response.json());
    if (!sent.success)
      throw new Error("O Google não confirmou o arquivo enviado.");
    const confirmed = await this.call(
      session,
      API +
        "/files/" +
        sent.data.id +
        "?fields=id,name,mimeType,size,createdTime,appProperties",
    );
    const file = fileSchema.safeParse(await confirmed.json());
    if (
      !file.success ||
      file.data.id !== sent.data.id ||
      Number(file.data.size) !== bytes
    )
      throw new Error(
        "Não foi possível confirmar a cópia completa no Google Drive. Consulte os backups antes de repetir o envio.",
      );
    return {
      account: session.account,
      file_id: file.data.id,
      confirmed_at: file.data.createdTime,
    };
  }
  async download(fileId: string): Promise<string> {
    const session = this.active();
    if (!this.allowed.has(fileId))
      throw new Error("Selecione um backup listado pelo Manin.");
    const metadata = await this.call(
      session,
      API +
        "/files/" +
        fileId +
        "?fields=id,name,mimeType,size,createdTime,appProperties",
    );
    const checked = fileSchema.safeParse(await metadata.json());
    if (!checked.success || checked.data.id !== fileId)
      throw new Error("O arquivo selecionado não é um backup válido do Manin.");
    const response = await this.call(
      session,
      API + "/files/" + fileId + "?alt=media",
    );
    if (!response.body) throw new Error("O Google retornou um arquivo vazio.");
    const reader = response.body.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_BACKUP_BYTES) {
        await reader.cancel();
        throw new Error("O backup excede 20 MB.");
      }
      chunks.push(result.value);
    }
    if (size !== Number(checked.data.size))
      throw new Error(
        "O backup recebido está incompleto. Seus dados foram mantidos.",
      );
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error(
        "O backup não contém texto UTF-8 válido. Seus dados foram mantidos.",
      );
    }
  }
}
