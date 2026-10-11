import { magicLine, MagicLineKey } from './dialogue';
import type { EventId, Mood } from './evaluate';
import { Vec, angleDiff, clamp, dist } from './geometry';
import { Tuft } from './hair';
import {
  RAY_COLORS,
  VACUUM_GULP_TIME,
  VACUUM_MAX_RADIUS,
  VACUUM_MIN_RADIUS,
  combStroke,
  cookerSteam,
  decaySteam,
  rayBlast,
  sculptTo,
  stormGust,
  vacuumGulp,
  vacuumSuck,
  wandCurl,
  wandSelect,
  wandStretch,
} from './magic';
import { RoundState, incident, refreshMetrics, say, sayLater } from './session';
import { TOOLS, ToolId, toolDef } from './tools';

/**
 * Runtime side of the Bộ Đồ Nghề: energy/cooldowns, gestures of the magic tools,
 * visual effects and the combo rules. Hair changes themselves live in magic.ts.
 */

export interface GearRuntime {
  /** 0..1 energy. */
  charge: number;
  /** Hit zero: unusable until fully refilled. */
  overheated: boolean;
  /** Earliest time of the next use (tap tools). */
  nextUseAt: number;
}

export interface MagicState {
  wandSel: number[] | null;
  wandLast: Vec | null;
  rayShots: number;
  aim: { from: Vec; to: Vec } | null;
  vacuumHold: number;
  vacuumGulped: boolean;
  vacuumRadius: number;
  combDir: number | null;
  /** Dyed + standing tufts touched by the current comb stroke. */
  combArt: Set<number>;
  potUntil: number;
  potPending: boolean;
  steamedAt: number;
  giantSaid: boolean;
}

export type ComboId = 'stormLong' | 'sculpt' | 'potSuck';
export type ComboState = Partial<Record<ComboId, { count: number; lastAt: number }>>;

export interface ComboDef {
  id: ComboId;
  name: string;
  tools: [ToolId, ToolId];
  /** What has to be true for it to fire. */
  condition: string;
  maxPerRound: number;
  /** Seconds before the same combo can fire again. */
  cooldown: number;
  event: EventId;
}

export const COMBOS: ComboDef[] = [
  {
    id: 'stormLong',
    name: 'Bão Tóc Dài',
    tools: ['wand', 'storm'],
    condition: 'Máy Sấy Bão thổi trúng ít nhất 8 lọn đã bị Gậy Như Ý kéo dài gấp 1,8 lần.',
    maxPerRound: 2,
    cooldown: 10,
    event: 'comboStormLong',
  },
  {
    id: 'sculpt',
    name: 'Kỳ Lân Bảy Sắc',
    tools: ['ray', 'comb'],
    condition: 'Một đường Lược Rồng chải qua ít nhất 6 lọn đã bị Súng Tóc nhuộm và dựng đứng.',
    maxPerRound: 2,
    cooldown: 8,
    event: 'comboSculpt',
  },
  {
    id: 'potSuck',
    name: 'Hút Nhầm Cả Nồi',
    tools: ['cooker', 'vacuum'],
    condition: 'Dùng Máy Hút trong vòng 10 giây sau khi hấp tóc bằng Nồi Cơm Điện, trúng ít nhất 5 lọn tóc hấp.',
    maxPerRound: 1,
    cooldown: 999,
    event: 'comboPotSuck',
  },
];

export type FxKind = 'beam' | 'ring' | 'sparkle' | 'gust' | 'steam' | 'pot' | 'suck' | 'combo' | 'overheat';
export interface Fx {
  id: number;
  kind: FxKind;
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  t0: number;
  dur: number;
  color?: string;
  text?: string;
}

const MAGIC = new Set<ToolId>(TOOLS.filter((t) => t.group === 'magic').map((t) => t.id));
export const isMagic = (t: ToolId) => MAGIC.has(t);

export function createGear(): Record<ToolId, GearRuntime> {
  return Object.fromEntries(TOOLS.map((t) => [t.id, { charge: 1, overheated: false, nextUseAt: 0 }])) as Record<ToolId, GearRuntime>;
}

