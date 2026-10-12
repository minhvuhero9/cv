import type { Creation } from './creation';
import { CUSTOMERS } from './customers';
import type { Carving, StencilId } from './hair';

/**
 * Tiệm của riêng bạn: the shop's name, wall paint and sign colour, and how the bought
 * decor is arranged on the wall. Plus "thách bạn bè": a saved design packed into a link.
 */
export interface ShopLook {
  name: string;
  wall: WallId;
  sign: SignId;
  /** Wall items in display order (ids from decorIds); missing ones go at the end. */
  order: string[];
  /** Items taken down from the wall. */
  hidden: string[];
}

export type WallId = 'mint' | 'pink' | 'sun' | 'night' | 'wood';
export type SignId = 'red' | 'blue' | 'gold' | 'purple';

export const WALLS: { id: WallId; name: string; a: string; b: string }[] = [
  { id: 'mint', name: 'Bạc hà', a: '#bfe3d6', b: '#a9d6c6' },
  { id: 'pink', name: 'Hồng phấn', a: '#f8d3e2', b: '#efbdd1' },
  { id: 'sun', name: 'Vàng nắng', a: '#fbe7a8', b: '#f3d77f' },
  { id: 'night', name: 'Xanh đêm', a: '#3a4a78', b: '#2f3d66' },
  { id: 'wood', name: 'Gỗ ấm', a: '#d9b48a', b: '#c99f72' },
];

export const SIGNS: { id: SignId; name: string; bg: string; text: string }[] = [
  { id: 'red', name: 'Đỏ', bg: '#d6332f', text: '#fff8e8' },
  { id: 'blue', name: 'Xanh', bg: '#2457b8', text: '#fff8e8' },
  { id: 'gold', name: 'Đen vàng', bg: '#1d1d1d', text: '#ffd23f' },
  { id: 'purple', name: 'Tím', bg: '#6b2fb3', text: '#ffe3f8' },
];

export const DEFAULT_NAME = 'TIỆM CẮT TÓC BẤT ỔN';
export const NAME_MAX = 26;

export function defaultLook(): ShopLook {
  return { name: DEFAULT_NAME, wall: 'mint', sign: 'red', order: [], hidden: [] };
}

export function cleanName(name: string): string {
  const n = name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return n || DEFAULT_NAME;
}

/** Wall items the shop has (works = the newest catalog pages). */
export function decorIds(owned: string[], works: number, trophies: number): string[] {
  const ids: string[] = [];
  if (works > 0) ids.push('works');
  if (trophies > 0) ids.push('trophies');
  for (const id of ['award', 'mirror', 'petSign', 'plant', 'bench', 'generator']) if (owned.includes(id)) ids.push(id);
  return ids;
}

/** The wall in the player's order, without the hidden ones. */
export function arrange(ids: string[], look: Pick<ShopLook, 'order' | 'hidden'>): string[] {
  const known = look.order.filter((x) => ids.includes(x));
  return [...known, ...ids.filter((x) => !known.includes(x))].filter((x) => !look.hidden.includes(x));
}

/** Move an item to a slot (drag & drop / tap-tap). */
export function moveDecor(ids: string[], look: ShopLook, id: string, to: number): ShopLook {
  const cur = arrange(ids, { order: look.order, hidden: [] }).filter((x) => x !== id);
  cur.splice(Math.max(0, Math.min(to, cur.length)), 0, id);
  return { ...look, order: cur };
}

export function toggleDecor(look: ShopLook, id: string): ShopLook {
  return { ...look, hidden: look.hidden.includes(id) ? look.hidden.filter((x) => x !== id) : [...look.hidden, id] };
}

/* ------------------------------------------------------------------ challenge links */

const KINDS: StencilId[] = ['bolt', 'star', 'heart', 'stripes', 'zigzag', 'text'];

interface Packed {
  v: 1;
  n: string;
  c: string;
  /** Per tuft: length (0.1 px) and colour, "len.tint" joined with "," ("b" = bald). */
  t: string;
  k: [number, number, number, number, number, string?][];
}

function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s: string): string {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}

/** A saved design as a short, URL-safe code. */
export function packChallenge(c: Creation): string {
  const p: Packed = {
    v: 1,
    n: c.name.slice(0, 40),
    c: c.customer,
    t: c.tufts.map((x) => (x[1] ? 'b' : `${Math.round(x[0] * 10)}${x[3] ? x[3].replace('#', '.') : ''}`)).join(','),
    k: c.carvings.slice(0, 12).map((k) => [KINDS.indexOf(k.kind), Math.round(k.x), Math.round(k.y), Math.round(k.s * 100) / 100, Math.round(k.r), ...(k.text ? [k.text] : [])] as Packed['k'][number]),
  };
  return b64url(JSON.stringify(p));
}

/** Back to a creation (null if the code is broken or names an unknown customer). */
export function unpackChallenge(code: string): Creation | null {
  try {
    const p = JSON.parse(unb64url(code)) as Packed;
    if (p.v !== 1 || typeof p.t !== 'string' || !CUSTOMERS.some((d) => d.id === p.c)) return null;
    const tufts = p.t.split(',').map((x): Creation['tufts'][number] => {
      if (x === 'b') return [0, 1, 0, null, 0, 0, 1, 0, 0, null, null];
      const [len, tint] = x.split('.');
      const v = Number(len) / 10;
      return [Number.isFinite(v) ? v : 0, 0, 0, tint && /^[0-9a-f]{6}$/i.test(tint) ? `#${tint}` : null, 0, 0, 1, 0, 0, null, null];
    });
    const carvings: Carving[] = (p.k ?? [])
      .filter((k) => KINDS[k[0]])
      .map((k) => ({ kind: KINDS[k[0]], x: k[1], y: k[2], s: k[3], r: k[4], ...(k[5] ? { text: String(k[5]).slice(0, 8) } : {}) }));
    return {
      id: `challenge-${code.slice(0, 10)}`,
      name: String(p.n ?? 'Thử thách').slice(0, 40),
      caption: '',
      customer: p.c,
      persona: null,
      tufts,
      carvings,
      photo: { mood: 'happy', bg: 'salon', frame: 'none', stickers: [] },
      at: 0,
    };
  } catch {
    return null;
  }
}

export function challengeUrl(c: Creation, base = `${location.origin}${location.pathname}`): string {
  return `${base}?challenge=${packChallenge(c)}`;
}
