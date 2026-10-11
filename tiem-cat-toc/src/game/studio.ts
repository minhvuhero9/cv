import { CUSTOMERS } from './customers';
import type { Mood } from './evaluate';
import { Vec, dist, pointSegment } from './geometry';
import { Carving, HairState, StencilId, cloneHair, createHair } from './hair';
import { PersonaId, personaById, transformCustomer } from './mirror';
import { createRound, refreshMetrics, RoundState, startCutting } from './session';
import { ToolId, TOOLS } from './tools';

/**
 * Xưởng Tạo Kiểu: a sandbox with no judge and no clock. Every tool, a colour brush,
 * shaved-in art from stencils, undo/redo, a photo mode and a book of saved creations.
 */
export type StudioMode = 'tool' | 'brush' | 'stencil';

export interface StudioState {
  mode: StudioMode;
  colorA: string;
  colorB: string;
  /** Two-colour fade (top colour → bottom colour) for the brush and the Súng Tóc. */
  blend: boolean;
  stencil: StencilId;
  text: string;
  /** Stencil size multiplier. */
  size: number;
  undo: HairState[];
  redo: HairState[];
}

export const PALETTE = ['#ff3fa4', '#ff6a00', '#ffd400', '#2ee86a', '#18c8ff', '#8a4dff', '#ffffff', '#c0c0c0', '#e8b04a', '#1d1d1d'];
export const STENCILS: { id: StencilId; name: string }[] = [
  { id: 'bolt', name: 'Tia sét' },
  { id: 'star', name: 'Ngôi sao' },
  { id: 'heart', name: 'Trái tim' },
  { id: 'stripes', name: 'Sọc' },
  { id: 'zigzag', name: 'Răng cưa' },
  { id: 'text', name: 'Chữ' },
];
const UNDO_MAX = 40;
export const ALL_TOOLS: ToolId[] = TOOLS.filter((t) => t.unlock.kind !== 'soon').map((t) => t.id);

export function newStudio(): StudioState {
  return { mode: 'tool', colorA: '#ff3fa4', colorB: '#18c8ff', blend: false, stencil: 'bolt', text: 'BẤT ỔN', size: 1, undo: [], redo: [] };
}

/** A studio round: every tool, Gương Thần, no clock, nobody judging. */
export function studioRound(customer: string, seed = 7): RoundState {
  const s = createRound(customer, seed, { onlyTools: ALL_TOOLS, mirror: true, ctx: { stock: { potion: 99, gel: 99 } } });
  s.studio = newStudio();
  s.timeLimit = Infinity;
  s.bubble = { text: 'Hôm nay không chấm điểm. Cứ sáng tạo thoải mái!', until: 3, shout: false };
  s.pending = [];
  startCutting(s);
  return s;
}

/* ------------------------------------------------------------------ undo / redo */

export function pushUndo(s: RoundState) {
  const st = s.studio;
  if (!st) return;
  st.undo.push(cloneHair(s.hair));
  if (st.undo.length > UNDO_MAX) st.undo.shift();
  st.redo = [];
}

export function undo(s: RoundState): boolean {
  const st = s.studio;
  if (!st?.undo.length) return false;
  st.redo.push(cloneHair(s.hair));
  s.hair = st.undo.pop()!;
  refreshMetrics(s);
  return true;
}

export function redo(s: RoundState): boolean {
  const st = s.studio;
  if (!st?.redo.length) return false;
  st.undo.push(cloneHair(s.hair));
  s.hair = st.redo.pop()!;
  refreshMetrics(s);
  return true;
}

/** Start over with the model's own hair (undoable). */
export function resetHair(s: RoundState) {
  pushUndo(s);
  s.hair = cloneHair(s.before);
  refreshMetrics(s);
}

