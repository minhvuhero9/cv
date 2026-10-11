/**
 * Cấp tiệm: the shop grows from a back-alley stall into an academy. XP comes from real
 * results (happy customers, catalog orders done well, art, goals). Every level unlocks
 * templates, shop items, more customers and better prices.
 */
export interface ShopLevel {
  level: number;
  name: string;
  xp: number;
  /** What this level brings (shown when you reach it and on the way there). */
  unlocks: string[];
  /** Price multiplier. */
  price: number;
  /** Extra customers a day. */
  extraCustomers: number;
}

export const LEVELS: ShopLevel[] = [
  { level: 1, name: 'Tiệm Hẻm', xp: 0, unlocks: ['Cắt theo yêu cầu của khách'], price: 1, extraCustomers: 0 },
  { level: 2, name: 'Tiệm Mặt Phố', xp: 60, unlocks: ['Bán Cọ Nhuộm (mua xong, hôm sau khách đặt mẫu nhuộm)', 'Khách mới: Chị Hồng Bếp, Bà Viên', 'Giá cắt +7%'], price: 1.07, extraCustomers: 0 },
  { level: 3, name: 'Salon Có Tiếng', xp: 170, unlocks: ['Bán Khuôn Cạo Hình (hôm sau có mẫu cạo hình) và Gương Thần', 'Khách mới: Anh Long Rốc', '+1 khách mỗi ngày', 'Giá cắt +14%'], price: 1.14, extraCustomers: 1 },
  { level: 4, name: 'Salon Nghệ Thuật', xp: 330, unlocks: ['Bán Bảng Màu Mở Rộng (mẫu nhuộm loang)', 'Giá cắt +22%'], price: 1.22, extraCustomers: 1 },
  { level: 5, name: 'Học Viện Bất Ổn', xp: 520, unlocks: ['Bán Khuôn Cạo Cao Cấp (mẫu bậc thầy: trái tim, khắc chữ)', '+1 khách mỗi ngày', 'Giá cắt +30%'], price: 1.3, extraCustomers: 2 },
];

export function levelFor(xp: number): ShopLevel {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.xp) cur = l;
  return cur;
}

export function nextLevel(xp: number): ShopLevel | null {
  return LEVELS.find((l) => l.xp > xp) ?? null;
}

/** 0..1 progress to the next level. */
export function levelProgress(xp: number): number {
  const cur = levelFor(xp);
  const nx = nextLevel(xp);
  return nx ? (xp - cur.xp) / (nx.xp - cur.xp) : 1;
}

/** XP for one finished customer. */
export function xpFor(r: { sat: number; tier: string; walkedOut: boolean }, extra: { design: boolean; art: boolean; boss: boolean; quests: number }): number {
  if (r.walkedOut) return 0;
  const good = r.tier === 'love' || r.tier === 'ok';
  let xp = Math.round(r.sat / 10);
  if (extra.design && good) xp += 10;
  if (extra.art && good) xp += 3;
  if (extra.boss && good) xp += 20;
  xp += extra.quests * 5;
  return xp;
}
