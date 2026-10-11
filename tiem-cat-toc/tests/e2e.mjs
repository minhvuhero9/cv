// End-to-end playtest: drives the real game in Chromium with mouse input.
// Usage: start the dev server (npm run dev), then `npm run e2e` (BASE_URL to override).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/';
const OUT = process.env.SHOTS ?? path.resolve('test-results');
fs.mkdirSync(OUT, { recursive: true });


const browser = await chromium.launch();
let failures = 0;
const results = [];

function check(name, cond, detail = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!cond) failures++;
}

async function newGame(viewport = { width: 1280, height: 800 }, opts = {}) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true, hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}?mode=free&seed=${opts.seed ?? 11}${opts.unlockAll ? '&unlock=all' : ''}`);
  await page.waitForSelector('[data-testid=start]');
  return { page, ctx, errors };
}

/** Converts head-local game coordinates to page pixels. */
async function toClient(page, x, y) {
  return page.evaluate(
    ([x, y]) => {
      const svg = document.querySelector('[data-testid=stage]');
      const pt = svg.createSVGPoint();
      pt.x = x;
      pt.y = y;
      const r = pt.matrixTransform(svg.getScreenCTM());
      return { x: r.x, y: r.y };
    },
    [x, y],
  );
}

const state = (page) =>
  page.evaluate(() => {
    const s = window.__tctbo.state();
    return {
      phase: s.phase,
      time: s.time,
      chaos: s.chaos,
      patience: s.patience,
      events: { ...s.events },
      metrics: s.metrics,
      fixCount: s.fixCount,
      customer: s.customer.id,
      tool: s.tool,
      result: s.result,
      totalLen: s.hair.tufts.reduce((a, t) => a + t.len, 0),
      bald: s.hair.tufts.filter((t) => t.bald).length,
      spiked: s.hair.tufts.filter((t) => t.spiked).length,
    };
  });

/** Drag through a list of head-local points. `steps` controls speed (more steps = slower). */
async function drag(page, pts, { steps = 6, pause = 0 } = {}) {
  const first = await toClient(page, ...pts[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const p of pts.slice(1)) {
    const c = await toClient(page, ...p);
    await page.mouse.move(c.x, c.y, { steps });
    if (pause) await page.waitForTimeout(pause);
  }
  await page.mouse.up();
}

/** Drag at a fixed real-time speed (head-local px per second), independent of machine speed. */
async function slowDrag(page, pts, pxPerSec) {
  const first = await toClient(page, ...pts[0]);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 3);
    for (let k = 1; k <= n; k++) {
      const c = await toClient(page, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n);
      await page.mouse.move(c.x, c.y);
      await page.waitForTimeout((3 / pxPerSec) * 1000);
    }
  }
  await page.mouse.up();
}

async function hold(page, x, y, ms) {
  const c = await toClient(page, x, y);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function start(page, customer) {
  if (customer) await page.click(`[data-testid=pick-${customer}]`);
  await page.click('[data-testid=start]');
  await page.waitForTimeout(150);
}

async function finishAndWait(page) {
  // A furious customer may be halfway out of the chair: beg, then finish.
  if (await page.locator('[data-testid=beg]').count()) await page.click('[data-testid=beg]');
  const phase = (await state(page)).phase;
  if (phase === 'cutting') await page.click('[data-testid=finish]');
  await page.waitForSelector('[data-testid=mirror]');
  await page.waitForTimeout(1700);
  await page.screenshot({ path: `${OUT}/mirror-${Date.now()}.png` });
  await page.click('[data-testid=mirror]');
  await page.waitForSelector('[data-testid=result]');
  await page.waitForSelector('[data-testid=card-img]');
  return state(page);
}

/* ---------------- Scenario A: Tuấn, cut to the reference photo ---------------- */
{
  const { page, ctx, errors } = await newGame();
  await start(page, 'tuan');
  await page.screenshot({ path: `${OUT}/A0-start.png` });
  // Clipper, quick passes over both sides (away from the roots so nothing goes bald).
  await page.click('[data-testid=tool-clipper]');
  for (const x of [92, 102, 112]) await drag(page, [[x, 170], [x - 6, 250], [x - 4, 300]], { steps: 4 });
  for (const x of [308, 298, 288]) await drag(page, [[x, 170], [x + 6, 250], [x + 4, 300]], { steps: 4 });
  await drag(page, [[60, 230], [70, 300]], { steps: 4 });
  await drag(page, [[340, 230], [330, 300]], { steps: 4 });
  // Scissors: trim the fringe straight and take a little off the top.
  await page.click('[data-testid=tool-scissors]');
  await drag(page, [[120, 214], [280, 214]], { steps: 8 });
  await drag(page, [[110, 128], [200, 118], [290, 128]], { steps: 8 });
  const mid = await state(page);
  await page.screenshot({ path: `${OUT}/A1-cut.png` });
  check('A: hair visibly changes when cutting', mid.totalLen < 0.85 * (await page.evaluate(() => window.__tctbo.state().before.tufts.reduce((a, t) => a + t.len, 0))));
  check('A: careful cut leaves no bald patch', mid.bald === 0, `bald=${mid.bald}`);
  const end = await finishAndWait(page);
  await page.screenshot({ path: `${OUT}/A2-result.png` });
  check('A: satisfied customer (>=60%)', end.result.sat >= 60, `sat=${end.result.sat} style=${end.result.style.name} line="${end.result.line}"`);
  check('A: positive mood', ['happy', 'ecstatic'].includes(end.result.mood), end.result.mood);
  // Download the card.
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-testid=download]')]);
  const file = `${OUT}/card-A.png`;
  await dl.saveAs(file);
  const buf = fs.readFileSync(file);
  check('A: PNG card downloads', buf.length > 20000 && buf.subarray(1, 4).toString() === 'PNG', `${buf.length} bytes, ${dl.suggestedFilename()}`);
  check('A: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Scenario B: shave too deep ---------------- */
{
  const { page, ctx, errors } = await newGame();
  await start(page, 'bay');
  await page.click('[data-testid=tool-clipper]');
  // Slow clipper drag right across the top of the scalp: dwell builds up -> bald strip.
  await slowDrag(page, [[140, 175], [175, 165], [205, 162], [235, 165], [262, 175]], 30);
  await page.waitForTimeout(1200);
  const mid = await state(page);
  await page.screenshot({ path: `${OUT}/B1-bald.png` });
  check('B: bald patch appears', mid.bald > 0, `bald=${mid.bald}`);
  check('B: Đường Cạo Định Mệnh event fired', (mid.events.baldPatch ?? 0) > 0);
  check('B: chaos rises', mid.chaos >= 25, `chaos=${mid.chaos.toFixed(1)}`);
  const end = await finishAndWait(page);
  await page.screenshot({ path: `${OUT}/B2-result.png` });
  check('B: hairstyle named after the damage', ['highway', 'onepatch', 'islands', 'egg'].includes(end.result.style.id), end.result.style.name);
  check('B: negative reaction', ['angry', 'shocked', 'crying', 'suspicious'].includes(end.result.mood), `${end.result.mood}: ${end.result.line}`);
  check('B: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Scenario C: keep fixing the same spot ---------------- */
{
  const { page, ctx, errors } = await newGame();
  await start(page, 'bay');
  await page.click('[data-testid=tool-scissors]');
  // Snip the left side again and again, each time a little higher.
  for (let i = 0; i < 8; i++) {
    const y = 285 - i * 12;
    await drag(page, [[40, y], [130, y - 10]], { steps: 5 });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(700);
  const mid = await state(page);
  await page.screenshot({ path: `${OUT}/C1-fixloop.png` });
  check('C: Càng Sửa Càng Sai event fired', (mid.events.fixLoop ?? 0) > 0, JSON.stringify(mid.events));
  check('C: left side much shorter than right', mid.metrics.zone.left < mid.metrics.zone.right - 0.25, `L=${mid.metrics.zone.left.toFixed(2)} R=${mid.metrics.zone.right.toFixed(2)}`);
  const end = await finishAndWait(page);
  await page.screenshot({ path: `${OUT}/C2-result.png` });
  check('C: caption mentions repeated fixing', /sửa/i.test(end.result.caption), end.result.caption);
  check('C: style reflects lopsided cut', ['halfhalf', 'undercut', 'science', 'onepatch'].includes(end.result.style.id), end.result.style.name);
  check('C: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Scenario D: hair dryer on gelled hair ---------------- */
{
  const { page, ctx, errors } = await newGame();
  await start(page, 'khoa');
  await page.click('[data-testid=tool-dryer]');
  const before = await state(page);
  await drag(page, [[110, 200], [150, 150], [200, 140], [250, 150], [290, 200], [200, 160], [120, 230], [280, 230]], { steps: 25, pause: 200 });
  await page.waitForTimeout(500);
  const mid = await state(page);
  await page.screenshot({ path: `${OUT}/D1-spikes.png` });
  check('D: dryer turns gel into spikes', mid.spiked > before.spiked + 20, `spiked=${mid.spiked}`);
  check('D: Gió Đổi Chiều event fired', (mid.events.gelSpikes ?? 0) > 0);
  const end = await finishAndWait(page);
  await page.screenshot({ path: `${OUT}/D2-result.png` });
  check('D: spiky hairstyle name', ['saiyan', 'hedgehog', 'perfect-khoa'].includes(end.result.style.id), end.result.style.name);
  check('D: Khoa loves the drama', ['ecstatic', 'happy'].includes(end.result.mood), `${end.result.mood}: ${end.result.line}`);
  check('D: no console errors', errors.length === 0, errors.join(' | '));

  /* ---------------- Scenario E: replay is a clean slate ---------------- */
  await page.click('[data-testid=replay]');
  await page.waitForTimeout(300);
  const fresh = await state(page);
  check('E: replay resets hair', fresh.spiked === 0 && fresh.bald === 0 && Math.abs(fresh.totalLen - before.totalLen) < 0.01);
  check('E: replay resets chaos/events/result', fresh.chaos === 0 && Object.keys(fresh.events).length === 0 && fresh.result === null && fresh.phase === 'cutting');
  // Can't cut after finishing.
  await page.click('[data-testid=finish]');
  await page.waitForTimeout(200);
  const finished = await state(page);
  await drag(page, [[200, 150], [200, 300]], { steps: 5 });
  const after = await state(page);
  check('E: no cutting after round ended', Math.abs(after.totalLen - finished.totalLen) < 0.01);
  await page.click('[data-testid=mirror]');
  await page.click('[data-testid=next]');
  await page.waitForTimeout(200);
  const next = await state(page);
  check('E: next customer cycles', next.customer === 'linh' && next.phase === 'intro', next.customer);
  check('E: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Head turn: warning, then a stray cut if you keep going ---------------- */
{
  const { page, ctx, errors } = await newGame({ width: 1280, height: 800 }, { seed: 3 });
  await start(page, 'tuan');
  await page.evaluate(() => {
    const s = window.__tctbo.state();
    s.patience = 15; // restless customer
    s.nextTurnCheck = 0;
    s.rng = () => 0.1; // force the turn roll for a deterministic test
  });
  await page.click('[data-testid=tool-clipper]');
  const c = await toClient(page, 200, 160);
  await page.mouse.move(c.x, c.y);
  await page.waitForFunction(() => window.__tctbo.state().motion?.stage === 'warn', null, { timeout: 5000 });
  await page.screenshot({ path: `${OUT}/F1-turn-warning.png` });
  check('C-event: warning shown before head turn', true);
  // Player ignores the warning and holds the clipper on the head.
  await page.mouse.down();
  await page.waitForFunction(() => window.__tctbo.state().motion?.stage === 'act', null, { timeout: 3000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${OUT}/F2-turn-stray.png` });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const s = await state(page);
  check('C-event: head turn under running clipper causes stray cut', (s.events.strayCut ?? 0) > 0 && s.bald > 0, JSON.stringify(s.events));
  check('C-event: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}


/* ---------------- Bộ Đồ Nghề Bất Ổn: locks and unlocks ---------------- */
{
  const { page, ctx, errors } = await newGame();
  await start(page, 'tuan');
  const locked = await page.getAttribute('[data-testid=tool-wand]', 'data-locked');
  check('Gear: new player has magic tools locked', locked === 'true');
  await page.click('[data-testid=tool-wand]');
  const info = await page.textContent('[data-testid=tool-info]');
  const tool = (await state(page)).tool;
  check('Gear: clicking a locked tool shows how to unlock, does not equip it', /Mở khóa/.test(info) && tool !== 'wand', info);
  const soon = await page.textContent('[data-testid=tool-stamp]');
  check('Gear: unimplemented tools are marked "Sắp có"', /Sắp có/.test(soon), soon);
  // The game is fully playable with basic tools only.
  await page.click('[data-testid=tool-scissors]');
  await drag(page, [[120, 214], [280, 214]], { steps: 8 });
  const end = await finishAndWait(page);
  check('Gear: basic-only round still completes', end.phase === 'result');
  const unlocked = await page.textContent('[data-testid=new-tools]').catch(() => '');
  check('Gear: finishing a round unlocks Gậy Như Ý', /Gậy Như Ý/.test(unlocked), unlocked);
  await page.click('[data-testid=next]');
  await page.click('[data-testid=start]');
  check('Gear: unlock persists into the next customer', (await page.getAttribute('[data-testid=tool-wand]', 'data-locked')) === 'false');
  check('Gear: no console errors (locks)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Bộ Đồ Nghề Bất Ổn: every tool and combo ---------------- */
{
  const { page, ctx, errors } = await newGame({ width: 1280, height: 800 }, { unlockAll: true, seed: 5 });
  await start(page, 'khoa');
  await page.evaluate(() => {
    const s = window.__tctbo.state();
    s.nextTurnCheck = 1e9;
  });
  const len0 = (await state(page)).totalLen;
  await page.click('[data-testid=tool-wand]');
  for (const x of [110, 150, 200, 250, 290]) await drag(page, [[x, 190], [x, 90]], { steps: 10 });
  const w = await state(page);
  check('Gậy Như Ý: dragging up grows the hair', w.totalLen > len0 * 1.2, `${len0.toFixed(0)} -> ${w.totalLen.toFixed(0)}`);
  await page.screenshot({ path: `${OUT}/G1-wand.png` });
  await page.click('[data-testid=tool-storm]');
  await drag(page, [[90, 210], [250, 190]], { steps: 10 });
  await page.waitForTimeout(300);
  const g = await state(page);
  check('Combo Gậy + Bão fires on wand-grown hair', (g.events.comboStormLong ?? 0) === 1, JSON.stringify(g.events));
  await page.screenshot({ path: `${OUT}/G2-storm-combo.png` });
  await page.click('[data-testid=replay]').catch(() => {});
  await ctx.close();
}
{
  const { page, ctx, errors } = await newGame({ width: 1280, height: 800 }, { unlockAll: true, seed: 5 });
  await start(page, 'khoa');
  await page.evaluate(() => {
    window.__tctbo.state().nextTurnCheck = 1e9;
  });
  await page.click('[data-testid=tool-ray]');
  for (const [x, y] of [[150, 150], [200, 135], [250, 150]]) {
    const c = await toClient(page, x, y);
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(400);
  }
  const r = await page.evaluate(() => window.__tctbo.state().hair.tufts.filter((t) => t.tint).length);
  check('Súng Tóc 3000: shots dye hair', r >= 6, `${r} dyed tufts`);
  await page.click('[data-testid=tool-comb]');
  await drag(page, [[130, 130], [200, 105], [270, 130]], { steps: 20 });
  await page.waitForTimeout(200);
  const k = await state(page);
  check('Combo Súng + Lược: dyed hair combed into a horn', (k.events.comboSculpt ?? 0) === 1, JSON.stringify(k.events));
  await page.screenshot({ path: `${OUT}/G3-unicorn.png` });
  await page.click('[data-testid=tool-cooker]');
  let c = await toClient(page, 200, 150);
  await page.mouse.click(c.x, c.y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/G4-pot.png` });
  await page.waitForTimeout(1100);
  const steamed = await page.evaluate(() => window.__tctbo.state().metrics.steamedFrac);
  check('Nồi Cơm Điện: hair is steamed and puffed', steamed > 0.3, steamed.toFixed(2));
  await page.click('[data-testid=tool-vacuum]');
  c = await toClient(page, 170, 150);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const v = await state(page);
  check('Combo Nồi Cơm + Máy Hút: steamed bun sucked in', (v.events.comboPotSuck ?? 0) === 1 && v.bald > 0, JSON.stringify(v.events));
  await page.screenshot({ path: `${OUT}/G5-potsuck.png` });
  // Switching tools in the middle of a storm aim must not fire it.
  await page.click('[data-testid=tool-storm]').catch(() => {});
  const lean0 = (await state(page)).metrics.leanAvg;
  const a = await toClient(page, 90, 210);
  const b = await toClient(page, 300, 210);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 6 });
  await page.keyboard.press('2');
  await page.mouse.up();
  const sw = await state(page);
  check('Switching tool mid-aim cancels the gust', Math.abs(sw.metrics.leanAvg - lean0) < 1e-6 && sw.tool === 'scissors');
  const end = await finishAndWait(page);
  await page.screenshot({ path: `${OUT}/G6-result.png` });
  check('Magic round ends with a result card', end.phase === 'result' && !!end.result.style.name, end.result.style.name);
  await page.click('[data-testid=replay]');
  await page.waitForTimeout(200);
  const fresh = await page.evaluate(() => {
    const s = window.__tctbo.state();
    return {
      dirty: s.hair.tufts.some((t) => t.tint || t.thick !== 1 || t.curl || t.sculpt || t.steamed || t.bald),
      combos: Object.keys(s.combos).length,
      charge: Math.min(...Object.values(s.gear).map((g) => g.charge)),
    };
  });
  check('Replay resets magic hair, combos and energy', !fresh.dirty && fresh.combos === 0 && fresh.charge === 1, JSON.stringify(fresh));
  check('Gear: no console errors (magic)', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
{
  const { page, ctx, errors } = await newGame({ width: 390, height: 844 }, { unlockAll: true, touch: true });
  await page.click('[data-testid=start]');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check('Gear(phone): no page overflow with the full toolbar', !overflow);
  const scrolls = await page.evaluate(() => {
    const el = document.querySelector('.tool-scroll');
    return el.scrollWidth > el.clientWidth;
  });
  check('Gear(phone): tools scroll sideways instead of squeezing', scrolls);
  const fin = await page.locator('[data-testid=finish]').boundingBox();
  check('Gear(phone): Xong button stays visible', fin && fin.x + fin.width <= 390 && fin.y + fin.height <= 844, JSON.stringify(fin));
  await page.locator('[data-testid=tool-cooker]').scrollIntoViewIfNeeded();
  await page.tap('[data-testid=tool-cooker]');
  await page.waitForTimeout(200);
  const pressed = await page.getAttribute('[data-testid=tool-cooker]', 'aria-pressed');
  const infoName = await page.textContent('[data-testid=tool-info-name]');
  check('Gear(phone): tapping a magic tool equips it', (await state(page)).tool === 'cooker' && pressed === 'true' && /Nồi Cơm/.test(infoName), infoName);
  await page.screenshot({ path: `${OUT}/G7-phone-toolbar.png` });
  check('Gear(phone): no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Distinct customers + Gương Thần Biến Hình ---------------- */
{
  const { page, ctx, errors } = await newGame();
  const ids = await page.$$eval('[data-testid^=pick-]', (els) => els.map((e) => e.dataset.testid.slice(5)));
  check('Roster: the alien customer is gone', !ids.includes('alien'), ids.join(','));
  // Every customer is drawn from their own skull: head sizes must differ across the roster.
  const heads = new Set();
  for (const id of ids) {
    await page.click(`[data-testid=pick-${id}]`);
    const h = await page.evaluate(() => window.__tctbo.state().hair.head);
    heads.add(`${h.rx}x${h.ry}@${h.cy}`);
  }
  check('Roster: customers have different head shapes', heads.size >= ids.length - 2, `${heads.size} shapes for ${ids.length}`);
  await page.click('[data-testid=pick-hoathan]');
  await page.click('[data-testid=start]');
  const want = await page.evaluate(() => window.__tctbo.state().wantPersona);
  await page.click('[data-testid=guong-than]');
  await page.waitForSelector('[data-testid=mirror-picker]');
  check('Gương Thần: picker shows 6 personas', (await page.locator('[data-testid^=persona-]').count()) === 6);
  await page.screenshot({ path: `${OUT}/G1-mirror-picker.png` });
  await page.click(`[data-testid=persona-${want}]`);
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => {
    const s = window.__tctbo.state();
    return { persona: s.persona, collar: s.customer.look.body?.collar, ev: s.events.transform ?? 0 };
  });
  check('Gương Thần: choosing a persona transforms the customer', st.persona === want && st.ev === 1 && !!st.collar, JSON.stringify(st));
  check('Gương Thần: only once per customer', await page.isDisabled('[data-testid=guong-than]'));
  await page.screenshot({ path: `${OUT}/G2-transformed.png` });
  await page.click('[data-testid=finish]');
  await page.waitForTimeout(300);
  await page.click('[data-testid=mirror]');
  await page.waitForSelector('[data-testid=card-img]');
  const name = await page.textContent('[data-testid=style-name]');
  check('Gương Thần: result card names the persona version', /· Bản /.test(name), name);
  await page.screenshot({ path: `${OUT}/G3-result.png` });
  check('Gương Thần: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
{
  const { page, ctx, errors } = await newGame({ width: 390, height: 844 }, { touch: true });
  await page.tap('[data-testid=start]');
  await page.tap('[data-testid=guong-than]');
  await page.waitForSelector('[data-testid=mirror-picker]');
  const fits = await page.evaluate(() => {
    const r = document.querySelector('[data-testid=mirror-picker]').getBoundingClientRect();
    return r.left >= 0 && r.right <= window.innerWidth && document.documentElement.scrollWidth <= window.innerWidth + 1;
  });
  check('Gương Thần (phone): picker fits the screen', fits);
  await page.screenshot({ path: `${OUT}/G4-phone-picker.png` });
  await page.tap('[data-testid=persona-idol]');
  check('Gương Thần (phone): tap transforms', (await page.evaluate(() => window.__tctbo.state().persona)) === 'idol');
  check('Gương Thần (phone): no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Responsive / touch ---------------- */
for (const vp of [
  { width: 390, height: 844, name: 'phone' },
  { width: 768, height: 1024, name: 'tablet' },
  { width: 1440, height: 900, name: 'desktop' },
]) {
  const { page, ctx, errors } = await newGame(vp, { touch: vp.name === 'phone' });
  await page.screenshot({ path: `${OUT}/R-${vp.name}-intro.png` });
  await page.click('[data-testid=start]');
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(`R(${vp.name}): no horizontal overflow`, !overflow);
  const tb = await page.locator('[data-testid=finish]').boundingBox();
  check(`R(${vp.name}): toolbar visible`, tb && tb.y + tb.height <= vp.height + 1, JSON.stringify(tb));
  if (vp.name === 'phone') {
    // Real touch input: tap-drag the scissors across the fringe.
    await page.tap('[data-testid=tool-scissors]');
    const a = await toClient(page, 120, 212);
    const b = await toClient(page, 280, 212);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + ((b.x - a.x) * i) / 10, y: a.y }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(200);
    const s = await state(page);
    check('R(phone): touch drag cuts hair', s.metrics.zone.fringe < 0.95, `fringe=${s.metrics.zone.fringe.toFixed(2)}`);
  }
  await page.screenshot({ path: `${OUT}/R-${vp.name}-play.png` });
  await page.click('[data-testid=finish]');
  await page.waitForTimeout(400);
  await page.click('[data-testid=mirror]');
  await page.waitForSelector('[data-testid=card-img]');
  await page.screenshot({ path: `${OUT}/R-${vp.name}-result.png`, fullPage: false });
  check(`R(${vp.name}): no console errors`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed. Screenshots: ${OUT}`);
process.exit(failures ? 1 : 0);
