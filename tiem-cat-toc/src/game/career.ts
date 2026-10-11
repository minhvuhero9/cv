import { CUSTOMERS, CustomerDef, customerById } from './customers';
import { STYLE_RULES } from './evaluate';
import { clamp } from './geometry';
import { HairState, Tuft, createHair } from './hair';
import { makeRng, pick } from './rng';
import { CONTESTS, contestPrize, tasteById, tasteDesignName, tastesFor } from './freestyle';
import { STORIES, StoryProgress, storyById } from './stories';
import type { RoundContext, RoundState } from './session';
import { ELECTRIC, MACHINES, SHOP, ShopItem, shopItem } from './shop';
import { TOOLS, ToolId } from './tools';
import { Quest, planQuests, settleQuests, updateQuests } from './quests';
import { LEVELS, levelFor, xpFor } from './level';
import { TEMPLATES, templateReady } from './templates';

/**
 * Chế độ Mở Tiệm: the multi-day shop simulation. Pure functions over CareerState so the
 * whole loop (plan day → serve → close → shop → next day) is testable without a browser.
 */

export const CAREER_VERSION = 1;
export const START_MONEY = 200000;
export const BASE_RENT = 60000;
export const BASE_CUSTOMERS = 3;
/** Viral gained from one customer that turns their hairstyle into tomorrow's trend. */
export const VIRAL_TREND = 6;

export type QueueReason = 'walkin' | 'return' | 'loyal' | 'copycat' | 'vip' | 'boss' | 'design' | 'freestyle' | 'story' | 'contest';

export interface QueueEntry {
  customer: string;
  reason: QueueReason;
  note: string;
  wantStyle?: string | null;
  /** Cuốn mẫu: id of the saved creation they ordered… */
  designId?: string;
  /** …or the built-in template. */
  templateId?: string;
  /** Khách tùy thợ: their taste (freestyle.ts); contest days: the theme. */
  tasteId?: string;
  /** Khách có câu chuyện: story and chapter (stories.ts). */
  storyId?: string;
  storyStep?: number;
}

export interface DayEvent {
  id: string;
  title: string;
  /** Why it happens (always visible to the player). */
  cause: string;
  /** What it changes today. */
  effect: string;
}

export interface Served {
  customer: string;
  name: string;
  styleId: string;
  styleName: string;
  sat: number;
  tier: string;
  paid: number;
  tip: number;
  repDelta: number;
  viralDelta: number;
  walkedOut: boolean;
  reason: QueueReason;
  /** Goals completed by this round (labels). */
  quests?: string[];
  /** Ordered from the catalog: the creation id. */
  designId?: string;
  /** A freestyle cut the customer loved: the app saves it into the catalog. */
  saveDesign?: { name: string; caption: string };
  /** …and it was saved. */
  savedDesign?: boolean;
  /** Prize or story reward money (counted in the day's takings). */
  bonus?: number;
  story?: { title: string; text: string; passed: boolean; finished?: boolean };
  contest?: { theme: string; label: string; money: number };
  /** XP earned, and the level reached if this round levelled the shop up. */
  xp?: number;
  levelUp?: number;
}

export interface CostLine {
  label: string;
  amount: number;
}

export interface DaySummary {
  day: number;
  served: Served[];
  revenue: number;
  tips: number;
  costs: CostLine[];
  net: number;
  repDelta: number;
  viralDelta: number;
  moneyAfter: number;
  tomorrow: string[];
  /** How messy the shop was at closing (tomorrow's inspection). */
  mess: number;
  /** Today's goals as they ended, and the bonus money they paid. */
  quests?: Quest[];
  questMoney?: number;
  /** Contest prizes and story rewards. */
  bonusMoney?: number;
}

export interface Pending {
  customer: string;
  reason: QueueReason;
  day: number;
  note: string;
}

/** Compact hair snapshot (enough to rebuild the head of a returning customer). */
export type HairSnap = [number, number, number, string | null, number, number, number][];

export interface CareerState {
  v: number;
  day: number;
  money: number;
  rep: number;
  viral: number;
  owned: string[];
  stock: Record<string, number>;
  condition: Partial<Record<ToolId, number>>;
  /** Last visit per customer. */
  history: Record<string, { day: number; styleId: string; sat: number; tier: string }>;
  returnHair: Record<string, HairSnap>;
  pending: Pending[];
  /** A style that went viral yesterday (copycats want it). */
  viralStyle: { id: string; name: string; day: number; gain: number } | null;
  events: string[];
  styles: string[];
  stats: { served: number; walkouts: number; earned: number; days: number };
  /** Kinh nghiệm của tiệm (Cấp tiệm). Older saves start at 0. */
  xp?: number;
  /** Hạt giống riêng của tiệm: each new shop gets its own customers. Older saves: 0. */
  seed?: number;
  /** Catalog id of a design born yesterday from a freestyle cut (ordered first). */
  freshDesign?: string | null;
  /** Khách có câu chuyện: progress per story. */
  stories?: Record<string, StoryProgress>;
  /** Friends a finished story brings tomorrow. */
  bonusWalkins?: number;
  /** Cúp từ Cuộc thi tóc của phường. */
  trophies?: { day: number; theme: string; rank: number; label: string }[];
  today: {
    phase: 'morning' | 'open' | 'closed';
    queue: QueueEntry[];
    index: number;
    events: DayEvent[];
    served: Served[];
    mess: number;
    usage: Partial<Record<ToolId, number>>;
    repStart: number;
    viralStart: number;
    /** Nhiệm vụ trong ngày (older saves don't have them). */
    quests?: Quest[];
    /** Styles first collected today. */
    newStyles?: string[];
  };
  lastSummary: DaySummary | null;
}

