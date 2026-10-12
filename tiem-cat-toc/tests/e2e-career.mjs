// Sandbox playtest: several days through the real UI, shop, save/reload, settings, Cậu Vàng.
// Usage: npm run dev, then `npm run e2e:career` (BASE_URL to override).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173/';
const OUT = process.env.SHOTS ?? path.resolve('test-results');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
const results = [];
let failures = 0;
function check(name, cond, detail = '') {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!cond) failures++;
}

async function open(url, viewport = { width: 1280, height: 800 }, touch = false) {
  const ctx = await browser.newContext({ viewport, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  return { ctx, page, errors };
}

const career = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__tctbo.career())));
const round = (page) => page.evaluate(() => {
  const s = window.__tctbo.state();
  return { phase: s.phase, customer: s.customer.id, tool: s.tool, events: { ...s.events }, nerves: s.nerves, unlocked: s.unlocked };
});

async function toClient(page, x, y) {
  return page.evaluate(([x, y]) => {
    const svg = document.querySelector('[data-testid=stage]');
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const r = pt.matrixTransform(svg.getScreenCTM());
    return { x: r.x, y: r.y };
  }, [x, y]);
}

/** Serve the current customer: a quick trim across the fringe, then finish. */
async function serveOne(page) {
  await page.waitForSelector('[data-testid=start]');
  await page.click('[data-testid=start]');
  await page.click('[data-testid=tool-scissors]');
  const a = await toClient(page, 110, 232);
  const b = await toClient(page, 290, 232);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 10 });
  await page.mouse.up();
  if (await page.locator('[data-testid=beg]').count()) await page.click('[data-testid=beg]');
  if ((await round(page)).phase === 'cutting') await page.click('[data-testid=finish]');
  await page.waitForSelector('[data-testid=mirror]');
  await page.click('[data-testid=mirror]');
  await page.waitForSelector('[data-testid=next]');
}

async function playDay(page) {
  for (let i = 0; i < 8; i++) {
    await serveOne(page);
    const label = await page.textContent('[data-testid=next]');
    await page.click('[data-testid=next]');
    if (/Đóng cửa/.test(label)) break;
  }
  await page.waitForSelector('[data-testid=summary]');
}

