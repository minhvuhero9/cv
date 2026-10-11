import { Vec, dist, pointSegment } from './geometry';
import type { Carving, HairState, StencilId } from './hair';

/**
 * Đồ nghề sáng tạo: Cọ Nhuộm (dye without cutting) and Khuôn Cạo Hình (shave a pattern
 * into the hair). Pure functions over the hair, used by every mode. What you can use
 * depends on your kit: the shop sells the brush, the stencils and their upgrades.
 */
export interface ArtSettings {
  colorA: string;
  colorB: string;
  /** Two-colour fade, top → bottom. */
  blend: boolean;
  stencil: StencilId;
  text: string;
  size: number;
}

/** What the barber owns. */
export interface ArtKit {
  colors: string[];
  /** Any colour (colour picker) and the two-colour fade. */
  custom: boolean;
  stencils: StencilId[];
  /** Stencil size slider. */
  sizes: boolean;
}

export const PALETTE = ['#ff3fa4', '#ff6a00', '#ffd400', '#2ee86a', '#18c8ff', '#8a4dff', '#ffffff', '#c0c0c0', '#e8b04a', '#1d1d1d'];
export const BASIC_COLORS = ['#ff3fa4', '#ffd400', '#18c8ff', '#2ee86a'];
export const STENCILS: { id: StencilId; name: string }[] = [
  { id: 'bolt', name: 'Tia sét' },
  { id: 'star', name: 'Ngôi sao' },
  { id: 'stripes', name: 'Sọc' },
  { id: 'heart', name: 'Trái tim' },
  { id: 'zigzag', name: 'Răng cưa' },
  { id: 'text', name: 'Chữ' },
];
export const BASIC_STENCILS: StencilId[] = ['bolt', 'star', 'stripes'];

export function fullKit(): ArtKit {
  return { colors: [...PALETTE], custom: true, stencils: STENCILS.map((x) => x.id), sizes: true };
}

/** Career: the kit grows with what was bought in the shop. */
export function careerKit(owned: string[]): ArtKit {
  const xl = owned.includes('paletteXL');
  const pro = owned.includes('stencilPro');
  return { colors: xl ? [...PALETTE] : [...BASIC_COLORS], custom: xl, stencils: pro ? STENCILS.map((x) => x.id) : [...BASIC_STENCILS], sizes: pro };
}

export function newArt(kit: ArtKit): ArtSettings {
  return { colorA: kit.colors[0], colorB: kit.colors[Math.min(4, kit.colors.length - 1)], blend: false, stencil: kit.stencils[0], text: 'BẤT ỔN', size: 1 };
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

/** 0..441: how far apart two colours are. */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

/** Colour for a tuft: plain, or a top-to-bottom fade between the two colours. */
export function colorFor(art: ArtSettings, h: HairState, root: Vec): string {
  if (!art.blend) return art.colorA;
  const top = h.head.cy - h.head.ry;
  const t = Math.min(1, Math.max(0, (root.y - top) / (h.head.ry * 1.25)));
  return mixColor(art.colorA, art.colorB, t);
}

export const BRUSH_RADIUS = 24;

/** Cọ nhuộm: dye the tufts under the brush without changing their shape. Returns how many changed. */
export function brushHair(h: HairState, art: ArtSettings, p: Vec): number {
  let n = 0;
  for (const t of h.tufts) {
    if (t.bald || t.len < 2 || dist(t.root, p) > BRUSH_RADIUS) continue;
    const c = colorFor(art, h, t.root);
    if (t.tint !== c) {
      t.tint = c;
      n++;
    }
  }
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

export const textWidth = (c: Carving) => (c.text ?? '').length * 15 * c.s;

function place(c: Carving, p: Vec): Vec {
  const a = (c.r * Math.PI) / 180;
  return { x: c.x + (p.x * Math.cos(a) - p.y * Math.sin(a)) * c.s, y: c.y + (p.x * Math.sin(a) + p.y * Math.cos(a)) * c.s };
}

export function carvingLines(c: Carving): Vec[][] {
  if (c.kind === 'text') {
    // Letters are drawn as text; for cutting, treat them as a box of horizontal strokes.
    const w = textWidth(c) / 2;
    return [-8, 0, 8].map((dy) => [place(c, { x: -w, y: dy }), place(c, { x: w, y: dy })]);
  }
  return STENCIL_LINES[c.kind].map((l) => l.map((p) => place(c, p)));
}

/** The carving a click at p would make (also used for the cursor preview). */
export function carvingAt(h: HairState, art: ArtSettings, p: Vec): Carving {
  return {
    kind: art.stencil,
    x: p.x,
    y: p.y,
    s: art.size,
    r: ((p.x - h.head.cx) / h.head.rx) * 25,
    ...(art.stencil === 'text' ? { text: art.text.slice(0, 8).toUpperCase() } : {}),
  };
}

/** Cạo hình: shave a stencil into the hair at p (scalp only). Tufts on the lines are clipped to the skin. */
export function carveHair(h: HairState, art: ArtSettings, p: Vec): Carving | null {
  const hd = h.head;
  if (((p.x - hd.cx) / hd.rx) ** 2 + ((p.y - hd.cy) / hd.ry) ** 2 > 1 || p.y > hd.cy + 10) return null;
  const c = carvingAt(h, art, p);
  const lines = carvingLines(c);
  for (const t of h.tufts) {
    if (t.bald) continue;
    let d = Infinity;
    for (const l of lines) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, pointSegment(t.root, l[i], l[i + 1]).d);
    if (d < 9 * c.s) t.len = Math.min(t.len, 2);
  }
  h.carvings = [...(h.carvings ?? []), c].slice(-12);
  return c;
}

export const STENCIL_NAME = Object.fromEntries(STENCILS.map((x) => [x.id, x.name])) as Record<StencilId, string>;