export const vnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

export function newCareer(seed = 0): CareerState {
  const c: CareerState = {
    v: CAREER_VERSION,
    seed,
    day: 1,
    money: START_MONEY,
    rep: 50,
    viral: 10,
    owned: [],
    stock: {},
    condition: Object.fromEntries(MACHINES.map((m) => [m, 100])),
    history: {},
    returnHair: {},
    pending: [],
    viralStyle: null,
    events: [],
    styles: [],
    stats: { served: 0, walkouts: 0, earned: 0, days: 0 },
    today: { phase: 'morning', queue: [], index: 0, events: [], served: [], mess: 0, usage: {}, repStart: 50, viralStart: 10 },
    lastSummary: null,
  };
  planDay(c);
  return c;
}

/* ------------------------------------------------------------------ planning */

/** Today's events, each with its cause (nothing happens without a reason). */
export function dayEvents(c: CareerState): DayEvent[] {
  const ev: DayEvent[] = [];
  const last = c.lastSummary;
  if (c.day % 3 === 0) {
    ev.push({
      id: 'foodStall',
      title: 'Chợ phiên trước cửa tiệm',
      cause: 'Cứ ba ngày một lần, phố có chợ phiên. Hàng xôi xéo bày ngay trước tiệm.',
      effect: 'Thêm 1 khách vãng lai. Cậu Vàng (nếu đến) sẽ ngửi thấy mùi đồ ăn và quay đầu.',
    });
  }
  if (c.day % 4 === 0) {
    ev.push({
      id: 'powerCut',
      title: 'Lịch cắt điện luân phiên',
      cause: 'Điện lực thông báo cắt điện khu phố vào các ngày chia hết cho 4.',
      effect: c.owned.includes('generator') ? 'Tiệm có máy phát điện: mọi máy vẫn chạy.' : 'Máy sấy, Máy Sấy Bão, Máy Hút, Nồi Cơm, Máy Tạo Kiểu không dùng được.',
    });
  }
  if (c.viralStyle && c.viralStyle.day === c.day - 1) {
    ev.push({
      id: 'viralClip',
      title: `Clip “${c.viralStyle.name}” lan khắp mạng`,
      cause: `Hôm qua tiệm tạo ra một kiểu tóc gây sốt (Viral +${c.viralStyle.gain} chỉ từ một khách).`,
      effect: 'Một khách muốn y hệt kiểu tóc đó; khách thích drama đến nhiều hơn.',
    });
  }
  if (last && last.mess >= 45) {
    ev.push({
      id: 'inspection',
      title: 'Đoàn kiểm tra vệ sinh',
      cause: 'Hàng xóm báo tiệm hôm qua tóc với lông bay đầy ra đường.',
      effect: c.owned.includes('vacuum') ? 'Tiệm có Máy Hút Tóc Vũ Trụ dọn sạch: không bị phạt.' : 'Cuối ngày bị phạt 100.000đ (mua Máy Hút để dọn kịp).',
    });
  }
  if (c.rep >= 70) {
    ev.push({ id: 'newspaper', title: 'Báo phường khen tiệm', cause: `Uy tín cao (${Math.round(c.rep)}).`, effect: 'Khách VIP có thể ghé thăm.' });
  }
  if (c.rep < 30) {
    ev.push({ id: 'badReview', title: 'Bị đánh giá 1 sao trên bản đồ', cause: `Uy tín thấp (${Math.round(c.rep)}).`, effect: 'Bớt 1 khách hôm nay.' });
  }
  if (c.owned.includes('neon')) {
    ev.push({ id: 'neon', title: 'Biển neon nhấp nháy', cause: 'Tiệm có biển hiệu neon.', effect: '+2 Viral mỗi ngày.' });
  }
  return ev;
}

function eligible(c: CareerState, d: CustomerDef, events: string[]): boolean {
  const a = d.appear;
  if (a.weight <= 0) return false;
  if (c.day < a.minDay) return false;
  if (a.minRep !== undefined && c.rep < a.minRep && !(d.id === 'vip' && events.includes('newspaper'))) return false;
  if (a.minViral !== undefined && c.viral < a.minViral) return false;
  if (a.needsItem && !c.owned.includes(a.needsItem)) return false;
  if (a.minLevel && shopLevel(c).level < a.minLevel) return false;
  return true;
}

