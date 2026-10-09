import test from "node:test";
import assert from "node:assert/strict";
import { GoogleDrive, DRIVE_SCOPE } from "../src/lib/google-drive";
import { createBackup, MAX_BACKUP_BYTES } from "../src/lib/backup";
import { createEmptyData } from "../src/lib/initial-data";

type Call = { url: string; options: RequestInit | undefined };
const sample = () => createBackup(createEmptyData(), crypto.randomUUID());
const file = (bytes: number) => ({
  id: "file_A",
  name: "manin-backup.json",
  mimeType: "application/json",
  createdTime: "2026-10-09T12:00:00Z",
  size: String(bytes),
  appProperties: { maninFormat: "manin-backup-v2" },
});
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function oauth(options: { error?: boolean; granted?: boolean } = {}) {
  let requested = "";
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      google: {
        accounts: {
          oauth2: {
            initTokenClient: (config: {
              scope: string;
              include_granted_scopes: boolean;
              callback: (r: object) => void;
            }) => {
              requested = config.scope;
              assert.equal(config.include_granted_scopes, false);
              return {
                requestAccessToken: () =>
                  config.callback(
                    options.error
                      ? { error: "access_denied" }
                      : {
                          access_token: "test_token",
                          expires_in: 3600,
                          scope: DRIVE_SCOPE,
                        },
                  ),
              };
            },
            hasGrantedAllScopes: () => options.granted !== false,
          },
        },
      },
    },
  });
  return () => requested;
}
function mock(
  handler: (url: string, options?: RequestInit) => Response | Promise<Response>,
) {
  const calls: Call[] = [];
  const request: typeof fetch = async (input, options) => {
    const url = String(input);
    calls.push({ url, options });
    return handler(url, options);
  };
  return { request, calls };
}
test("OAuth usa apenas drive.appdata; conectar confirma email e não envia backup", async () => {
  const scope = oauth(),
    m = mock(() => json({ user: { emailAddress: "local@example.com" } })),
    driver = new GoogleDrive("public-client", m.request);
  try {
    assert.equal(await driver.connect(), "local@example.com");
    assert.equal(scope(), DRIVE_SCOPE);
    assert.equal(m.calls.length, 1);
    assert.ok(m.calls[0].url.includes("/about?fields=user"));
    assert.ok(!m.calls.some((c) => c.options?.method === "POST"));
    driver.disconnect();
    assert.equal(driver.account, undefined);
  } finally {
    driver.disconnect();
  }
});
test("autorização negada ou sem escopo não gera conexão falsa", async () => {
  for (const option of [{ error: true }, { granted: false }]) {
    oauth(option);
    const m = mock(() => json({ user: { emailAddress: "local@example.com" } })),
      driver = new GoogleDrive("public-client", m.request);
    await assert.rejects(driver.connect());
    assert.equal(driver.connected, false);
    assert.equal(m.calls.length, 0);
    driver.disconnect();
  }
});
test("upload só retorna comprovante depois de confirmação de ID, tamanho e metadados", async () => {
  oauth();
  const b = sample(),
    bytes = new TextEncoder().encode(JSON.stringify(b)).byteLength;
  const m = mock((url) =>
    url.includes("/about")
      ? json({ user: { emailAddress: "local@example.com" } })
      : url.includes("/upload/")
        ? json({ id: "file_A" }, 201)
        : json(file(bytes)),
  );
  const d = new GoogleDrive("public-client", m.request);
  try {
    await d.connect();
    const receipt = await d.upload(b);
    assert.deepEqual(receipt, {
      account: "local@example.com",
      file_id: "file_A",
      confirmed_at: "2026-10-09T12:00:00Z",
    });
    const upload = m.calls.find((c) => c.url.includes("/upload/"))!;
    const text = await (upload.options!.body as Blob).text();
    assert.ok(text.includes('"parents":["appDataFolder"]'));
    assert.ok(text.includes("\r\nContent-Type: application/json"));
    assert.ok(!text.includes("\\r\\nContent-Type"));
    assert.ok(
      m.calls.every(
        (c) => new URL(c.url).origin === "https://www.googleapis.com",
      ),
    );
    assert.equal(upload.options?.credentials, "omit");
    assert.equal(upload.options?.redirect, "error");
  } finally {
    d.disconnect();
  }
});
test("falha de envio ou confirmação impede anunciar backup concluído", async () => {
  for (const stage of ["upload", "confirmation", "size"]) {
    oauth();
    const b = sample(),
      bytes = new TextEncoder().encode(JSON.stringify(b)).byteLength;
    const m = mock((url) =>
      url.includes("/about")
        ? json({ user: { emailAddress: "local@example.com" } })
        : url.includes("/upload/")
          ? stage === "upload"
            ? json({}, 500)
            : json({ id: "file_A" })
          : stage === "confirmation"
            ? json({}, 500)
            : json(file(bytes + 1)),
    );
    const d = new GoogleDrive("public-client", m.request);
    try {
      await d.connect();
      await assert.rejects(d.upload(b), /confirm/);
    } finally {
      d.disconnect();
    }
  }
});
test("lista fica na pasta do app e restauração recusa IDs não listados", async () => {
  oauth();
  const b = sample(),
    text = JSON.stringify(b),
    bytes = new TextEncoder().encode(text).byteLength;
  const m = mock((url) =>
    url.includes("/about")
      ? json({ user: { emailAddress: "local@example.com" } })
      : url.includes("/files?")
        ? json({ files: [file(bytes)] })
        : url.includes("alt=media")
          ? new Response(text)
          : json(file(bytes)),
  );
  const d = new GoogleDrive("public-client", m.request);
  try {
    await d.connect();
    const files = await d.list();
    assert.equal(files.length, 1);
    const listed = new URL(m.calls.find((c) => c.url.includes("/files?"))!.url);
    assert.equal(listed.searchParams.get("spaces"), "appDataFolder");
    assert.ok(listed.searchParams.get("q")!.includes("manin-backup-v2"));
    await assert.rejects(d.download("unlisted_file"), /listado/);
    assert.equal(await d.download("file_A"), text);
  } finally {
    d.disconnect();
  }
});
test("token expirado pela API desconecta e exige ação do usuário", async () => {
  oauth();
  let expire = false;
  const m = mock(() =>
    expire
      ? json({}, 401)
      : json({ user: { emailAddress: "local@example.com" } }),
  );
  const d = new GoogleDrive("public-client", m.request);
  try {
    await d.connect();
    expire = true;
    await assert.rejects(d.list(), /expirou/);
    assert.equal(d.connected, false);
    await assert.rejects(d.list(), /Conecte novamente/);
  } finally {
    d.disconnect();
  }
});
test("arquivo incompleto nunca passa como restauração confirmada", async () => {
  oauth();
  const m = mock((url) =>
    url.includes("/about")
      ? json({ user: { emailAddress: "local@example.com" } })
      : url.includes("/files?")
        ? json({ files: [file(100)] })
        : url.includes("alt=media")
          ? new Response("{}")
          : json(file(100)),
  );
  const d = new GoogleDrive("public-client", m.request);
  try {
    await d.connect();
    await d.list();
    await assert.rejects(d.download("file_A"), /incompleto/);
  } finally {
    d.disconnect();
  }
});
test("metadados de outro arquivo e texto UTF-8 inválido são recusados", async () => {
  oauth();
  for (const stage of ["id", "encoding"]) {
    const m = mock((url) =>
      url.includes("/about")
        ? json({ user: { emailAddress: "local@example.com" } })
        : url.includes("/files?")
          ? json({ files: [file(1)] })
          : url.includes("alt=media")
            ? new Response(new Uint8Array([255]))
            : json({
                ...file(1),
                id: stage === "id" ? "other_file" : "file_A",
              }),
    );
    const driver = new GoogleDrive("public-client", m.request);
    try {
      await driver.connect();
      await driver.list();
      await assert.rejects(
        driver.download("file_A"),
        stage === "id" ? /backup válido/ : /UTF-8 válido/,
      );
    } finally {
      driver.disconnect();
    }
  }
});
test("arquivos acima do limite são rejeitados antes do download", async () => {
  oauth();
  const m = mock((url) =>
    url.includes("/about")
      ? json({ user: { emailAddress: "local@example.com" } })
      : json({ files: [file(MAX_BACKUP_BYTES + 1)] }),
  );
  const d = new GoogleDrive("public-client", m.request);
  try {
    await d.connect();
    await assert.rejects(d.list(), /lista de backups inválida/);
    assert.equal(m.calls.length, 2);
  } finally {
    d.disconnect();
  }
});
test("envio grande usa sessão retomável e não encaminha token a outro domínio", async () => {
  oauth();
  const data = createEmptyData();
  data.accounts = Array.from({ length: 60000 }, () => ({
    id: crypto.randomUUID(),
    name: "x".repeat(60),
  }));
  const backup = createBackup(data, crypto.randomUUID()),
    bytes = new TextEncoder().encode(JSON.stringify(backup)).byteLength;
  assert.ok(bytes > 5 * 1024 * 1024);
  for (const malicious of [true, false]) {
    const m = mock((url, options) =>
      url.includes("/about")
        ? json({ user: { emailAddress: "local@example.com" } })
        : url.includes("uploadType=resumable")
          ? new Response(null, {
              status: 200,
              headers: {
                Location: malicious
                  ? "https://bad.example/upload"
                  : "https://www.googleapis.com/upload/drive/v3/files?upload_id=resume_test",
              },
            })
          : options?.method === "PUT"
            ? json({ id: "file_A" })
            : json(file(bytes)),
    );
    const d = new GoogleDrive("public-client", m.request);
    try {
      await d.connect();
      if (malicious)
        await assert.rejects(d.upload(backup), /Endereço de envio inválido/);
      else assert.equal((await d.upload(backup)).file_id, "file_A");
      assert.ok(
        m.calls.every(
          (c) => new URL(c.url).origin === "https://www.googleapis.com",
        ),
      );
    } finally {
      d.disconnect();
    }
  }
});
