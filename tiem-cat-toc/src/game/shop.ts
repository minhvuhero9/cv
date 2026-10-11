import type { ToolId } from './tools';

/**
 * Cửa hàng: everything the shop can buy, as data. `effect` is shown to the player and
 * implemented by the system named in the comment (all effects change gameplay).
 */
export type ShopCategory = 'tool' | 'machine' | 'chaos' | 'upgrade' | 'decor' | 'special';

export const CATEGORY_LABEL: Record<ShopCategory, string> = {
  tool: 'Đồ nghề phép',
  machine: 'Máy móc tạo kiểu',
  chaos: 'Vật phẩm hỗn loạn',
  upgrade: 'Nâng cấp',
  decor: 'Trang trí',
  special: 'Đặc biệt',
};

export interface ShopUnlock {
  day?: number;
  rep?: number;
  viral?: number;
  /** An event that must have happened at least once. */
  event?: string;
  eventLabel?: string;
}

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  desc: string;
  /** What it changes in the game, in plain words. */
  effect: string;
  unlock: ShopUnlock;
  /** Consumables come in packs and are used up; others are bought once. */
  pack?: number;
  /** The toolbar tool this item gives. */
  tool?: ToolId;
}

export const SHOP: ShopItem[] = [
  // ---- magic tools (the Bộ Đồ Nghề Bất Ổn): bought instead of unlocked in career mode
  { id: 'wand', name: 'Gậy Như Ý', category: 'tool', price: 300000, tool: 'wand', desc: 'Kéo dài, thu ngắn, phóng to từng lọn.', effect: 'Thêm dụng cụ Gậy Như Ý vào thanh công cụ.', unlock: { day: 2 } },
  { id: 'ray', name: 'Súng Tóc 3000', category: 'tool', price: 250000, tool: 'ray', desc: 'Bắn màu, dựng tóc, phóng to.', effect: 'Thêm dụng cụ Súng Tóc 3000.', unlock: { day: 2 } },
  { id: 'comb', name: 'Lược Rồng', category: 'tool', price: 200000, tool: 'comb', desc: 'Chải hướng, phồng, xoăn.', effect: 'Thêm dụng cụ Lược Rồng.', unlock: { day: 2 } },
  { id: 'storm', name: 'Máy Sấy Bão', category: 'machine', price: 350000, tool: 'storm', desc: 'Bão cấp 12 trong lòng bàn tay.', effect: 'Thêm dụng cụ Máy Sấy Bão.', unlock: { day: 3, event: 'gelSpikes', eventLabel: 'Từng gây sự cố “Gió Đổi Chiều”' } },
  { id: 'cooker', name: 'Nồi Cơm Điện Tạo Kiểu', category: 'machine', price: 280000, tool: 'cooker', desc: 'Hấp tóc phồng như bánh bao.', effect: 'Thêm dụng cụ Nồi Cơm Điện.', unlock: { day: 3 } },
  { id: 'vacuum', name: 'Máy Hút Tóc Vũ Trụ', category: 'machine', price: 450000, tool: 'vacuum', desc: 'Hút tóc thừa. Và tóc không thừa.', effect: 'Thêm Máy Hút; dọn sạch tiệm: miễn phạt vệ sinh.', unlock: { viral: 25 } },
  { id: 'auto', name: 'Máy Tạo Kiểu Tự Động', category: 'machine', price: 700000, tool: 'auto', desc: 'Một nút bấm, tự cắt theo yêu cầu. Nếu nghe rõ yêu cầu.', effect: 'Một lần mỗi khách: tự tỉa tóc về đúng mẫu. Tiệm quá ồn (Chaos ≥ 50) thì máy nghe nhầm.', unlock: { rep: 55 } },
  // ---- chaos consumables (also tools while you have stock)
  { id: 'potion', name: 'Thuốc Mọc Tóc Siêu Tốc', category: 'chaos', price: 60000, pack: 3, tool: 'potion', desc: 'Xịt đâu mọc đó, trong vài giây.', effect: 'Chạm để xịt: tóc quanh đó mọc nhanh 6 giây, chỗ trọc mọc lại. Cắt bằng tông đơ lúc đang mọc thì… tóc mọc nhanh hơn cắt.', unlock: { day: 2 } },
  { id: 'gel', name: 'Keo Tóc Vĩnh Cửu', category: 'chaos', price: 70000, pack: 3, tool: 'gel', desc: 'Cứng như bê tông. Bảo hành trọn đời tóc.', effect: 'Chạm để quét keo: máy sấy làm tóc dựng ngay; Máy Sấy Bão biến tóc thành ăng-ten bê tông.', unlock: { day: 2 } },
  { id: 'sausage', name: 'Xúc Xích Cho Cậu Vàng', category: 'chaos', price: 20000, pack: 2, desc: 'Mùi thơm át mọi mùi khác.', effect: 'Khi Cậu Vàng đến: bớt sợ, không bị mùi đồ ăn làm quay đầu (dùng 1 cái mỗi lần).', unlock: { day: 2 } },
  // ---- upgrades
  { id: 'chair', name: 'Ghế Cắt Tóc Massage', category: 'upgrade', price: 400000, desc: 'Ngồi êm đến mức không ai muốn quay đầu.', effect: 'Khách quay đầu ít hơn một nửa, kiên nhẫn giảm chậm hơn 20%.', unlock: { rep: 40 } },
  { id: 'japanClipper', name: 'Tông Đơ Nhật Bãi', category: 'upgrade', price: 220000, desc: 'Lưỡi êm, ít cắn da.', effect: 'Phải giữ tông đơ 0,85 giây (thay vì 0,5) mới bị trọc.', unlock: { day: 2 } },
  { id: 'aircon', name: 'Điều Hòa Cũ', category: 'upgrade', price: 350000, desc: 'Kêu như máy cày nhưng mát.', effect: 'Khách kiên nhẫn lâu hơn 25%.', unlock: { day: 3 } },
  { id: 'bench', name: 'Ghế Chờ Thêm', category: 'upgrade', price: 300000, desc: 'Thêm chỗ cho khách ngồi đợi.', effect: '+1 khách mỗi ngày (tiền thuê tăng 15.000đ/ngày).', unlock: { day: 2 } },
  { id: 'generator', name: 'Máy Phát Điện', category: 'upgrade', price: 260000, desc: 'Ồn nhưng không bao giờ mất điện.', effect: 'Ngày cắt điện vẫn dùng được máy sấy, máy hút, nồi cơm.', unlock: { event: 'powerCut', eventLabel: 'Đã trải qua một ngày mất điện' } },
  // ---- decor (with real effects)
  { id: 'ringLight', name: 'Góc Sống Ảo Đèn LED', category: 'decor', price: 150000, desc: 'Khách nào cũng muốn chụp một tấm.', effect: 'Viral tăng thêm 30%, tiền khách trả thêm 10%.', unlock: { day: 2 } },
  { id: 'award', name: 'Bằng Khen “Thợ Của Năm” (Tự In)', category: 'decor', price: 120000, desc: 'Không ai kiểm tra đâu.', effect: 'Uy tín tăng thêm 15% khi khách hài lòng.', unlock: { day: 2 } },
  { id: 'plant', name: 'Chậu Cây Phong Thủy', category: 'decor', price: 90000, desc: 'Cân bằng âm dương, giảm hỗn loạn.', effect: 'Chaos từ sự cố giảm 15%.', unlock: { day: 1 } },
  // ---- special: unlocks customers/events
  { id: 'petSign', name: 'Biển “Cho Phép Thú Cưng”', category: 'special', price: 100000, desc: 'Chào mừng các khách bốn chân.', effect: 'Cậu Vàng bắt đầu đến tiệm.', unlock: { day: 2 } },
  { id: 'mirror', name: 'Gương Thần Biến Hình', category: 'special', price: 280000, desc: 'Gương khung gỗ chạm hoa sen, soi vào là hóa thân.', effect: 'Mỗi khách được biến hình 1 lần (6 phong cách). Bé Ba Hóa Thân bắt đầu đến tiệm.', unlock: { day: 2 } },
  { id: 'neon', name: 'Biển Hiệu Neon Nhấp Nháy', category: 'special', price: 500000, desc: 'Sáng đến mức nhìn thấy từ ngoài vũ trụ.', effect: '+2 Viral mỗi ngày; khách mới thấy tiệm từ xa.', unlock: { viral: 30 } },
];

export function shopItem(id: string): ShopItem | undefined {
  return SHOP.find((i) => i.id === id);
}

/** Machines that wear out with use and need maintenance. */
export const MACHINES: ToolId[] = ['clipper', 'dryer', 'storm', 'vacuum', 'cooker', 'auto'];
/** Tools that need electricity (blocked on a power-cut day without a generator). */
export const ELECTRIC: ToolId[] = ['dryer', 'storm', 'vacuum', 'cooker', 'auto'];
