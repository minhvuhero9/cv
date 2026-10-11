import { CustomerDef, CustomerId, customerById } from './customers';
import { demandIgnored, demandLine, demandMet, eventLine, EventLineKey, photoLine, tierLine } from './dialogue';
import { EventId, EVENT_TITLES, Mood, RoundResult, evaluateRound } from './evaluate';
import { NOSE, Vec, clamp, dist } from './geometry';
import {
  CutResult,
  HairState,
  Zone,
  clipperDwell,
  clipperSweep,
  cloneHair,
  createHair,
  decayDwell,
  dryerBlow,
  scissorsSnip,
  scissorsSweep,
} from './hair';
import { HairMetrics, LEAN_RUNAWAY, localLean, measureHair } from './metrics';
import { Rng, between, makeRng } from './rng';
import { GearRuntime, MagicState, createGear, createMagic, gearCancel, gearDown, gearMove, gearTick, gearUp, isMagic, Fx, ComboState } from './gear';
import { ToolId } from './tools';

export type Tool = ToolId;
export const BASIC_TOOLS: ToolId[] = ['clipper', 'scissors', 'dryer'];
export type Phase = 'intro' | 'cutting' | 'mirror' | 'result';
export type Sfx =
  | 'snip'
  | 'bald'
  | 'boing'
  | 'gasp'
  | 'sneeze'
  | 'ding'
  | 'fail'
  | 'warn'
  | 'flash'
  | 'pop'
  | 'zap'
  | 'sparkle'
  | 'whoosh'
  | 'gulp'
  | 'steam'
  | 'deny'
  | 'overheat'
  | 'combo';
export type EndReason = 'done' | 'timeout' | 'walkout';

export const TIME_LIMIT = 75;
export const MIRROR_REVEAL = 1.5;
export const MIRROR_END = 4.2;
export const WALKOUT_WINDOW = 3.2;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  len: number;
  life: number;
  landed: boolean;
}

export interface Toast {
  id: number;
  title: string;
  until: number;
}

export interface Bubble {
  text: string;
  until: number;
  shout: boolean;
}

export type MotionKind = 'turn' | 'flinch' | 'sneeze';
export interface Motion {
  kind: MotionKind;
  stage: 'warn' | 'act';
  t: number;
  dx: number;
  dy: number;
  strayed: boolean;
}

const WARN_TIME: Record<MotionKind, number> = { turn: 0.95, flinch: 0.75, sneeze: 1.05 };
const ACT_TIME: Record<MotionKind, number> = { turn: 0.95, flinch: 0.6, sneeze: 0.55 };

interface PendingLine {
  at: number;
  text: string | (() => string);
  mood?: Mood;
  shout?: boolean;
}

export interface RoundState {
  customer: CustomerDef;
  seed: number;
  rng: Rng;
  hair: HairState;
  before: HairState;
  beforeMetrics: HairMetrics;
  metrics: HairMetrics;
  phase: Phase;
  time: number;
  tool: Tool;
  pointer: {
    down: boolean;
    stage: Vec | null;
    lastLocal: Vec | null;
    stroke: number;
    zones: Set<Zone>;
    removed: number;
    dryerUsed: boolean;
    /** Distance the tool travelled during this stroke (head-local px). */
    travel: number;
    /** A magic tool changed the hair during this stroke. */
    magicUsed: boolean;
  };
  headOffset: Vec;
  motion: Motion | null;
  nextTurnCheck: number;
  patience: number;
  incident: number;
  lastIncidentAt: number;
  chaos: number;
  maxTierSaid: number;
  nerves: number;
  clippings: number;
  particles: Particle[];
  events: Partial<Record<EventId, number>>;
  log: { id: EventId; t: number }[];
  toasts: Toast[];
  toastSeq: number;
  bubble: Bubble | null;
  pending: PendingLine[];
  moodOverride: { mood: Mood; until: number } | null;
  zoneStrokes: Record<Zone, number>;
  fixLoopZones: Set<Zone>;
  fixCount: number;
  bestSat: number;
  hasCut: boolean;
  demand: { zone: Zone; deadline: number } | null;
  nextDemandAt: number;
  photoUntil: number;
  nextPhotoAt: number;
  combAttempt: number;
  lastBaldAt: number;
  sneezeBuild: number;
  sneezeCooldown: number;
  hotCooldown: number;
  walkout: { until: number; canBeg: boolean } | null;
  begUsed: boolean;
  ruleTimer: number;
  endReason: EndReason | null;
  mirrorT: number;
  revealed: boolean;
  result: RoundResult | null;
  flashUntil: number;
  sfx: Sfx[];
  /** Tools the player may use this round (basic tools are always included). */
  unlocked: ToolId[];
  /** Energy / cooldown per magic tool. */
  gear: Record<ToolId, GearRuntime>;
  /** In-progress gestures of the magic tools. */
  magic: MagicState;
  combos: ComboState;
  fx: Fx[];
  fxSeq: number;
  /** Magic tools already tried on this customer (first use gets a reaction). */
  toolsUsed: ToolId[];
  /** When a tool use was refused (cooldown/locked), for UI feedback. */
  deniedAt: number;
}