export function customersPerDay(c: CareerState, events: string[]): number {
  let n = BASE_CUSTOMERS;
  if (c.owned.includes('bench')) n++;
  if (events.includes('foodStall')) n++;
  if (events.includes('badReview')) n--;
  if (c.viral >= 50) n++;
  n += shopLevel(c).extraCustomers;
  return clamp(n, 2, 7);
}

/** A page of the shop's catalog (the player's saved creations). */
export interface CatalogEntry {
  id: string;
  customer: string;
  name: string;
}

/** Builds today's events and customer queue. Deterministic per day. */
export function planDay(c: CareerState, catalog: CatalogEntry[] = []) {
  const rng = makeRng(c.day * 7919 + c.stats.served * 13 + 1 + (c.seed ?? 0));
  const events = dayEvents(c);
  const ids = events.map((e) => e.id);
  const queue: QueueEntry[] = [];

  // 1) Customers who said they'd come back today.
  //    At most one comes back to complain (the others gave up on the shop) and one
  //    regular per day (the rest come a day later), so the day isn't all repeats.
  const due = c.pending.filter((p) => p.day <= c.day);
  c.pending = c.pending.filter((p) => p.day > c.day);
  for (const reason of ['return', 'loyal'] as const) {
    due
      .filter((p) => p.reason === reason)
      .forEach((p, i) => {
        if (i === 0) queue.push({ customer: p.customer, reason: p.reason, note: p.note });
        else if (reason === 'loyal') c.pending.push({ ...p, day: c.day + 1 });
        else delete c.returnHair[p.customer];
      });
  }
  for (const p of due.filter((p) => p.reason !== 'return' && p.reason !== 'loyal')) queue.push({ customer: p.customer, reason: p.reason, note: p.note });

  // 1b) Khách có câu chuyện: one chapter a day; a story starts once its day and level come.
  const stories = (c.stories ??= {});
  let storyToday = false;
  for (const st of STORIES) {
    if (!stories[st.id] && c.day >= st.startDay && shopLevel(c).level >= st.minLevel) stories[st.id] = { step: 0, due: c.day, state: 'active' };
    const pr = stories[st.id];
    if (!pr || pr.state !== 'active' || pr.due > c.day) continue;
    if (storyToday || queue.some((q) => q.customer === st.customer)) {
      pr.due = c.day + 1;
      continue;
    }
    storyToday = true;
    queue.push({ customer: st.customer, reason: 'story', note: st.chapters[pr.step].note, storyId: st.id, storyStep: pr.step });
  }

  // 2) A viral style brings a copycat.
  if (ids.includes('viralClip') && c.viralStyle) {
    queue.push({ customer: 'copycat', reason: 'copycat', note: `Muốn y hệt kiểu “${c.viralStyle.name}” trên mạng`, wantStyle: c.viralStyle.id });
  }

  // 2b) Cuốn mẫu: only once the shop owns creative tools (Cọ Nhuộm / Khuôn Cạo Hình) do
  //     customers come in with the catalog — the day after you buy them, since the day is
  //     planned in the morning. They order a template your tools can do or, every other
  //     day once you have some, a design you saved yourself.
  const artShop = c.owned.includes('brush') || c.owned.includes('stencil');
  const ok = (d: CustomerDef) => !d.boss && d.look.species !== 'dog' && d.appear.weight > 0 && d.id !== 'copycat' && c.day >= d.appear.minDay && (!d.appear.needsItem || c.owned.includes(d.appear.needsItem)) && (!d.appear.minLevel || shopLevel(c).level >= d.appear.minLevel) && !queue.some((q) => q.customer === d.id);
  const fresh = artShop ? catalog.find((x) => x.id === c.freshDesign) : undefined;
  c.freshDesign = null;
  const own = fresh ?? (artShop && catalog.length > 0 && c.day % 2 === 0 ? catalog[(c.day / 2) % catalog.length] : null);
  const ready = artShop ? TEMPLATES.filter((t) => templateReady(t, shopLevel(c).level, careerTools(c), c.owned)) : [];
  const tpl = !own && ready.length ? ready[(c.day * 7 + c.stats.served) % ready.length] : null;
  if (own || tpl) {
    const model = own ? CUSTOMERS.find((x) => x.id === own.customer) : null;
    const others = CUSTOMERS.filter(ok);
    const who = model && ok(model) ? model : others.length ? others[Math.floor(rng() * others.length) % others.length] : null;
    if (who && own) queue.push({ customer: who.id, reason: 'design', note: `Chọn mẫu “${own.name}” (do bạn tạo) trong cuốn mẫu`, designId: own.id });
    else if (who && tpl) queue.push({ customer: who.id, reason: 'design', note: `Chọn mẫu có sẵn “${tpl.name}” ${'★'.repeat(tpl.stars)}`, templateId: tpl.id });
  }

  // 2c) Khách tùy thợ: from day 2, most days someone just says "làm gì cũng được, miễn
  //     hợp gu em". Tastes that need colours or patterns only come once the shop has them.
  const tastes = tastesFor(careerTools(c));
  if (c.day >= 2 && tastes.length && rng() < 0.75) {
    const w = tastes.map((t) => (t.needs.length ? 2 : 1));
    let r = rng() * w.reduce((a, b) => a + b, 0);
    let taste = tastes[0];
    for (let i = 0; i < tastes.length; i++) {
      r -= w[i];
      if (r <= 0) {
        taste = tastes[i];
        break;
      }
    }
    const notRecent = (d: CustomerDef) => !(c.history[d.id] && c.history[d.id].day >= c.day - 2) && !c.pending.some((p) => p.customer === d.id);
    const pool = CUSTOMERS.filter((d) => ok(d) && !d.behaviors.includes('transform') && !d.stages?.length);
    const cands = pool.filter(notRecent).length ? pool.filter(notRecent) : pool;
    const who = cands.length ? cands[Math.floor(rng() * cands.length) % cands.length] : null;
    if (who) queue.push({ customer: who.id, reason: 'freestyle', note: `Tùy thợ: “${taste.name}”`, tasteId: taste.id });
  }

  // 2d) Cuộc thi tóc của phường: every week (day 4, 11, 18…) a model sits down for the contest.
  if (c.day % 7 === 4) {
    const themes = CONTESTS.filter((t) => t.needs.every((x) => careerTools(c).includes(x)));
    const theme = themes[Math.floor(c.day / 7) % themes.length];
    const pool = CUSTOMERS.filter((d) => ok(d) && !d.behaviors.includes('transform') && !d.stages?.length);
    const who = pool.length ? pool[Math.floor(rng() * pool.length) % pool.length] : null;
    if (who && theme) queue.push({ customer: who.id, reason: 'contest', note: `🏆 Người mẫu dự thi — đề “${theme.name}”`, tasteId: theme.id });
  }

  // 3) Walk-ins, weighted, no duplicates; drama lovers more likely after a viral clip.
  //    There are always at least two new faces besides the ones coming back.
  const total = customersPerDay(c, ids) + (c.bonusWalkins ?? 0);
  c.bonusWalkins = 0;
  const pool = CUSTOMERS.filter((d) => eligible(c, d, ids));
  let walkins = 0;
  let guard = 0;
  while ((queue.length < total || walkins < 2) && guard++ < 50) {
    const cands = pool.filter((d) => !queue.some((q) => q.customer === d.id) && !c.pending.some((p) => p.customer === d.id));
    if (!cands.length) break;
    // Customers from the last two days rarely walk in again.
    const recent = (d: CustomerDef) => (c.history[d.id] && c.history[d.id].day >= c.day - 2 ? 0.12 : 1);
    const w = cands.map((d) => d.appear.weight * recent(d) * (ids.includes('viralClip') ? d.viralWeight : 1) * (d.id === 'vip' && ids.includes('newspaper') ? 3 : 1));
    let r = rng() * w.reduce((a, b) => a + b, 0);
    let chosen = cands[0];
    for (let i = 0; i < cands.length; i++) {
      r -= w[i];
      if (r <= 0) {
        chosen = cands[i];
        break;
      }
    }
    queue.push({ customer: chosen.id, reason: chosen.id === 'vip' ? 'vip' : 'walkin', note: pick(rng, ['Khách vãng lai', 'Đi ngang qua thấy biển', 'Hàng xóm giới thiệu']) });
    walkins++;
  }

  // 4) Every seventh day a boss customer closes the week.
  if (c.day % 7 === 0) {
    const boss = BOSSES[(c.day / 7 - 1) % BOSSES.length];
    queue.push({ customer: boss, reason: 'boss', note: 'Khách trùm cuối tuần — làm hài lòng để nhận thưởng lớn' });
  }

  c.today = {
    phase: 'morning',
    queue,
    index: 0,
    events,
    served: [],
    mess: 0,
    usage: {},
    repStart: c.rep,
    viralStart: c.viral,
    quests: [],
    newStyles: [],
  };
  c.today.quests = planQuests(c, rng);
}

