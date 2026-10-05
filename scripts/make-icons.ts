// Renders the home-screen app icons into public/icons/ (and the iOS one into src/app/).
// Usage: node scripts/make-icons.ts   — re-run after changing the design below.
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Full-bleed square so it also works as a maskable icon: the lettering stays inside the
// central 80% safe zone that Android may crop to a circle or squircle.
const html = (size: number) => `<!doctype html>
<body style="margin:0">
  <div style="width:${size}px;height:${size}px;background:#1f4e79;display:flex;flex-direction:column;
    align-items:center;justify-content:center;font-family:Georgia,'Times New Roman',serif;color:#fff">
    <div style="font-size:${size * 0.3}px;font-weight:700;letter-spacing:${size * 0.005}px;line-height:1">JRF</div>
    <div style="margin-top:${size * 0.04}px;width:${size * 0.34}px;height:${Math.max(1, size * 0.012)}px;background:#9fc3e4"></div>
    <div style="margin-top:${size * 0.035}px;font-size:${size * 0.085}px;font-family:Helvetica,Arial,sans-serif;
      letter-spacing:${size * 0.008}px;color:#cfe0f0">COMMERCE</div>
  </div>
</body>`;

const OUTPUTS = [
  { file: "public/icons/icon-192.png", size: 192 },
  { file: "public/icons/icon-512.png", size: 512 },
  { file: "src/app/apple-icon.png", size: 180 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
mkdirSync(join(ROOT, "public/icons"), { recursive: true });
for (const { file, size } of OUTPUTS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html(size));
  await page.screenshot({ path: join(ROOT, file), clip: { x: 0, y: 0, width: size, height: size } });
  console.log(`wrote ${file}`);
}
await browser.close();
