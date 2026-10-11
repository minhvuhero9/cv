import { Vec, angleDiff, clamp, dist, pointSegment, segmentSegment } from './geometry';
import { HairState, Tuft, tuftPoints } from './hair';

/**
 * Bộ Đồ Nghề Bất Ổn: hair operations for the fictional magic tools. Like the basic tools,
 * each one only changes tuft properties; rendering and scoring read the result.
 */

export const WAND_RADIUS = 36;
export const RAY_RADIUS = 26;
export const COMB_REACH = 15;
export const VACUUM_MIN_RADIUS = 28;
export const VACUUM_MAX_RADIUS = 74;
/** Seconds of continuous suction before the vacuum gulps a whole patch. */
export const VACUUM_GULP_TIME = 2.2;
export const MAX_GROWTH = 3;

/** Distance from a point to the drawn tuft (or its root, for bald/short tufts). */
function reach(t: Tuft, p: Vec): number {
  const pts = tuftPoints(t);
  let d = dist(t.root, p);
  for (let i = 0; i < 3; i++) d = Math.min(d, pointSegment(p, pts[i], pts[i + 1]).d);
  return d;
}

/** Tufts the wand is touching when pressed at p. */
export function wandSelect(h: HairState, p: Vec): Tuft[] {
  return h.tufts.filter((t) => reach(t, p) < WAND_RADIUS * 0.6 || dist(t.root, p) < WAND_RADIUS);
}

export interface WandResult {
  grown: number;
  regrown: Tuft[];
}

/**
 * Gậy Như Ý: dragging up (negative dy) grows the selected tufts, down shrinks them,
 * sideways makes them thicker/thinner. Bald roots grow back — curly, of course.
 */
export function wandStretch(sel: Tuft[], dx: number, dy: number): WandResult {
  const res: WandResult = { grown: 0, regrown: [] };
  for (const t of sel) {
    const dl = -dy * 0.9;
    if (t.bald) {
      if (dl <= 0) continue;
      t.bald = false;
      t.len = 3;
      t.curl = 0.55;
      res.regrown.push(t);
    }
    const before = t.len;
    t.len = clamp(t.len + dl, 3, t.origLen * MAX_GROWTH);
    res.grown += t.len - before;
    t.thick = clamp(t.thick + dx * 0.012, 0.45, 2.6);
  }
  return res;
}

/** A light tap with the wand: tufts curl up one notch (and eventually flip direction). */
export function wandCurl(h: HairState, p: Vec): Tuft[] {
  const sel = wandSelect(h, p).filter((t) => !t.bald);
  for (const t of sel) t.curl = t.curl >= 0.55 ? -0.4 : Math.round((t.curl + 0.2) * 100) / 100;
  return sel;
}

/** Súng Tóc 3000 colours, in firing order. */
export const RAY_COLORS = ['#ff3fa4', '#2ee86a', '#8a4dff', '#ffd400', '#18c8ff', '#ff6a00'];

/** Súng Tóc 3000: dye, stand up and enlarge every tuft around the impact point. */
export function rayBlast(h: HairState, p: Vec, color: string | ((t: Tuft) => string)): Tuft[] {
  const hit = h.tufts.filter((t) => !t.bald && t.len > 2 && reach(t, p) < RAY_RADIUS);
  for (const t of hit) {
    t.tint = typeof color === 'string' ? color : color(t);
    t.spiked = true;
    t.spike = 1;
    t.len = Math.min(t.len * 1.25, t.origLen * MAX_GROWTH);
    t.thick = Math.min(2.6, t.thick * 1.3);
  }
  return hit;
}

export interface GustResult {
  moved: number;
  /** Abnormally long tufts (grown by the wand) that the gust whipped around. */
  whipped: Tuft[];
}