/** Weekly bosses, in rotation. */
export const BOSSES = ['chure', 'thanhtra'];

/* ------------------------------------------------------------------ rounds */

/** Tools the barber has today. */
export function careerTools(c: CareerState): ToolId[] {
  const tools = TOOLS.filter((t) => t.group === 'basic').map((t) => t.id);
  for (const item of SHOP) if (item.tool && (c.owned.includes(item.id) || (item.pack && (c.stock[item.id] ?? 0) > 0))) tools.push(item.tool);
  return [...new Set(tools)];
}

export const shopLevel = (c: CareerState) => levelFor(c.xp ?? 0);

export function repMultiplier(c: CareerState) {
  return (0.8 + c.rep / 250) * (c.owned.includes('ringLight') ? 1.1 : 1) * shopLevel(c).price;
}

/** Everything the round needs to know about the shop for the current customer. */
export function roundContext(c: CareerState): Partial<RoundContext> {
  const q = c.today.queue[c.today.index];
  const ids = c.today.events.map((e) => e.id);
  const snap = q && (q.reason === 'return') ? c.returnHair[q.customer] : undefined;
  return {
    items: [...c.owned, ...((c.stock.sausage ?? 0) > 0 && q?.customer === 'vang' ? ['sausage'] : [])],
    dayEvents: ids,
    condition: { ...c.condition },
    stock: { ...c.stock },
    blocked: ids.includes('powerCut') && !c.owned.includes('generator') ? [...ELECTRIC] : [],
    payMultiplier: repMultiplier(c),
    wantStyle: q?.wantStyle ?? null,
    returnHair: snap ? unsnap(snap, q.customer) : null,
    taste: q?.tasteId ?? null,
    story: q?.storyId ? { id: q.storyId, step: q.storyStep ?? 0 } : null,
  };
}

