import type { CustomerDef } from './customers';
import { clamp } from './geometry';
import type { HairState, StencilId } from './hair';
import { HairMetrics, measureHair } from './metrics';
import type { ToolId } from './tools';

/**
 * Khách "tùy thợ": no picture, no outline — "làm gì cũng được, miễn hợp gu em".
 * Each taste is a few likes (points when present) and dislikes (points lost); the player
 * decides the actual look. Good results go into the shop's catalog automatically.
 */
export interface TasteRule {
  id: string;
  label: string;
  points: number;
  check(m: HairMetrics, h: HairState | null): boolean;
}

export interface Taste {
  id: string;
  name: string;
  /** What the customer says. */
  ask: string;
  /** Tools the shop needs before this taste walks in. */
  needs: ToolId[];
  likes: TasteRule[];
  dislikes: TasteRule[];
  /** Judges neat, even sides (most do; the asymmetric fan does not). */
  neat: boolean;
}

/* ------------------------------------------------------------------ colour helpers */

function hue(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 0.08) return { h: 0, s: 0, l };
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s: d / (1 - Math.abs(2 * l - 1) || 1), l };
}

export type ColorFamily = 'warm' | 'pink' | 'cool' | 'green' | 'neutral';

export function colorFamily(hex: string): ColorFamily {
  const { h, s } = hue(hex);
  if (s < 0.15) return 'neutral';
  if (h >= 290 && h < 345) return 'pink';
  if (h >= 345 || h < 70) return 'warm';
  if (h < 160) return 'green';
  if (h < 290) return 'cool';
  return 'neutral';
}

/** Share of live tufts dyed in this colour family. */
export function familyShare(h: HairState | null, fam: ColorFamily): number {
  if (!h) return 0;
  const live = h.tufts.filter((t) => !t.bald && t.len > 2);
  if (!live.length) return 0;
  return live.filter((t) => t.tint && colorFamily(t.tint) === fam).length / live.length;
}

const carved = (h: HairState | null, kinds: StencilId[]) => (h?.carvings ?? []).some((c) => kinds.includes(c.kind));

/* ------------------------------------------------------------------ rules */

const R = {
  sidesShort: (max = 0.5, points = 15): TasteRule => ({ id: 'sides', label: 'Hai bên ngắn', points, check: (m) => m.zone.left <= max && m.zone.right <= max }),
  topLong: (min = 0.78, points = 15): TasteRule => ({ id: 'top', label: 'Phía trên để dài', points, check: (m) => m.zone.top >= min }),
  fringeLong: (points = 10): TasteRule => ({ id: 'fringe', label: 'Mái dài', points, check: (m) => m.zone.fringe >= 0.6 }),
  even: (points = 15): TasteRule => ({ id: 'even', label: 'Hai bên đều nhau', points, check: (m) => m.unevenLR < 0.08 }),
  color: (fam: ColorFamily, label: string, share = 0.3, points = 30): TasteRule => ({ id: `c-${fam}`, label, points, check: (_m, h) => familyShare(h, fam) >= share }),
  anyCarving: (points = 25): TasteRule => ({ id: 'carve', label: 'Có hình cạo', points, check: (m) => m.carvingCount >= 1 }),
  carving: (kinds: StencilId[], label: string, points = 15): TasteRule => ({ id: `k-${kinds.join('')}`, label, points, check: (_m, h) => carved(h, kinds) }),
  /* dislikes */
  noBald: (points = 35): TasteRule => ({ id: 'bald', label: 'Trọc lốc', points, check: (m) => m.baldFrac > 0.05 }),
  noArt: (points = 25): TasteRule => ({ id: 'art', label: 'Nhuộm hay cạo hình', points, check: (m) => m.tintedFrac > 0.05 || m.carvingCount > 0 }),
  noColor: (fam: ColorFamily, label: string, points = 25): TasteRule => ({ id: `n-${fam}`, label, points, check: (_m, h) => familyShare(h, fam) > 0.1 }),
  noShort: (points = 25): TasteRule => ({ id: 'short', label: 'Cắt cụt lủn', points, check: (m) => m.avg < 0.4 }),
};