/* ---------------- 3 days, shop, persistence ---------------- */
{
  const { ctx, page, errors } = await open(`${BASE}?fresh=1&seed=4`);
  await page.waitForSelector('[data-testid=morning]');
  const c0 = await career(page);
  check('Career: day 1 starts with a planned queue', c0.day === 1 && c0.today.queue.length >= 3, `queue=${c0.today.queue.length}`);
  await page.screenshot({ path: `${OUT}/K1-morning.png` });
  check('Cấp tiệm: the morning shows the shop level and what comes next', (await page.locator('[data-testid=level-card]').count()) === 1 && (await page.getAttribute('[data-testid=hud-level]', 'data-value')) === '1');
  check('Cuốn mẫu: no catalog orders before buying a creative tool', !c0.today.queue.some((q) => q.reason === 'design') && (await page.locator('[data-testid=catalog-tip]').count()) === 1);
  const q0 = (await career(page)).today.queue.length;
  await page.click('[data-testid=promo]');
  const cp = await career(page);
  check('Khuyến mãi: two more walk-ins, and the button turns into a notice', cp.today.promo === true && cp.today.queue.length === q0 + 2 && (await page.locator('[data-testid=promo-on]').count()) === 1);
  check('Ngày đầu: the morning shows tips and the round is gentler', (await page.locator('[data-testid=day-tips] li').count()) === 3 && (await page.evaluate(() => window.__tctbo.state().ease)) === 1);
  check('Nhiệm vụ: the morning shows today\'s goals', (await page.locator('[data-testid=quests] li').count()) === 3 && c0.today.quests.length === 3);
  await page.click('[data-testid=open-day]');
  await playDay(page);
  await page.screenshot({ path: `${OUT}/K2-summary-day1.png` });
  const c1 = await career(page);
  check('Nhiệm vụ: goals are listed on the evening summary', (await page.locator('[data-testid=summary] [data-testid=quests] li').count()) === 3);
  check('Career: day 1 ledger has revenue and costs', c1.lastSummary && c1.lastSummary.costs.length >= 2 && c1.lastSummary.served.length >= 3, `net=${c1.lastSummary?.net}`);
  check('Career: reputation moved from real results', c1.rep !== 50, `rep=${c1.rep}`);
  // Creative loop: save a finished cut to the catalog, and a customer orders it on an even day.
  await page.evaluate(() => {
    localStorage.setItem('tctbo-coach', '4');
    const s = window.__tctbo.state();
    const c = {
      id: 'e2e',
      name: 'Mẫu Số Một',
      caption: '',
      customer: s.baseCustomer.id,
      persona: null,
      tufts: s.hair.tufts.map((t) => [t.len, t.bald ? 1 : 0, t.spiked ? 1 : 0, t.tint, t.lean, t.fluff, t.thick, t.curl, t.gel, null, null]),
      carvings: [],
      photo: { mood: 'happy', bg: 'salon', frame: 'none', stickers: [] },
      at: Date.now(),
    };
    localStorage.setItem('tctbo-studio-book', JSON.stringify([c]));
  });
  check('Xưởng Tạo Kiểu đã bỏ: no studio button after closing', (await page.locator('[data-testid=summary-studio]').count()) === 0);
  // Reach shop level 2 and buy the Cọ Nhuộm this evening: customers start ordering tomorrow.
  await page.evaluate(() => {
    window.__tctbo.career().money += 400000;
    window.__tctbo.career().xp = 80;
  });
  await page.click('[data-testid=summary-shop]');
  await page.click('[data-testid=buy-brush]');
  await page.click('[data-testid=close-shop]');
  check('Cuốn mẫu: buying the brush does not change today', !(await career(page)).today.queue.some((q) => q.reason === 'design'));
  await page.click('[data-testid=summary-book]');
  await page.waitForSelector('[data-testid=book-item]');
  check('Cuốn mẫu: opens from the evening summary', (await page.locator('[data-testid=book-item]').count()) === 1);
  await page.click('[data-testid=book-close]');
  await page.click('[data-testid=next-day]');
  await page.waitForSelector('[data-testid=morning]');
  const qd = (await career(page)).today.queue.filter((x) => x.reason === 'design' && x.designId === 'e2e');
  check('Cuốn mẫu: on day 2 a customer orders the saved design', qd.length === 1, JSON.stringify(qd));
  // Day 2: give the shop some money, buy a tool and check it really appears in the toolbar.
  await page.evaluate(() => {
    window.__tctbo.career().money += 400000;
  });
  await page.click('[data-testid=morning-shop]');
  await page.click('[data-testid=buy-wand]');
  await page.click('[data-testid=shop-tab-decor]');
  await page.click('[data-testid=buy-plant]');
  await page.screenshot({ path: `${OUT}/K3-shop.png` });
  await page.click('[data-testid=close-shop]');
  const c2 = await career(page);
  check('Shop: buying Gậy Như Ý spends money and owns it', c2.owned.includes('wand'), `money=${c2.money}`);
  await page.click('[data-testid=open-day]');
  await page.waitForSelector('[data-testid=start]');
  check('Đồ nghề sáng tạo: the bought brush is in the toolbar', (await page.getAttribute('[data-testid=tool-brush]', 'data-locked')) === 'false');
  check('Tường tác phẩm: the saved design hangs on the wall', (await page.locator('[data-decor^=work-]').count()) === 1);
  check('Đồ mua về: the plant now stands in the shop', (await page.locator('[data-decor=plant]').count()) === 1);
  check('Nhiệm vụ: HUD shows goal progress', (await page.locator('[data-testid=hud-quests]').count()) === 1);
  check('Shop: the bought tool is in the toolbar and usable', (await page.getAttribute('[data-testid=tool-wand]', 'data-locked')) === 'false' && (await round(page)).unlocked.includes('wand'));
  await playDay(page);
  await page.click('[data-testid=next-day]');
  await page.waitForSelector('[data-testid=morning]');
  await page.click('[data-testid=open-day]');
  await playDay(page);
  const c3 = await career(page);
  check('Career: played 3 full days', c3.stats.days >= 3 && c3.day === 3, `days=${c3.stats.days} day=${c3.day} served=${c3.stats.served}`);
  // Reload: everything must still be there.
  const before = await career(page);
  await page.goto(`${BASE}?seed=4`); // a normal reload (no ?fresh)
  await page.waitForSelector('[data-testid=summary], [data-testid=morning], [data-testid=start]');
  const after = await career(page);
  check('Save: day, money, rep, owned tools survive a reload', after.day === before.day && after.money === before.money && after.rep === before.rep && after.owned.includes('wand'), `day=${after.day} money=${after.money}`);
  await page.click('[data-testid=next-day]');
  await page.waitForSelector('[data-testid=morning]');
  check('Career: day 4 morning after reload', (await career(page)).day === 4);
  // Reset needs confirmation.
  await page.click('[data-testid=open-settings]');
  await page.click('[data-testid=reset]');
  check('Settings: reset asks for confirmation first', (await career(page)).day === 4);
  await page.click('[data-testid=reset-confirm]');
  await page.waitForSelector('[data-testid=morning]');
  const fresh = await career(page);
  check('Settings: confirmed reset starts again at day 1', fresh.day === 1 && fresh.owned.length === 0);
  check('Career: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Khách tùy thợ: no outline, taste checklist, loved cut goes to the catalog ---------------- */
{
  const { ctx, page, errors } = await open(`${BASE}?fresh=1&seed=4`);
  await page.evaluate(() => localStorage.setItem('tctbo-coach', '4'));
  await page.waitForSelector('[data-testid=morning]');
  await page.click('[data-testid=open-day]');
  await serveOne(page);
  await page.evaluate(() => {
    window.__tctbo.career().today.queue[1] = { customer: 'tuan', reason: 'freestyle', note: 'Tùy thợ', tasteId: 'gon' };
  });
  await page.click('[data-testid=next]');
  await page.waitForSelector('[data-testid=start]');
  check('Tùy thợ: the request card names the taste', /Khách tùy thợ · Gu Gọn Gàng/.test(await page.textContent('[data-testid=request-card]')));
  check('Tùy thợ: no outline toggle (no picture to follow)', (await page.locator('[data-testid=ghost-toggle]').count()) === 0);
  await page.click('[data-testid=start]');
  await page.waitForSelector('[data-testid=taste-score]');
  const v0 = Number(await page.getAttribute('[data-testid=taste-score]', 'data-value'));
  await page.evaluate(() => {
    const s = window.__tctbo.state();
    const z = { left: 0.5, right: 0.5, top: 0.6, fringe: 0.5 };
    for (const t of s.hair.tufts) if (!t.bald) t.len = t.origLen * z[t.zone];
    s.nextTurnCheck = 1e9;
    s.nextBehaviorAt = 1e9;
  });
  // One small snip so the round re-measures the hair.
  await page.click('[data-testid=tool-scissors]');
  const a = await toClient(page, 60, 120);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 5, a.y + 2, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const v1 = Number(await page.getAttribute('[data-testid=taste-score]', 'data-value'));
  check('Tùy thợ: live "Hợp gu" score rises with a fitting cut', v1 > v0 && v1 >= 80, `${v0} → ${v1}`);
  await page.screenshot({ path: `${OUT}/K5-freestyle.png` });
  await page.click('[data-testid=finish]');
  await page.waitForSelector('[data-testid=mirror]');
  await page.click('[data-testid=mirror]');
  await page.waitForSelector('[data-testid=next]');
  check('Tùy thợ: a loved cut is saved into the catalog', (await page.locator('[data-testid=design-saved]').count()) === 1);
  const book = await page.evaluate(() => JSON.parse(localStorage.getItem('tctbo-studio-book') ?? '[]'));
  const c = await career(page);
  check('Tùy thợ: the catalog has it and tomorrow orders it first', book.length === 1 && /Gọn Gàng/.test(book[0].name) && c.freshDesign === book[0].id, JSON.stringify(book.map((b) => b.name)));
  check('Tùy thợ: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Tiệm của riêng bạn + thách bạn bè ---------------- */
{
  const { ctx, page, errors } = await open(`${BASE}?fresh=1&seed=4`);
  await page.evaluate(() => {
    localStorage.setItem('tctbo-coach', '4');
    const s = window.__tctbo.state();
    const c = {
      id: 'e2e-ch',
      name: 'Mẫu Thách Đấu',
      caption: '',
      customer: s.baseCustomer.id,
      persona: null,
      tufts: s.hair.tufts.map((t, i) => [t.zone === 'top' ? t.len : t.len * 0.5, t.bald ? 1 : 0, 0, i % 3 === 0 ? '#ff3fa4' : null, 0, 0, 1, 0, 0, null, null]),
      carvings: [],
      photo: { mood: 'happy', bg: 'salon', frame: 'none', stickers: [] },
      at: Date.now(),
    };
    localStorage.setItem('tctbo-studio-book', JSON.stringify([c]));
    const car = window.__tctbo.career();
    car.owned.push('plant', 'award');
    car.trophies = [{ day: 4, theme: 'Mùa Hè Rực Rỡ', rank: 1, label: 'Giải Nhất' }];
  });
  await page.click('[data-testid=morning-look]');
  await page.waitForSelector('[data-testid=look-panel]');
  await page.fill('[data-testid=look-name]', 'Tiệm Tóc Cô Ba');
  await page.click('[data-testid=look-name-save]');
  await page.click('[data-testid=look-wall-pink]');
  await page.click('[data-testid=look-sign-gold]');
  // Tap-tap: move the plant to the first slot.
  await page.click('[data-testid=look-slot-plant]');
  await page.click('[data-testid=look-slot-trophies]');
  const slots = await page.$$eval('[data-testid=look-wall] li', (els) => els.map((e) => e.getAttribute('data-testid')));
  check('Trang trí: tap-tap moves a wall item', slots.indexOf('look-slot-plant') < slots.indexOf('look-slot-award'), slots.join(','));
  await page.click('[data-testid=look-hide-award]');
  await page.screenshot({ path: `${OUT}/K6-look-panel.png` });
  await page.click('[data-testid=look-close]');
  check('Trang trí: the sign shows the shop name', (await page.textContent('[data-testid=shop-name]')) === 'TIỆM TÓC CÔ BA' || (await page.textContent('[data-testid=shop-name]')) === 'Tiệm Tóc Cô Ba');
  const wall = await page.evaluate(() => getComputedStyle(document.querySelector('.app')).getPropertyValue('--wall').trim());
  check('Trang trí: wall paint applied', wall === '#f8d3e2', wall);
  const look = (await career(page)).look;
  check('Trang trí: saved with the career', look && look.wall === 'pink' && look.sign === 'gold' && look.hidden.includes('award'), JSON.stringify(look));
  // Thách bạn bè: make a link from the catalog (open from the morning).
  await page.click('[data-testid=morning-book]');
  await page.waitForSelector('[data-testid=book-item]');
  await page.click('[data-testid=book-challenge]');
  const link = await page.inputValue('[data-testid=challenge-link] input');
  check('Thách bạn bè: the catalog makes a link', /\?challenge=[A-Za-z0-9_-]+$/.test(link), link.slice(0, 80));
  await page.click('[data-testid=book-close]');
  await page.click('[data-testid=open-day]');
  await page.waitForSelector('[data-testid=start]');
  check('Trang trí: hidden item is off the wall, trophies are on it', (await page.locator('[data-decor=award]').count()) === 0 && (await page.locator('[data-decor=trophies]').count()) === 1);
  check('Cấp tiệm: plaque on the wall', (await page.getAttribute('[data-testid=level-plaque]', 'data-level')) === '1');
  await page.screenshot({ path: `${OUT}/K7-own-shop.png` });
  await page.goto(link);
  await page.waitForSelector('[data-testid=start]');
  await page.click('[data-testid=start]');
  await page.waitForSelector('[data-testid=challenge-banner]');
  check('Thách bạn bè: the link opens the friend\'s design to copy', (await page.locator('[data-testid=design-score]').count()) === 1 && /Mẫu Thách Đấu/.test(await page.textContent('[data-testid=challenge-banner]')));
  await page.click('[data-testid=finish]');
  await page.waitForSelector('[data-testid=mirror]');
  await page.click('[data-testid=mirror]');
  await page.waitForSelector('[data-testid=challenge-score]');
  check('Thách bạn bè: the result shows how close you got', /Bạn đạt \d+%/.test(await page.textContent('[data-testid=challenge-score]')));
  check('Trang trí & thách: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Mở rộng tiệm, thợ phụ, thành tựu ---------------- */
{
  const { ctx, page, errors } = await open(`${BASE}?fresh=1&seed=4`);
  await page.evaluate(() => {
    localStorage.setItem('tctbo-coach', '4');
    const c = window.__tctbo.career();
    c.xp = 450;
    c.money = 5000000;
  });
  await page.click('[data-testid=morning-shop]');
  await page.click('[data-testid=shop-tab-room]');
  await page.click('[data-testid=buy-washRoom]');
  await page.click('[data-testid=shop-tab-staff]');
  await page.click('[data-testid=buy-assistant]');
  await page.click('[data-testid=close-shop]');
  const c0 = await career(page);
  check('Mở rộng: rooms and the thợ phụ can be bought', c0.owned.includes('washRoom') && c0.owned.includes('assistant'));
  await page.evaluate(() => {
    window.__tctbo.career().today.queue[0] = { customer: 'linh', reason: 'walkin', note: 'Khách vãng lai' };
  });
  await page.click('[data-testid=open-day]');
  await page.waitForSelector('[data-testid=assistant]');
  check('Thợ phụ: the intro offers to hand a walk-in over', /Bé Tư/.test(await page.textContent('[data-testid=assistant]')));
  check('Mở rộng: the rooms show in the shop', (await page.locator('[data-room=washRoom]').count()) === 1);
  await page.click('[data-testid=assistant]');
  await page.waitForSelector('[data-testid=mirror]');
  await page.click('[data-testid=mirror]');
  await page.waitForSelector('[data-testid=assistant-result]');
  const c1 = await career(page);
  check('Thợ phụ: she cut the customer and learned from it', c1.assistant && c1.assistant.jobs === 1 && c1.today.served[0].byAssistant === true);
  await page.click('[data-testid=next]');
  await page.waitForSelector('[data-testid=start]');
  check('Thợ phụ: only one hand-over a day at first', (await page.locator('[data-testid=assistant]').count()) === 0);
  check('Mở rộng & thợ phụ: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
{
  const { ctx, page, errors } = await open(`${BASE}?fresh=1&seed=4`);
  await page.evaluate(() => {
    localStorage.setItem('tctbo-coach', '4');
    window.__tctbo.career().achievements = ['first10', 'week'];
  });
  await page.click('[data-testid=morning-achievements]');
  await page.waitForSelector('[data-testid=achievements-panel]');
  check('Thành tựu: the list shows done and pending goals', (await page.getAttribute('[data-testid=ach-first10]', 'data-done')) === 'true' && (await page.getAttribute('[data-testid=ach-served50]', 'data-done')) === 'false');
  await page.click('[data-testid=title-week]');
  await page.click('[data-testid=achievements-close]');
  check('Thành tựu: the chosen title hangs under the sign', (await page.textContent('[data-testid=shop-title]')) === 'Chủ Tiệm Kiên Cường');
  await page.screenshot({ path: `${OUT}/K8-title.png` });
  check('Thành tựu: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Gương Thần ngẫu nhiên + phụ kiện tóc ---------------- */
{
  const { ctx, page, errors } = await open(`${BASE}?fresh=1&seed=4`);
  await page.evaluate(() => {
    localStorage.setItem('tctbo-coach', '4');
    const c = window.__tctbo.career();
    c.owned.push('mirror', 'accessoryBox');
    c.today.queue[0] = { customer: 'tuan', reason: 'walkin', note: 'Khách vãng lai' };
  });
  await page.click('[data-testid=open-day]');
  await page.click('[data-testid=start]');
  await page.evaluate(() => {
    const s = window.__tctbo.state();
    s.nextTurnCheck = 1e9;
    s.nextBehaviorAt = 1e9;
  });
  await page.click('[data-testid=guong-than]');
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => {
    const s = window.__tctbo.state();
    return { persona: s.persona, mood: s.personaMood, spins: s.mirrorSpins };
  });
  check('Gương Thần ở tiệm: one tap, random persona, no picker', !!r.persona && (await page.locator('[data-testid=mirror-picker]').count()) === 0, JSON.stringify(r));
  check('Gương Thần ở tiệm: the customer loves it or hates it', r.mood === 'fan' || r.mood === 'hater', r.mood);
  check('Gương Thần ở tiệm: used up for this customer', await page.isDisabled('[data-testid=guong-than]'));
  await page.click('[data-testid=accessories]');
  await page.waitForSelector('[data-testid=accessory-picker]');
  await page.click('[data-testid=acc-crown]');
  const acc = await page.evaluate(() => {
    const s = window.__tctbo.state();
    return { acc: s.accessory, hat: s.customer.look.hat, persona: s.persona };
  });
  check('Phụ kiện: the crown sits on the (transformed) customer', acc.acc === 'crown' && acc.hat === 'crown' && acc.persona === r.persona, JSON.stringify(acc));
  await page.screenshot({ path: `${OUT}/K9-mirror-acc.png` });
  check('Gương Thần & phụ kiện: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Sound settings: volume and mute persist ---------------- */
{
  const { ctx, page, errors } = await open(`${BASE}?fresh=1&seed=4`);
  await page.waitForSelector('[data-testid=open-day]');
  await page.click('[data-testid=open-settings]');
  check('Settings: no voice-over slider any more', (await page.locator('[data-testid=vol-voice]').count()) === 0);
  await page.locator('[data-testid=vol-sfx]').fill('0.3');
  await page.check('[data-testid=mute]');
  await page.goto(`${BASE}?seed=4`);
  await page.waitForSelector('[data-testid=start], [data-testid=morning]');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tctbo-audio')));
  check('Settings: volume and mute persist after reload', saved.muted === true && Math.abs(saved.sfx - 0.3) < 0.01, JSON.stringify(saved));
  const voiceReq = [];
  page.on('request', (r) => r.url().includes('/voice/') && voiceReq.push(r.url()));
  await page.click('[data-testid=start], [data-testid=open-day]');
  await page.waitForTimeout(1500);
  check('No voice files are requested', voiceReq.length === 0, voiceReq.join(' '));
  check('Settings: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Cậu Vàng in the browser ---------------- */
{
  const { ctx, page, errors } = await open(`${BASE}?mode=free&seed=4`);
  await page.click('[data-testid=pick-vang]');
  await page.click('[data-testid=start]');
  await page.screenshot({ path: `${OUT}/V1-vang.png` });
  await page.click('[data-testid=tool-clipper]');
  const p = await toClient(page, 200, 335);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForFunction(() => (window.__tctbo.state().events.dogShake ?? 0) >= 1, null, { timeout: 15000 }).catch(() => {});
  await page.mouse.up();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/V2-vang-shake.png` });
  const r = await round(page);
  check('Cậu Vàng: a buzzing clipper makes him shake fur everywhere', (r.events.dogShake ?? 0) >= 1, JSON.stringify(r.events));
  await page.click('[data-testid=tool-dryer]');
  const before = (await round(page)).nerves;
  const d = await toClient(page, 200, 140);
  await page.mouse.move(d.x, d.y);
  await page.mouse.down();
  await page.waitForTimeout(2500);
  await page.mouse.up();
  const after = (await round(page)).nerves;
  check('Cậu Vàng: the dryer calms him down', after < before, `${before.toFixed(0)} -> ${after.toFixed(0)}`);
  await page.screenshot({ path: `${OUT}/V3-vang-dryer.png` });
  check('Cậu Vàng: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ---------------- Phone layout of the career panels ---------------- */
{
  const { ctx, page, errors } = await open(`${BASE}?fresh=1&seed=4`, { width: 390, height: 844 }, true);
  await page.waitForSelector('[data-testid=morning]');
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check('Phone: morning panel fits', !(await overflow()));
  await page.screenshot({ path: `${OUT}/P1-phone-morning.png` });
  await page.tap('[data-testid=morning-shop]');
  check('Phone: shop fits', !(await overflow()));
  await page.screenshot({ path: `${OUT}/P2-phone-shop.png` });
  await page.tap('[data-testid=close-shop]');
  await page.tap('[data-testid=open-day]');
  await serveOne(page);
  check('Phone: result panel fits', !(await overflow()));
  check('Phone: no console errors', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} checks passed. Screenshots: ${OUT}`);
process.exit(failures ? 1 : 0);