export function snapHair(h: HairState): HairSnap {
  return h.tufts.map((t) => [Math.round(t.len * 10) / 10, t.bald ? 1 : 0, t.spiked ? 1 : 0, t.tint, Math.round(t.lean * 100) / 100, Math.round(t.fluff * 100) / 100, Math.round(t.thick * 100) / 100]);
}

export function unsnap(snap: HairSnap, customerId: string): HairState {
  // Rebuild from the customer's own hair layout, then apply the saved state.
  const base = createHairFor(customerId);
  base.tufts.forEach((t: Tuft, i: number) => {
    const v = snap[i];
    if (!v) return;
    [t.len, t.bald, t.spiked, t.tint, t.lean, t.fluff, t.thick] = [v[0], v[1] === 1, v[2] === 1, v[3], v[4], v[5], v[6]];
  });
  return base;
}

function createHairFor(id: string): HairState {
  return createHair(customerById(id).hair);
}

/** Uy tín change for one verdict. */
export function repDeltaFor(c: CareerState, d: CustomerDef, sat: number, walkedOut: boolean): number {
  if (walkedOut) return Math.round(-6 * d.repWeight);
  let delta = ((sat - 55) / 9) * d.repWeight;
  if (delta > 0 && c.owned.includes('award')) delta *= 1.15;
  return Math.round(clamp(delta, -15, 12) * 10) / 10;
}

/** Viral change: chaos, incidents, combos and over-the-top results get attention. */
export function viralDeltaFor(c: CareerState, d: CustomerDef, s: RoundState): number {
  const r = s.result!;
  const combos = r.incidents.filter((i) => i.startsWith('combo')).length;
  let v = (r.chaos / 100) * 6 + r.incidents.length * 1.2 + combos * 4 + (r.special ? 3 : 0) + s.viewers / 500;
  if (d.id === 'copycat' && r.sat >= 90) v += 6;
  v *= d.viralWeight * (c.owned.includes('ringLight') ? 1.3 : 1);
  return Math.round(clamp(v, 0, 30) * 10) / 10;
}