/** Máy Sấy Bão: one directional gust over the whole head. Long hair catches more wind. */
export function stormGust(h: HairState, dir: Vec, power: number): GustResult {
  const res: GustResult = { moved: 0, whipped: [] };
  const target = Math.atan2(dir.y, dir.x);
  for (const t of h.tufts) {
    if (t.bald || t.len < 3) continue;
    const ratio = t.len / t.origLen;
    const sail = clamp(ratio, 0.3, MAX_GROWTH);
    const pts = tuftPoints({ ...t, lean: 0 });
    const start = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    const stiff = t.spiked || t.sculpt ? 0.25 : 1 - t.gel * 0.5;
    const want = clamp(angleDiff(start, target), -1.6, 1.6);
    const k = clamp(power * sail * 0.7 * stiff, 0, 1);
    t.lean = clamp(t.lean + (want - t.lean) * k, -1.6, 1.6);
    t.fluff = clamp(t.fluff + 0.35 * power * sail, 0, 1);
    res.moved++;
    if (ratio >= 1.8 && power > 0.3) {
      t.sculpt = null;
      t.spiked = false;
      t.lean = want;
      t.fluff = 1;
      t.curl = (t.id % 2 ? 1 : -1) * 0.35;
      res.whipped.push(t);
    }
  }
  return res;
}

export interface SuckResult {
  removed: number;
  at: Vec[];
  steamedHit: number;
}

/** Máy Hút Tóc Vũ Trụ: pulls nearby hair towards the nozzle and shortens it. Puffy hair goes fast. */
export function vacuumSuck(h: HairState, p: Vec, radius: number, dt: number): SuckResult {
  const res: SuckResult = { removed: 0, at: [], steamedHit: 0 };
  for (const t of h.tufts) {
    if (t.bald || t.len < 3) continue;
    const tip = tuftPoints(t)[3];
    const d = Math.min(dist(tip, p), reach(t, p));
    if (d > radius) continue;
    const s = 1 - d / radius;
    const pts = tuftPoints({ ...t, lean: 0 });
    const start = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    const toward = Math.atan2(p.y - t.root.y, p.x - t.root.x);
    t.lean = clamp(t.lean + clamp(angleDiff(start + t.lean, toward), -1, 1) * s * dt * 4, -1.6, 1.6);
    const rate = (22 + t.steamed * 140 + t.fluff * 30) * s;
    const before = t.len;
    t.len = Math.max(3, t.len - rate * dt);
    if (t.steamed > 0.3) res.steamedHit++;
    if (before - t.len > 0.01) {
      res.removed += before - t.len;
      if (res.at.length < 6) res.at.push(tip);
    }
  }
  return res;
}

/** Held too long: the vacuum swallows every root under the nozzle. */
export function vacuumGulp(h: HairState, p: Vec, radius: number): Tuft[] {
  const gone = h.tufts.filter((t) => !t.bald && dist(t.root, p) < radius * 0.75);
  for (const t of gone) {
    t.bald = true;
    t.len = 0;
    t.spiked = false;
    t.sculpt = null;
  }
  return gone;
}

/**
 * Lược Rồng: tufts the comb passes through take the stroke direction. Combing upward
 * adds volume; a curving stroke (turn, radians) adds curl.
 */
export function combStroke(h: HairState, a: Vec, b: Vec, turn: number): Tuft[] {
  const len = dist(a, b);
  if (len < 0.5) return [];
  const dir = Math.atan2(b.y - a.y, b.x - a.x);
  const touched: Tuft[] = [];
  for (const t of h.tufts) {
    if (t.bald || t.len < 3 || t.sculpt) continue;
    const pts = tuftPoints(t);
    let d = Infinity;
    for (let i = 0; i < 3; i++) d = Math.min(d, segmentSegment(pts[i], pts[i + 1], a, b).d);
    if (d > COMB_REACH) continue;
    const nat = tuftPoints({ ...t, lean: 0, curl: 0 });
    const start = Math.atan2(nat[1].y - nat[0].y, nat[1].x - nat[0].x);
    const want = clamp(angleDiff(start, dir), -1.6, 1.6);
    t.lean += (want - t.lean) * 0.35;
    if (b.y < a.y - 0.5) t.fluff = clamp(t.fluff + 0.05, 0, 1);
    else t.fluff = clamp(t.fluff - 0.03, 0, 1);
    t.curl = clamp(t.curl + turn * 0.25, -0.7, 0.7);
    touched.push(t);
  }
  return touched;
}