export interface RoundOptions {
  unlocked?: ToolId[];
}

export function createRound(customerId: CustomerId, seed = Date.now() & 0xffff, opts: RoundOptions = {}): RoundState {
  const customer = customerById(customerId);
  const hair = createHair(customer.hair);
  const metrics = measureHair(hair);
  return {
    customer,
    seed,
    rng: makeRng(seed),
    hair,
    before: cloneHair(hair),
    beforeMetrics: metrics,
    metrics,
    phase: 'intro',
    time: 0,
    tool: customer.id === 'khoa' ? 'dryer' : customer.id === 'bay' ? 'scissors' : 'clipper',
    pointer: { down: false, stage: null, lastLocal: null, stroke: 0, zones: new Set(), removed: 0, dryerUsed: false, travel: 0, magicUsed: false },
    headOffset: { x: 0, y: 0 },
    motion: null,
    nextTurnCheck: 4,
    patience: customer.patience,
    incident: 0,
    lastIncidentAt: -99,
    chaos: 0,
    maxTierSaid: 0,
    nerves: 0,
    clippings: 0,
    particles: [],
    events: {},
    log: [],
    toasts: [],
    toastSeq: 0,
    bubble: { text: customer.request, until: 4, shout: false },
    pending: [{ at: 1.6, text: customer.catch }],
    moodOverride: null,
    zoneStrokes: { left: 0, right: 0, top: 0, fringe: 0 },
    fixLoopZones: new Set(),
    fixCount: 0,
    bestSat: 0,
    hasCut: false,
    demand: null,
    nextDemandAt: 0,
    photoUntil: 0,
    nextPhotoAt: 5,
    combAttempt: 0,
    lastBaldAt: -99,
    sneezeBuild: 0,
    sneezeCooldown: 0,
    hotCooldown: 0,
    walkout: null,
    begUsed: false,
    ruleTimer: 0,
    endReason: null,
    mirrorT: 0,
    revealed: false,
    result: null,
    flashUntil: 0,
    sfx: [],
    unlocked: [...new Set([...BASIC_TOOLS, ...(opts.unlocked ?? [])])],
    gear: createGear(),
    magic: createMagic(),
    combos: {},
    fx: [],
    fxSeq: 0,
    toolsUsed: [],
    deniedAt: -99,
  };
}

/* ------------------------------------------------------------------ helpers */

export function say(s: RoundState, text: string, mood?: Mood, opts: { dur?: number; shout?: boolean } = {}) {
  const dur = opts.dur ?? Math.max(2.2, text.length * 0.065);
  s.bubble = { text, until: s.time + dur, shout: opts.shout ?? false };
  if (mood) s.moodOverride = { mood, until: s.time + dur };
}

export function sayLater(s: RoundState, delay: number, text: PendingLine['text'], mood?: Mood, shout?: boolean) {
  s.pending.push({ at: s.time + delay, text, mood, shout });
}

function line(s: RoundState, key: EventLineKey) {
  return eventLine(s.rng, key, s.customer.personality);
}

/** Records an incident: adds to the event log, chaos, and shows a toast. */
export function incident(s: RoundState, id: EventId, chaos: number, toast = true) {
  s.events[id] = (s.events[id] ?? 0) + 1;
  if (toast) s.log.push({ id, t: s.time });
  s.incident = clamp(s.incident + chaos, 0, 100);
  s.lastIncidentAt = s.time;
  if (toast) {
    s.toasts.push({ id: s.toastSeq++, title: EVENT_TITLES[id], until: s.time + 2.4 });
    if (s.toasts.length > 3) s.toasts.shift();
  }
}