export function createMagic(): MagicState {
  return {
    wandSel: null,
    wandLast: null,
    rayShots: 0,
    aim: null,
    vacuumHold: 0,
    vacuumGulped: false,
    vacuumRadius: VACUUM_MIN_RADIUS,
    combDir: null,
    combArt: new Set(),
    potUntil: -1,
    potPending: false,
    steamedAt: -99,
    giantSaid: false,
  };
}

/* ------------------------------------------------------------------ energy */

export type GearStatus = { state: 'ready' | 'cooldown' | 'overheated'; charge: number; wait: number };

export function gearStatus(s: RoundState, id: ToolId): GearStatus {
  const def = toolDef(id);
  const g = s.gear[id];
  if (!def.energy) return { state: 'ready', charge: 1, wait: 0 };
  if (g.overheated) return { state: 'overheated', charge: g.charge, wait: (1 - g.charge) * def.energy.refill };
  const cost = def.energy.costPerUse ?? 0.02;
  if (g.charge + 1e-6 < cost) return { state: 'cooldown', charge: g.charge, wait: ((cost - g.charge) * def.energy.refill) };
  if (s.time < g.nextUseAt) return { state: 'cooldown', charge: g.charge, wait: g.nextUseAt - s.time };
  return { state: 'ready', charge: g.charge, wait: 0 };
}

function deny(s: RoundState) {
  s.deniedAt = s.time;
  s.sfx.push('deny');
}

function spend(s: RoundState, id: ToolId, amount: number) {
  const g = s.gear[id];
  g.charge = Math.max(0, g.charge - amount);
  if (g.charge <= 1e-4) {
    g.charge = 0;
    g.overheated = true;
    s.sfx.push('overheat');
    const p = s.pointer.stage;
    if (p) addFx(s, 'overheat', p, { dur: 1.2, text: 'HẾT PHÉP!' });
  }
}

/* ------------------------------------------------------------------ helpers */

function addFx(s: RoundState, kind: FxKind, p: Vec, extra: Partial<Fx> = {}) {
  s.fx.push({ id: s.fxSeq++, kind, x: p.x, y: p.y, t0: s.time, dur: 0.6, ...extra });
  if (s.fx.length > 40) s.fx.shift();
}

/** Head-local -> stage coordinates (effects are drawn on the stage). */
function stage(s: RoundState, p: Vec): Vec {
  return { x: p.x + s.headOffset.x, y: p.y + s.headOffset.y };
}

function mline(s: RoundState, key: MagicLineKey) {
  return magicLine(s.rng, key, s.customer.personality);
}

function moodFor(s: RoundState, loves: Mood, others: Mood): Mood {
  return s.customer.personality === 'dramatic' ? loves : others;
}

function byIds(s: RoundState, ids: number[]): Tuft[] {
  const set = new Set(ids);
  return s.hair.tufts.filter((t) => set.has(t.id));
}

function touched(s: RoundState, tufts: Tuft[]) {
  if (!tufts.length) return;
  s.hasCut = true;
  s.pointer.magicUsed = true;
  for (const t of tufts) s.pointer.zones.add(t.zone);
}

/** First time a gadget is used on this customer they comment on it (unless something louder happens). */
function firstUse(s: RoundState, id: ToolId, silent = false) {
  if (s.toolsUsed.includes(id)) return;
  s.toolsUsed.push(id);
  if (silent) return;
  const key = `first_${id}` as MagicLineKey;
  sayLater(s, 0.35, mline(s, key), moodFor(s, 'happy', 'suspicious'));
  // Strange gadgets near your head are unsettling — except for Khoa.
  if (s.customer.personality !== 'dramatic') s.patience = clamp(s.patience - 3, 0, 100);
}

/** Anti-repeat gate for combos: per-round cap + cooldown. */
export function comboReady(s: RoundState, id: ComboId): boolean {
  const def = COMBOS.find((c) => c.id === id)!;
  const st = s.combos[id];
  if (!st) return true;
  return st.count < def.maxPerRound && s.time - st.lastAt >= def.cooldown;
}

function comboFire(s: RoundState, id: ComboId, at: Vec, chaos: number) {
  const def = COMBOS.find((c) => c.id === id)!;
  const st = s.combos[id] ?? { count: 0, lastAt: -99 };
  st.count++;
  st.lastAt = s.time;
  s.combos[id] = st;
  incident(s, def.event, s.customer.personality === 'dramatic' ? Math.round(chaos / 3) : chaos);
  addFx(s, 'combo', stage(s, at), { dur: 1.6, text: `COMBO: ${def.name}!` });
  s.sfx.push('combo');
}

