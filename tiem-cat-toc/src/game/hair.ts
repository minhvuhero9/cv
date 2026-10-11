import { HEAD, HAIRLINE_Y, Vec, angleDiff, clamp, dist, segmentIntersect, segmentSegment } from './geometry';

/**
 * Hair is modelled as ~110 "tufts" (lọn tóc). Each tuft has a root on the scalp and a
 * length; tools change length, baldness, lean, fluff and gel spikes. Everything the
 * player sees and everything the scorer reads comes from this one structure.
 */
export type Zone = 'left' | 'top' | 'right' | 'fringe';
export type TuftKind = 'edge' | 'crown' | 'fringe';

export interface Tuft {
  id: number;
  kind: TuftKind;
  zone: Zone;
  root: Vec;
  /** Initial growth direction (radians, SVG space, y down). */
  normal: number;
  /** Which way the tuft falls when it droops: +1 clockwise (screen right), -1 left. */
  partSign: 1 | -1;
  origLen: number;
  len: number;
  bald: boolean;
  /** Seconds the clipper has been sitting on this root (decays when it moves away). */
  dwell: number;
  gel: number;
  spike: number;
  spiked: boolean;
  lean: number;
  fluff: number;
  /** Number of distinct strokes that shortened this tuft. */
  touches: number;
  lastStroke: number;
  /* ---- magic tools (Bộ Đồ Nghề Bất Ổn) ---- */
  /** Magic dye colour from Súng Tóc 3000, or null for natural colour. */
  tint: string | null;
  /** Width multiplier (Gậy Như Ý / Súng Tóc enlarge). */
  thick: number;
  /** Curl per segment, radians (Gậy Như Ý tap, Lược Rồng). */
  curl: number;
  /** Point the tuft is sculpted towards (Súng Tóc + Lược Rồng combo), or null. */
  sculpt: Vec | null;
  /** 0..1 steam-puffed by the Nồi Cơm Điện (decays slowly). */
  steamed: number;
  /** Seconds of super-fast growth left (Thuốc Mọc Tóc). */
  grow: number;
  /** Keo Vĩnh Cửu: gel that never softens. */
  eternal: boolean;
}

export interface HairStyleInit {
  /** Base length in px for scalp hair. */
  length: number;
  fringeLength: number;
  /** Gel per zone, 0..1. */
  gel: Partial<Record<Zone, number>>;
  /** Random variation applied to lengths (0..1). */
  messiness?: number;
  /** Per-zone multiplier on the base length. */
  zoneLength?: Partial<Record<Zone, number>>;
  /** Already bald when the customer walks in (thinning crown). */
  preBald?: { x: number; y: number; r: number };
  /** Angle range (degrees) of the outline rows; wider = fur down the cheeks. */
  phiRange?: [number, number];
}

export interface HairState {
  tufts: Tuft[];
}

export const CLIPPER_GUARD = 9;
export const CLIPPER_RADIUS = 17;
export const BALD_DWELL = 0.5;
export const SCISSOR_SNIP_RADIUS = 13;
export const DRYER_RADIUS = 78;

/** Hairline: forehead in the middle, dropping towards the temples. */
export function hairlineY(x: number): number {
  const u = (x - HEAD.cx) / HEAD.rx;
  return HAIRLINE_Y + u * u * 48;
}

function ellipsePoint(phiDeg: number, scale: number): Vec {
  const p = (phiDeg * Math.PI) / 180;
  return { x: HEAD.cx + HEAD.rx * scale * Math.cos(p), y: HEAD.cy - HEAD.ry * scale * Math.sin(p) };
}

/** Normalise an angle into (-3PI/2, PI/2] so "falling down" is monotonic on both sides. */
function normAngle(a: number): number {
  while (a > Math.PI / 2) a -= Math.PI * 2;
  while (a <= (-3 * Math.PI) / 2) a += Math.PI * 2;
  return a;
}

function zoneForX(x: number): Zone {
  if (x < HEAD.cx - 34) return 'left';
  if (x > HEAD.cx + 34) return 'right';
  return 'top';
}