export function toLocal(s: RoundState, p: Vec): Vec {
  return { x: p.x - s.headOffset.x, y: p.y - s.headOffset.y };
}

export function chaosTier(chaos: number): 0 | 1 | 2 | 3 {
  return chaos < 25 ? 0 : chaos < 50 ? 1 : chaos < 75 ? 2 : 3;
}

export const CHAOS_TIER_LABEL = ['Bình yên', 'Bắt đầu lo', 'Nghi ngờ tay nghề', 'HỖN LOẠN'];

/** Chaos = lasting damage visible on the head + recent incidents (which cool down). */
export function damageChaos(m: HairMetrics, dramatic: boolean): number {
  return clamp(
    m.baldFrac * 160 +
      m.unevenLR * 50 +
      Math.max(0, Math.abs(m.leanAvg) - 0.15) * 40 +
      Math.max(0, 0.45 - m.avg) * 60 +
      (dramatic ? 0 : m.spikedFrac * 40 + m.tintedFrac * 30 + m.longFrac * 35 + m.sculptedFrac * 40),
    0,
    65,
  );
}

export function refreshMetrics(s: RoundState) {
  s.metrics = measureHair(s.hair);
  s.chaos = clamp(damageChaos(s.metrics, s.customer.personality === 'dramatic') + s.incident, 0, 100);
}

/* ------------------------------------------------------------------ input */

export function startCutting(s: RoundState) {
  if (s.phase !== 'intro') return;
  s.phase = 'cutting';
}

/** Switches tool; locked tools are refused. Finishes (or cancels) any gesture in progress. */
export function setTool(s: RoundState, tool: Tool): boolean {
  if (!s.unlocked.includes(tool)) {
    s.deniedAt = s.time;
    return false;
  }
  if (s.pointer.down) {
    gearCancel(s);
    endStroke(s);
  }
  s.tool = tool;
  return true;
}

export function canCut(s: RoundState) {
  return s.phase === 'cutting' && !s.walkout && s.time >= s.magic.potUntil;
}

export function pointerDown(s: RoundState, p: Vec) {
  if (!canCut(s)) return;
  const ptr = s.pointer;
  ptr.down = true;
  ptr.stage = p;
  ptr.stroke++;
  ptr.zones = new Set();
  ptr.removed = 0;
  ptr.dryerUsed = false;
  ptr.magicUsed = false;
  const local = toLocal(s, p);
  ptr.lastLocal = local;
  ptr.travel = 0;
  if (isMagic(s.tool)) {
    if (!gearDown(s, local)) ptr.down = false;
    return;
  }
  if (s.tool === 'clipper') {
    handleCut(s, clipperSweep(s.hair, local, local, ptr.stroke));
  }
}

export function pointerMove(s: RoundState, p: Vec) {
  const ptr = s.pointer;
  ptr.stage = p;
  if (!ptr.down || !canCut(s)) return;
  const local = toLocal(s, p);
  const prev = ptr.lastLocal ?? local;
  ptr.travel += dist(prev, local);
  if (isMagic(s.tool)) {
    gearMove(s, prev, local);
  } else if (s.tool === 'scissors') {
    const r = scissorsSweep(s.hair, prev, local, ptr.stroke);
    if (r.cut.length) s.sfx.push('snip');
    handleCut(s, r);
  } else if (s.tool === 'clipper') {
    handleCut(s, clipperSweep(s.hair, prev, local, ptr.stroke));
  }
  ptr.lastLocal = local;
}

export function pointerUp(s: RoundState) {
  const ptr = s.pointer;
  if (!ptr.down) return;
  // A click (no drag) with the scissors snips whatever is under the blades.
  if (s.tool === 'scissors' && ptr.travel < 4 && ptr.lastLocal && canCut(s)) {
    handleCut(s, scissorsSnip(s.hair, ptr.lastLocal, ptr.stroke));
    s.sfx.push('snip');
  }
  if (isMagic(s.tool) && canCut(s)) gearUp(s);
  endStroke(s);
}

export function pointerLeave(s: RoundState) {
  s.pointer.stage = null;
  pointerUp(s);
}

export function handleCut(s: RoundState, r: CutResult) {
  if (!r.cut.length && !r.newlyBald.length) return;
  s.hasCut = true;
  const ptr = s.pointer;
  ptr.removed += r.removed;
  for (const t of r.cut) ptr.zones.add(t.zone);
  s.clippings = Math.min(60, s.clippings + r.removed / 8);
  spawnClippings(s, r);
  if (r.newlyBald.length) onBald(s);
}