/** Applies a finished round to the shop: money, reputation, viral, history, returns, wear. */
export function applyRound(c: CareerState, s: RoundState): Served {
  const r = s.result!;
  const d = s.customer;
  const q = c.today.queue[c.today.index];
  const repDelta = repDeltaFor(c, d, r.sat, r.walkedOut);
  const viralDelta = viralDeltaFor(c, d, s);
  c.money += r.paid + r.tip;
  c.rep = clamp(c.rep + repDelta, 0, 100);
  c.viral = clamp(c.viral + viralDelta, 0, 100);
  c.stats.served++;
  c.stats.earned += r.paid + r.tip;
  if (r.walkedOut) c.stats.walkouts++;
  if (!c.styles.includes(r.style.id)) {
    c.styles.push(r.style.id);
    (c.today.newStyles ??= []).push(r.style.id);
  }
  for (const e of Object.keys(s.events)) if (!c.events.includes(e)) c.events.push(e);
  // Consumables used, machine wear, shop mess.
  for (const [k, n] of Object.entries(s.consumed)) c.stock[k] = Math.max(0, (c.stock[k] ?? 0) - n);
  if (d.id === 'vang' && (c.stock.sausage ?? 0) > 0) c.stock.sausage--;
  for (const m of MACHINES) {
    const used = (s.usage[m] ?? 0) * (m === 'clipper' ? 1.2 : 2) + (s.wear[m] ?? 0);
    if (used > 0) c.condition[m] = clamp((c.condition[m] ?? 100) - used, 0, 100);
    c.today.usage[m] = (c.today.usage[m] ?? 0) + (s.usage[m] ?? 0);
  }
  for (const t of TOOLS) if (t.group === 'magic' && s.usage[t.id]) c.today.usage[t.id] = (c.today.usage[t.id] ?? 0) + s.usage[t.id]!;
  // Normal clippings are swept up; fur storms and sucked-up patches are what make a mess.
  c.today.mess += s.mess + Math.min(8, s.clippings / 6) + (s.events.vacuumGulp ? 10 : 0);

  // Returns: a disaster comes back tomorrow to get it fixed, a fan comes back in two days.
  c.history[d.id] = { day: c.day, styleId: r.style.id, sat: r.sat, tier: r.tier };
  const already = c.pending.some((p) => p.customer === d.id);
  // Someone who already came back to get it fixed and is still unhappy gives up on the shop.
  // Story visits come back through their story, not as returns or regulars.
  const secondChance = q?.reason === 'return' || q?.reason === 'story' || q?.reason === 'contest';
  if (!already && !secondChance && !r.walkedOut && d.returns.onDisaster && (r.tier === 'bad' || r.tier === 'disaster')) {
    c.pending.push({ customer: d.id, reason: 'return', day: c.day + 1, note: `Quay lại đòi sửa kiểu “${r.style.name}” hôm qua` });
    c.returnHair[d.id] = snapHair(s.hair);
  } else if (!already && !secondChance && d.returns.onLove && r.tier === 'love') {
    c.pending.push({ customer: d.id, reason: 'loyal', day: c.day + 2, note: 'Khách quen, mê tay nghề của tiệm' });
  }
  // A big viral moment: the style becomes tomorrow's trend.
  // Copycats copy a trend; they don't start a new one.
  const human = d.look.species !== 'dog' && d.id !== 'copycat';
  if (viralDelta >= VIRAL_TREND && human && !r.style.id.startsWith('perfect') && (!c.viralStyle || c.viralStyle.day !== c.day || c.viralStyle.gain < viralDelta)) {
    c.viralStyle = { id: r.style.id, name: r.style.name, day: c.day, gain: viralDelta };
  }

  const served: Served = {
    customer: d.id,
    name: d.name,
    styleId: r.style.id,
    styleName: r.style.name,
    sat: r.sat,
    tier: r.tier,
    paid: r.paid,
    tip: r.tip,
    repDelta,
    viralDelta,
    walkedOut: r.walkedOut,
    reason: q?.reason ?? 'walkin',
  };
  // A catalog design done well: word of mouth.
  if (q?.reason === 'design' && !r.walkedOut && (r.tier === 'love' || r.tier === 'ok')) {
    c.viral = clamp(c.viral + 2, 0, 100);
    served.viralDelta = Math.round((served.viralDelta + 2) * 10) / 10;
  }
  if (q?.designId) served.designId = q.designId;
  // Khách có câu chuyện: pass the chapter and the story goes on; fail and it ends.
  const st = q?.reason === 'story' ? storyById(q.storyId) : null;
  const pr = st ? c.stories?.[st.id] : undefined;
  if (st && pr && pr.state === 'active') {
    const ch = st.chapters[pr.step];
    if (!r.walkedOut && r.sat >= ch.pass) {
      if (pr.step >= st.chapters.length - 1) {
        pr.state = 'done';
        c.money += st.reward.money;
        c.viral = clamp(c.viral + st.reward.viral, 0, 100);
        c.rep = clamp(c.rep + st.reward.rep, 0, 100);
        c.bonusWalkins = (c.bonusWalkins ?? 0) + st.reward.friends;
        served.bonus = (served.bonus ?? 0) + st.reward.money;
        served.story = { title: st.title, text: `${ch.win} ${st.reward.text}`, passed: true, finished: true };
      } else {
        pr.step++;
        pr.due = c.day + Math.max(1, ch.gap);
        served.story = { title: st.title, text: ch.win, passed: true };
      }
    } else {
      pr.state = 'failed';
      served.story = { title: st.title, text: st.fail, passed: false };
    }
  }
  // Cuộc thi tóc của phường: the judges' score is the satisfaction.
  const theme = q?.reason === 'contest' ? tasteById(q.tasteId) : null;
  if (theme) {
    const prize = r.walkedOut ? null : contestPrize(r.sat);
    if (prize) {
      c.money += prize.money;
      c.viral = clamp(c.viral + prize.viral, 0, 100);
      (c.trophies ??= []).push({ day: c.day, theme: theme.name, rank: prize.rank, label: prize.label });
      served.bonus = (served.bonus ?? 0) + prize.money;
    }
    served.contest = { theme: theme.name, label: prize?.label ?? 'Không đạt giải', money: prize?.money ?? 0 };
  }
  // Tùy thợ: a cut they loved goes into the catalog; tomorrow someone orders it.
  const taste = tasteById(q?.tasteId);
  if (taste && !r.walkedOut && r.sat >= 75) {
    served.saveDesign = { name: tasteDesignName(taste, d.name), caption: `${taste.name} · ${r.style.name} · khách chấm ${r.sat}%` };
  }
  const done = updateQuests(c, s, served);
  if (done.length) served.quests = done.map((q) => q.label);
  // Cấp tiệm.
  const before = shopLevel(c).level;
  const gained = xpFor(r, { design: q?.reason === 'design' || q?.reason === 'freestyle' || q?.reason === 'story' || q?.reason === 'contest', art: s.metrics.carvingCount > 0 || s.metrics.tintedFrac > 0.1, boss: q?.reason === 'boss', quests: done.length });
  c.xp = (c.xp ?? 0) + gained;
  served.xp = gained;
  if (shopLevel(c).level > before) served.levelUp = shopLevel(c).level;
  c.today.served.push(served);
  c.today.index++;
  c.today.phase = c.today.index >= c.today.queue.length ? 'closed' : 'open';
  return served;
}

