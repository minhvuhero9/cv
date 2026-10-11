// Promo gameplay capture for "Tiệm Cắt Tóc Bất Ổn" (read-only on the game: only drives the UI).
// Records one real-time Playwright video per aspect ratio and writes timeline.json marks
// (seconds since recording start) for assemble.sh to trim by.
//
// Usage: node capture.mjs --out DIR [--base http://localhost:4180/] [--w 432 --h 768 --dsf 2.5]
//          [--seed 4] [--customer teo] [--persona tocdung] [--strip 70] [--speed 40]
// Video size = w*dsf x h*dsf (e.g. 432x768@2.5 -> 1080x1920; 1280x720@1.5 -> 1920x1080).
// Playwright is resolved from the game's node_modules (no install needed).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire('/home/user/cv/tiem-cat-toc/package.json');
const { chromium } = require('playwright');

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://localhost:4180/');
const OUT = path.resolve(arg('out', '/home/user/cv/promo/out/raw'));
const W = +arg('w', 432), H = +arg('h', 768), DSF = +arg('dsf', 2.5);
const VW = Math.round(W * DSF), VH = Math.round(H * DSF);
const SEED = arg('seed', '4');
const CUSTOMER = arg('customer', 'teo');
const PERSONA = arg('persona', 'tocdung');
const STRIP = +arg('strip', 70);   // width (head-local px) of the bald strip across the scalp
const SPEED = +arg('speed', 40);   // clipper speed, head-local px/s (slow = dwell = bald)
fs.mkdirSync(OUT, { recursive: true });

const warnings = [];
const warn = (m) => { warnings.push(m); console.error('capture warning:', m); };

const browser = await chromium.launch();
// Playwright recordVideo ignores deviceScaleFactor (content lands in a W x H corner) and CDP
// screencastAck is unavailable in this Chromium build, so capture with a Page.captureScreenshot
// loop at device pixels (~18-20 fps, sharp 1080x1920 / 1920x1080), then encode the timestamped
// frames to a CFR 30 fps MP4 with the concat demuxer.
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DSF });
const page = await ctx.newPage();
page.on('pageerror', (e) => warn(`pageerror: ${e.message}`));
const FRAMES = path.join(OUT, 'frames');
fs.rmSync(FRAMES, { recursive: true, force: true }); fs.mkdirSync(FRAMES, { recursive: true });
const frames = []; // { file, ts }
const cdp = await ctx.newCDPSession(page);
let recording = true;
const recorder = (async () => {
  while (recording) {
    const t1 = Date.now();
    try {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90, optimizeForSpeed: true });
      const file = path.join(FRAMES, `f${String(frames.length).padStart(5, '0')}.jpg`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      frames.push({ file, ts: (t1 + Date.now()) / 2000 });
    } catch { await new Promise((r) => setTimeout(r, 30)); }
  }
})();
const marks = [];
const mark = (label, extra = {}) => { const m = { label, wall: Date.now() / 1000, ...extra }; marks.push(m); console.log('mark', label, JSON.stringify(extra)); };

const toClient = (x, y) => page.evaluate(([x, y]) => {
  const svg = document.querySelector('[data-testid=stage]');
  const pt = svg.createSVGPoint(); pt.x = x; pt.y = y;
  const r = pt.matrixTransform(svg.getScreenCTM()); return { x: r.x, y: r.y };
}, [x, y]);
const st = () => page.evaluate(() => {
  const s = window.__tctbo.state();
  return { phase: s.phase, chaos: Math.round(s.chaos), patience: Math.round(s.patience), persona: s.persona ?? null,
    bald: s.hair.tufts.filter((t) => t.bald).length, walkout: !!s.walkout, style: s.result?.style?.name ?? null };
});
const waitPhase = (p, timeout = 8000) => page.waitForFunction((p) => window.__tctbo?.state().phase === p, p, { timeout });
const has = async (sel) => (await page.locator(sel).count()) > 0;
const clickIf = async (sel, label) => {
  if (await has(sel)) { await page.click(sel); return true; }
  warn(`missing selector ${sel}${label ? ` (${label})` : ''}`); return false;
};
async function slowDrag(pts, pxPerSec) {
  const a = await toClient(...pts[0]);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
    for (let k = 1; k <= n; k++) {
      const c = await toClient(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n);
      await page.mouse.move(c.x, c.y);
      await page.waitForTimeout((3 / pxPerSec) * 1000);
    }
  }
  await page.mouse.up();
}
async function begIfNeeded() {
  if (await has('[data-testid=beg]')) { await page.click('[data-testid=beg]'); mark('beg'); await page.waitForTimeout(600); }
}

