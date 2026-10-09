import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
const root = "out";
const urls = [];
const hash = createHash("sha256");
async function scan(dir, prefix = "") {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const rel = prefix + entry.name;
    if (rel === "demo" || rel.startsWith("demo/")) continue;
    if (entry.isDirectory()) await scan(join(dir, entry.name), rel + "/");
    else if (
      !rel.endsWith(".map") &&
      !["sw.js", "offline-manifest.js"].includes(rel)
    ) {
      const content = await readFile(join(dir, entry.name));
      hash.update(rel);
      hash.update(content);
      urls.push("/" + (rel.endsWith("index.html") ? rel.slice(0, -10) : rel));
    }
  }
}
await scan(root);
await writeFile(
  join(root, "offline-manifest.js"),
  "self.MANIN_SHELL=" +
    JSON.stringify({ version: hash.digest("hex").slice(0, 16), urls }) +
    ";\n",
);
console.log("App estático preparado para uso offline.");