/* ------------------------------------------------------------------ end of day */

export function rentFor(c: CareerState) {
  return BASE_RENT + (c.owned.includes('bench') ? 15000 : 0) + (c.owned.includes('neon') ? 10000 : 0);
}

export function dayCosts(c: CareerState): CostLine[] {
  const costs: CostLine[] = [{ label: 'Tiền thuê mặt bằng', amount: rentFor(c) }];
  const powerSec = ELECTRIC.reduce((a, t) => a + (c.today.usage[t] ?? 0), 0) + (c.today.usage.clipper ?? 0) * 0.3;
  const magicSec = TOOLS.filter((t) => t.group === 'magic' && !ELECTRIC.includes(t.id)).reduce((a, t) => a + (c.today.usage[t.id] ?? 0), 0);
  const power = Math.round((8000 + powerSec * 400 + magicSec * 600) / 1000) * 1000;
  costs.push({ label: 'Tiền điện (và phép thuật)', amount: power });
  if (c.today.events.some((e) => e.id === 'inspection') && !c.owned.includes('vacuum')) costs.push({ label: 'Phạt vệ sinh', amount: 100000 });
  if (c.today.mess >= 20) costs.push({ label: 'Dọn dẹp tóc, lông vương vãi', amount: Math.round(c.today.mess * 500 / 1000) * 1000 });
  return costs;
}

/** Closes the day: pays the costs, decays viral, writes the summary. */
export function endDay(c: CareerState): DaySummary {
  settleQuests(c);
  const questMoney = (c.today.quests ?? []).filter((q) => q.done).reduce((a, q) => a + q.reward.money, 0);
  const costs = dayCosts(c);
  const revenue = c.today.served.reduce((a, s) => a + s.paid, 0);
  const tips = c.today.served.reduce((a, s) => a + s.tip, 0);
  const bonusMoney = c.today.served.reduce((a, s) => a + (s.bonus ?? 0), 0);
  const total = costs.reduce((a, x) => a + x.amount, 0);
  c.money -= total;
  if (c.owned.includes('neon')) c.viral = clamp(c.viral + 2, 0, 100);
  const viralBefore = c.viral;
  // Attention fades.
  c.viral = clamp(c.viral * 0.8, 0, 100);
  const tomorrow: string[] = [];
  const next = c.day + 1;
  for (const p of c.pending.filter((p) => p.day === next)) tomorrow.push(`${customerById(p.customer).name}: ${p.note}`);
  if (next % 3 === 0) tomorrow.push('Ngày mai có chợ phiên trước cửa tiệm.');
  if (next % 7 === 0) tomorrow.push(`Ngày mai có khách trùm cuối tuần: ${customerById(BOSSES[(next / 7 - 1) % BOSSES.length]).name}!`);
  if (next % 7 === 4) tomorrow.push('Ngày mai có Cuộc thi tóc của phường: một người mẫu sẽ đến, giải Nhất 300.000đ!');
  for (const st of STORIES) {
    const pr = c.stories?.[st.id];
    if (pr?.state === 'active' && pr.due === next) tomorrow.push(`${customerById(st.customer).name} quay lại: ${st.chapters[pr.step].note}`);
  }
  if ((c.bonusWalkins ?? 0) > 0) tomorrow.push(`Bạn bè khách giới thiệu: thêm ${c.bonusWalkins} khách.`);
  if (next % 4 === 0) tomorrow.push(c.owned.includes('generator') ? 'Ngày mai cắt điện, nhưng tiệm có máy phát.' : 'Ngày mai cắt điện luân phiên: máy dùng điện sẽ nghỉ.');
  const low = MACHINES.filter((m) => (c.condition[m] ?? 100) < 25 && (m === 'clipper' || m === 'dryer' || c.owned.includes(m)));
  if (low.length) tomorrow.push(`Máy sắp hỏng: ${low.map((m) => TOOLS.find((t) => t.id === m)?.name).join(', ')} — nên bảo dưỡng ở Cửa hàng.`);
  const summary: DaySummary = {
    day: c.day,
    served: c.today.served,
    revenue,
    tips,
    costs,
    net: revenue + tips + questMoney + bonusMoney - total,
    repDelta: Math.round((c.rep - c.today.repStart) * 10) / 10,
    viralDelta: Math.round((viralBefore - c.today.viralStart) * 10) / 10,
    moneyAfter: c.money,
    tomorrow,
    mess: c.today.mess,
    quests: (c.today.quests ?? []).map((q) => ({ ...q, reward: { ...q.reward } })),
    questMoney,
    bonusMoney,
  };
  c.lastSummary = summary;
  c.stats.days++;
  c.today.phase = 'closed';
  return summary;
}

/** Starts the next day (after the summary / shopping). */
export function nextDay(c: CareerState, catalog: CatalogEntry[] = []) {
  c.day++;
  planDay(c, catalog);
}

