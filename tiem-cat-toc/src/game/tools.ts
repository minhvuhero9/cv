/**
 * Bộ Đồ Nghề: every tool in the shop, as data. The session reads `energy` to rate-limit
 * magic tools; the toolbar reads names, descriptions and unlock rules from here.
 * These are fictional magic gadgets — they only exist inside the game.
 */
export type ToolId =
  | 'clipper'
  | 'scissors'
  | 'dryer'
  | 'wand'
  | 'ray'
  | 'storm'
  | 'vacuum'
  | 'comb'
  | 'cooker'
  | 'potion'
  | 'gel'
  | 'auto'
  | 'stamp'
  | 'fireworks'
  | 'brush'
  | 'stencil';

export type Rarity = 'thuong' | 'hiem' | 'sutthi' | 'huyenthoai';
export const RARITY_LABEL: Record<Rarity, string> = {
  thuong: 'Thường',
  hiem: 'Hiếm',
  sutthi: 'Sử thi',
  huyenthoai: 'Huyền thoại',
};

/** How the player operates the tool. */
export type InputKind = 'drag' | 'hold' | 'tap' | 'aim-release';

export interface Progress {
  rounds: number;
  styles: string[];
  events: string[];
}

export type Unlock =
  | { kind: 'start' }
  | { kind: 'rounds'; n: number }
  | { kind: 'styles'; n: number }
  | { kind: 'event'; id: string; label: string }
  /** Only from the shop (career mode), or ?unlock=all. */
  | { kind: 'shop' }
  | { kind: 'soon' };

export interface Energy {
  /** Energy spent per second while held (hold/drag tools). */
  drainPerSec?: number;
  /** Energy spent per use (tap/aim tools). */
  costPerUse?: number;
  /** Seconds to refill from empty. When the bar hits zero the tool overheats until full. */
  refill: number;
  /** Minimum seconds between two uses (tap tools). */
  gap?: number;
}

export interface ToolDef {
  id: ToolId;
  name: string;
  /** Short funny description. */
  blurb: string;
  /** How to use it, one line. */
  howTo: string;
  /** What it really does to the hair. */
  effect: string;
  rarity: Rarity;
  input: InputKind;
  group: 'basic' | 'magic' | 'art';
  unlock: Unlock;
  energy: Energy | null;
  hotkey?: string;
}