/** Deterministic pseudo-noise so the same customer always starts with the same hair. */
function noise(i: number): number {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

export function createHair(init: HairStyleInit): HairState {
  const tufts: Tuft[] = [];
  const mess = init.messiness ?? 0.12;
  let id = 0;
  const push = (
    t: Omit<
      Tuft,
      'id' | 'len' | 'bald' | 'dwell' | 'spike' | 'spiked' | 'lean' | 'fluff' | 'touches' | 'lastStroke' | 'tint' | 'thick' | 'curl' | 'sculpt' | 'steamed' | 'grow' | 'eternal'
    >,
  ) => {
    const variance = 1 + (noise(id) - 0.5) * 2 * mess;
    const origLen = t.origLen * variance;
    tufts.push({
      ...t,
      id,
      origLen,
      len: origLen,
      bald: false,
      dwell: 0,
      spike: 0,
      spiked: false,
      lean: 0,
      fluff: 0,
      touches: 0,
      lastStroke: -1,
      tint: null,
      thick: 1,
      curl: 0,
      sculpt: null,
      steamed: 0,
      grow: 0,
      eternal: false,
    });
    id++;
  };

  // Edge tufts: three staggered rows around the outline of the scalp.
  const rows = [
    { scale: 1.0, offset: 0 },
    { scale: 0.95, offset: 0.5 },
    { scale: 0.9, offset: 0.25 },
  ];
  const steps = 22;
  const [phiMin, phiMax] = init.phiRange ?? [-6, 186];
  for (const row of rows) {
    for (let i = 0; i < steps; i++) {
      const phi = phiMin + ((i + row.offset) / (steps - 1 + row.offset)) * (phiMax - phiMin);
      const root = ellipsePoint(phi, row.scale);
      const pr = (phi * Math.PI) / 180;
      const normal = normAngle(Math.atan2(-Math.sin(pr) / HEAD.ry, Math.cos(pr) / HEAD.rx));
      const zone: Zone = phi < 52 ? 'right' : phi > 128 ? 'left' : 'top';
      const c = Math.cos(pr);
      const partSign: 1 | -1 = c > 0.04 ? 1 : c < -0.04 ? -1 : i % 2 === 0 ? 1 : -1;
      push({ kind: 'edge', zone, root, normal, partSign, origLen: init.length * (init.zoneLength?.[zone] ?? 1), gel: init.gel[zone] ?? 0 });
    }
  }

  // Crown tufts: a grid on the front of the scalp (what you see from the front).
  for (let y = HEAD.cy - HEAD.ry + 16; y < HAIRLINE_Y + 30; y += 17) {
    for (let x = HEAD.cx - 80; x <= HEAD.cx + 80; x += 19) {
      const jx = x + ((Math.round(y) / 17) % 2 === 0 ? 0 : 9);
      const u = (jx - HEAD.cx) / (HEAD.rx * 0.86);
      const v = (y - HEAD.cy) / (HEAD.ry * 0.88);
      if (u * u + v * v > 1) continue;
      if (y > hairlineY(jx) - 12) continue;
      const fan = (jx - HEAD.cx) / 110;
      const zone = zoneForX(jx);
      push({
        kind: 'crown',
        zone,
        root: { x: jx, y },
        normal: -Math.PI / 2 + fan * 1.6,
        partSign: jx >= HEAD.cx ? 1 : -1,
        origLen: init.length * 0.8 * (init.zoneLength?.[zone] ?? 1),
        gel: init.gel[zone] ?? 0,
      });
    }
  }

  // Fringe (mái): hangs over the forehead.
  for (let x = HEAD.cx - 58; x <= HEAD.cx + 58.1; x += 9.6) {
    push({
      kind: 'fringe',
      zone: 'fringe',
      root: { x, y: hairlineY(x) - 6 },
      normal: Math.PI / 2 - (x - HEAD.cx) / 260,
      partSign: x >= HEAD.cx ? 1 : -1,
      origLen: init.fringeLength,
      gel: init.gel.fringe ?? 0,
    });
  }
  if (init.preBald) {
    const b = init.preBald;
    for (const t of tufts) {
      if (dist(t.root, b) < b.r) {
        t.bald = true;
        t.len = 0;
      }
    }
  }
  return { tufts };
}

export function cloneHair(h: HairState): HairState {
  return { tufts: h.tufts.map((t) => ({ ...t, root: { ...t.root }, sculpt: t.sculpt ? { ...t.sculpt } : null })) };
}

/** Centre-line of a tuft as 4 points (root, two bends, tip). */
export function tuftPoints(t: Tuft): Vec[] {
  const { root } = t;
  if (t.bald || t.len <= 0.5) return [root, root, root, root];
  if (t.sculpt) {
    // Sculpted into a shared point: straight towards the target, as long as the tuft allows.
    const a = Math.atan2(t.sculpt.y - root.y, t.sculpt.x - root.x);
    const L = Math.min(t.len * 1.15, Math.max(dist(root, t.sculpt), 6));
    return [0, 1 / 3, 2 / 3, 1].map((f) => ({ x: root.x + Math.cos(a) * L * f, y: root.y + Math.sin(a) * L * f }));
  }
  if (t.spiked) {
    const fan = (t.root.x - HEAD.cx) / 140;
    const base = t.kind === 'fringe' ? -Math.PI / 2 + fan * 0.8 : t.normal * 0.5 + (-Math.PI / 2) * 0.5;
    const a = base + t.lean * 0.3;
    const L = t.len * 1.12;
    return [0, 1 / 3, 2 / 3, 1].map((f) => ({ x: root.x + Math.cos(a) * L * f, y: root.y + Math.sin(a) * L * f }));
  }
  const visual = t.kind === 'crown' ? 0.55 : 1;
  const seg = (t.len * visual) / 3;
  let a = t.normal;
  let droop: number;
  let maxA: number;
  let minA: number;
  if (t.kind === 'fringe') {
    droop = 0.05 * (1 - t.fluff);
    maxA = Math.PI / 2 + 0.6;
    minA = -Math.PI / 2 - 2;
  } else {
    droop = (1 - t.gel * 0.5) * clamp(t.len / 60, 0, 1.25) * (1 - t.fluff * 0.6) * (t.kind === 'crown' ? 1.3 : 1);
    // Crown hair is swept back, never onto the face.
    maxA = t.kind === 'crown' ? 0.15 : Math.PI / 2 + 0.12;
    minA = t.kind === 'crown' ? -Math.PI - 0.15 : (-3 * Math.PI) / 2 - 0.12;
  }
  // Gravity first, then the whole tuft is swung by its lean (blow-dried / combed).
  const pts: Vec[] = [root];
  let p = root;
  for (let i = 0; i < 3; i++) {
    a = clamp(a + t.partSign * droop * 0.8, minA, maxA);
    const b = a + t.lean + t.curl * (i + 1);
    p = { x: p.x + Math.cos(b) * seg, y: p.y + Math.sin(b) * seg };
    pts.push(p);
  }
  return pts;
}

export function tuftTip(t: Tuft): Vec {
  return tuftPoints(t)[3];
}

/** Coverage of a tuft relative to how it walked in: 0 = bald, 1 = untouched. */
export function tuftRatio(t: Tuft): number {
  return t.bald ? 0 : clamp(t.len / t.origLen, 0, 3);
}

export interface CutResult {
  /** Tufts shortened by this call. */
  cut: Tuft[];
  /** Total px of hair removed (drives falling clippings). */
  removed: number;
  /** Points where hair was removed, for particle effects. */
  at: Vec[];
  /** Tufts that just became bald. */
  newlyBald: Tuft[];
}

function emptyCut(): CutResult {
  return { cut: [], removed: 0, at: [], newlyBald: [] };
}

function shorten(t: Tuft, newLen: number, stroke: number, res: CutResult) {
  if (newLen >= t.len - 0.6) return;
  const pts = tuftPoints(t);
  res.removed += t.len - newLen;
  res.at.push(pts[3]);
  t.len = Math.max(0, newLen);
  if (t.lastStroke !== stroke) {
    t.touches++;
    t.lastStroke = stroke;
  }
  res.cut.push(t);
}

function makeBald(t: Tuft, stroke: number, res: CutResult) {
  if (t.bald) return;
  if (t.len > 0) shorten(t, 0, stroke, res);
  t.bald = true;
  t.spiked = false;
  t.len = 0;
  res.newlyBald.push(t);
}

/** Arc-length along the tuft polyline at the point where segment ab crosses it. */
function crossLength(t: Tuft, a: Vec, b: Vec): number | null {
  const pts = tuftPoints(t);
  const segLen = t.len / 3;
  for (let i = 0; i < 3; i++) {
    const u = segmentIntersect(pts[i], pts[i + 1], a, b);
    if (u !== null) return (i + u) * segLen;
  }
  return null;
}

function closestOnTuft(t: Tuft, a: Vec, b: Vec): { d: number; along: number } {
  const pts = tuftPoints(t);
  const segLen = t.len / 3;
  let best = { d: Infinity, along: 0 };
  for (let i = 0; i < 3; i++) {
    const r = segmentSegment(pts[i], pts[i + 1], a, b);
    if (r.d < best.d) best = { d: r.d, along: (i + r.t) * segLen };
  }
  return best;
}

/**
 * Clipper (tông đơ): anything it touches is buzzed down to the guard length.
 * `forceBald` is used when the head jerks into a running clipper.
 */
export function clipperSweep(h: HairState, a: Vec, b: Vec, stroke: number, forceBald = false): CutResult {
  const res = emptyCut();
  for (const t of h.tufts) {
    if (t.bald) continue;
    if (forceBald && segmentSegment(t.root, t.root, a, b).d < CLIPPER_RADIUS) {
      makeBald(t, stroke, res);
      continue;
    }
    if (t.len <= CLIPPER_GUARD) continue;
    const c = closestOnTuft(t, a, b);
    if (c.d < CLIPPER_RADIUS) shorten(t, CLIPPER_GUARD, stroke, res);
  }
  return res;
}

/** Clipper sitting still: roots under it accumulate dwell and eventually go bald. */
export function clipperDwell(h: HairState, p: Vec, dt: number, stroke: number, baldAfter = BALD_DWELL): CutResult {
  const res = emptyCut();
  for (const t of h.tufts) {
    const near = dist(t.root, p) < CLIPPER_RADIUS + 3;
    if (near && !t.bald) {
      t.dwell += dt;
      if (t.dwell >= baldAfter) makeBald(t, stroke, res);
    } else if (t.dwell > 0) {
      t.dwell = Math.max(0, t.dwell - dt * 0.8);
    }
  }
  return res;
}

export function decayDwell(h: HairState, dt: number) {
  for (const t of h.tufts) if (t.dwell > 0) t.dwell = Math.max(0, t.dwell - dt * 0.8);
}

/** Scissors (kéo): cuts exactly where the blade path crosses a tuft. */
export function scissorsSweep(h: HairState, a: Vec, b: Vec, stroke: number): CutResult {
  const res = emptyCut();
  if (dist(a, b) < 0.5) return res;
  for (const t of h.tufts) {
    if (t.bald || t.len < 2) continue;
    const along = crossLength(t, a, b);
    if (along !== null) shorten(t, Math.max(1.5, along), stroke, res);
  }
  return res;
}

/** A single click with the scissors: snip whatever passes under the blades. */
export function scissorsSnip(h: HairState, p: Vec, stroke: number): CutResult {
  const res = emptyCut();
  for (const t of h.tufts) {
    if (t.bald || t.len < 2) continue;
    const c = closestOnTuft(t, p, p);
    if (c.d < SCISSOR_SNIP_RADIUS) shorten(t, Math.max(1.5, c.along), stroke, res);
  }
  return res;
}

export interface DryerResult {
  /** Tufts that turned into gel spikes on this tick. */
  newlySpiked: Tuft[];
  /** Total wind applied (for sound / effects). */
  power: number;
  /** Wind that hit bald skin (it's hot!). */
  onBald: number;
}

/** Hair dryer (máy sấy): pushes hair away from the nozzle, fluffs it, and sets gel into spikes. */
export function dryerBlow(h: HairState, p: Vec, dt: number, invert = false): DryerResult {
  const out: DryerResult = { newlySpiked: [], power: 0, onBald: 0 };
  for (const t of h.tufts) {
    const pts = tuftPoints(t);
    const mid = pts[2];
    const d = dist(mid, p);
    if (d > DRYER_RADIUS) continue;
    const s = (1 - d / DRYER_RADIUS) * dt;
    if (t.bald) {
      if (dist(t.root, p) < 40) out.onBald += s;
      continue;
    }
    if (t.len < 3) continue;
    out.power += s;
    if (t.gel > 0.05 && !t.spiked) {
      t.spike += s * 2.4 * t.gel * (t.eternal ? 4 : 1);
      if (t.spike >= 1) {
        t.spiked = true;
        out.newlySpiked.push(t);
      }
    }
    // The dryer points at the head: hair is pushed from the nozzle towards (and past) the centre.
    const toHead = { x: HEAD.cx - p.x, y: HEAD.cy - 20 - p.y };
    let wind = Math.hypot(toHead.x, toHead.y) > 25 ? Math.atan2(toHead.y, toHead.x) : Math.atan2(mid.y - p.y, mid.x - p.x);
    // Anti-gravity hair (Khách X-79) flies towards the nozzle instead.
    if (invert) wind += Math.PI;
    const start = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    const stiff = t.spiked ? 0.25 : 1 - t.gel * 0.6;
    t.lean = clamp(t.lean + clamp(angleDiff(start, wind), -1, 1) * s * 2.2 * stiff, -1.4, 1.4);
    t.fluff = clamp(t.fluff + s * 0.9 * (1 - t.gel * 0.7), 0, 1);
  }
  return out;
}