/* ------------------------------------------------------------------ shop */

export type BuyCheck = { ok: true } | { ok: false; reason: string };

export function canBuy(c: CareerState, item: ShopItem): BuyCheck {
  const u = item.unlock;
  if (u.level && shopLevel(c).level < u.level) return { ok: false, reason: `Cần cấp tiệm ${u.level}: ${LEVELS[u.level - 1].name}` };
  if (u.day && c.day < u.day) return { ok: false, reason: `Mở bán từ ngày ${u.day}` };
  if (u.rep && c.rep < u.rep) return { ok: false, reason: `Cần Uy tín ${u.rep}` };
  if (u.viral && c.viral < u.viral) return { ok: false, reason: `Cần Viral ${u.viral}` };
  if (u.event && !c.events.includes(u.event) && !(u.event === 'powerCut' && c.today.events.some((e) => e.id === 'powerCut'))) return { ok: false, reason: u.eventLabel ?? 'Chưa đủ điều kiện' };
  if (!item.pack && c.owned.includes(item.id)) return { ok: false, reason: 'Đã có' };
  if (c.money < item.price) return { ok: false, reason: `Thiếu ${vnd(item.price - c.money)}` };
  return { ok: true };
}

export function buy(c: CareerState, id: string): BuyCheck {
  const item = shopItem(id);
  if (!item) return { ok: false, reason: 'Không có món này' };
  const check = canBuy(c, item);
  if (!check.ok) return check;
  c.money -= item.price;
  if (item.pack) c.stock[item.id] = (c.stock[item.id] ?? 0) + item.pack;
  else c.owned.push(item.id);
  return { ok: true };
}

export function repairCost(c: CareerState): number {
  const owned = MACHINES.filter((m) => m === 'clipper' || m === 'dryer' || c.owned.includes(m));
  return Math.round(owned.reduce((a, m) => a + (100 - (c.condition[m] ?? 100)) * 800, 0) / 1000) * 1000;
}

export function repair(c: CareerState): BuyCheck {
  const cost = repairCost(c);
  if (cost <= 0) return { ok: false, reason: 'Máy móc vẫn tốt' };
  if (c.money < cost) return { ok: false, reason: `Thiếu ${vnd(cost - c.money)}` };
  c.money -= cost;
  for (const m of MACHINES) c.condition[m] = 100;
  return { ok: true };
}

/* ------------------------------------------------------------------ save */

export const SAVE_KEY = 'tctbo-career-v1';
const BACKUP_KEY = 'tctbo-career-v1-backup';

function valid(x: unknown): x is CareerState {
  const c = x as CareerState;
  return (
    !!c &&
    c.v === CAREER_VERSION &&
    Number.isFinite(c.day) &&
    Number.isFinite(c.money) &&
    Number.isFinite(c.rep) &&
    Number.isFinite(c.viral) &&
    Array.isArray(c.owned) &&
    !!c.today &&
    Array.isArray(c.today.queue)
  );
}

export function saveCareer(c: CareerState, store: Storage | undefined = globalThis.localStorage) {
  if (!store) return;
  try {
    // Keep the previous good save as a backup before overwriting.
    const prev = store.getItem(SAVE_KEY);
    if (prev) store.setItem(BACKUP_KEY, prev);
    store.setItem(SAVE_KEY, JSON.stringify(c));
  } catch {
    /* storage full or blocked: the game keeps running */
  }
}

/**
 * Old saves can mention customers that no longer exist (e.g. the removed "Khách X-79"):
 * unserved visits by them become ordinary walk-ins, their return/loyal visits are dropped.
 */
export function sanitizeCareer(c: CareerState): CareerState {
  const known = (id: string) => CUSTOMERS.some((d) => d.id === id);
  c.today.queue = c.today.queue.map((q, i) =>
    i < c.today.index || known(q.customer) ? q : { customer: 'tuan', reason: 'walkin', note: 'Khách vãng lai (thay cho khách cũ không còn ghé)' },
  );
  c.pending = (c.pending ?? []).filter((p) => known(p.customer));
  for (const id of Object.keys(c.returnHair ?? {})) if (!known(id)) delete c.returnHair[id];
  for (const id of Object.keys(c.history ?? {})) if (!known(id)) delete c.history[id];
  return c;
}

export function loadCareer(store: Storage | undefined = globalThis.localStorage): CareerState | null {
  if (!store) return null;
  for (const key of [SAVE_KEY, BACKUP_KEY]) {
    try {
      const raw = store.getItem(key);
      if (!raw) continue;
      const c = JSON.parse(raw);
      if (valid(c)) return sanitizeCareer(c);
    } catch {
      /* corrupt: try the backup */
    }
  }
  return null;
}

export function resetCareer(store: Storage | undefined = globalThis.localStorage) {
  try {
    store?.removeItem(SAVE_KEY);
    store?.removeItem(BACKUP_KEY);
  } catch {
    /* ignore */
  }
}

/** All hairstyle names (for the collection). */
export const ALL_STYLES = STYLE_RULES.map((r) => r.id);