/** A bald moment counts as a *new* patch when the clipper had stopped shaving for 1.5s. */
function onBald(s: RoundState) {
  refreshMetrics(s);
  const gap = s.time - s.lastBaldAt;
  s.lastBaldAt = s.time;
  if (!s.events.baldPatch) {
    incident(s, 'baldPatch', 14);
    s.sfx.push('bald');
    s.patience = clamp(s.patience - 12, 0, 100);
    // Comedic beat: a short silence before the customer notices.
    s.moodOverride = { mood: 'neutral', until: s.time + 0.8 };
    sayLater(s, 0.8, line(s, 'bald'), 'suspicious');
  } else if (gap > 1.5 && (s.events.baldPatch ?? 0) < 6) {
    incident(s, 'baldPatch', 6, false);
    s.sfx.push('bald');
    s.patience = clamp(s.patience - 6, 0, 100);
    sayLater(s, 0.5, line(s, 'baldAgain'), 'shocked');
  }
}

function spawnClippings(s: RoundState, r: CutResult) {
  const n = Math.min(10, Math.ceil(r.removed / 10));
  for (let i = 0; i < n && s.particles.length < 160; i++) {
    const at = r.at[i % r.at.length];
    s.particles.push({
      x: at.x + s.headOffset.x,
      y: at.y + s.headOffset.y,
      vx: between(s.rng, -60, 60),
      vy: between(s.rng, -80, 10),
      rot: between(s.rng, 0, 360),
      vr: between(s.rng, -400, 400),
      len: between(s.rng, 5, 12),
      life: 4,
      landed: false,
    });
  }
}

/** Called when the player lifts the tool: per-stroke rules live here. */
function endStroke(s: RoundState) {
  const ptr = s.pointer;
  ptr.down = false;
  ptr.lastLocal = null;
  const cutSomething = ptr.removed > 0.5;
  if (!cutSomething && !ptr.dryerUsed && !ptr.magicUsed) return;
  refreshMetrics(s);
  const c = s.customer;
  const zones = [...ptr.zones];

  if (cutSomething) {
    for (const z of zones) s.zoneStrokes[z]++;

    // Wrong tool for this customer.
    if (s.tool === 'clipper') {
      // Tuấn only minds the clipper once it starts eating the long top he wants to keep.
      const wrong = c.id === 'bay' || c.id === 'khoa' || (c.id === 'tuan' && ptr.zones.has('top') && s.metrics.zone.top < 0.55);
      if (wrong) {
        const n = s.events.wrongTool ?? 0;
        incident(s, 'wrongTool', n === 0 ? 10 : 4, n === 0);
        s.patience = clamp(s.patience - (c.id === 'bay' ? 10 : 5), 0, 100);
        if (n < 3) say(s, line(s, 'wrongTool'), c.id === 'bay' ? 'angry' : 'worried', { shout: c.id !== 'tuan' });
      }
    }

    // Khoa: every snip scares him a bit more.
    if (c.id === 'khoa') s.nerves = clamp(s.nerves + 14 + ptr.removed / 9 + (s.tool === 'clipper' ? 20 : 0), 0, 100);

    // Chú Bảy: did we do what he asked?
    if (c.id === 'bay' && s.demand && ptr.zones.has(s.demand.zone)) {
      s.fixCount++;
      s.patience = clamp(s.patience + 6, 0, 100);
      say(s, demandMet(s.rng), 'neutral', { dur: 1.4 });
      s.demand = null;
      s.nextDemandAt = s.time + between(s.rng, 2.2, 3.4);
    }

    // Càng sửa càng sai: same zone hammered until it's much shorter than the rest.
    for (const z of zones) {
      if (s.zoneStrokes[z] < 5 || s.fixLoopZones.has(z)) continue;
      const others = (['left', 'right', 'top', 'fringe'] as Zone[]).filter((o) => o !== z);
      const otherAvg = others.reduce((a, o) => a + s.metrics.zone[o], 0) / others.length;
      if (s.metrics.zone[z] < otherAvg - 0.22) {
        s.fixLoopZones.add(z);
        incident(s, 'fixLoop', 12);
        s.sfx.push('boing');
        sayLater(s, 0.4, line(s, 'fixLoop'), 'suspicious');
      }
    }
  }

  // Phút chót toang: it was nearly done, then one more stroke.
  const sat = c.satisfaction(s.metrics);
  if (s.bestSat >= 70 && sat < s.bestSat - 15 && !s.events.lastMinuteRuin) {
    incident(s, 'lastMinuteRuin', 12);
    s.sfx.push('fail');
    sayLater(s, 0.5, line(s, 'ruin'), c.personality === 'dramatic' ? 'crying' : 'angry');
  }
  s.bestSat = Math.max(s.bestSat, sat);
}