/** Combo Súng + Lược: dyed, standing tufts are combed into one bizarre point. */
export function sculptTo(tufts: Tuft[], target: Vec) {
  for (const t of tufts) {
    t.sculpt = { ...target };
    t.len = Math.max(t.len, Math.min(dist(t.root, target), t.origLen * MAX_GROWTH));
  }
}

/** Nồi Cơm Điện: everything above the ears is steamed into a round, puffy bun. */
export function cookerSteam(h: HairState): Tuft[] {
  const done = h.tufts.filter((t) => !t.bald && t.root.y < h.head.cy - 10);
  for (const t of done) {
    t.steamed = 1;
    t.fluff = 1;
    t.lean *= 0.3;
    t.spiked = false;
    t.sculpt = null;
    t.curl = (t.id % 2 ? 1 : -1) * 0.12;
    t.len = Math.max(t.len, t.origLen * 0.6);
  }
  return done;
}

export function decaySteam(h: HairState, dt: number) {
  for (const t of h.tufts) if (t.steamed > 0) t.steamed = Math.max(0, t.steamed - dt * 0.02);
}

export const SPRAY_RADIUS = 55;

/** Thuốc Mọc Tóc: hair around the spray grows fast for a few seconds; bald roots sprout again. */
export function potionSpray(h: HairState, p: Vec): Tuft[] {
  const hit = h.tufts.filter((t) => dist(t.root, p) < SPRAY_RADIUS || (!t.bald && reach(t, p) < SPRAY_RADIUS * 0.5));
  for (const t of hit) {
    t.grow = 6;
    if (t.bald) {
      t.bald = false;
      t.len = 2;
      t.curl = 0.2;
    }
  }
  return hit;
}

export function growTick(h: HairState, dt: number): number {
  let growing = 0;
  for (const t of h.tufts) {
    if (t.grow <= 0) continue;
    t.grow = Math.max(0, t.grow - dt);
    if (t.bald) continue;
    t.len = Math.min(t.len + 22 * dt, t.origLen * 1.6);
    growing++;
  }
  return growing;
}

/** Keo Vĩnh Cửu: maximum gel that never softens. */
export function gelApply(h: HairState, p: Vec): Tuft[] {
  const hit = h.tufts.filter((t) => !t.bald && (dist(t.root, p) < SPRAY_RADIUS || reach(t, p) < SPRAY_RADIUS * 0.5));
  for (const t of hit) {
    t.gel = 1;
    t.eternal = true;
  }
  return hit;
}

/** Storm meets eternal gel: the tufts set like concrete, straight up and longer. */
export function concreteSpikes(h: HairState): Tuft[] {
  const set = h.tufts.filter((t) => !t.bald && t.eternal && t.len > 3);
  for (const t of set) {
    t.spiked = true;
    t.spike = 1;
    t.sculpt = null;
    t.lean = 0;
    t.len = Math.min(t.len * 1.5, t.origLen * MAX_GROWTH);
  }
  return set;
}

/** Máy Tạo Kiểu Tự Động: pulls every zone towards a target and tidies up. */
export function autoStyle(h: HairState, target: Partial<Record<Tuft['zone'], number>>): Tuft[] {
  const done: Tuft[] = [];
  for (const t of h.tufts) {
    if (t.bald) continue;
    const ratio = target[t.zone] ?? 0.7;
    t.len = Math.max(2, t.len + (t.origLen * ratio - t.len) * 0.75);
    t.lean *= 0.3;
    t.fluff *= 0.5;
    t.curl *= 0.5;
    done.push(t);
  }
  return done;
}