/* ------------------------------------------------------------------ colour */

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[m(r1, r2), m(g1, g2), m(b1, b2)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Colour for a tuft: plain, or a top-to-bottom fade between the two colours. */
export function colorFor(st: StudioState, h: HairState, root: Vec): string {
  if (!st.blend) return st.colorA;
  const top = h.head.cy - h.head.ry;
  const t = Math.min(1, Math.max(0, (root.y - top) / (h.head.ry * 1.25)));
  return mixColor(st.colorA, st.colorB, t);
}

export const BRUSH_RADIUS = 24;

/** Cọ nhuộm: dye the tufts under the brush without changing their shape. */
export function brush(s: RoundState, p: Vec): number {
  const st = s.studio;
  if (!st) return 0;
  let n = 0;
  for (const t of s.hair.tufts) {
    if (t.bald || t.len < 2 || dist(t.root, p) > BRUSH_RADIUS) continue;
    const c = colorFor(st, s.hair, t.root);
    if (t.tint !== c) {
      t.tint = c;
      n++;
    }
  }
  if (n) refreshMetrics(s);
  return n;
}

/* ------------------------------------------------------------------ shaved art */

/** Stencil outlines in local units (about 60 wide), as polylines. */
export const STENCIL_LINES: Record<Exclude<StencilId, 'text'>, Vec[][]> = {
  bolt: [[{ x: -6, y: -30 }, { x: 12, y: -30 }, { x: 2, y: -6 }, { x: 16, y: -6 }, { x: -10, y: 30 }, { x: -2, y: 4 }, { x: -16, y: 4 }, { x: -6, y: -30 }]],
  star: [
    Array.from({ length: 11 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 30 : 13;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    }),
  ],
  heart: [
    Array.from({ length: 25 }, (_, i) => {
      const t = (i / 24) * Math.PI * 2;
      return { x: 16 * Math.pow(Math.sin(t), 3) * 1.6, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 1.6 };
    }),
  ],
  stripes: [
    [{ x: -30, y: -14 }, { x: 30, y: -24 }],
    [{ x: -30, y: 2 }, { x: 30, y: -8 }],
    [{ x: -30, y: 18 }, { x: 30, y: 8 }],
  ],
  zigzag: [[{ x: -32, y: 0 }, { x: -20, y: -14 }, { x: -8, y: 14 }, { x: 4, y: -14 }, { x: 16, y: 14 }, { x: 28, y: -6 }]],
};

export function carvingLines(c: Carving): Vec[][] {
  if (c.kind === 'text') {
    // Text is drawn as letters; for cutting, treat it as a box of horizontal strokes.
    const w = textWidth(c) / 2;
    return [-8, 0, 8].map((dy) => [
      { x: -w, y: dy },
      { x: w, y: dy },
    ]).map((l) => l.map((p) => place(c, p)));
  }
  return STENCIL_LINES[c.kind].map((l) => l.map((p) => place(c, p)));
}

export const textWidth = (c: Carving) => (c.text ?? '').length * 15 * c.s;

function place(c: Carving, p: Vec): Vec {
  const a = (c.r * Math.PI) / 180;
  return { x: c.x + (p.x * Math.cos(a) - p.y * Math.sin(a)) * c.s, y: c.y + (p.x * Math.sin(a) + p.y * Math.cos(a)) * c.s };
}

/** Cạo hình: shave a stencil into the hair at p. Tufts on the lines are clipped to the skin. */
export function carve(s: RoundState, p: Vec): Carving | null {
  const st = s.studio;
  if (!st) return null;
  const h = s.hair.head;
  // Only on the scalp.
  if (((p.x - h.cx) / h.rx) ** 2 + ((p.y - h.cy) / h.ry) ** 2 > 1 || p.y > h.cy + 10) return null;
  const c: Carving = { kind: st.stencil, x: p.x, y: p.y, s: st.size, r: ((p.x - h.cx) / h.rx) * 25, ...(st.stencil === 'text' ? { text: st.text.slice(0, 8).toUpperCase() } : {}) };
  const lines = carvingLines(c);
  for (const t of s.hair.tufts) {
    if (t.bald) continue;
    let d = Infinity;
    for (const l of lines) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, pointSegment(t.root, l[i], l[i + 1]).d);
    if (d < 9 * c.s) t.len = Math.min(t.len, 2);
  }
  s.hair.carvings = [...(s.hair.carvings ?? []), c];
  refreshMetrics(s);
  return c;
}

/* ------------------------------------------------------------------ the book */