export function beg(s: RoundState) {
  if (!s.walkout || !s.walkout.canBeg) return;
  s.walkout = null;
  s.begUsed = true;
  s.incident = clamp(s.incident - 30, 0, 100);
  s.patience = clamp(Math.max(s.patience, 0) + 30, 0, 100);
  refreshMetrics(s);
  say(s, line(s, 'begAccepted'), 'suspicious');
}

export function finish(s: RoundState, reason: EndReason) {
  if (s.phase !== 'cutting') return;
  gearCancel(s);
  if (s.pointer.down) endStroke(s);
  s.pointer.down = false;
  s.motion = null;
  s.walkout = null;
  s.demand = null;
  s.pending = [];
  s.endReason = reason;
  s.phase = 'mirror';
  s.mirrorT = 0;
  s.headOffset = { x: 0, y: 0 };
  refreshMetrics(s);
  s.result = evaluateRound(
    {
      customer: s.customer,
      metrics: s.metrics,
      before: s.beforeMetrics,
      chaos: s.chaos,
      events: s.events,
      fixCount: s.fixCount,
      maxZoneStrokes: Math.max(...Object.values(s.zoneStrokes)),
      walkedOut: reason === 'walkout',
      timedOut: reason === 'timeout',
    },
    s.rng,
  );
  if (reason === 'walkout') {
    say(s, line(s, 'walkout'), 'angry', { dur: 3, shout: true });
  } else {
    s.bubble = { text: '…', until: s.time + MIRROR_REVEAL, shout: false };
    s.moodOverride = { mood: 'neutral', until: s.time + MIRROR_REVEAL };
  }
}

/** Skip the mirror animation straight to the result card. */
export function skipMirror(s: RoundState) {
  if (s.phase !== 'mirror') return;
  if (!s.revealed) reveal(s);
  s.phase = 'result';
}

function reveal(s: RoundState) {
  const r = s.result!;
  s.revealed = true;
  if (r.walkedOut) return;
  say(s, r.line, r.mood, { dur: 6, shout: r.mood === 'angry' || r.mood === 'ecstatic' || r.mood === 'shocked' });
  s.sfx.push(r.tier === 'love' || r.tier === 'ok' ? 'ding' : 'fail');
  if (r.special && r.mood === 'ecstatic') {
    s.flashUntil = s.time + 0.35;
    s.sfx.push('flash');
  }
}

/* ------------------------------------------------------------------ simulation */

function startMotion(s: RoundState, kind: MotionKind) {
  const dir = s.rng() < 0.5 ? -1 : 1;
  const dx = kind === 'turn' ? dir * 46 : kind === 'flinch' ? dir * 26 : dir * 8;
  const dy = kind === 'turn' ? 4 : kind === 'flinch' ? -24 : 30;
  s.motion = { kind, stage: 'warn', t: 0, dx, dy, strayed: false };
  s.sfx.push('warn');
  if (kind === 'turn') say(s, line(s, 'turnWarn'), 'suspicious', { dur: 1.6 });
  if (kind === 'flinch') say(s, line(s, 'flinchWarn'), 'flinch', { dur: 1.3 });
  if (kind === 'sneeze') say(s, line(s, 'sneezeWarn'), 'sneeze', { dur: 1.3 });
}