/* ------------------------------------------------------------------ gestures */

/** Pointer pressed with a magic tool. Returns false if the press does not start a drag. */
export function gearDown(s: RoundState, p: Vec): boolean {
  const id = s.tool;
  const st = gearStatus(s, id);
  if (st.state !== 'ready') {
    deny(s);
    return false;
  }
  const m = s.magic;
  switch (id) {
    case 'wand': {
      m.wandSel = wandSelect(s.hair, p).map((t) => t.id);
      m.wandLast = p;
      addFx(s, 'sparkle', stage(s, p), { color: '#ffe066' });
      firstUse(s, id);
      return true;
    }
    case 'ray': {
      const color = RAY_COLORS[m.rayShots % RAY_COLORS.length];
      m.rayShots++;
      const hit = rayBlast(s.hair, p, color);
      const def = toolDef('ray').energy!;
      spend(s, 'ray', def.costPerUse!);
      s.gear.ray.nextUseAt = s.time + (def.gap ?? 0);
      const at = stage(s, p);
      addFx(s, 'beam', { x: 392, y: 470 }, { x2: at.x, y2: at.y, color, dur: 0.25 });
      addFx(s, 'ring', at, { color, dur: 0.5 });
      s.sfx.push('zap');
      touched(s, hit);
      firstUse(s, id);
      return true;
    }
    case 'storm':
      m.aim = { from: p, to: p };
      return true;
    case 'vacuum':
      m.vacuumHold = 0;
      m.vacuumGulped = false;
      m.vacuumRadius = VACUUM_MIN_RADIUS;
      firstUse(s, id);
      return true;
    case 'comb':
      m.combDir = null;
      m.combArt = new Set();
      firstUse(s, id);
      return true;
    case 'cooker': {
      const def = toolDef('cooker').energy!;
      spend(s, 'cooker', def.costPerUse!);
      s.gear.cooker.nextUseAt = s.time + (def.gap ?? 0);
      m.potUntil = s.time + 1.5;
      m.potPending = true;
      addFx(s, 'pot', { x: 200, y: 150 }, { dur: 1.9 });
      s.sfx.push('steam');
      firstUse(s, id);
      return false;
    }
    default:
      return false;
  }
}

export function gearMove(s: RoundState, prev: Vec, p: Vec) {
  const m = s.magic;
  switch (s.tool) {
    case 'wand': {
      if (!m.wandSel || !m.wandLast) return;
      const dx = p.x - m.wandLast.x;
      const dy = p.y - m.wandLast.y;
      m.wandLast = p;
      const sel = byIds(s, m.wandSel);
      const r = wandStretch(sel, dx, dy);
      touched(s, sel);
      if (r.regrown.length && !s.events.regrow) {
        incident(s, 'regrow', 0);
        say(s, mline(s, 'regrow'), 'shocked');
      }
      if (Math.abs(dy) + Math.abs(dx) > 3 && s.rng() < 0.35) addFx(s, 'sparkle', stage(s, p), { color: '#ffe066' });
      if (Math.abs(r.grown) > 2 && s.rng() < 0.15) s.sfx.push('sparkle');
      return;
    }
    case 'storm':
      if (m.aim) m.aim.to = p;
      return;
    case 'comb': {
      if (s.gear.comb.overheated) return;
      const d = dist(prev, p);
      if (d < 1.5) return;
      const dir = Math.atan2(p.y - prev.y, p.x - prev.x);
      const turn = m.combDir === null ? 0 : clamp(angleDiff(m.combDir, dir), -0.6, 0.6);
      m.combDir = dir;
      const hit = combStroke(s.hair, prev, p, turn);
      for (const t of hit) if (t.tint && t.spiked) m.combArt.add(t.id);
      touched(s, hit);
      return;
    }
  }
}

