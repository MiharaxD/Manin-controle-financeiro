import sharp from "sharp";
import { mkdir } from "node:fs/promises";
await mkdir("public/icons", { recursive: true });
const svg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#0b0b0d"/><path d="M108 92h324l-28 328H80z" fill="#ff1828"/><path d="M152 342V172l104 92 104-92v170M256 264v92" fill="none" stroke="#f4f0e7" stroke-width="32" stroke-linecap="square" stroke-linejoin="miter"/></svg>',
);
for (const [file, size] of [
  ["icon-192", 192],
  ["icon-512", 512],
  ["maskable-512", 512],
  ["apple-touch-icon", 180],
])
  await sharp(svg).resize(size, size).png().toFile(`public/icons/${file}.png`);