function updateMotion(s: RoundState, dt: number) {
  const m = s.motion;
  if (!m) {
    s.headOffset = { x: 0, y: 0 };
    return;
  }
  m.t += dt;
  if (m.stage === 'warn') {
    s.headOffset = { x: 0, y: 0 };
    if (m.t >= WARN_TIME[m.kind]) {
      m.stage = 'act';
      m.t = 0;
      if (m.kind === 'sneeze') {
        say(s, line(s, 'sneeze'), 'sneeze', { dur: 1.2, shout: true });
        s.sfx.push('sneeze');
        burstClippings(s);
      }
      if (m.kind === 'flinch') s.sfx.push('gasp');
    }
    return;
  }
  const T = ACT_TIME[m.kind];
  const u = m.t / T;
  // Quick out, hold, ease back.
  const k = u < 0.22 ? u / 0.22 : u < 0.62 ? 1 : Math.max(0, 1 - (u - 0.62) / 0.38);
  const e = k * k * (3 - 2 * k);
  s.headOffset = { x: m.dx * e, y: m.dy * e };
  if (m.t >= T) {
    s.headOffset = { x: 0, y: 0 };
    const kind = m.kind;
    const strayed = m.strayed;
    s.motion = null;
    if (kind === 'turn') {
      incident(s, 'headTurn', strayed ? 6 : 2, !strayed);
      if (!strayed) say(s, line(s, 'turnSafe'), 'neutral', { dur: 1.6 });
    }
    if (kind === 'sneeze') {
      incident(s, 'sneeze', 8);
      s.sneezeCooldown = s.time + 9;
    }
    if (kind === 'flinch') {
      s.nerves = 25;
      incident(s, 'headTurn', strayed ? 6 : 1, false);
    }
    if (strayed) sayLater(s, 0.3, line(s, 'turnStray'), kind === 'flinch' ? 'crying' : 'angry', true);
  }
}

function burstClippings(s: RoundState) {
  s.clippings = 0;
  s.sneezeBuild = 0;
  for (const p of s.particles) {
    p.vy = between(s.rng, -320, -120);
    p.vx = between(s.rng, -260, 260);
    p.landed = false;
    p.life = 2;
  }
}

/** If the head moves under a running tool, the tool cuts along the relative path. */
function strayCut(s: RoundState) {
  const ptr = s.pointer;
  if (!ptr.down || !ptr.stage || !ptr.lastLocal) return;
  const local = toLocal(s, ptr.stage);
  if (dist(local, ptr.lastLocal) < 0.3) return;
  const acting = s.motion?.stage === 'act';
  if (acting && (s.tool === 'clipper' || s.tool === 'scissors')) {
    const r =
      s.tool === 'clipper'
        ? clipperSweep(s.hair, ptr.lastLocal, local, ptr.stroke, true)
        : scissorsSweep(s.hair, ptr.lastLocal, local, ptr.stroke);
    if (r.cut.length || r.newlyBald.length) {
      handleCut(s, r);
      if (!s.motion!.strayed) {
        s.motion!.strayed = true;
        incident(s, 'strayCut', 8);
        s.sfx.push('boing');
      }
    }
  }
  ptr.lastLocal = local;
}

interface Rule {
  id: string;
  check(s: RoundState): boolean;
  fire(s: RoundState): void;
}