/** Every taste: "em bảo làm gì cũng được, chứ có bảo không làm gì đâu!" */
export const UNTOUCHED: TasteRule = { id: 'same', label: 'Để nguyên không làm gì', points: 35, check: (m) => m.avg > 0.9 && m.tintedFrac < 0.05 && m.carvingCount === 0 };

const TASTE_LIST: Taste[] = [
  {
    id: 'gon',
    name: 'Gu Gọn Gàng',
    ask: 'gọn gàng, sạch sẽ, nhìn là thấy lịch sự.',
    needs: [],
    neat: true,
    likes: [
      { id: 'mid', label: 'Ngắn vừa phải', points: 25, check: (m) => m.avg >= 0.38 && m.avg <= 0.7 },
      R.even(15),
      { id: 'tidy', label: 'Đường cắt gọn', points: 10, check: (m) => m.choppiness < 0.12 },
    ],
    dislikes: [R.noArt(25), R.noBald(35)],
  },
  {
    id: 'chat',
    name: 'Gu Càng Ngắn Càng Chất',
    ask: 'càng ngắn càng chất, nhưng đừng để lộ da đầu nhé!',
    needs: [],
    neat: true,
    likes: [
      { id: 'short', label: 'Ngắn thật ngắn', points: 30, check: (m) => m.avg <= 0.38 },
      R.sidesShort(0.28, 15),
    ],
    dislikes: [R.noBald(40)],
  },
  {
    id: 'lech',
    name: 'Gu Bất Đối Xứng',
    ask: 'phá cách! Một bên dài một bên ngắn mới chất.',
    needs: [],
    neat: false,
    likes: [
      { id: 'lop', label: 'Lệch rõ hai bên', points: 35, check: (m) => m.unevenLR >= 0.28 },
      R.fringeLong(10),
    ],
    dislikes: [R.noBald(30)],
  },
  {
    id: 'lua',
    name: 'Gu Rực Lửa',
    ask: 'màu nóng, rực như lửa! Vàng, cam, đỏ gì cũng được.',
    needs: ['brush'],
    neat: true,
    likes: [R.color('warm', 'Tóc màu nóng (vàng/cam/đỏ)', 0.3, 30), R.sidesShort(0.6, 10), R.carving(['bolt', 'star'], 'Thêm tia sét hoặc ngôi sao', 10)],
    dislikes: [R.noColor('cool', 'Màu lạnh (xanh, tím)'), R.noBald(35)],
  },
  {
    id: 'bien',
    name: 'Gu Biển Xanh',
    ask: 'mát mẻ như biển, màu xanh mát và tóc phía trên để dài.',
    needs: ['brush'],
    neat: true,
    likes: [R.color('cool', 'Tóc màu xanh dương/tím', 0.25, 30), R.topLong(0.75, 15)],
    dislikes: [R.noShort(25), R.noColor('warm', 'Màu nóng (vàng/cam/đỏ)', 20), R.noBald(35)],
  },
  {
    id: 'dethuong',
    name: 'Gu Dễ Thương',
    ask: 'dễ thương, hồng hồng, mái dài chút.',
    needs: ['brush'],
    neat: true,
    likes: [R.color('pink', 'Có màu hồng', 0.2, 30), R.fringeLong(15), R.carving(['heart', 'star'], 'Trái tim hoặc ngôi sao', 10)],
    dislikes: [R.noShort(25), R.noBald(40)],
  },
  {
    id: 'ngau',
    name: 'Gu Ngầu Đường Phố',
    ask: 'ngầu! Hai bên cạo ngắn, khắc hình lên cho chất.',
    needs: ['stencil'],
    neat: true,
    likes: [R.anyCarving(25), R.sidesShort(0.45, 20), { id: 'two', label: 'Từ hai hình trở lên', points: 10, check: (m) => m.carvingCount >= 2 }],
    dislikes: [R.noColor('pink', 'Màu hồng', 20), R.noBald(30)],
  },
  {
    id: 'cauvong',
    name: 'Gu Cầu Vồng',
    ask: 'càng nhiều màu càng vui! Cả đầu là một cầu vồng.',
    needs: ['brush'],
    neat: false,
    likes: [
      { id: 'many', label: 'Ít nhất 3 màu', points: 30, check: (m) => m.colorCount >= 3 },
      { id: 'cover', label: 'Nhuộm hơn nửa đầu', points: 15, check: (m) => m.tintedFrac >= 0.5 },
    ],
    dislikes: [R.noShort(20), R.noBald(35)],
  },
  {
    id: 'nghesi',
    name: 'Gu Nghệ Sĩ',
    ask: 'nghệ thuật! Có màu, có hình, càng độc càng tốt.',
    needs: ['brush', 'stencil'],
    neat: false,
    likes: [
      { id: 'tint', label: 'Có nhuộm màu', points: 20, check: (m) => m.tintedFrac >= 0.25 },
      R.anyCarving(20),
      { id: 'word', label: 'Khắc chữ hoặc 2 màu trở lên', points: 10, check: (m) => m.hasText || m.colorCount >= 2 },
    ],
    dislikes: [R.noBald(30)],
  },
];