/** Pointer released with a magic tool. */
export function gearUp(s: RoundState) {
  const m = s.magic;
  const ptr = s.pointer;
  switch (s.tool) {
    case 'wand': {
      if (ptr.travel < 4 && ptr.lastLocal) {
        const curled = wandCurl(s.hair, ptr.lastLocal);
        if (curled.length) {
          spend(s, 'wand', toolDef('wand').energy!.costPerUse!);
          addFx(s, 'sparkle', stage(s, ptr.lastLocal), { color: '#ff9bf0' });
          s.sfx.push('sparkle');
          touched(s, curled);
        }
      }
      m.wandSel = null;
      m.wandLast = null;
      refreshMetrics(s);
      if (!m.giantSaid && s.metrics.longFrac >= 0.15) {
        m.giantSaid = true;
        incident(s, 'wandGiant', 6);
        say(s, mline(s, 'wandGiant'), moodFor(s, 'ecstatic', 'shocked'), { shout: true });
      }
      return;
    }
    case 'storm': {
      const aim = m.aim;
      m.aim = null;
      if (!aim) return;
      const len = dist(aim.from, aim.to);
      if (len < 14) return; // too short: no gust, no cost
      const dir = { x: (aim.to.x - aim.from.x) / len, y: (aim.to.y - aim.from.y) / len };
      const power = clamp(len / 140, 0.25, 1);
      const r = stormGust(s.hair, dir, power);
      spend(s, 'storm', toolDef('storm').energy!.costPerUse!);
      addFx(s, 'gust', stage(s, aim.from), { x2: dir.x, y2: dir.y, dur: 0.9, color: '#bfe8ff' });
      s.sfx.push('whoosh');
      ptr.magicUsed = true;
      s.hasCut = true;
      // Combo: Gậy Như Ý + Máy Sấy Bão.
      const combo = r.whipped.length >= 8 && comboReady(s, 'stormLong');
      firstUse(s, 'storm', combo);
      if (combo) {
        comboFire(s, 'stormLong', aim.to, 14);
        // The longest whipped tufts snap off and fly away with the wind.
        r.whipped.forEach((t, i) => {
          if (i % 3 === 0) t.len = Math.max(t.origLen * 0.9, t.len * 0.5);
        });
        for (let i = 0; i < 24; i++) {
          s.particles.push({
            x: 200 + (s.rng() - 0.5) * 160,
            y: 150 + s.rng() * 120,
            vx: dir.x * (300 + s.rng() * 300),
            vy: dir.y * (300 + s.rng() * 300) - 120,
            rot: s.rng() * 360,
            vr: 600,
            len: 10 + s.rng() * 16,
            life: 2.5,
            landed: false,
          });
        }
        say(s, mline(s, 'comboStormLong'), moodFor(s, 'ecstatic', 'shocked'), { shout: true });
      }
      return;
    }
    case 'vacuum':
      m.vacuumHold = 0;
      m.vacuumRadius = VACUUM_MIN_RADIUS;
      return;
    case 'comb': {
      // Combo: Súng Tóc 3000 + Lược Rồng.
      if (m.combArt.size >= 6 && comboReady(s, 'sculpt') && ptr.lastLocal) {
        const art = byIds(s, [...m.combArt]);
        const cx = art.reduce((a, t) => a + t.root.x, 0) / art.length;
        const cy = art.reduce((a, t) => a + t.root.y, 0) / art.length;
        // The point sticks out from the head, past where the comb ended.
        const out = { x: ptr.lastLocal.x - 200, y: ptr.lastLocal.y - 250 };
        const ol = Math.hypot(out.x, out.y) || 1;
        const target = { x: cx + (out.x / ol) * 95, y: cy + (out.y / ol) * 95 - 20 };
        sculptTo(art, target);
        comboFire(s, 'sculpt', target, 12);
        say(s, mline(s, 'comboSculpt'), moodFor(s, 'ecstatic', 'shocked'), { shout: true });
      }
      m.combArt = new Set();
      m.combDir = null;
      return;
    }
  }
}

/** Abort any gesture without triggering it (tool switch, round end). */
export function gearCancel(s: RoundState) {
  const m = s.magic;
  m.aim = null;
  m.wandSel = null;
  m.wandLast = null;
  m.vacuumHold = 0;
  m.combArt = new Set();
  m.combDir = null;
}

/* ------------------------------------------------------------------ per-frame */

