// Renders title/CTA cards as PNG (HTML -> Playwright screenshot) at the exact output size.
// Usage: node render-cards.mjs --kind hook|cta --w 1080 --h 1920 --out card.png
//          --title "line 1|line 2" [--sub "..."] [--hero frame.png] [--badge "..."]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('/home/user/cv/tiem-cat-toc/package.json');
const { chromium } = require('playwright');

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const KIND = arg('kind', 'hook'), W = +arg('w', 1080), H = +arg('h', 1920);
const OUT = path.resolve(arg('out', `/home/user/cv/promo/out/card-${KIND}.png`));
const TITLE = arg('title', 'Tiệm Cắt Tóc Bất Ổn'), SUB = arg('sub', ''), BADGE = arg('badge', '');
const HERO = arg('hero', '');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const heroUrl = HERO && fs.existsSync(HERO) ? `data:image/${HERO.endsWith('.png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(HERO).toString('base64')}` : '';
const portrait = H > W;
const u = Math.min(W, H) / 100; // 1 unit = 1% of the short side

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:'Inter Display','Inter','DejaVu Sans',sans-serif;color:#2b1a12;
  background:#bfe3d6;background-image:linear-gradient(#a9d4c5 2px,transparent 2px),linear-gradient(90deg,#a9d4c5 2px,transparent 2px);
  background-size:${6 * u}px ${6 * u}px;display:flex;flex-direction:${portrait ? 'column' : 'row'};align-items:center;justify-content:center;gap:${5 * u}px;padding:${6 * u}px}
.band{position:absolute;left:0;right:0;top:0;height:${3.2 * u}px;background:repeating-linear-gradient(-45deg,#d93a2b 0 ${2 * u}px,#fff 0 ${4 * u}px,#2a5bd7 0 ${6 * u}px,#fff 0 ${8 * u}px)}
.band.b{top:auto;bottom:0}
.sign{background:#d93a2b;border:${0.9 * u}px solid #5a1b0e;border-radius:${3 * u}px;box-shadow:0 ${1.2 * u}px 0 #5a1b0e;padding:${3.2 * u}px ${4.5 * u}px;text-align:center;color:#fff;max-width:${portrait ? 94 * u : 0.46 * W}px}
.sign h1{font-weight:900;font-size:${(portrait ? 10.2 : 7.6) * u}px;line-height:1.08;letter-spacing:-0.01em;text-transform:uppercase;text-shadow:0 ${0.7 * u}px 0 #5a1b0e}
.sub{margin-top:${2.4 * u}px;display:inline-block;background:#fff4d6;color:#c62f20;border:${0.6 * u}px solid #5a1b0e;border-radius:${10 * u}px;padding:${1.3 * u}px ${3.6 * u}px;font-weight:900;font-size:${(portrait ? 5.4 : 4.2) * u}px;white-space:nowrap}
.url{font-family:'Inter','DejaVu Sans',sans-serif;font-weight:800;font-size:${(portrait ? 4.7 : 3.6) * u}px;color:#2b1a12;background:#fff;letter-spacing:0}
.hero{position:relative;flex:none;transform:rotate(${KIND === 'hook' ? -3 : 3}deg)}
.hero img{display:block;${portrait ? `width:${0.8 * W}px;max-height:${0.5 * H}px;object-fit:cover` : `height:${0.62 * H}px;max-width:${0.44 * W}px;object-fit:cover`};border-radius:${4 * u}px;border:${1.3 * u}px solid #f2c230;outline:${0.8 * u}px solid #5a1b0e;box-shadow:0 ${1.6 * u}px 0 #5a1b0e;background:#fff}
.sticker{position:absolute;${KIND === 'hook' ? 'right' : 'left'}:-${5 * u}px;bottom:${6 * u}px;background:#f2c230;color:#5a1b0e;border:${0.6 * u}px solid #5a1b0e;border-radius:${2 * u}px;padding:${1.2 * u}px ${2.4 * u}px;
  font-weight:900;font-size:${(portrait ? 5 : 3.8) * u}px;transform:rotate(${KIND === 'hook' ? 8 : -8}deg);white-space:nowrap}
</style></head><body>
<div class="band"></div><div class="band b"></div>
${KIND === 'hook' ? `<div class="sign"><h1>${esc(TITLE).split('|').join('<br>')}</h1>${SUB ? `<div class="sub">${esc(SUB)}</div>` : ''}</div>` : ''}
${heroUrl ? `<div class="hero"><img src="${heroUrl}">${BADGE ? `<div class="sticker">${esc(BADGE)}</div>` : ''}</div>` : ''}
${KIND === 'cta' ? `<div class="sign"><h1>${esc(TITLE).split('|').join('<br>')}</h1>${SUB ? `<div class="sub url">${esc(SUB)}</div>` : ''}</div>` : ''}
</body></html>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: OUT });
await browser.close();
console.log(OUT);
