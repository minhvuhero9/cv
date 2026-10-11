import { CUSTOMERS, CustomerDef, customerById } from './customers';
import { STYLE_RULES } from './evaluate';
import { clamp } from './geometry';
import { HairState, Tuft, createHair } from './hair';
import { makeRng, pick } from './rng';
import type { RoundContext, RoundState } from './session';
import { ELECTRIC, MACHINES, SHOP, ShopItem, shopItem } from './shop';
import { TOOLS, ToolId } from './tools';
import { Quest, planQuests, settleQuests, updateQuests } from './quests';

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

export type QueueReason = 'walkin' | 'return' | 'loyal' | 'copycat' | 'vip' | 'boss';

export interface QueueEntry {
  customer: string;
  reason: QueueReason;
  note: string;
  wantStyle?: string | null;
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

export function newCareer(): CareerState {
  const c: CareerState = {
    v: CAREER_VERSION,
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
  return true;
}

export function customersPerDay(c: CareerState, events: string[]): number {
  let n = BASE_CUSTOMERS;
  if (c.owned.includes('bench')) n++;
  if (events.includes('foodStall')) n++;
  if (events.includes('badReview')) n--;
  if (c.viral >= 50) n++;
  return clamp(n, 2, 6);
}

/** Builds today's events and customer queue. Deterministic per day. */
export function planDay(c: CareerState) {
  const rng = makeRng(c.day * 7919 + c.stats.served * 13 + 1);
  const events = dayEvents(c);
  const ids = events.map((e) => e.id);
  const queue: QueueEntry[] = [];

  // 1) Customers who said they'd come back today.
  for (const p of c.pending.filter((p) => p.day <= c.day)) {
    queue.push({ customer: p.customer, reason: p.reason, note: p.note });
  }
  c.pending = c.pending.filter((p) => p.day > c.day);

  // 2) A viral style brings a copycat.
  if (ids.includes('viralClip') && c.viralStyle) {
    queue.push({ customer: 'copycat', reason: 'copycat', note: `Muốn y hệt kiểu “${c.viralStyle.name}” trên mạng`, wantStyle: c.viralStyle.id });
  }

  // 3) Walk-ins, weighted, no duplicates; drama lovers more likely after a viral clip.
  const total = customersPerDay(c, ids);
  const pool = CUSTOMERS.filter((d) => eligible(c, d, ids));
  let guard = 0;
  while (queue.length < total && guard++ < 50) {
    const cands = pool.filter((d) => !queue.some((q) => q.customer === d.id));
    if (!cands.length) break;
    // Yesterday's customers are less likely to walk in again today.
    const recent = (d: CustomerDef) => (c.history[d.id] && c.history[d.id].day >= c.day - 1 ? 0.3 : 1);
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

export function repMultiplier(c: CareerState) {
  return (0.8 + c.rep / 250) * (c.owned.includes('ringLight') ? 1.1 : 1);
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
  const secondChance = q?.reason === 'return';
  if (!already && !secondChance && !r.walkedOut && d.returns.onDisaster && (r.tier === 'bad' || r.tier === 'disaster')) {
    c.pending.push({ customer: d.id, reason: 'return', day: c.day + 1, note: `Quay lại đòi sửa kiểu “${r.style.name}” hôm qua` });
    c.returnHair[d.id] = snapHair(s.hair);
  } else if (!already && d.returns.onLove && r.tier === 'love') {
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
  const done = updateQuests(c, s, served);
  if (done.length) served.quests = done.map((q) => q.label);
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
  if (next % 4 === 0) tomorrow.push(c.owned.includes('generator') ? 'Ngày mai cắt điện, nhưng tiệm có máy phát.' : 'Ngày mai cắt điện luân phiên: máy dùng điện sẽ nghỉ.');
  const low = MACHINES.filter((m) => (c.condition[m] ?? 100) < 25 && (m === 'clipper' || m === 'dryer' || c.owned.includes(m)));
  if (low.length) tomorrow.push(`Máy sắp hỏng: ${low.map((m) => TOOLS.find((t) => t.id === m)?.name).join(', ')} — nên bảo dưỡng ở Cửa hàng.`);
  const summary: DaySummary = {
    day: c.day,
    served: c.today.served,
    revenue,
    tips,
    costs,
    net: revenue + tips + questMoney - total,
    repDelta: Math.round((c.rep - c.today.repStart) * 10) / 10,
    viralDelta: Math.round((viralBefore - c.today.viralStart) * 10) / 10,
    moneyAfter: c.money,
    tomorrow,
    mess: c.today.mess,
    quests: (c.today.quests ?? []).map((q) => ({ ...q, reward: { ...q.reward } })),
    questMoney,
  };
  c.lastSummary = summary;
  c.stats.days++;
  c.today.phase = 'closed';
  return summary;
}

/** Starts the next day (after the summary / shopping). */
export function nextDay(c: CareerState) {
  c.day++;
  planDay(c);
}

/* ------------------------------------------------------------------ shop */

export type BuyCheck = { ok: true } | { ok: false; reason: string };

export function canBuy(c: CareerState, item: ShopItem): BuyCheck {
  const u = item.unlock;
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
