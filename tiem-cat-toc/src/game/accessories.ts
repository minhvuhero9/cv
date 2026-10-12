import type { CustomerDef } from './customers';
import { clamp } from './geometry';
import type { Taste } from './freestyle';
import type { LookLayer } from './mirror';
import { applyLook } from './mirror';

/**
 * Phụ kiện tóc: bought in the shop as a box, put on the head at the end of a cut.
 * They change the look and the verdict: some customers love a bow, others hate anything
 * on their head. Tùy thợ tastes have their own opinion (cute, cool, royal…).
 */
export type AccessoryId = 'bow' | 'catEars' | 'headband' | 'shades' | 'crown';
export type AccessoryKind = 'cute' | 'cool' | 'royal' | 'sport';

export interface Accessory {
  id: AccessoryId;
  name: string;
  icon: string;
  kind: AccessoryKind;
  layer: LookLayer;
}

export const ACCESSORIES: Accessory[] = [
  { id: 'bow', name: 'Nơ to', icon: '🎀', kind: 'cute', layer: { hat: 'bow' } },
  { id: 'catEars', name: 'Bờm tai mèo', icon: '🐱', kind: 'cute', layer: { hat: 'catEars' } },
  { id: 'headband', name: 'Băng đô thể thao', icon: '🏃', kind: 'sport', layer: { headband: '#e5322d' } },
  { id: 'shades', name: 'Kính râm cài đầu', icon: '🕶️', kind: 'cool', layer: { sunglasses: 'onHead' } },
  { id: 'crown', name: 'Vương miện giấy', icon: '👑', kind: 'royal', layer: { hat: 'crown' } },
];

export const accessoryById = (id: string | null | undefined) => ACCESSORIES.find((a) => a.id === id) ?? null;

/** What tùy thợ tastes think of each kind (points). */
const TASTE_LIKES: Record<string, Partial<Record<AccessoryKind, number>>> = {
  dethuong: { cute: 12, royal: 6, cool: -8 },
  ngau: { cool: 12, sport: 6, cute: -12 },
  cauvong: { cute: 8, royal: 8 },
  nghesi: { cute: 6, cool: 6, royal: 6, sport: 6 },
  lua: { cool: 8, sport: 6 },
  bien: { sport: 8, cool: 6 },
  gon: { cute: -12, cool: -12, royal: -12, sport: -6 },
  chat: { sport: 8, cute: -8 },
  lech: { cool: 8 },
};

/** Customers' own feelings (by id); everyone else follows their taste for art on their head. */
const CUSTOMER_LIKES: Record<string, Partial<Record<AccessoryKind, number>>> = {
  ngan: { cute: 12 },
  hoathan: { royal: 15, cute: 8 },
  na: { cute: 10, royal: 8 },
  rocker: { cool: 12, cute: -12 },
  gamer: { cool: 8, sport: 6 },
  vosu: { sport: 10, cute: -10 },
  linh: { cute: -10, royal: -10, cool: -6 },
  dat: { cute: -12, royal: -12, cool: -8, sport: -6 },
  bay: { cute: -12, royal: -10, cool: -6 },
  bavien: { royal: 10, cute: 6 },
};

/** Points the accessory adds to (or takes from) this customer's verdict. */
export function accessoryPoints(base: CustomerDef, acc: Accessory, taste: Taste | null): number {
  const t = taste ? TASTE_LIKES[taste.id]?.[acc.kind] : undefined;
  if (t !== undefined) return t;
  const own = CUSTOMER_LIKES[base.id]?.[acc.kind];
  if (own !== undefined) return own;
  const art = base.artTaste ?? 0;
  return art > 0 ? 5 : art < 0 ? -8 : 0;
}

/** The customer wearing it: new look, verdict nudged by how they feel about it. */
export function withAccessory(def: CustomerDef, base: CustomerDef, acc: Accessory, taste: Taste | null): CustomerDef {
  const pts = accessoryPoints(base, acc, taste);
  const own = def.satisfaction;
  return {
    ...def,
    look: applyLook(def.look, acc.layer),
    satisfaction: (m, ctx) => clamp(own.call(def, m, ctx) + pts, 0, 100),
  };
}

export function accessoryReaction(pts: number): { line: string; mood: 'ecstatic' | 'happy' | 'suspicious' | 'angry' } {
  if (pts >= 10) return { line: 'Ôi xinh quá! Cái này hợp với em ghê!', mood: 'ecstatic' };
  if (pts > 0) return { line: 'Ừm, cũng dễ thương đấy.', mood: 'happy' };
  if (pts <= -10) return { line: 'Gỡ ra ngay! Trông tôi như cái gì thế này?!', mood: 'angry' };
  if (pts < 0) return { line: 'Ơ… cái này hơi kỳ…', mood: 'suspicious' };
  return { line: 'Cũng được, sao cũng được.', mood: 'happy' };
}