export const TASTES: Taste[] = TASTE_LIST.map((t) => ({ ...t, dislikes: [UNTOUCHED, ...t.dislikes] }));

export const tasteById = (id: string | null | undefined) => TASTES.find((t) => t.id === id) ?? null;

/** Tastes this shop can satisfy with its tools. */
export function tastesFor(tools: ToolId[]): Taste[] {
  return TASTES.filter((t) => t.needs.every((x) => tools.includes(x)));
}

const BASE = 45;

/** 0..100: how well the head fits the customer's taste. */
export function tasteScore(t: Taste, m: HairMetrics, h: HairState | null = null): number {
  let s = BASE;
  for (const r of t.likes) if (r.check(m, h)) s += r.points;
  for (const r of t.dislikes) if (r.check(m, h)) s -= r.points;
  if (t.neat) s += 10 - m.unevenLR * 60 - m.choppiness * 30;
  else s += 5;
  // Bald patches: nobody's taste.
  if (m.baldFrac > 0.05) s = Math.min(s, 62 - m.baldFrac * 100);
  return clamp(Math.round(s), 0, 100);
}

/** The best score reachable (likes all met, no dislikes, perfectly neat). */
export const tasteMax = (t: Taste) => Math.min(100, BASE + t.likes.reduce((a, r) => a + r.points, 0) + (t.neat ? 10 : 5));

export function tasteCustomer(base: CustomerDef, t: Taste): CustomerDef {
  const toolReactions = { ...base.toolReactions };
  // They asked for colours / patterns: the brush and stencil don't bother them today.
  for (const x of t.needs) delete toolReactions[x];
  return {
    ...base,
    request: `Làm gì cũng được, miễn hợp gu em: ${t.ask}`,
    catch: 'Em tin tay nghề tiệm mình đấy!',
    hint: `Khách tùy thợ (${t.name}): không có mẫu, bạn tự sáng tạo. Xem gu ở phiếu yêu cầu.`,
    target: null,
    stages: undefined,
    artTaste: 0,
    toolReactions,
    satisfaction: (m, ctx) => tasteScore(t, m, ctx?.hair ?? null),
    special: (_m, sat) => sat >= 92,
    specialLine: { line: 'Đúng gu em luôn! Em sẽ khoe khắp xóm!', mood: 'ecstatic' },
    pay: { base: Math.round(base.pay.base * 1.25), tip: Math.round(base.pay.tip * 1.4) },
  };
}

/** Name for a catalog entry born from a freestyle cut. */
export function tasteDesignName(t: Taste, customerName: string) {
  return `${t.name.replace('Gu ', '')} của ${customerName}`;
}

/** Re-measure helper for tests. */
export const scoreHair = (t: Taste, h: HairState) => tasteScore(t, measureHair(h), h);