try {
  await page.goto(`${BASE}?mode=free&seed=${SEED}`);
  await page.waitForSelector('[data-testid=start]', { timeout: 15000 });
  await clickIf(`[data-testid=pick-${CUSTOMER}]`, 'customer');
  await page.waitForTimeout(400); // let fonts/SVG settle
  mark('intro');
  await page.waitForTimeout(900);
  await page.click('[data-testid=start]');
  await waitPhase('cutting');
  mark('cutting', await st());
  await page.waitForTimeout(700);

  // Beat: chaotic clipper pass -> bald strip across the top of the scalp.
  await clickIf('[data-testid=tool-clipper]', 'clipper');
  const head = await page.evaluate(() => window.__tctbo.state().hair.head);
  const top = await page.evaluate(() => {
    const s = window.__tctbo.state(); const h = s.hair.head;
    return s.hair.tufts.filter((t) => t.root.y < h.cy - h.ry * 0.55).map((t) => [t.root.x, t.root.y]).sort((a, b) => a[0] - b[0]);
  });
  const mid = top.filter(([x]) => Math.abs(x - head.cx) <= STRIP / 2);
  const pts = mid.length >= 2 ? [mid[0], mid[Math.floor(mid.length / 2)], mid[mid.length - 1]] : [[head.cx - STRIP / 2, head.cy - head.ry * 0.7], [head.cx + STRIP / 2, head.cy - head.ry * 0.7]];
  mark('clip');
  await slowDrag(pts, SPEED);
  mark('bald', await st());
  await page.waitForTimeout(1600); // customer reaction
  await begIfNeeded();
  mark('react', await st());

  // Beat: Gương Thần Biến Hình.
  if (await clickIf('[data-testid=guong-than]', 'magic mirror')) {
    await page.waitForSelector('[data-testid=mirror-picker]', { timeout: 5000 });
    mark('picker');
    const card = page.locator(`[data-testid=persona-${PERSONA}]`);
    if (await card.count()) {
      const bb = await card.boundingBox();
      if (bb) await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 15 });
      await page.waitForTimeout(1100);
      await card.click();
      await page.waitForFunction((p) => window.__tctbo.state().persona === p, PERSONA, { timeout: 3000 }).catch(() => warn('persona not applied'));
      mark('transform', await st());
      await page.mouse.move(5, 5);
      await page.waitForTimeout(2600);
      await begIfNeeded();
    } else warn(`persona ${PERSONA} missing`);
  }

  // Beat: finish -> mirror reveal -> result card.
  const ph = (await st()).phase;
  if (ph === 'cutting') await clickIf('[data-testid=finish]', 'finish');
  await waitPhase('mirror');
  mark('mirror');
  await page.waitForTimeout(1800);
  await page.click('[data-testid=mirror]');
  await waitPhase('result');
  await page.waitForSelector('[data-testid=card-img]', { timeout: 8000 }).catch(() => warn('card-img missing'));
  mark('result', { style: await page.textContent('[data-testid=style-name]').catch(() => null) });
  await page.waitForTimeout(3500);
  mark('end');
} catch (e) {
  warn(e.message.split('\n')[0]);
} finally {
  recording = false; await recorder;
  await ctx.close(); await browser.close();
  if (frames.length < 2) throw new Error('no screencast frames captured');
  // Times relative to the first frame; concat demuxer with per-frame durations -> CFR 30 fps.
  const T0 = frames[0].ts, endTs = Math.max(frames.at(-1).ts + 0.05, ...marks.map((m) => m.wall));
  let list = 'ffconcat version 1.0\n';
  frames.forEach((f, i) => {
    const d = Math.max(0.001, (i + 1 < frames.length ? frames[i + 1].ts : endTs) - f.ts);
    list += `file '${f.file}'\nduration ${d.toFixed(4)}\n`;
  });
  list += `file '${frames.at(-1).file}'\n`;
  fs.writeFileSync(path.join(OUT, 'frames.ffconcat'), list);
  const video = path.join(OUT, 'raw.mp4');
  const { execFileSync } = await import('node:child_process');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-safe', '0', '-f', 'concat', '-i', path.join(OUT, 'frames.ffconcat'),
    '-vf', `fps=30,scale=${VW}:${VH}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', video]);
  for (const m of marks) { m.t = +(m.wall - T0).toFixed(3); delete m.wall; }
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({ video, w: VW, h: VH, viewport: [W, H, DSF], customer: CUSTOMER, persona: PERSONA, seed: SEED, frames: frames.length, duration: +(endTs - T0).toFixed(3), marks, warnings }, null, 2));
  console.log(JSON.stringify({ video, frames: frames.length, warnings }));
}
