import { BehaviorId, CustomerDef, CustomerId, customerById } from './customers';
import { BEHAVIOR_RULES, behaviorTick, onMotionEnd, startle } from './behaviors';
import { demandIgnored, demandLine, demandMet, eventLine, EventLineKey, fallbackLine, photoLine, tierLine } from './dialogue';
import { EventId, EVENT_TITLES, Mood, RoundResult, evaluateRound } from './evaluate';
import { NOSE, Vec, clamp, dist } from './geometry';
import {
  CutResult,
  HairState,
  Zone,
  BALD_DWELL,
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
import { checkSheet, requestSheet } from './request';
import type { Creation } from './creation';
import { DesignOrder, designCustomer, designOrder, templateOrder } from './design';
import { Taste, tasteById, tasteCustomer } from './freestyle';
import { storyById, storyCustomer } from './stories';
import { AccessoryId, accessoryById, accessoryPoints, accessoryReaction, withAccessory } from './accessories';
import { templateById } from './templates';
import { ArtKit, ArtSettings, brushHair, carveHair, fullKit, newArt } from './art';
import { PERSONA_IDS, PersonaId, affinity, personaById, transformCustomer } from './mirror';

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
  | 'combo'
  | 'ring'
  | 'chop'
  | 'bark'
  | 'whimper'
  | 'cash'
  | 'good';
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

export type MotionKind = 'turn' | 'flinch' | 'sneeze' | 'nod' | 'startle' | 'pose' | 'phone' | 'duck' | 'chop' | 'dogShake' | 'sniff';
export interface Motion {
  kind: MotionKind;
  stage: 'warn' | 'act';
  t: number;
  dx: number;
  dy: number;
  strayed: boolean;
}

interface MotionSpec {
  /** Warning time before the head moves (the player's chance to lift the tool). */
  warn: number;
  act: number;
  dx: number;
  dy: number;
  line?: string;
  mood?: Mood;
}

/** Every way a head can move. Each has a visible/audible warning except reactions to the player's own actions. */
const MOTIONS: Record<MotionKind, MotionSpec> = {
  turn: { warn: 0.95, act: 0.95, dx: 46, dy: 4, line: 'turnWarn', mood: 'suspicious' },
  flinch: { warn: 0.75, act: 0.6, dx: 26, dy: -24, line: 'flinchWarn', mood: 'flinch' },
  sneeze: { warn: 1.05, act: 0.55, dx: 8, dy: 30, line: 'sneezeWarn', mood: 'sneeze' },
  nod: { warn: 1.1, act: 6, dx: 4, dy: 26, line: 'sleepy', mood: 'sleepy' },
  startle: { warn: 0, act: 0.5, dx: 20, dy: -22 },
  pose: { warn: 0.8, act: 1.0, dx: 44, dy: -10, line: 'flexWarn', mood: 'happy' },
  phone: { warn: 0.9, act: 0.95, dx: 46, dy: 4, line: 'phone', mood: 'suspicious' },
  duck: { warn: 0.8, act: 1.2, dx: 6, dy: 34, line: 'duckWarn', mood: 'worried' },
  chop: { warn: 0, act: 0.35, dx: 14, dy: -6 },
  dogShake: { warn: 0.9, act: 0.9, dx: 18, dy: 0, line: 'dogFearWarn', mood: 'worried' },
  sniff: { warn: 0.7, act: 1.1, dx: 50, dy: 6, line: 'dogSniff', mood: 'happy' },
};

interface PendingLine {
  at: number;
  text: string | (() => string);
  mood?: Mood;
  shout?: boolean;
}

export interface RoundState {
  customer: CustomerDef;
  /** The customer as they walked in (customer changes when the Gương Thần is used). */
  baseCustomer: CustomerDef;
  /** Gương Thần: persona applied this round, the one asked for, and whether the mirror is in the shop. */
  persona: PersonaId | null;
  wantPersona: PersonaId | null;
  mirrorReady: boolean;
  /** The request as said (placeholders filled in). */
  requestText: string;
  /* presentation (juice): screen shake, slow motion, request lines already praised */
  shakeUntil: number;
  shakeAmp: number;
  slowUntil: number;
  praised: string[];
  /** Said the hair-texture line already. */
  textureSaid: boolean;
  /** Multi-step request: steps already met. */
  stage: number;
  /** Cuốn mẫu: the design this customer ordered. */
  design: DesignOrder | null;
  /** Khách tùy thợ: no picture, just a taste. */
  taste: Taste | null;
  /** 0..1: first-days easing (see RoundContext.ease). */
  ease: number;
  /** Cut by the thợ phụ (career), not the player. */
  byAssistant?: boolean;
  /** Random Gương Thần (career): spins left for this customer, and how they took the last one. */
  mirrorRandom: boolean;
  mirrorSpins: number;
  /** Phụ kiện tóc on the head (one at a time), and whether the box is in the shop. */
  accessory: AccessoryId | null;
  accessoriesReady: boolean;
  personaMood: 'fan' | 'hater' | 'neutral' | null;
  /** Khách có câu chuyện: which story and chapter. */
  story: { id: string; step: number; title: string; chapters: number } | null;
  /** Đồ nghề sáng tạo: current colours / stencil, and what the barber owns. */
  art: ArtSettings;
  kit: ArtKit;
  /** Frames for the 5-second replay (sampled while cutting). */
  replay: ReplayFrame[];
  nextReplayAt: number;
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
    /** Recent stage points of the scissors (drawn as a faint cut line). */
    trail: Vec[];
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
  /** Uses per tool that got a reaction from this customer. */
  toolReacted: Partial<Record<Tool, number>>;
  /** Round length for this customer. */
  timeLimit: number;
  /* behaviour state */
  drowsy: number;
  nextBehaviorAt: number;
  viewers: number;
  boredAt: number;
  deadlineSaid: boolean;
  /** A tool knocked out of the barber's hand (võ sư) until `until`. */
  jam: { tool: Tool; until: number } | null;
  reflexCooldown: number;
  /** How messy the shop got (fur/hair everywhere) — carried into the day. */
  mess: number;
  /** Wear dealt to machines this round (career applies it). */
  wear: Partial<Record<Tool, number>>;
  /** Copycat: the style they want. */
  wantStyle: string | null;
  /** Context from the shop (career mode). */
  ctx: RoundContext;
  /** Consumables left / used this round. */
  stock: Record<string, number>;
  consumed: Record<string, number>;
  /** Seconds each tool was in use (wear and electricity). */
  usage: Partial<Record<Tool, number>>;
  growCut: number;
  malfunctionT: number;
}

export interface ReplayFrame {
  t: number;
  hair: HairState;
  off: Vec;
  mood: Mood;
  /** Taken after the Gương Thần (draw with the persona look). */
  transformed: boolean;
}

const REPLAY_STEP = 0.25;
const REPLAY_MAX = 320;

/** Samples the head for the replay; keeps an even spread when the round runs long. */
function recordReplay(s: RoundState) {
  if (s.time < s.nextReplayAt) return;
  s.replay.push({ t: s.time, hair: cloneHair(s.hair), off: { ...s.headOffset }, mood: currentMood(s), transformed: !!s.persona });
  s.nextReplayAt = s.time + REPLAY_STEP * (s.replay.length > REPLAY_MAX / 2 ? 2 : 1);
  if (s.replay.length > REPLAY_MAX) s.replay = s.replay.filter((_, i) => i % 2 === 0);
}

export interface RoundContext {
  /** Owned upgrades / consumables that change the round. */
  items: string[];
  /** Today's events that affect the round (e.g. food smell, power cut). */
  dayEvents: string[];
  /** Hair this customer left with last time, if they are back to get it fixed. */
  returnHair?: HairState | null;
  wantStyle?: string | null;
  /** Machines with low condition (0..100) behave badly. */
  condition?: Partial<Record<Tool, number>>;
  /** Consumable stock (potion, gel, sausage…). */
  stock?: Record<string, number>;
  /** Tools that cannot be used today (power cut). */
  blocked?: Tool[];
  /** Price multiplier from reputation and decor. */
  payMultiplier?: number;
  /** Persona a "Hóa Thân" customer asks for. */
  wantPersona?: PersonaId | null;
  /** A design from the shop's catalog this customer ordered. */
  design?: Creation | null;
  /** …or a built-in template (mẫu có sẵn). */
  designTemplate?: string | null;
  /** …or no picture at all: "làm gì cũng được, miễn hợp gu" (freestyle.ts). */
  taste?: string | null;
  /** A chapter of a customer's story (stories.ts). */
  story?: { id: string; step: number } | null;
  /** Thời tiết hôm nay (career). */
  weather?: 'fair' | 'rain' | 'heat';
  /** Career Gương Thần: the mirror picks the persona at random (no picker). */
  mirrorRandom?: boolean;
  /** 0..1: the shop's first days are gentler (more patience, more time, fewer head turns). */
  ease?: number;
}

export interface RoundOptions {
  unlocked?: ToolId[];
  /** Gương Thần Biến Hình available (free mode, or bought in career). */
  mirror?: boolean;
  /** Restrict the toolbar to exactly these tools (daily challenge rules). */
  onlyTools?: ToolId[];
  /** Round length override (daily challenge). */
  timeLimit?: number;
  /** Colours and stencils available to the brush / stencil tools (default: everything). */
  kit?: ArtKit;
  ctx?: Partial<RoundContext>;
}

export function createRound(customerId: CustomerId, seed = Date.now() & 0xffff, opts: RoundOptions = {}): RoundState {
  const baseDef = customerById(customerId);
  const tpl = templateById(opts.ctx?.designTemplate);
  const design = opts.ctx?.design ? designOrder(opts.ctx.design, baseDef.id) : tpl ? templateOrder(tpl, baseDef.id) : null;
  const story = design ? null : storyById(opts.ctx?.story?.id);
  const step = Math.min(opts.ctx?.story?.step ?? 0, (story?.chapters.length ?? 1) - 1);
  const taste = design ? null : story ? tasteById(story.chapters[step].taste) : tasteById(opts.ctx?.taste);
  const picked = design ? designCustomer(baseDef, design) : story ? storyCustomer(baseDef, story, step) : taste ? tasteCustomer(baseDef, taste) : baseDef;
  const ease = clamp(opts.ctx?.ease ?? 0, 0, 1);
  // Phòng Gội Đầu: washed and relaxed before the cut.
  const washed = !!opts.ctx?.items?.includes('washRoom');
  // First days: the same customer, just a little more patient.
  // Thời tiết: rain makes people sit it out; heat makes them restless (unless the shop has air-con) and want it short.
  const weather = opts.ctx?.weather ?? 'fair';
  const cool = !!opts.ctx?.items?.includes('aircon');
  const calm = (1 - 0.45 * ease) * (washed ? 0.85 : 1) * (weather === 'rain' ? 0.85 : weather === 'heat' && !cool ? 1.15 : 1);
  const own = picked.satisfaction;
  const hot = weather === 'heat' && picked.look.species !== 'dog';
  const customer: CustomerDef =
    calm !== 1 || hot
      ? {
          ...picked,
          patience: Math.min(100, picked.patience + (washed ? 10 : 0)),
          patienceDecay: picked.patienceDecay * calm,
          satisfaction: hot ? (m, c) => clamp(own.call(picked, m, c) + (m.avg <= 0.55 && m.baldFrac < 0.05 ? 6 : m.avg > 0.85 ? -5 : 0), 0, 100) : own,
        }
      : picked;
  const hair = opts.ctx?.returnHair ? cloneHair(opts.ctx.returnHair) : createHair(customer.hair);
  const metrics = measureHair(hair);
  const ctx: RoundContext = { items: [], dayEvents: [], ...opts.ctx };
  const rng = makeRng(seed);
  const wantPersona = customer.behaviors.includes('transform') ? (ctx.wantPersona ?? PERSONA_IDS[Math.floor(rng() * PERSONA_IDS.length) % PERSONA_IDS.length]) : null;
  const request = customer.stages?.length ? customer.stages[0].say : customer.request.replace('{persona}', personaById(wantPersona)?.name ?? 'người khác');
  return {
    customer,
    baseCustomer: customer,
    design,
    taste,
    ease,
    story: story ? { id: story.id, step, title: story.title, chapters: story.chapters.length } : null,
    persona: null,
    wantPersona,
    mirrorReady: (opts.mirror ?? false) || ctx.items.includes('mirror'),
    mirrorRandom: !!ctx.mirrorRandom,
    // Bé Ba Hóa Thân came for the mirror: she may look three times.
    mirrorSpins: customer.behaviors.includes('transform') ? 3 : 1,
    personaMood: null,
    accessory: null,
    accessoriesReady: (opts.mirror ?? false) || ctx.items.includes('accessoryBox'),
    requestText: request,
    shakeUntil: 0,
    shakeAmp: 0,
    slowUntil: 0,
    praised: [],
    textureSaid: false,
    stage: 0,
    replay: [],
    nextReplayAt: 0,
    kit: opts.kit ?? fullKit(),
    art: newArt(opts.kit ?? fullKit()),
    seed,
    rng,
    hair,
    before: cloneHair(hair),
    beforeMetrics: metrics,
    metrics,
    phase: 'intro',
    time: 0,
    tool: opts.onlyTools ? (opts.onlyTools.includes('scissors') ? 'scissors' : opts.onlyTools[0]) : customer.startTool && [...BASIC_TOOLS, ...(opts.unlocked ?? [])].includes(customer.startTool) ? customer.startTool : 'scissors',
    pointer: { down: false, stage: null, lastLocal: null, stroke: 0, zones: new Set(), removed: 0, dryerUsed: false, travel: 0, magicUsed: false, trail: [] },
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
    bubble: { text: request, until: 4, shout: false },
    pending: [
      { at: 1.6, text: customer.catch },
      ...(hair.texture === 'curly' || hair.texture === 'thin' ? [{ at: 4.2, text: TEXTURE_LINES[hair.texture] }] : []),
    ],
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
    unlocked: opts.onlyTools ? [...new Set(opts.onlyTools)] : [...new Set([...BASIC_TOOLS, ...(opts.unlocked ?? [])])],
    gear: createGear(),
    magic: createMagic(),
    combos: {},
    fx: [],
    fxSeq: 0,
    toolsUsed: [],
    deniedAt: -99,
    toolReacted: {},
    timeLimit: (opts.timeLimit ?? customer.timeLimit ?? TIME_LIMIT) + Math.round(15 * ease),
    drowsy: 0,
    nextBehaviorAt: 6,
    viewers: 120,
    boredAt: -99,
    deadlineSaid: false,
    jam: null,
    reflexCooldown: 0,
    mess: 0,
    wear: {},
    wantStyle: ctx.wantStyle ?? null,
    ctx,
    stock: { ...(ctx.stock ?? {}) },
    consumed: {},
    usage: {},
    growCut: 0,
    malfunctionT: 0,
  };
}

const hasItem = (s: RoundState, id: string) => s.ctx.items.includes(id);

/** Uses one unit of a consumable; returns false when out of stock. */
export function consume(s: RoundState, id: string): boolean {
  if ((s.stock[id] ?? 0) <= 0) return false;
  s.stock[id]--;
  s.consumed[id] = (s.consumed[id] ?? 0) + 1;
  return true;
}

export const TEXTURE_LINES = {
  wiry: 'Tóc cứng như rễ tre đấy, cắt mấy lượt mới đứt!',
  curly: 'Tóc xoăn đấy nhé, sấy là xù như tổ quạ!',
  thin: 'Tóc mỏng lắm, cầm tông đơ nhẹ tay thôi…',
};

/** Multi-step request (weekly bosses): when the current step is met, the next one is revealed. */
function advanceStage(s: RoundState) {
  const st = s.customer.stages;
  if (!st || s.stage >= st.length) return;
  if (!st[s.stage].check(s.metrics, s)) return;
  s.stage++;
  s.sfx.push('good');
  s.patience = clamp(s.patience + 8, 0, 100);
  const h = s.hair.head;
  s.fx.push({ id: s.fxSeq++, kind: 'praise', x: h.cx, y: h.cy - h.ry - 10, t0: s.time, dur: 1.4, text: `Xong bước ${s.stage}/${st.length}!` });
  if (s.stage < st.length) sayLater(s, 0.9, st[s.stage].say, 'suspicious');
  else sayLater(s, 0.6, 'Được rồi đấy! Soi gương thôi.', 'happy');
}

const GUARDS = new Set(['noBald', 'noNewBald', 'noBaldTeo', 'noDye', 'plain', 'keep', 'calm', 'fast']);

/** A request line just turned green: a small "Chuẩn!" with a sparkle and a happy ding. */
function praise(s: RoundState) {
  const rows = checkSheet(requestSheet(s), s);
  const h = s.hair.head;
  let n = 0;
  for (const r of rows) {
    // Guard lines ("don't…") start out true: only achievements get a cheer.
    if (r.ok !== true || s.praised.includes(r.id) || GUARDS.has(r.id) || r.id.startsWith('stage')) continue;
    s.praised.push(r.id);
    const at = r.id === 'left' ? { x: h.cx - h.rx * 0.8, y: h.cy - 10 } : r.id === 'right' ? { x: h.cx + h.rx * 0.8, y: h.cy - 10 } : r.id === 'fringe' ? { x: h.cx, y: h.cy - 40 } : { x: h.cx, y: h.cy - h.ry * 0.9 };
    s.fx.push({ id: s.fxSeq++, kind: 'praise', x: at.x + s.headOffset.x, y: at.y + s.headOffset.y - n * 26, t0: s.time, dur: 1.2, text: r.id === 'sides' ? 'Hai bên chuẩn!' : 'Chuẩn!' });
    s.fx.push({ id: s.fxSeq++, kind: 'sparkle', x: at.x + s.headOffset.x, y: at.y + s.headOffset.y, t0: s.time, dur: 0.6, color: '#7dffb0' });
    n++;
  }
  if (n) {
    s.sfx.push('good');
    s.patience = clamp(s.patience + 2 * n, 0, 100);
  }
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

/** A customer's own line for this event if they have one, else their temperament's. */
export function line(s: RoundState, key: string) {
  const own = s.customer.lines?.[key];
  if (own?.length) return own[Math.floor(s.rng() * own.length) % own.length];
  const fb = s.customer.fallback ?? 'neutral';
  if (fb !== 'personality') return fallbackLine(s.rng, key, fb);
  return eventLine(s.rng, key as EventLineKey, s.customer.personality);
}

export function has(s: RoundState, b: BehaviorId) {
  return s.customer.behaviors.includes(b);
}

/** Screen shake (drawn by the Stage; no effect on the simulation). */
export function shake(s: RoundState, amp: number, dur: number) {
  s.shakeAmp = Math.max(amp, s.time < s.shakeUntil ? s.shakeAmp : 0);
  s.shakeUntil = Math.max(s.shakeUntil, s.time + dur);
}

/** Records an incident: adds to the event log, chaos, and shows a toast. */
export function incident(s: RoundState, id: EventId, chaos: number, toast = true) {
  if (hasItem(s, 'plant')) chaos *= 0.85;
  s.events[id] = (s.events[id] ?? 0) + 1;
  if (toast) s.log.push({ id, t: s.time });
  s.incident = clamp(s.incident + chaos, 0, 100);
  s.lastIncidentAt = s.time;
  // Livestream: every incident is content. VIP: every incident is an insult.
  if (has(s, 'livestream')) s.viewers += 40 + chaos * 15 + (id.startsWith('combo') ? 400 : 0);
  if (has(s, 'vip')) s.patience = clamp(s.patience - chaos * 0.6, 0, 100);
  if (chaos >= 10) shake(s, Math.min(9, 3 + chaos / 3), 0.35);
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
  if (s.ctx.blocked?.includes(tool)) {
    s.deniedAt = s.time;
    s.sfx.push('deny');
    s.toasts.push({ id: s.toastSeq++, title: 'Mất điện — máy này không chạy được', until: s.time + 2 });
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
  if (s.jam && s.jam.tool === s.tool && s.time < s.jam.until) {
    s.deniedAt = s.time;
    s.sfx.push('deny');
    return;
  }
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
  ptr.trail = [p];
  if (isMagic(s.tool)) {
    if (!gearDown(s, local)) ptr.down = false;
    return;
  }
  if (s.tool === 'brush') {
    artBrush(s, local);
    return;
  }
  if (s.tool === 'stencil') {
    const c = carveHair(s.hair, s.art, local);
    if (c) {
      ptr.magicUsed = true;
      s.sfx.push('bald');
      refreshMetrics(s);
    } else s.deniedAt = s.time;
    return;
  }
  if (s.tool === 'clipper') {
    handleCut(s, clipperSweep(s.hair, local, local, ptr.stroke));
  }
}

/** Cọ Nhuộm under the pointer (counts as a styling stroke for reactions and praise). */
function artBrush(s: RoundState, local: Vec) {
  if (brushHair(s.hair, s.art, local)) {
    s.pointer.magicUsed = true;
    refreshMetrics(s);
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
  } else if (s.tool === 'brush') {
    artBrush(s, local);
  } else if (s.tool === 'scissors') {
    ptr.trail.push(p);
    if (ptr.trail.length > 14) ptr.trail.shift();
    const r = scissorsSweep(s.hair, prev, local, ptr.stroke);
    if (r.cut.length) s.sfx.push('snip');
    if (r.cut.length && s.hair.texture === 'wiry' && !s.textureSaid) {
      s.textureSaid = true;
      s.sfx.push('boing');
      say(s, TEXTURE_LINES.wiry, 'suspicious');
    }
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
  // Thuốc mọc tóc + tông đơ: the hair grows back while you cut it.
  if (s.tool === 'clipper') {
    s.growCut += r.cut.filter((t) => t.grow > 0).length;
    if (s.growCut >= 15 && !s.events.growRace) {
      incident(s, 'growRace', 10);
      say(s, line(s, 'growRace'), 'shocked', { shout: true });
    }
  }
  if (r.newlyBald.length) onBald(s);
}

/** A bald moment counts as a *new* patch when the clipper had stopped shaving for 1.5s. */
function onBald(s: RoundState) {
  refreshMetrics(s);
  const gap = s.time - s.lastBaldAt;
  s.lastBaldAt = s.time;
  // Người sợ hói: every new bald moment is a catastrophe.
  if (has(s, 'fearBald') && gap > 1.5) {
    incident(s, 'baldPanic', 15);
    s.patience = clamp(s.patience - 25, 0, 100);
  }
  if (!s.events.baldPatch) {
    incident(s, 'baldPatch', 14);
    // The disaster moment: slow motion + a big banner.
    s.slowUntil = s.time + 0.2;
    shake(s, 9, 0.5);
    s.fx.push({ id: s.fxSeq++, kind: 'banner', x: 200, y: 330, t0: s.time, dur: 1.6, text: 'TOANG RỒI!' });
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
  toolReaction(s, s.tool);

  if (cutSomething) {
    for (const z of zones) s.zoneStrokes[z]++;

    // Khoa (and anyone nervous): every snip scares him a bit more.
    if (has(s, 'nervous')) s.nerves = clamp(s.nerves + 14 + ptr.removed / 9, 0, 100);
    // Chú Bảy: did we do what he asked?
    if (has(s, 'demands') && s.demand && ptr.zones.has(s.demand.zone)) {
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

  praise(s);
  advanceStage(s);

  // Phút chót toang: it was nearly done, then one more stroke.
  const sat = c.satisfaction(s.metrics);
  if (s.bestSat >= 70 && sat < s.bestSat - 15 && !s.events.lastMinuteRuin) {
    incident(s, 'lastMinuteRuin', 12);
    s.sfx.push('fail');
    sayLater(s, 0.5, line(s, 'ruin'), c.personality === 'dramatic' ? 'crying' : 'angry');
  }
  s.bestSat = Math.max(s.bestSat, sat);
}

/**
 * The customer's data says how they feel about a tool (hate / fear / love). Called once per
 * stroke or use that actually changed their hair.
 */
export function toolReaction(s: RoundState, tool: Tool) {
  const r = s.customer.toolReactions[tool];
  if (!r) return;
  if (r.when === 'topTooShort' && !(s.pointer.zones.has('top') && s.metrics.zone.top < 0.55)) return;
  const n = s.toolReacted[tool] ?? 0;
  s.toolReacted[tool] = n + 1;
  s.patience = clamp(s.patience + r.patience, 0, 100);
  if (r.nerves) s.nerves = clamp(s.nerves + r.nerves, 0, 100);
  if (r.kind === 'love') {
    if (n === 0 && r.lines?.length) say(s, r.lines[Math.floor(s.rng() * r.lines.length)], 'happy');
    return;
  }
  const w = s.events.wrongTool ?? 0;
  incident(s, 'wrongTool', n === 0 ? r.chaos : Math.ceil(r.chaos / 3), w === 0);
  if (n < 3) {
    const text = r.lines?.length ? r.lines[Math.floor(s.rng() * r.lines.length)] : line(s, 'wrongTool');
    const strong = r.kind === 'fear' || r.patience <= -8;
    say(s, text, r.kind === 'hate' ? 'angry' : 'worried', { shout: strong });
  }
}

/** Gương Thần can be used once per customer, while cutting, on humans. */
export function canTransform(s: RoundState): boolean {
  const left = s.mirrorRandom ? s.mirrorSpins > 0 : !s.persona;
  return s.mirrorReady && s.phase === 'cutting' && left && s.customer.look.species !== 'dog';
}

/**
 * Gương Thần ngẫu nhiên (career): the mirror decides. A customer who already loves or hates
 * that persona keeps their feelings; anyone else may love it — or not.
 */
export function spinMirror(s: RoundState): PersonaId | null {
  if (!canTransform(s)) {
    transform(s, PERSONA_IDS[0]); // refusal path: says why, plays the deny sound
    return null;
  }
  const pool = PERSONA_IDS.filter((x) => x !== s.persona);
  const id = pool[Math.floor(s.rng() * pool.length) % pool.length];
  s.mirrorSpins--;
  transform(s, id, true);
  return id;
}

/** Gương Thần Biến Hình: dress the customer up as a persona (look, signature hair, lines, verdict). */
export function transform(s: RoundState, id: PersonaId, random = false): boolean {
  const p = personaById(id);
  if (!p) return false;
  if (!random && !canTransform(s)) {
    if (s.customer.look.species === 'dog' && s.phase === 'cutting') say(s, 'Gâu? (Gương Thần không soi được lông chó.)', 'suspicious');
    s.deniedAt = s.time;
    s.sfx.push('deny');
    return false;
  }
  const base = affinity(p, s.baseCustomer.id);
  // Random mirror: no fixed taste for this persona → they either love it or they don't.
  const aff = random && base === 'neutral' && !s.wantPersona ? (s.rng() < 0.5 ? 'fan' : 'hater') : base;
  s.persona = id;
  s.personaMood = aff;
  s.customer = transformCustomer(s.baseCustomer, p, s.wantPersona, aff);
  const acc = accessoryById(s.accessory);
  if (acc) s.customer = withAccessory(s.customer, s.baseCustomer, acc, s.taste);
  p.treat(s.hair);
  s.viewers += p.viewers;
  s.flashUntil = s.time + 0.3;
  s.sfx.push('sparkle');
  incident(s, 'transform', p.chaos);
  refreshMetrics(s);
  const asked = s.wantPersona;
  if (random) s.toasts.push({ id: s.toastSeq++, title: `Gương Thần quay ra: ${p.name}!`, until: s.time + 2.5 });
  if (asked && asked !== id) {
    s.patience = clamp(s.patience - 18, 0, 100);
    say(s, `Ơ! Em xin ${personaById(asked)?.name}, sao lại thành ${p.name}?!`, 'shocked', { shout: true });
  } else if (asked || aff === 'fan') {
    s.patience = clamp(s.patience + 12, 0, 100);
    say(s, p.entrance[Math.floor(s.rng() * p.entrance.length) % p.entrance.length], 'ecstatic');
  } else if (aff === 'hater') {
    s.patience = clamp(s.patience - 15, 0, 100);
    say(s, random && base === 'neutral' ? `${s.baseCustomer.name}: “${p.name}?! Không hợp với tôi chút nào!”` : `${s.baseCustomer.name} nhìn gương: “Cái gì đây?! Trả lại mặt cho tôi!”`, 'angry', { shout: true });
  } else {
    say(s, p.entrance[0], 'shocked');
  }
  return true;
}

/** Phụ kiện tóc: put one on (or null to take it off). The customer says what they think. */
export function setAccessory(s: RoundState, id: AccessoryId | null): boolean {
  if (!s.accessoriesReady || s.phase !== 'cutting' || s.customer.look.species === 'dog') return false;
  // Rebuild from the customer as they are without accessories (the persona stays).
  const p = personaById(s.persona);
  const clean = p ? transformCustomer(s.baseCustomer, p, s.wantPersona, s.personaMood ?? undefined) : s.baseCustomer;
  s.accessory = id;
  const acc = accessoryById(id);
  s.customer = acc ? withAccessory(clean, s.baseCustomer, acc, s.taste) : clean;
  if (acc) {
    const r = accessoryReaction(accessoryPoints(s.baseCustomer, acc, s.taste));
    say(s, r.line, r.mood);
    s.sfx.push('sparkle');
  }
  refreshMetrics(s);
  return true;
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
      timeUsed: s.time,
      timeLimit: s.timeLimit,
      viewers: s.viewers,
      wantStyle: s.wantStyle,
      payBonus: s.ctx.payMultiplier ?? 1,
      stagesDone: s.stage,
      hair: s.hair,
    },
    s.rng,
  );
  const persona = personaById(s.persona);
  if (persona) s.result.style = { ...s.result.style, name: `${s.result.style.name} · Bản ${persona.tag}` };
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

export function startMotion(s: RoundState, kind: MotionKind) {
  const spec = MOTIONS[kind];
  const dir = s.rng() < 0.5 ? -1 : 1;
  s.motion = { kind, stage: spec.warn > 0 ? 'warn' : 'act', t: 0, dx: dir * spec.dx, dy: spec.dy, strayed: false };
  if (spec.warn > 0) s.sfx.push(kind === 'phone' ? 'ring' : 'warn');
  if (spec.line) say(s, line(s, spec.line), spec.mood, { dur: Math.max(1.3, spec.warn + 0.6) });
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
    if (m.t >= MOTIONS[m.kind].warn) {
      m.stage = 'act';
      m.t = 0;
      if (m.kind === 'sneeze') {
        say(s, line(s, 'sneeze'), 'sneeze', { dur: 1.2, shout: true });
        s.sfx.push('sneeze');
        burstClippings(s);
        startle(s);
      }
      if (m.kind === 'flinch') s.sfx.push('gasp');
    }
    return;
  }
  const T = MOTIONS[m.kind].act;
  const u = m.t / T;
  // Quick out, hold, ease back (a dozing head sinks slowly and stays down).
  const k =
    m.kind === 'nod'
      ? u < 0.3 ? u / 0.3 : u < 0.9 ? 1 : Math.max(0, 1 - (u - 0.9) / 0.1)
      : u < 0.22 ? u / 0.22 : u < 0.62 ? 1 : Math.max(0, 1 - (u - 0.62) / 0.38);
  const e = k * k * (3 - 2 * k);
  const shake = m.kind === 'dogShake' ? Math.sin(m.t * 42) : 1;
  s.headOffset = { x: m.dx * e * shake, y: m.dy * e };
  if (m.t >= T) {
    s.headOffset = { x: 0, y: 0 };
    const kind = m.kind;
    const strayed = m.strayed;
    s.motion = null;
    if (kind === 'turn' || kind === 'pose' || kind === 'phone' || kind === 'duck' || kind === 'sniff') {
      incident(s, 'headTurn', strayed ? 6 : 2, !strayed);
      if (!strayed) say(s, line(s, 'turnSafe'), 'neutral', { dur: 1.6 });
    }
    if (kind === 'nod') s.drowsy = 0.2;
    onMotionEnd(s, kind, strayed);
    if (kind === 'sneeze') {
      incident(s, 'sneeze', 8);
      s.sneezeCooldown = s.time + 9;
    }
    if (kind === 'flinch') {
      s.nerves = 25;
      incident(s, 'headTurn', strayed ? 6 : 1, false);
    }
    if (strayed && kind !== 'chop' && kind !== 'startle') sayLater(s, 0.3, line(s, 'turnStray'), kind === 'flinch' ? 'crying' : 'angry', true);
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

export interface Rule {
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
      const text =
        (s.customer.fallback ?? 'neutral') === 'personality' ? tierLine(s.rng, s.customer.personality, s.maxTierSaid) : s.maxTierSaid > 0 ? line(s, `tier${s.maxTierSaid}`) : null;
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
      s.nextTurnCheck = s.time + between(s.rng, 3, 5.5) * (1 + s.ease);
      const restless = s.patience < 40 || s.chaos >= 50;
      // The massage chair keeps half of them seated.
      if (restless && hasItem(s, 'chair') && s.rng() < 0.5) return false;
      return restless && s.rng() < 0.4 + s.chaos / 250;
    },
    fire: (s) => startMotion(s, 'turn'),
  },
  {
    id: 'flinch',
    check: (s) => has(s, 'nervous') && !s.motion && s.nerves >= 75,
    fire: (s) => startMotion(s, 'flinch'),
  },
  {
    id: 'sneeze',
    check: (s) => !s.motion && s.sneezeBuild >= 0.6 && s.time >= s.sneezeCooldown && (s.events.sneeze ?? 0) < 3,
    fire: (s) => startMotion(s, 'sneeze'),
  },
  {
    id: 'photoCheck',
    check: (s) => has(s, 'photoCheck') && s.time >= s.nextPhotoAt,
    fire: (s) => {
      s.photoUntil = s.time + 3.4;
      s.nextPhotoAt = s.time + between(s.rng, 10, 13);
      sayLater(s, 0.9, () => photoLine(s.rng, s.metrics.zone, s.customer.target!, s.metrics.baldCount > 0), undefined);
    },
  },
  {
    id: 'demand',
    check: (s) => has(s, 'demands') && s.hasCut && !s.demand && s.time >= s.nextDemandAt,
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
  recordReplay(s);

  const ptr = s.pointer;
  const local = ptr.stage ? toLocal(s, ptr.stage) : null;
  if (ptr.down && local && s.tool === 'clipper') {
    // Thin hair goes bald much faster under a resting clipper.
    const thin = s.hair.texture === 'thin' ? 0.6 : 1;
    handleCut(s, clipperDwell(s.hair, local, dt, ptr.stroke, (hasItem(s, 'japanClipper') ? 0.85 : BALD_DWELL) * thin));
  } else {
    decayDwell(s.hair, dt);
  }
  if (ptr.down && local && s.tool === 'dryer') blow(s, local, dt);
  gearTick(s, dt, ptr.down && local ? local : null);
  behaviorTick(s, dt, ptr.down && local ? local : null);
  if (ptr.down && local) {
    s.usage[s.tool] = (s.usage[s.tool] ?? 0) + dt;
    malfunction(s, local, dt);
  }

  const comfort = (hasItem(s, 'chair') ? 0.8 : 1) * (hasItem(s, 'aircon') ? 0.75 : 1);
  s.patience = clamp(s.patience - s.customer.patienceDecay * comfort * dt * (1 + chaosTier(s.chaos) * 0.35), 0, 100);
  s.nerves = clamp(s.nerves - 9 * dt, 0, 100);
  if (s.time - s.lastIncidentAt > 5) s.incident = clamp(s.incident - 0.8 * dt, 0, 100);

  s.ruleTimer += dt;
  if (s.ruleTimer >= 0.25) {
    s.ruleTimer = 0;
    refreshMetrics(s);
    for (const r of [...RULES, ...BEHAVIOR_RULES]) {
      if (s.walkout && r.id !== 'chaosTier') continue;
      if (r.check(s)) r.fire(s);
    }
  }

  if (s.walkout && s.time >= s.walkout.until) {
    incident(s, 'walkout', 0, false);
    finish(s, 'walkout');
    return;
  }
  if (s.time >= s.timeLimit) finish(s, 'timeout');
}

/**
 * A worn-out machine (condition < 25%, shown in the tool info) misbehaves every few seconds
 * of use: the clipper jerks into the scalp, dryers spit a hot blast.
 */
function malfunction(s: RoundState, local: Vec, dt: number) {
  const cond = s.ctx.condition?.[s.tool];
  if (cond === undefined || cond >= 25) return;
  s.malfunctionT += dt;
  if (s.malfunctionT < 4) return;
  s.malfunctionT = 0;
  if (s.tool === 'clipper') {
    handleCut(s, clipperSweep(s.hair, local, { x: local.x + 6, y: local.y + 4 }, s.pointer.stroke, true));
  } else {
    for (const t of s.hair.tufts) if (dist(t.root, local) < 90) t.fluff = clamp(t.fluff + 0.5, 0, 1);
    s.patience = clamp(s.patience - 6, 0, 100);
  }
  incident(s, 'malfunction', 6);
  s.sfx.push('overheat');
  say(s, line(s, 'malfunction'), 'shocked', { shout: true, dur: 1.6 });
}

function blow(s: RoundState, local: Vec, dt: number) {
  const r = dryerBlow(s.hair, local, dt, false);
  s.pointer.dryerUsed = true;
  if (r.newlySpiked.length) s.sfx.push('pop');
  if (s.customer.toolReactions.dryer?.kind === 'love') {
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
  const h = s.hair.head;
  if (s.clippings >= 18 && dist(local, { x: h.cx, y: h.cy + NOSE.y - 250 }) < 85) s.sneezeBuild += dt;
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
  if ((has(s, 'nervous') || has(s, 'dog')) && s.nerves > 50) return 'worried';
  if (s.motion?.kind === 'nod' && s.motion.stage === 'act') return 'sleepy';
  const tier = chaosTier(s.chaos);
  const p = s.customer.personality;
  if (tier === 3) return p === 'dramatic' ? 'crying' : 'angry';
  if (tier === 2) return 'suspicious';
  if (tier === 1) return p === 'dramatic' ? 'worried' : 'neutral';
  return s.patience > 55 && s.hasCut ? 'happy' : 'neutral';
}

export function timeLeft(s: RoundState) {
  return Math.max(0, s.timeLimit - s.time);
}
