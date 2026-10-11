// Promo gameplay capture (skeleton). Read-only on the game: only drives the UI.
// Usage: node capture.mjs [--base URL] [--out DIR] [--w 1080 --h 1920] [--seed 4] [--max-ms 12000]
// Playwright is resolved from the game's node_modules (no install needed).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('/home/user/cv/tiem-cat-toc/package.json');
const { chromium } = require('playwright');

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://localhost:4180/');
const OUT = path.resolve(arg('out', '/home/user/cv/promo/out/raw'));
const W = +arg('w', 1080), H = +arg('h', 1920);
const SEED = arg('seed', '4');
const MAX_MS = +arg('max-ms', 12000);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: OUT, size: { width: W, height: H } },
});
const page = await ctx.newPage();
const t0 = Date.now();
const marks = []; // timeline for the storyboard/assembly (seconds since recording start)
const mark = (label) => marks.push({ label, t: (Date.now() - t0) / 1000 });

const toClient = (x, y) => page.evaluate(([x, y]) => {
  const svg = document.querySelector('[data-testid=stage]');
  const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
  const r = pt.matrixTransform(svg.getScreenCTM()); return { x: r.x, y: r.y };
}, [x, y]);
async function drag(pts, steps = 12) {
  const a = await toClient(...pts[0]);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  for (const p of pts.slice(1)) { const c = await toClient(...p); await page.mouse.move(c.x, c.y, { steps }); }
  await page.mouse.up();
}
const left = () => MAX_MS - (Date.now() - t0);
const has = async (sel) => (await page.locator(sel).count()) > 0;

try {
  await page.goto(`${BASE}?mode=free&seed=${SEED}`);
  await page.waitForSelector('[data-testid=start]', { timeout: 15000 });
  mark('menu'); await page.waitForTimeout(800);
  await page.click('[data-testid=start]'); mark('start');
  await page.waitForTimeout(600);
  if (left() > 2000 && (await has('[data-testid=tool-scissors]'))) {
    await page.click('[data-testid=tool-scissors]'); mark('cut');
    await drag([[120, 214], [280, 214]]);
    if (left() > 2000) await drag([[110, 128], [200, 118], [290, 128]]);
  }
  if (left() > 2500 && (await has('[data-testid=finish]'))) {
    await page.click('[data-testid=finish]');
    await page.waitForSelector('[data-testid=mirror]', { timeout: 5000 });
    await page.click('[data-testid=mirror]'); mark('mirror');
    await page.waitForSelector('[data-testid=result]', { timeout: 5000 }); mark('result');
    await page.waitForTimeout(Math.max(0, Math.min(2500, left())));
  }
} catch (e) {
  console.error('capture warning:', e.message);
} finally {
  if (left() > 0 && Date.now() - t0 < 3000) await page.waitForTimeout(3000 - (Date.now() - t0));
  const video = page.video();
  await ctx.close(); await browser.close();
  const webm = await video.path();
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({ webm, w: W, h: H, marks }, null, 2));
  console.log(JSON.stringify({ webm, marks }));
}
