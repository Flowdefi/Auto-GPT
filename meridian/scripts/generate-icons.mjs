#!/usr/bin/env node
/**
 * Renders the Meridian mark into the PNG sizes iOS and Android install flows
 * expect. Run after changing the source SVG: `node scripts/generate-icons.mjs`
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT = path.join(process.cwd(), "public");
mkdirSync(OUT, { recursive: true });

const BG = "#0c1620";
const GOLD = "#c9a24a";

function markSvg(size, { maskable = false } = {}) {
  // Maskable icons must keep artwork inside the safe zone (80% of the canvas).
  const inset = maskable ? size * 0.18 : size * 0.1;
  const radius = maskable ? 0 : size * 0.22;
  const w = size - inset * 2;
  const scale = w / 100;
  const x = (v) => inset + v * scale;
  const y = (v) => inset + v * scale;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
  <path d="M ${x(4)} ${y(84)} L ${x(50)} ${y(12)} L ${x(96)} ${y(84)} H ${x(74)} L ${x(50)} ${y(46)} L ${x(26)} ${y(84)} Z" fill="${GOLD}"/>
  <circle cx="${x(50)}" cy="${y(94)}" r="${7 * scale}" fill="${GOLD}"/>
</svg>`);
}

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32.png", size: 32 },
];

for (const target of targets) {
  const png = await sharp(markSvg(target.size, { maskable: target.maskable }))
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(path.join(OUT, target.file), png);
  console.log(`wrote public/${target.file} (${png.length} bytes)`);
}

const ico = await sharp(markSvg(32)).resize(32, 32).png().toBuffer();
writeFileSync(path.join(OUT, "favicon.ico"), ico);
console.log("wrote public/favicon.ico");