export function gearTick(s: RoundState, dt: number, local: Vec | null) {
  const m = s.magic;
  const active = local ? s.tool : null;

  // Refill energy for every tool that is not being held right now.
  for (const def of TOOLS) {
    if (!def.energy) continue;
    const g = s.gear[def.id];
    const held = active === def.id && (def.id === 'wand' || def.id === 'vacuum' || def.id === 'comb');
    // Hold tools recover whenever idle; tap tools work like a magazine and reload once empty.
    const magazine = def.energy.drainPerSec === undefined;
    if (!held && (!magazine || g.overheated)) {
      g.charge = Math.min(1, g.charge + dt / def.energy.refill);
      if (g.overheated && g.charge >= 1) g.overheated = false;
    }
  }

  if (local && s.tool === 'wand' && m.wandSel) {
    spend(s, 'wand', toolDef('wand').energy!.drainPerSec! * dt);
    if (s.gear.wand.overheated) m.wandSel = null;
  }
  if (local && s.tool === 'comb' && m.combDir !== null) {
    spend(s, 'comb', toolDef('comb').energy!.drainPerSec! * dt);
  }
  if (local && s.tool === 'vacuum' && !s.gear.vacuum.overheated) suck(s, local, dt);

  // Nồi cơm điện: the pot lifts and the steamed bun is revealed.
  if (m.potPending && s.time >= m.potUntil) {
    m.potPending = false;
    const done = cookerSteam(s.hair);
    m.steamedAt = s.time;
    s.hasCut = true;
    addFx(s, 'steam', { x: 200, y: 140 }, { dur: 1.4 });
    s.sfx.push('pop');
    refreshMetrics(s);
    if (done.length) say(s, mline(s, 'cooked'), moodFor(s, 'ecstatic', 'shocked'));
  }
  decaySteam(s.hair, dt);
}

function suck(s: RoundState, p: Vec, dt: number) {
  const m = s.magic;
  spend(s, 'vacuum', toolDef('vacuum').energy!.drainPerSec! * dt);
  m.vacuumHold += dt;
  m.vacuumRadius = VACUUM_MIN_RADIUS + (VACUUM_MAX_RADIUS - VACUUM_MIN_RADIUS) * clamp(m.vacuumHold / VACUUM_GULP_TIME, 0, 1);
  const r = vacuumSuck(s.hair, p, m.vacuumRadius, dt);
  if (r.removed > 0) {
    s.hasCut = true;
    s.pointer.removed += r.removed;
    s.pointer.magicUsed = true;
    if (s.rng() < 0.5) addFx(s, 'suck', stage(s, r.at[0] ?? p), { x2: p.x + s.headOffset.x, y2: p.y + s.headOffset.y, dur: 0.35 });
  }

  // Combo: Nồi Cơm Điện + Máy Hút — the steamed bun goes in all at once.
  if (r.steamedHit >= 5 && s.time - m.steamedAt < 10 && comboReady(s, 'potSuck')) {
    const near = s.hair.tufts.filter((t) => !t.bald && t.steamed > 0.3 && dist(t.root, p) < 115);
    for (const t of near) {
      if (dist(t.root, p) < 45) {
        t.bald = true;
        t.len = 0;
      } else {
        t.len = Math.max(3, t.len * 0.25);
      }
      t.steamed = 0;
      t.fluff = 0.2;
    }
    comboFire(s, 'potSuck', p, 18);
    s.sfx.push('gulp');
    refreshMetrics(s);
    say(s, mline(s, 'comboPotSuck'), moodFor(s, 'crying', 'shocked'), { shout: true });
    m.vacuumGulped = true;
    return;
  }

  // Held too long: it swallows a whole patch (warning: the ring turns red first).
  if (!m.vacuumGulped && m.vacuumHold >= VACUUM_GULP_TIME) {
    m.vacuumGulped = true;
    const gone = vacuumGulp(s.hair, p, m.vacuumRadius);
    if (gone.length) {
      incident(s, 'vacuumGulp', 12);
      s.sfx.push('gulp');
      s.lastBaldAt = s.time;
      if (!s.events.baldPatch) s.events.baldPatch = 1;
      refreshMetrics(s);
      sayLater(s, 0.5, mline(s, 'vacuumGulp'), 'shocked', true);
    }
  }
}