export type PhotoBg = 'salon' | 'pastel' | 'neon' | 'tet' | 'plain';
export type PhotoFrame = 'none' | 'polaroid' | 'gold' | 'film';
export interface Sticker {
  id: string;
  x: number;
  y: number;
}
export interface PhotoSettings {
  mood: Mood;
  bg: PhotoBg;
  frame: PhotoFrame;
  stickers: Sticker[];
}

/** Full tuft state (more than the career snapshot: curls, gel, sculpt). */
type TuftSnap = [number, 0 | 1, 0 | 1, string | null, number, number, number, number, number, number | null, number | null];

export interface Creation {
  id: string;
  name: string;
  caption: string;
  customer: string;
  persona: PersonaId | null;
  tufts: TuftSnap[];
  carvings: Carving[];
  photo: PhotoSettings;
  at: number;
}

const BOOK_KEY = 'tctbo-studio-book';
export const BOOK_MAX = 40;

const r2 = (n: number) => Math.round(n * 100) / 100;

export function snapCreation(s: RoundState, name: string, caption: string, photo: PhotoSettings, id?: string): Creation {
  return {
    id: id ?? `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    name: name.slice(0, 60),
    caption: caption.slice(0, 120),
    customer: s.baseCustomer.id,
    persona: s.persona,
    tufts: s.hair.tufts.map((t) => [r2(t.len), t.bald ? 1 : 0, t.spiked ? 1 : 0, t.tint, r2(t.lean), r2(t.fluff), r2(t.thick), r2(t.curl), r2(t.gel), t.sculpt ? r2(t.sculpt.x) : null, t.sculpt ? r2(t.sculpt.y) : null]),
    carvings: (s.hair.carvings ?? []).map((c) => ({ ...c })),
    photo: { ...photo, stickers: photo.stickers.map((x) => ({ ...x })) },
    at: Date.now(),
  };
}

/** Rebuilds the hair of a saved creation on the model's own head. */
export function creationHair(c: Creation): HairState {
  const d = CUSTOMERS.find((x) => x.id === c.customer) ?? CUSTOMERS[0];
  const h = createHair(d.hair);
  h.tufts.forEach((t, i) => {
    const v = c.tufts[i];
    if (!v) return;
    [t.len, t.tint, t.lean, t.fluff, t.thick, t.curl, t.gel] = [v[0], v[3], v[4], v[5], v[6], v[7], v[8]];
    t.bald = v[1] === 1;
    t.spiked = v[2] === 1;
    t.spike = t.spiked ? 1 : 0;
    t.sculpt = v[9] !== null && v[10] !== null ? { x: v[9], y: v[10] } : null;
  });
  h.carvings = c.carvings.map((x) => ({ ...x }));
  return h;
}

/** Opens a saved creation in the studio to keep working on it. */
export function openCreation(c: Creation): RoundState {
  const s = studioRound(CUSTOMERS.some((x) => x.id === c.customer) ? c.customer : 'tuan');
  const p = personaById(c.persona);
  if (p) {
    s.persona = p.id;
    s.customer = transformCustomer(s.baseCustomer, p, null);
  }
  s.hair = creationHair(c);
  refreshMetrics(s);
  s.bubble = null;
  return s;
}

export function loadBook(store: Storage | undefined = globalThis.localStorage): Creation[] {
  try {
    const v = JSON.parse(store?.getItem(BOOK_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((c) => c && Array.isArray(c.tufts)) : [];
  } catch {
    return [];
  }
}

/** Saves (or replaces by id); keeps the newest BOOK_MAX. Returns false when storage is full. */
export function saveToBook(c: Creation, store: Storage | undefined = globalThis.localStorage): boolean {
  const book = [c, ...loadBook(store).filter((x) => x.id !== c.id)].slice(0, BOOK_MAX);
  try {
    store?.setItem(BOOK_KEY, JSON.stringify(book));
    return true;
  } catch {
    return false;
  }
}

export function deleteFromBook(id: string, store: Storage | undefined = globalThis.localStorage) {
  try {
    store?.setItem(BOOK_KEY, JSON.stringify(loadBook(store).filter((x) => x.id !== id)));
  } catch {
    /* ignore */
  }
}