/** Continuous rules, evaluated 4× per second while cutting. Each has a clear trigger. */
const RULES: Rule[] = [
  {
    id: 'gelSpikes',
    check: (s) => !s.events.gelSpikes && s.metrics.spikedFrac >= 0.25,
    fire: (s) => {
      const p = s.customer.personality;
      incident(s, 'gelSpikes', p === 'picky' ? 18 : p === 'loyal' ? 10 : 4);
      s.sfx.push('boing');
      if (p === 'dramatic') {
        s.patience = clamp(s.patience + 15, 0, 100);
        say(s, line(s, 'gelSpikes'), 'ecstatic', { shout: true });
      } else {
        s.patience = clamp(s.patience - (p === 'picky' ? 15 : 8), 0, 100);
        say(s, line(s, 'gelSpikes'), p === 'picky' ? 'angry' : 'shocked', { shout: p === 'picky' });
      }
    },
  },
  {
    id: 'combOver',
    // Trying to hide a bald patch with the dryer: hair around the patch gets blown to one side.
    check: (s) => {
      if (!s.events.baldPatch || s.events.combOver || s.combAttempt < 0.8) return false;
      const bald = s.hair.tufts.filter((t) => t.bald);
      const c = { x: bald.reduce((a, t) => a + t.root.x, 0) / bald.length, y: bald.reduce((a, t) => a + t.root.y, 0) / bald.length };
      return Math.abs(localLean(s.hair, c, 90)) >= 0.25 || Math.abs(s.metrics.leanAvg) >= LEAN_RUNAWAY;
    },
    fire: (s) => {
      incident(s, 'combOver', 10);
      s.sfx.push('boing');
      say(s, line(s, 'combOver'), 'suspicious');
    },
  },
  {
    id: 'chaosTier',
    check: (s) => chaosTier(s.chaos) > s.maxTierSaid,
    fire: (s) => {
      s.maxTierSaid = chaosTier(s.chaos);
      const text = tierLine(s.rng, s.customer.personality, s.maxTierSaid);
      if (text && !(s.bubble && s.bubble.until > s.time + 0.5)) {
        say(s, text, s.maxTierSaid >= 3 ? 'angry' : s.maxTierSaid === 2 ? 'suspicious' : 'worried', {
          shout: s.maxTierSaid >= 3,
        });
      }
    },
  },
  {
    id: 'walkoutThreat',
    check: (s) => !s.walkout && !s.motion && (s.chaos >= 92 || s.patience <= 0),
    fire: (s) => {
      s.walkout = { until: s.time + WALKOUT_WINDOW, canBeg: !s.begUsed };
      if (s.pointer.down) endStroke(s);
      incident(s, 'walkoutThreat', 0);
      s.sfx.push('warn');
      say(s, line(s, 'walkoutWarn'), 'angry', { shout: true, dur: WALKOUT_WINDOW });
    },
  },
  {
    id: 'headTurn',
    check: (s) => {
      if (s.motion || s.time < s.nextTurnCheck) return false;
      s.nextTurnCheck = s.time + between(s.rng, 3, 5.5);
      const restless = s.patience < 40 || s.chaos >= 50;
      return restless && s.rng() < 0.4 + s.chaos / 250;
    },
    fire: (s) => startMotion(s, 'turn'),
  },
  {
    id: 'flinch',
    check: (s) => s.customer.id === 'khoa' && !s.motion && s.nerves >= 75,
    fire: (s) => startMotion(s, 'flinch'),
  },
  {
    id: 'sneeze',
    check: (s) => !s.motion && s.sneezeBuild >= 0.6 && s.time >= s.sneezeCooldown && (s.events.sneeze ?? 0) < 3,
    fire: (s) => startMotion(s, 'sneeze'),
  },
  {
    id: 'photoCheck',
    check: (s) => s.customer.id === 'tuan' && s.time >= s.nextPhotoAt,
    fire: (s) => {
      s.photoUntil = s.time + 3.4;
      s.nextPhotoAt = s.time + between(s.rng, 10, 13);
      sayLater(s, 0.9, () => photoLine(s.rng, s.metrics.zone, s.customer.target!, s.metrics.baldCount > 0), undefined);
    },
  },
  {
    id: 'demand',
    check: (s) => s.customer.id === 'bay' && s.hasCut && !s.demand && s.time >= s.nextDemandAt,
    fire: (s) => {
      const z = s.metrics.zone;
      const zones: Zone[] = ['left', 'right', 'top', 'fringe'];
      let longest = zones[0];
      for (const k of zones) if (z[k] > z[longest] + 0.01) longest = k;
      s.demand = { zone: longest, deadline: s.time + 7 };
      say(s, demandLine(s.rng, longest, s.fixCount), 'suspicious', { dur: 3 });
    },
  },
  {
    id: 'demandIgnored',
    check: (s) => !!s.demand && s.time > s.demand.deadline,
    fire: (s) => {
      s.demand = null;
      s.patience = clamp(s.patience - 10, 0, 100);
      s.nextDemandAt = s.time + 3;
      say(s, demandIgnored(s.rng), 'angry');
    },
  },
];

