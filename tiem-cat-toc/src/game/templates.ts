import { ArtSettings, carveHair, mixColor } from './art';
import { CUSTOMERS } from './customers';
import { HairState, StencilId, Zone, createHair } from './hair';
import type { ToolId } from './tools';

/**
 * Mẫu có sẵn của tiệm: recipes the player can follow ("vẽ theo mẫu"). A recipe is
 * rebuilt on any customer's head: lengths per zone, colours, shaved patterns placed on
 * the head in relative coordinates. Harder recipes need better tools and a bigger shop.
 */
export interface TemplateCarving {
  kind: StencilId;
  /** Position on the head: u across (−1 left … 1 right), v down (−1 top … 0 centre). */
  u: number;
  v: number;
  s: number;
  text?: string;
}

export interface Template {
  id: string;
  name: string;
  /** Shop level that unlocks it (1–5). */
  level: number;
  /** 1–3 stars. */
  stars: number;
  /** Tools needed besides scissors/clipper. */
  tools: ToolId[];
  /** Shop upgrades needed (Bảng Màu Mở Rộng, Khuôn Cạo Cao Cấp). */
  items: string[];
  zones: Record<Zone, number>;
  /** Dye: one colour, or a fade a → b; only on the listed zones (default all). */
  color?: { a: string; b?: string; zones?: Zone[] };
  carvings?: TemplateCarving[];
  /** How to do it, in short steps. */
  steps: string[];
}

export const TEMPLATES: Template[] = [
  {
    id: 'highlight',
    name: 'Highlight Kẹo Hồng',
    level: 2,
    stars: 1,
    tools: ['brush'],
    items: [],
    zones: { left: 0.7, right: 0.7, top: 0.85, fringe: 0.65 },
    color: { a: '#ff3fa4', zones: ['top', 'fringe'] },
    steps: ['Tỉa nhẹ hai bên và mái', 'Cọ Nhuộm màu hồng lên phía trên và mái'],
  },
  {
    id: 'bienxanh',
    name: 'Mái Xanh Biển',
    level: 2,
    stars: 1,
    tools: ['brush'],
    items: [],
    zones: { left: 0.5, right: 0.5, top: 0.8, fringe: 0.75 },
    color: { a: '#18c8ff', zones: ['fringe'] },
    steps: ['Tỉa hai bên còn nửa', 'Nhuộm xanh riêng phần mái'],
  },
  {
    id: 'chanh',
    name: 'Chanh Leo Tươi Mát',
    level: 2,
    stars: 2,
    tools: ['brush'],
    items: [],
    zones: { left: 0.4, right: 0.4, top: 0.9, fringe: 0.6 },
    color: { a: '#2ee86a', zones: ['top'] },
    steps: ['Hai bên ngắn', 'Nhuộm xanh lá phía trên, không nhuộm mái'],
  },
  {
    id: 'setdanh',
    name: 'Tia Sét Đánh Ngang',
    level: 3,
    stars: 2,
    tools: ['stencil'],
    items: [],
    zones: { left: 0.4, right: 0.4, top: 0.85, fringe: 0.55 },
    carvings: [{ kind: 'bolt', u: -0.72, v: -0.18, s: 0.8 }],
    steps: ['Tỉa hai bên ngắn', 'Khuôn tia sét: cạo bên trái đầu'],
  },
  {
    id: 'sansao',
    name: 'Ngôi Sao Sân Cỏ',
    level: 3,
    stars: 2,
    tools: ['stencil', 'brush'],
    items: [],
    zones: { left: 0.3, right: 0.3, top: 0.9, fringe: 0.55 },
    color: { a: '#ffd400', zones: ['top'] },
    carvings: [{ kind: 'star', u: 0.7, v: -0.2, s: 0.8 }],
    steps: ['Hai bên ngắn', 'Nhuộm vàng phía trên', 'Khuôn ngôi sao: cạo bên phải'],
  },
  {
    id: 'socngua',
    name: 'Sọc Ngựa Vằn',
    level: 3,
    stars: 3,
    tools: ['stencil'],
    items: [],
    zones: { left: 0.45, right: 0.45, top: 0.8, fringe: 0.6 },
    carvings: [
      { kind: 'stripes', u: -0.7, v: -0.1, s: 0.75 },
      { kind: 'stripes', u: 0.7, v: -0.1, s: 0.75 },
    ],
    steps: ['Tỉa hai bên vừa', 'Khuôn sọc: cạo cả hai bên đầu'],
  },
  {
    id: 'hoanghon',
    name: 'Hoàng Hôn Phố Biển',
    level: 4,
    stars: 2,
    tools: ['brush'],
    items: ['paletteXL'],
    zones: { left: 0.75, right: 0.75, top: 0.9, fringe: 0.7 },
    color: { a: '#ff6a00', b: '#8a4dff' },
    steps: ['Tỉa nhẹ', 'Bật "Loang": cam ở đỉnh, tím ở đuôi, nhuộm cả đầu'],
  },
  {
    id: 'traitim',
    name: 'Trái Tim Tan Vỡ',
    level: 5,
    stars: 3,
    tools: ['brush', 'stencil'],
    items: ['paletteXL', 'stencilPro'],
    zones: { left: 0.45, right: 0.45, top: 0.85, fringe: 0.55 },
    color: { a: '#ff3fa4', b: '#ffffff', zones: ['top', 'fringe'] },
    carvings: [{ kind: 'heart', u: -0.68, v: -0.2, s: 0.7 }],
    steps: ['Hai bên ngắn vừa', 'Loang hồng → trắng phía trên', 'Khuôn trái tim: cạo bên trái'],
  },
  {
    id: 'chuky',
    name: 'Chữ Ký Bất Ổn',
    level: 5,
    stars: 3,
    tools: ['stencil', 'brush'],
    items: ['stencilPro', 'paletteXL'],
    zones: { left: 0.35, right: 0.35, top: 0.9, fringe: 0.6 },
    color: { a: '#1d1d1d', b: '#e8b04a', zones: ['top'] },
    carvings: [{ kind: 'text', u: 0.68, v: -0.12, s: 0.6, text: 'TÓC' }],
    steps: ['Hai bên ngắn', 'Loang đen → vàng phía trên', 'Khắc chữ “TÓC” bên phải'],
  },
];

