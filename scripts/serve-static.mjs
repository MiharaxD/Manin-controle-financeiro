import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
const root = resolve("out");
const index = process.argv.indexOf("--port");
const port = Number(
  index < 0 ? (process.env.PORT ?? 3000) : process.argv[index + 1],
);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Porta inválida.");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};
createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (pathname === "/demo" || pathname.startsWith("/demo/")) {
      res.writeHead(404);
      res.end("Página não encontrada.");
      return;
    }
    let path = resolve(root, "." + pathname);
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
    const data = await readFile(path);
    res.setHeader(
      "Content-Type",
      types[extname(path)] ?? "application/octet-stream",
    );
    res.setHeader(
      "Cache-Control",
      path.endsWith("sw.js") || path.endsWith("offline-manifest.js")
        ? "no-store"
        : "no-cache",
    );
    res.writeHead(200);
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    res.writeHead(404);
    res.end("Página não encontrada.");
  }
}).listen(port, "0.0.0.0", () =>
  console.log("Manin estático: http://localhost:" + port),
);