export function tick(s: RoundState, dt: number) {
  dt = Math.min(dt, 0.05);
  s.time += dt;
  updateParticles(s, dt);
  if (s.fx.length) s.fx = s.fx.filter((f) => f.t0 + f.dur > s.time);
  if (s.bubble && s.time > s.bubble.until && s.phase !== 'result') s.bubble = null;
  if (s.moodOverride && s.time > s.moodOverride.until) s.moodOverride = null;
  s.toasts = s.toasts.filter((t) => t.until > s.time);

  if (s.phase === 'intro') {
    flushPending(s);
    return;
  }
  if (s.phase === 'mirror') {
    s.mirrorT += dt;
    if (!s.revealed && s.mirrorT >= MIRROR_REVEAL) reveal(s);
    if (s.mirrorT >= MIRROR_END) s.phase = 'result';
    return;
  }
  if (s.phase !== 'cutting') return;

  flushPending(s);
  updateMotion(s, dt);
  strayCut(s);

  const ptr = s.pointer;
  const local = ptr.stage ? toLocal(s, ptr.stage) : null;
  if (ptr.down && local && s.tool === 'clipper') {
    handleCut(s, clipperDwell(s.hair, local, dt, ptr.stroke));
  } else {
    decayDwell(s.hair, dt);
  }
  if (ptr.down && local && s.tool === 'dryer') blow(s, local, dt);
  gearTick(s, dt, ptr.down && local ? local : null);

  s.patience = clamp(s.patience - s.customer.patienceDecay * dt * (1 + chaosTier(s.chaos) * 0.35), 0, 100);
  s.nerves = clamp(s.nerves - 9 * dt, 0, 100);
  if (s.time - s.lastIncidentAt > 5) s.incident = clamp(s.incident - 0.8 * dt, 0, 100);

  s.ruleTimer += dt;
  if (s.ruleTimer >= 0.25) {
    s.ruleTimer = 0;
    refreshMetrics(s);
    for (const r of RULES) {
      if (s.walkout && r.id !== 'chaosTier') continue;
      if (r.check(s)) r.fire(s);
    }
  }

  if (s.walkout && s.time >= s.walkout.until) {
    incident(s, 'walkout', 0, false);
    finish(s, 'walkout');
    return;
  }
  if (s.time >= TIME_LIMIT) finish(s, 'timeout');
}

function blow(s: RoundState, local: Vec, dt: number) {
  const r = dryerBlow(s.hair, local, dt);
  s.pointer.dryerUsed = true;
  if (r.newlySpiked.length) s.sfx.push('pop');
  if (s.customer.id === 'khoa') {
    s.nerves = clamp(s.nerves - 14 * dt, 0, 100);
    if (!s.moodOverride) s.moodOverride = { mood: 'happy', until: s.time + 0.3 };
  }
  if (s.metrics.baldCount > 0 && s.hair.tufts.some((t) => t.bald && dist(t.root, local) < 60)) s.combAttempt += dt;
  if (r.onBald > 0.02 && s.time > s.hotCooldown) {
    s.hotCooldown = s.time + 4;
    incident(s, 'hotDryer', 3, !s.events.hotDryer);
    s.patience = clamp(s.patience - 5, 0, 100);
    say(s, line(s, 'hotDryer'), 'angry', { shout: true, dur: 1.6 });
  }
  if (s.clippings >= 18 && dist(local, NOSE) < 85) s.sneezeBuild += dt;
}

function flushPending(s: RoundState) {
  if (!s.pending.length) return;
  const due = s.pending.filter((p) => p.at <= s.time);
  if (!due.length) return;
  s.pending = s.pending.filter((p) => p.at > s.time);
  const last = due[due.length - 1];
  say(s, typeof last.text === 'function' ? last.text() : last.text, last.mood, { shout: last.shout });
}

const FLOOR_Y = 505;

function updateParticles(s: RoundState, dt: number) {
  for (const p of s.particles) {
    if (!p.landed) {
      p.vy += 700 * dt;
      p.vx *= 1 - 1.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y >= FLOOR_Y) {
        p.y = FLOOR_Y;
        p.landed = true;
      }
    } else {
      p.life -= dt;
    }
  }
  if (s.particles.length) s.particles = s.particles.filter((p) => p.life > 0 && p.x > -50 && p.x < 450);
}

/* ------------------------------------------------------------------ view helpers */

export function currentMood(s: RoundState): Mood {
  if (s.moodOverride) return s.moodOverride.mood;
  if (s.phase === 'result' && s.result) return s.result.mood;
  if (s.walkout) return 'angry';
  const m = s.motion;
  if (m?.kind === 'sneeze') return 'sneeze';
  if (m?.kind === 'flinch') return 'flinch';
  if (m?.kind === 'turn' && m.stage === 'act') return 'neutral';
  if (s.customer.id === 'khoa' && s.nerves > 50) return 'worried';
  const tier = chaosTier(s.chaos);
  const p = s.customer.personality;
  if (tier === 3) return p === 'dramatic' ? 'crying' : 'angry';
  if (tier === 2) return 'suspicious';
  if (tier === 1) return p === 'dramatic' ? 'worried' : 'neutral';
  return s.patience > 55 && s.hasCut ? 'happy' : 'neutral';
}

export function timeLeft(s: RoundState) {
  return Math.max(0, TIME_LIMIT - s.time);
}