export const templateById = (id: string | null | undefined) => TEMPLATES.find((t) => t.id === id) ?? null;

/** The recipe on this customer's head. */
export function templateHair(t: Template, customerId: string): HairState {
  const d = CUSTOMERS.find((x) => x.id === customerId) ?? CUSTOMERS[0];
  const h = createHair(d.hair);
  const top = h.head.cy - h.head.ry;
  for (const tf of h.tufts) {
    if (tf.bald) continue;
    tf.len = tf.origLen * t.zones[tf.zone];
    if (t.color && (!t.color.zones || t.color.zones.includes(tf.zone))) {
      const k = Math.min(1, Math.max(0, (tf.root.y - top) / (h.head.ry * 1.25)));
      tf.tint = t.color.b ? mixColor(t.color.a, t.color.b, k) : t.color.a;
    }
  }
  for (const c of t.carvings ?? []) {
    const art: ArtSettings = { colorA: '#000000', colorB: '#000000', blend: false, stencil: c.kind, text: c.text ?? '', size: c.s };
    carveHair(h, art, { x: h.head.cx + c.u * h.head.rx, y: h.head.cy + c.v * h.head.ry });
  }
  return h;
}

/** Can this shop do it (level and the tools / upgrades it owns)? */
export function templateReady(t: Template, level: number, tools: ToolId[], owned: string[]): boolean {
  return t.level <= level && t.tools.every((x) => tools.includes(x)) && t.items.every((x) => owned.includes(x));
}
