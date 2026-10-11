import { CUSTOMERS } from './customers';
import type { Mood } from './evaluate';
import { Carving, HairState, createHair } from './hair';
import type { PersonaId } from './mirror';
import type { RoundState } from './session';

/** A saved creation (Sổ kiểu tóc / cuốn mẫu of the shop). */
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
  /** Times a customer ordered it from the shop's catalog. */
  orders?: number;
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

export const BOOK_KEY = 'tctbo-studio-book';
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


/**
 * The same creation on someone else's head: each tuft copies the closest tuft of the same
 * kind (lengths as a share of the natural length), patterns are moved and scaled with the skull.
 */
export function creationHairOn(c: Creation, customerId: string): HairState {
  const src = creationHair(c);
  if (customerId === c.customer) return src;
  const d = CUSTOMERS.find((x) => x.id === customerId) ?? CUSTOMERS[0];
  const h = createHair(d.hair);
  const norm = (t: { root: { x: number; y: number } }, hd: HairState['head']) => ({ x: (t.root.x - hd.cx) / hd.rx, y: (t.root.y - hd.cy) / hd.ry });
  const srcN = src.tufts.map((t) => ({ t, n: norm(t, src.head) }));
  for (const t of h.tufts) {
    const n = norm(t, h.head);
    let best = srcN[0];
    let bd = Infinity;
    for (const o of srcN) {
      if (o.t.kind !== t.kind) continue;
      const dd = (o.n.x - n.x) ** 2 + (o.n.y - n.y) ** 2;
      if (dd < bd) {
        bd = dd;
        best = o;
      }
    }
    const o = best.t;
    t.len = t.origLen * (o.origLen > 0 ? o.len / o.origLen : 1);
    t.bald = o.bald;
    t.spiked = o.spiked;
    t.spike = o.spike;
    t.tint = o.tint;
    t.lean = o.lean;
    t.fluff = o.fluff;
    t.thick = o.thick;
    t.curl = o.curl;
    t.gel = o.gel;
  }
  const kx = h.head.rx / src.head.rx;
  const ky = h.head.ry / src.head.ry;
  h.carvings = (src.carvings ?? []).map((cv) => ({ ...cv, x: h.head.cx + (cv.x - src.head.cx) * kx, y: h.head.cy + (cv.y - src.head.cy) * ky, s: cv.s * Math.sqrt(kx * ky) }));
  return h;
}