export const TOOLS: ToolDef[] = [
  {
    id: 'brush',
    name: 'Cọ Nhuộm',
    blurb: 'Tô màu lên tóc như tô tranh. Không mất sợi nào.',
    howTo: 'Rê lên tóc để nhuộm. Chọn màu ở bảng màu phía trên thanh công cụ.',
    effect: 'Nhuộm các lọn dưới cọ (màu đơn hoặc loang 2 màu nếu có Bảng Màu Mở Rộng).',
    rarity: 'hiem',
    input: 'drag',
    group: 'art',
    unlock: { kind: 'rounds', n: 1 },
    energy: null,
    hotkey: '8',
  },
  {
    id: 'stencil',
    name: 'Khuôn Cạo Hình',
    blurb: 'Tia sét, ngôi sao, sọc… cạo thẳng vào đầu khách.',
    howTo: 'Chọn khuôn rồi chạm lên da đầu để cạo hình.',
    effect: 'Cạo một hình vào tóc; lọn nằm trên nét cạo bị cắt sát da.',
    rarity: 'hiem',
    input: 'tap',
    group: 'art',
    unlock: { kind: 'rounds', n: 2 },
    energy: null,
    hotkey: '9',
  },
  {
    id: 'clipper',
    name: 'Tông đơ',
    blurb: 'Người bạn trung thành. Hơi quá trung thành.',
    howTo: 'Rê qua tóc để cạo ngắn. Giữ yên = trọc!',
    effect: 'Cạo lọn tóc về 9px; đứng yên trên chân tóc 0,5s là trọc.',
    rarity: 'thuong',
    input: 'drag',
    group: 'basic',
    unlock: { kind: 'start' },
    energy: null,
    hotkey: '1',
  },
  {
    id: 'scissors',
    name: 'Kéo',
    blurb: 'Cắt đúng chỗ bạn kéo. Đúng tuyệt đối. Kể cả khi bạn kéo sai.',
    howTo: 'Kéo một đường để cắt đúng chỗ đó. Bấm để cắt một nhát.',
    effect: 'Cắt mọi lọn tóc tại điểm đường kéo đi qua.',
    rarity: 'thuong',
    input: 'drag',
    group: 'basic',
    unlock: { kind: 'start' },
    energy: null,
    hotkey: '2',
  },
  {
    id: 'dryer',
    name: 'Máy sấy',
    blurb: 'Hàng chợ, nhưng gặp keo vuốt thì như điện giật.',
    howTo: 'Giữ để thổi: tóc bay, bung, keo thì dựng.',
    effect: 'Đẩy tóc ra xa vòi sấy, làm bung xù, biến keo thành gai.',
    rarity: 'thuong',
    input: 'hold',
    group: 'basic',
    unlock: { kind: 'start' },
    energy: null,
    hotkey: '3',
  },
  {
    id: 'wand',
    name: 'Gậy Như Ý',
    blurb: 'Muốn dài thì dài, muốn to thì to. Muốn dừng thì… chưa chắc.',
    howTo: 'Bấm giữ trên tóc rồi kéo LÊN để dài ra, XUỐNG để ngắn lại, NGANG để to/nhỏ. Chạm nhẹ = uốn xoăn.',
    effect: 'Đổi chiều dài (tới 3 lần), độ dày và độ xoăn của các lọn quanh đầu gậy.',
    rarity: 'sutthi',
    input: 'drag',
    group: 'magic',
    unlock: { kind: 'rounds', n: 1 },
    energy: { drainPerSec: 0.45, costPerUse: 0.12, refill: 4 },
    hotkey: '4',
  },
  {
    id: 'ray',
    name: 'Súng Tóc 3000',
    blurb: 'Tia phép thuật đa năng. Không ai biết phát tiếp theo màu gì, kể cả nhà sản xuất.',
    howTo: 'Chạm vào tóc để bắn. 6 phát mỗi băng, phát nào cũng đổi màu, dựng và phóng to tóc.',
    effect: 'Nhuộm màu, dựng đứng và phóng to các lọn quanh điểm trúng.',
    rarity: 'hiem',
    input: 'tap',
    group: 'magic',
    unlock: { kind: 'rounds', n: 2 },
    energy: { costPerUse: 1 / 6, refill: 4, gap: 0.35 },
    hotkey: '5',
  },
  {
    id: 'storm',
    name: 'Máy Sấy Bão',
    blurb: 'Bão cấp 12 trong lòng bàn tay. Đã bị cấm ở ba tiệm khác.',
    howTo: 'Kéo để ngắm hướng gió, thả tay để thổi. Kéo càng dài gió càng mạnh.',
    effect: 'Một cơn gió quét cả đầu theo hướng ngắm; tóc càng dài càng bay.',
    rarity: 'sutthi',
    input: 'aim-release',
    group: 'magic',
    unlock: { kind: 'event', id: 'gelSpikes', label: 'Gây ra sự cố “Gió Đổi Chiều” (máy sấy + keo)' },
    energy: { costPerUse: 1, refill: 3.5 },
    hotkey: '6',
  },
  {
    id: 'vacuum',
    name: 'Máy Hút Tóc Vũ Trụ',
    blurb: 'Hút tóc thừa. Định nghĩa “thừa” do máy tự quyết.',
    howTo: 'Giữ để hút. Giữ càng lâu vùng hút càng rộng. Vòng đỏ là sắp hút nhầm!',
    effect: 'Rút ngắn và kéo tóc về phía vòi; giữ quá 2 giây thì nuốt luôn một mảng.',
    rarity: 'huyenthoai',
    input: 'hold',
    group: 'magic',
    unlock: { kind: 'styles', n: 4 },
    energy: { drainPerSec: 0.3, refill: 5 },
    hotkey: '7',
  },
  {
    id: 'comb',
    name: 'Lược Rồng',
    blurb: 'Rồng bay phượng múa. Chủ yếu là rồng bay.',
    howTo: 'Chải theo hướng muốn tóc nằm. Chải ngược lên làm tóc phồng, chải vòng để uốn.',
    effect: 'Đặt hướng, độ phồng và độ xoăn cho các lọn được chải qua.',
    rarity: 'hiem',
    input: 'drag',
    group: 'magic',
    unlock: { kind: 'rounds', n: 3 },
    energy: { drainPerSec: 0.25, refill: 3 },
    hotkey: '8',
  },
  {
    id: 'cooker',
    name: 'Nồi Cơm Điện Tạo Kiểu',
    blurb: 'Hấp tóc như hấp xôi. Có chế độ giữ ấm.',
    howTo: 'Chạm lên đầu khách: úp nồi 1,5 giây, mở ra tóc phồng như bánh bao.',
    effect: 'Làm phồng và dựng tròn toàn bộ tóc phía trên; tóc hấp chín rất dễ bị hút.',
    rarity: 'sutthi',
    input: 'tap',
    group: 'magic',
    unlock: { kind: 'rounds', n: 4 },
    energy: { costPerUse: 0.5, refill: 8, gap: 2 },
    hotkey: '9',
  },
  {
    id: 'potion',
    name: 'Thuốc Mọc Tóc',
    blurb: 'Xịt đâu mọc đó. Nhanh hơn cả tông đơ.',
    howTo: 'Chạm lên đầu để xịt (tốn 1 lọ). Tóc quanh đó mọc nhanh trong 6 giây, chỗ trọc mọc lại.',
    effect: 'Cho tóc mọc thêm tới 1,6 lần; mọc lại chỗ trọc.',
    rarity: 'hiem',
    input: 'tap',
    group: 'magic',
    unlock: { kind: 'shop' },
    energy: { costPerUse: 0.34, refill: 3, gap: 0.5 },
  },
  {
    id: 'gel',
    name: 'Keo Vĩnh Cửu',
    blurb: 'Cứng như bê tông. Bảo hành trọn đời tóc.',
    howTo: 'Chạm để quét keo (tốn 1 hộp). Máy sấy làm tóc keo dựng ngay; gặp Máy Sấy Bão thì thành ăng-ten.',
    effect: 'Keo tối đa và không bao giờ mềm lại.',
    rarity: 'hiem',
    input: 'tap',
    group: 'magic',
    unlock: { kind: 'shop' },
    energy: { costPerUse: 0.34, refill: 3, gap: 0.5 },
  },
  {
    id: 'auto',
    name: 'Máy Tạo Kiểu Tự Động',
    blurb: 'Một nút bấm. Nghe yêu cầu rồi tự tỉa. Nếu nghe rõ.',
    howTo: 'Chạm lên đầu một lần mỗi khách. Tiệm đang quá ồn (Chaos ≥ 50) thì máy nghe nhầm yêu cầu.',
    effect: 'Đưa độ dài từng vùng về gần đúng mẫu khách muốn, chải gọn lại.',
    rarity: 'huyenthoai',
    input: 'tap',
    group: 'magic',
    unlock: { kind: 'shop' },
    energy: { costPerUse: 1, refill: 9999 },
  },
  {
    id: 'stamp',
    name: 'Con Dấu Phán Quyết',
    blurb: 'Đóng dấu lên kiểu tóc. Có hiệu lực pháp lý trong tiệm.',
    howTo: 'Sắp ra mắt.',
    effect: 'Chưa triển khai.',
    rarity: 'huyenthoai',
    input: 'tap',
    group: 'magic',
    unlock: { kind: 'soon' },
    energy: null,
  },
  {
    id: 'fireworks',
    name: 'Pháo Hoa Tạo Kiểu',
    blurb: 'Tết đến sớm trên đầu khách.',
    howTo: 'Sắp ra mắt.',
    effect: 'Chưa triển khai.',
    rarity: 'huyenthoai',
    input: 'tap',
    group: 'magic',
    unlock: { kind: 'soon' },
    energy: null,
  },
];

export function toolDef(id: ToolId): ToolDef {
  return TOOLS.find((t) => t.id === id)!;
}

export function isUnlocked(def: ToolDef, p: Progress): boolean {
  const u = def.unlock;
  switch (u.kind) {
    case 'start':
      return true;
    case 'rounds':
      return p.rounds >= u.n;
    case 'styles':
      return p.styles.length >= u.n;
    case 'event':
      return p.events.includes(u.id);
    case 'shop':
    case 'soon':
      return false;
  }
}

export function unlockText(def: ToolDef): string {
  const u = def.unlock;
  switch (u.kind) {
    case 'start':
      return 'Có sẵn';
    case 'rounds':
      return `Cắt xong ${u.n} lượt khách`;
    case 'styles':
      return `Mở khóa ${u.n} kiểu tóc trong bộ sưu tập`;
    case 'event':
      return u.label;
    case 'shop':
      return 'Mua ở Cửa hàng (chế độ Mở tiệm)';
    case 'soon':
      return 'Sắp ra mắt';
  }
}

export function unlockedTools(p: Progress, all = false): ToolId[] {
  return TOOLS.filter((t) => t.unlock.kind !== 'soon' && (all || isUnlocked(t, p))).map((t) => t.id);
}
