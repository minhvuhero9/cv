import { clamp } from './geometry';
import { HairStyleInit, Zone } from './hair';
import { HairMetrics } from './metrics';
import type { ToolId } from './tools';

/**
 * Khách hàng: everything that makes a customer different is data in this file —
 * look, hair, wants, tool reactions, behaviours, lines, pay and when they show up.
 * Add a customer by adding an entry to CUSTOMERS; the round engine reads these fields.
 */
export type CustomerId = string;
/** Base temperament: picks fallback dialogue for any line a customer does not override. */
export type Personality = 'loyal' | 'picky' | 'dramatic';

/** Reusable behaviour modules implemented in behaviors.ts. */
export type BehaviorId =
  | 'photoCheck'
  | 'demands'
  | 'nervous'
  | 'deadline'
  | 'sleepy'
  | 'flex'
  | 'livestream'
  | 'rush'
  | 'reflex'
  | 'fearBald'
  | 'vip'
  | 'alien'
  | 'duck'
  | 'dog';

export interface CustomerLook {
  skin: string;
  skinShade: string;
  hairColor: string;
  hairShade: string;
  shirt: string;
  glasses?: boolean;
  sunglasses?: boolean;
  mustache?: boolean;
  beard?: boolean;
  earring?: boolean;
  chain?: boolean;
  wrinkles?: boolean;
  headband?: string;
  tie?: string;
  necklace?: boolean;
  antennae?: boolean;
  freckles?: boolean;
  /** Something they hold or wear on the shoulder (drawn next to the body). */
  prop?: 'helmet' | 'phoneStick' | 'schoolBag' | 'briefcase';
  species?: 'human' | 'dog';
}

/** How a customer reacts when a given tool actually touches/changes their hair. */
export interface ToolReaction {
  kind: 'hate' | 'fear' | 'love';
  /** Patience change per use (stroke/shot). */
  patience: number;
  /** Chaos added the first time (later uses add a third). */
  chaos: number;
  /** Extra nerves (behaviour 'nervous'/'dog'). */
  nerves?: number;
  /** Only react when this is true. */
  when?: 'topTooShort';
  lines?: string[];
}

export interface SatisfactionCtx {
  before: HairMetrics;
  timeUsed: number;
  timeLimit: number;
  viewers: number;
  /** Hairstyle id as named from the final hair (before satisfaction bonuses). */
  styleId: string;
  /** Style this customer wants to copy (copycat), if any. */
  wantStyle: string | null;
}

/** Data description of what a customer wants; turned into a satisfaction function by fromWants(). */
export interface Wants {
  /** Start score before zone error, penalties and bonuses. */
  base: number;
  zones?: Partial<Record<Zone, number>>;
  zoneWeight?: number;
  /** Penalty per unit of metric. */
  penalties?: Partial<Record<keyof HairMetrics | 'lean', number>>;
  /** Bonus per unit of metric. */
  bonuses?: Partial<Record<keyof HairMetrics | 'lean' | 'change', number>>;
  /** Hairstyle ids that delight this customer. */
  loveStyles?: string[];
  /** Bonus (0..1 × value) for finishing early. */
  speedBonus?: number;
}

export interface MirrorLines {
  love: string[];
  ok: string[];
  meh: string[];
  bad: string[];
  disaster: string[];
}

export interface CustomerDef {
  id: CustomerId;
  name: string;
  title: string;
  personality: Personality;
  trait: string;
  request: string;
  /** The hidden contradiction, said out loud a moment after the request. */
  catch: string;
  /** One-line hint for the request card. */
  hint: string;
  look: CustomerLook;
  hair: HairStyleInit;
  patience: number;
  /** Patience lost per second just by sitting there. */
  patienceDecay: number;
  /** Target coverage per zone (shown as a ghost outline), if the customer has a concrete picture. */
  target: Record<Zone, number> | null;
  /** 0..100: how well the hair matches what this customer wanted. */
  satisfaction(m: HairMetrics, ctx?: SatisfactionCtx): number;
  /** Over-the-top reaction trigger (result "vượt ngoài mong đợi"). */
  special(m: HairMetrics, sat: number): boolean;
  /* ---- sandbox data ---- */
  likes: string[];
  dislikes: string[];
  behaviors: BehaviorId[];
  toolReactions: Partial<Record<ToolId, ToolReaction>>;
  /** Overrides for event lines (keys from dialogue.ts); falls back to the personality's lines. */
  lines?: Record<string, string[]>;
  /** Mirror reactions by tier; falls back to the personality's. */
  mirror?: Partial<MirrorLines>;
  /** Special mirror reaction when `special()` is true. */
  specialLine?: { line: string; mood: 'ecstatic' | 'happy' | 'shocked' | 'crying' | 'angry' };
  /** Price of a haircut and tip when they love it (VND). */
  pay: { base: number; tip: number };
  /** How much this customer's verdict moves Uy tín / Viral. */
  repWeight: number;
  viralWeight: number;
  /** When they can show up in the queue. */
  appear: { minDay: number; minRep?: number; minViral?: number; needsItem?: string; weight: number };
  /** Come back tomorrow after a disaster (to get it fixed) or after loving it (as a regular). */
  returns: { onDisaster: boolean; onLove: boolean };
  startTool?: ToolId;
  /** Round length override (seconds). */
  timeLimit?: number;
  /** Which lines to use for events this customer doesn't override (default 'neutral'). */
  fallback?: 'personality' | 'neutral' | 'dog';
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Builds a satisfaction function from a Wants description (data-driven customers). */
export function fromWants(w: Wants): (m: HairMetrics, ctx?: SatisfactionCtx) => number {
  return (m, ctx) => {
    let s = w.base;
    if (w.zones) {
      const zs = Object.entries(w.zones) as [Zone, number][];
      const err = sum(zs.map(([z, t]) => Math.abs(m.zone[z] - t))) / zs.length;
      s -= err * (w.zoneWeight ?? 200);
    }
    const val = (k: string): number => {
      if (k === 'lean') return Math.abs(m.leanAvg);
      if (k === 'change') return ctx ? Math.abs(m.avg - ctx.before.avg) + m.tintedFrac + m.spikedFrac * 0.5 : 0;
      const v = (m as unknown as Record<string, unknown>)[k];
      return typeof v === 'number' ? v : 0;
    };
    for (const [k, p] of Object.entries(w.penalties ?? {})) s -= val(k) * (p as number);
    for (const [k, b] of Object.entries(w.bonuses ?? {})) s += val(k) * (b as number);
    if (ctx && w.loveStyles?.includes(ctx.styleId)) s += 35;
    if (ctx && w.speedBonus && ctx.timeLimit > 0) s += clamp(1 - ctx.timeUsed / ctx.timeLimit, 0, 1) * w.speedBonus;
    return clamp(s, 0, 100);
  };
}

const NO_RETURN = { onDisaster: false, onLove: false };

export const CUSTOMERS: CustomerDef[] = [
  {
    id: 'tuan',
    fallback: 'personality',
    name: 'Anh Tuấn',
    title: 'Anh Trai Chung Thủy Với Ảnh Mẫu',
    personality: 'loyal',
    trait: 'Tin ảnh mẫu hơn tin gương. Cứ chốc chốc lại giơ điện thoại lên so.',
    request: 'Em cắt cho anh giống ảnh này nhé.',
    catch: '…nhưng đừng cắt ngắn quá.',
    hint: 'Hai bên thật ngắn, phía trên giữ dài. Đừng để trọc.',
    look: {
      skin: '#f2c49b',
      skinShade: '#d99d72',
      hairColor: '#2a1d17',
      hairShade: '#120b08',
      shirt: '#3d7dd8',
      glasses: true,
    },
    hair: { length: 50, fringeLength: 40, gel: { top: 0.35, fringe: 0.2 } },
    patience: 100,
    patienceDecay: 0.45,
    target: { left: 0.2, right: 0.2, top: 0.72, fringe: 0.55 },
    satisfaction(m) {
      const t = this.target!;
      const err =
        (Math.abs(m.zone.left - t.left) +
          Math.abs(m.zone.right - t.right) +
          1.3 * Math.abs(m.zone.top - t.top) +
          0.7 * Math.abs(m.zone.fringe - t.fringe)) /
        4;
      const tooShort = m.zone.top < 0.45 ? 22 : 0;
      return clamp(100 - err * 185 - m.baldFrac * 320 - tooShort - m.spikedFrac * 70 - Math.abs(m.leanAvg) * 60 - m.tintedFrac * 80 - m.sculptedFrac * 80 - m.steamedFrac * 30 - m.curlAvg * 40, 0, 100);
    },
    special(m, sat) {
      return sat >= 88 || m.baldFrac > 0.25;
    },
    likes: ['Ảnh mẫu', 'Hai bên ngắn gọn'],
    dislikes: ['Phía trên bị ngắn', 'Chỗ trọc', 'Màu mè'],
    behaviors: ['photoCheck'],
    toolReactions: {
      clipper: { kind: 'hate', patience: -5, chaos: 10, when: 'topTooShort' },
    },
    pay: { base: 60000, tip: 20000 },
    repWeight: 1,
    viralWeight: 1,
    appear: { minDay: 1, weight: 3 },
    returns: { onDisaster: true, onLove: true },
    startTool: 'clipper',
  },
  {
    id: 'bay',
    fallback: 'personality',
    name: 'Chú Bảy',
    title: 'Chú Khách Hàng Khó Tính',
    personality: 'picky',
    trait: 'Cắt ở tiệm này 20 năm. Thấy bên nào dài hơn là bắt sửa ngay.',
    request: 'Tỉa nhẹ thôi nhé.',
    catch: 'Mà bên nào dài hơn là chú biết đấy.',
    hint: 'Tỉa nhẹ, hai bên bằng nhau. Chiều chú quá là… hết tóc.',
    look: {
      skin: '#e0ad84',
      skinShade: '#b9805a',
      hairColor: '#3c3a3d',
      hairShade: '#1d1b1e',
      shirt: '#e8e2cf',
      mustache: true,
      wrinkles: true,
    },
    hair: { length: 42, fringeLength: 30, gel: { top: 0.55, left: 0.25, right: 0.25, fringe: 0.2 }, zoneLength: { left: 0.75, right: 0.75 } },
    patience: 78,
    patienceDecay: 0.85,
    target: { left: 0.82, right: 0.82, top: 0.82, fringe: 0.82 },
    satisfaction(m) {
      const z = m.zone;
      const err = sum([z.left, z.right, z.top, z.fringe].map((r) => Math.abs(r - 0.82))) / 4;
      return clamp(
        100 - err * 210 - m.unevenLR * 170 - m.baldFrac * 420 - m.spikedFrac * 130 - m.fluffAvg * 25 - Math.abs(m.leanAvg) * 80 -
          m.tintedFrac * 150 - m.sculptedFrac * 150 - m.steamedFrac * 40 - Math.abs(m.thickAvg - 1) * 40 - m.curlAvg * 60,
        0,
        100,
      );
    },
    special(m, sat) {
      return sat >= 85 || m.highway !== null || m.avg < 0.35;
    },
    likes: ['Tỉa nhẹ', 'Hai bên bằng nhau', 'Kéo'],
    dislikes: ['Tông đơ', 'Màu mè', 'Bị cãi'],
    behaviors: ['demands'],
    toolReactions: {
      clipper: { kind: 'hate', patience: -10, chaos: 10 },
    },
    pay: { base: 50000, tip: 10000 },
    repWeight: 1.3,
    viralWeight: 0.6,
    appear: { minDay: 1, weight: 3 },
    returns: { onDisaster: true, onLove: true },
    startTool: 'scissors',
  },
  {
    id: 'khoa',
    fallback: 'personality',
    name: 'Khoa',
    title: 'Thanh Niên Muốn Đổi Đời',
    personality: 'dramatic',
    trait: 'Vừa chia tay. Muốn lột xác nhưng giật mình với từng nhát kéo.',
    request: 'Anh muốn kiểu tóc khiến người yêu cũ phải hối hận.',
    catch: 'Nhưng mà… đừng thay đổi gì nhiều nhé em.',
    hint: 'Cần thật ẤN TƯỢNG mà vẫn giữ độ dài. Keo này mà gặp máy sấy thì…',
    look: {
      skin: '#f5cfa8',
      skinShade: '#dba57e',
      hairColor: '#8a3f1b',
      hairShade: '#4d1f0b',
      shirt: '#141414',
      earring: true,
      chain: true,
    },
    hair: { length: 64, fringeLength: 52, gel: { left: 0.9, right: 0.9, top: 1, fringe: 1 }, messiness: 0.18 },
    patience: 90,
    patienceDecay: 0.55,
    target: null,
    satisfaction(m) {
      const drama = clamp(
        m.spikedFrac * 1.7 + m.fluffAvg * 0.45 + Math.abs(m.leanAvg) * 0.8 + m.tintedFrac * 0.9 + m.longFrac * 0.6 + m.sculptedFrac * 1.2 + m.curlAvg * 0.4,
        0,
        1,
      );
      const kept = clamp((m.avg - 0.35) / 0.5, 0, 1);
      return clamp(drama * 70 + kept * 30 - m.baldFrac * 260, 0, 100);
    },
    special(m, sat) {
      return sat >= 80 || m.spikedFrac > 0.55 || m.baldFrac > 0.2;
    },
    likes: ['Máy sấy', 'Keo vuốt', 'Sự kịch tính'],
    dislikes: ['Bị cắt nhiều', 'Tông đơ', 'Trọc'],
    behaviors: ['nervous'],
    toolReactions: {
      clipper: { kind: 'fear', patience: -5, chaos: 10, nerves: 20 },
      dryer: { kind: 'love', patience: 0, chaos: 0 },
    },
    pay: { base: 80000, tip: 30000 },
    repWeight: 1,
    viralWeight: 1.4,
    appear: { minDay: 1, weight: 3 },
    returns: { onDisaster: true, onLove: false },
    startTool: 'dryer',
  },

  /* ======================= sandbox customers ======================= */
  {
    id: 'linh',
    name: 'Chị Linh',
    title: 'Nhân Viên Văn Phòng Sắp Họp',
    personality: 'picky',
    trait: '2 giờ có cuộc họp với sếp tổng. Nhìn đồng hồ nhiều hơn nhìn gương.',
    request: 'Em cắt gọn gàng, chuyên nghiệp giúp chị.',
    catch: 'Mười lăm phút nữa chị họp đấy nhé.',
    hint: 'Gọn, đều, mái ngắn vừa. Ít thời gian. Ghét đồ phép thuật.',
    look: { skin: '#f3cdb0', skinShade: '#d6a585', hairColor: '#3a2416', hairShade: '#1c1009', shirt: '#2b3a67', earring: true, prop: 'briefcase' },
    hair: { length: 66, fringeLength: 46, gel: {}, messiness: 0.1 },
    patience: 85,
    patienceDecay: 0.8,
    target: { left: 0.6, right: 0.6, top: 0.75, fringe: 0.5 },
    satisfaction: fromWants({
      base: 100,
      zones: { left: 0.6, right: 0.6, top: 0.75, fringe: 0.5 },
      zoneWeight: 190,
      penalties: { unevenLR: 150, baldFrac: 400, tintedFrac: 120, spikedFrac: 120, lean: 60, choppiness: 80, sculptedFrac: 150 },
      speedBonus: 10,
    }),
    special: (m, sat) => sat >= 88 || m.tintedFrac > 0.15,
    specialLine: { line: 'Đẹp! Chị sẽ được thăng chức vì kiểu tóc này!', mood: 'ecstatic' },
    likes: ['Gọn gàng', 'Nhanh', 'Lược'],
    dislikes: ['Đồ phép thuật', 'Tóc màu', 'Mất thời gian'],
    behaviors: ['deadline'],
    toolReactions: {
      ray: { kind: 'hate', patience: -15, chaos: 12, lines: ['Em bắn cái gì vào đầu chị thế?! Chị đi họp đấy!'] },
      storm: { kind: 'hate', patience: -12, chaos: 10, lines: ['Tóc chị! Chị vừa sấy sáng nay!'] },
      wand: { kind: 'hate', patience: -6, chaos: 6, lines: ['Gậy gì đấy? Chị không có thời gian xem ảo thuật!'] },
      comb: { kind: 'love', patience: 6, chaos: 0, lines: ['Ừ, chải gọn thế là được.'] },
    },
    lines: {
      bald: ['…Sếp tổng mà thấy chỗ này thì chị mất việc!', 'Chị họp online còn đỡ, đây họp trực tiếp!'],
      turnWarn: ['Chờ chị trả lời mail cái…', 'Ơ sếp gọi!'],
      deadline: ['Còn hai mươi giây! Chị muộn họp mất!', 'Em nhanh lên, chị phải đi rồi!'],
      walkoutWarn: ['Thôi chị đi họp thế này luôn!'],
    },
    mirror: {
      love: ['Chuyên nghiệp! Đúng chất trưởng phòng!'],
      ok: ['Ổn, đủ để đi họp.'],
      meh: ['Thôi, chị đội tóc giả đi họp vậy.'],
      bad: ['Sếp sẽ hỏi chị bị làm sao đấy.'],
      disaster: ['Chị xin nghỉ ốm hôm nay vậy.'],
    },
    pay: { base: 90000, tip: 30000 },
    repWeight: 1.2,
    viralWeight: 0.7,
    appear: { minDay: 1, weight: 2 },
    returns: { onDisaster: true, onLove: true },
    startTool: 'scissors',
    timeLimit: 50,
  },
  {
    id: 'cutu',
    name: 'Cụ Tư',
    title: 'Ông Cụ Ngủ Gật',
    personality: 'picky',
    trait: 'Vào tiệm là ngủ. Gật gù như con lật đật. Bật máy kêu to là giật mình tỉnh.',
    request: 'Cắt ngắn gọn như hồi tôi đi bộ đội nhé.',
    catch: 'Tôi chợp mắt tí… khò…',
    hint: 'Ngắn đều cả đầu. Đầu cụ cứ gục xuống dần. Máy kêu to khi cụ đang ngủ = cụ giật mình.',
    look: { skin: '#e2b08a', skinShade: '#b9845f', hairColor: '#e6e3dc', hairShade: '#9c968b', shirt: '#6f7d4c', glasses: true, wrinkles: true, beard: true },
    hair: { length: 38, fringeLength: 26, gel: {}, messiness: 0.25, preBald: { x: 200, y: 168, r: 30 } },
    patience: 95,
    patienceDecay: 0.3,
    target: { left: 0.3, right: 0.3, top: 0.35, fringe: 0.3 },
    satisfaction: fromWants({
      base: 100,
      zones: { left: 0.3, right: 0.3, top: 0.35, fringe: 0.3 },
      zoneWeight: 170,
      penalties: { unevenLR: 120, baldFrac: 150, tintedFrac: 100, spikedFrac: 90, choppiness: 60, longFrac: 120 },
    }),
    special: (m, sat) => sat >= 85 || m.tintedFrac > 0.1,
    specialLine: { line: 'Chuẩn! Y như hồi năm bảy hai!', mood: 'happy' },
    likes: ['Tông đơ', 'Ngắn gọn', 'Yên tĩnh'],
    dislikes: ['Tiếng ồn khi đang ngủ', 'Màu mè', 'Tóc dài'],
    behaviors: ['sleepy'],
    toolReactions: {
      clipper: { kind: 'love', patience: 2, chaos: 0 },
      ray: { kind: 'hate', patience: -10, chaos: 8, lines: ['Đạn pháo! Nằm xuống!'] },
    },
    lines: {
      sleepy: ['Khò… khò…', 'Khò… hai đứa cháu… khò…'],
      startle: ['HẢ?! Ai đấy?! Báo động!', 'Ơ! Tôi có ngủ đâu!'],
      bald: ['Hả? Chỗ đấy hói từ năm tám lăm rồi, không sao.'],
      walkoutWarn: ['Thôi tôi về ngủ ở nhà cho yên.'],
    },
    mirror: {
      love: ['Gọn! Gọn như lính!'],
      ok: ['Được, đi đám cưới cháu được.'],
      meh: ['Ờ… mắt tôi kém, chắc là đẹp.'],
      bad: ['Cháu cắt cho tôi hay cho con chó nhà bên?'],
      disaster: ['Bà nhà mà thấy chắc không cho vào nhà mất.'],
    },
    pay: { base: 40000, tip: 20000 },
    repWeight: 0.8,
    viralWeight: 0.5,
    appear: { minDay: 1, weight: 2 },
    returns: { onDisaster: true, onLove: true },
    startTool: 'clipper',
  },
  {
    id: 'ti',
    name: 'Tí Sún',
    title: 'Thanh Niên Thích Thể Hiện',
    personality: 'dramatic',
    trait: 'Cứ vài giây lại tạo dáng chụp ảnh. Muốn đầu mào gà như cầu thủ.',
    request: 'Cho em quả mào gà như cầu thủ nha anh!',
    catch: 'Phải dựng, phải ngầu, phải… nhìn em này!',
    hint: 'Hai bên cạo ngắn, giữa dựng cao. Thích súng tóc và máy sấy bão. Tạo dáng = đầu xoay.',
    look: { skin: '#e8b48c', skinShade: '#c58f68', hairColor: '#1d1712', hairShade: '#000', shirt: '#e5322d', chain: true, earring: true },
    hair: { length: 48, fringeLength: 36, gel: { top: 0.7, fringe: 0.5 } },
    patience: 90,
    patienceDecay: 0.5,
    target: { left: 0.15, right: 0.15, top: 1, fringe: 0.6 },
    satisfaction: fromWants({
      base: 40,
      zones: { left: 0.15, right: 0.15 },
      zoneWeight: 110,
      penalties: { baldFrac: 200, unevenLR: 60 },
      bonuses: { spikedFrac: 90, tintedFrac: 40, longFrac: 30 },
      loveStyles: ['rooster', 'saiyan', 'hedgehog', 'unicorn'],
    }),
    special: (m, sat) => sat >= 85 || m.sculptedFrac > 0.04,
    specialLine: { line: 'Ngầu! Ngầu hơn cả cầu thủ! Chụp em đi anh!', mood: 'ecstatic' },
    likes: ['Súng Tóc 3000', 'Máy Sấy Bão', 'Tóc dựng'],
    dislikes: ['Tóc xẹp', 'Trọc'],
    behaviors: ['flex'],
    toolReactions: {
      ray: { kind: 'love', patience: 8, chaos: 0, lines: ['Pằng pằng! Ngầu quá anh ơi!'] },
      storm: { kind: 'love', patience: 8, chaos: 0, lines: ['Gió lên! Em như siêu anh hùng!'] },
    },
    lines: {
      flexWarn: ['Xem em này!', 'Khoan, chụp kiểu này đã!', 'Một… hai… ba… tạo dáng!'],
      turnStray: ['Ơ… sao bên này hụt mất một mảng?!', 'Anh ơi em tạo dáng chứ có bảo cắt đâu!'],
    },
    mirror: {
      love: ['Mào gà xịn! Em lên đời rồi!'],
      ok: ['Cũng ngầu… nhưng chưa đủ dựng.'],
      meh: ['Mào gà… bị ướt mưa à anh?'],
      bad: ['Đây là mào gà hay mào vịt?'],
      disaster: ['Em xin đội mũ lưỡi trai về.'],
    },
    pay: { base: 70000, tip: 30000 },
    repWeight: 0.8,
    viralWeight: 1.5,
    appear: { minDay: 2, weight: 2 },
    returns: { onDisaster: true, onLove: false },
    startTool: 'clipper',
  },
  {
    id: 'na',
    name: 'Na Bông',
    title: 'Người Nổi Tiếng Trên Mạng',
    personality: 'dramatic',
    trait: 'Livestream suốt buổi. Càng hỗn loạn người xem càng đông. Người xem ít là chán.',
    request: 'Cả nhà ơi, hôm nay Na đi làm tóc nè! Em làm kiểu nào lên xu hướng nha!',
    catch: 'Đừng để live chán nha, mắt xem đang nhìn đó!',
    hint: 'Màu, phồng, combo = người xem tăng. Không có gì xảy ra = người xem bỏ đi.',
    look: { skin: '#f6d2b8', skinShade: '#dcab8c', hairColor: '#e98fc0', hairShade: '#a24d7e', shirt: '#ffd23f', earring: true, prop: 'phoneStick' },
    hair: { length: 70, fringeLength: 48, gel: { top: 0.3 } },
    patience: 85,
    patienceDecay: 0.5,
    target: null,
    satisfaction: fromWants({
      base: 25,
      penalties: { baldFrac: 120 },
      bonuses: { tintedFrac: 80, fluffAvg: 40, spikedFrac: 40, sculptedFrac: 120, colorCount: 6 },
      loveStyles: ['unicorn', 'rainbow', 'stormy', 'bun'],
    }),
    special: (m, sat) => sat >= 85 || m.colorCount >= 4,
    specialLine: { line: 'Cả nhà ơi, thả tim đi! Na lên xu hướng rồi!', mood: 'ecstatic' },
    likes: ['Màu', 'Combo', 'Người xem đông'],
    dislikes: ['Nhàm chán', 'Trọc'],
    behaviors: ['livestream'],
    toolReactions: {
      ray: { kind: 'love', patience: 6, chaos: 0, lines: ['Wow cả nhà ơi, màu mới nè!'] },
      cooker: { kind: 'love', patience: 6, chaos: 0, lines: ['Nồi cơm tạo kiểu! Có ai thấy bao giờ chưa!'] },
    },
    lines: {
      boring: ['Ơ live tụt mắt rồi, em làm gì đi chứ!', 'Cả nhà đừng thoát nha… em ấy đang… suy nghĩ.'],
      bald: ['Cả nhà ơi… tắt live, tắt live!'],
    },
    mirror: {
      love: ['Na lên xu hướng rồi! Cảm ơn em!'],
      ok: ['Cũng được, để Na thêm filter.'],
      meh: ['Không đủ drama, view thấp lắm.'],
      bad: ['Cả nhà ơi, đừng ai đến tiệm này nha.'],
      disaster: ['Live này phải xóa gấp!'],
    },
    pay: { base: 120000, tip: 50000 },
    repWeight: 0.7,
    viralWeight: 2.5,
    appear: { minDay: 2, minViral: 15, weight: 2 },
    returns: { onDisaster: false, onLove: true },
    startTool: 'scissors',
  },
  {
    id: 'shipper',
    name: 'Anh Hai Hỏa Tốc',
    title: 'Shipper Đang Vội',
    personality: 'loyal',
    trait: 'Còn sáu đơn chưa giao. Điện thoại reo liên tục. Cắt sao cũng được, miễn nhanh.',
    request: 'Cắt nhanh gọn giúp anh, sao cũng được!',
    catch: 'Khách đang chờ đơn trà sữa ngoài kia!',
    hint: 'Ít thời gian. Xong càng sớm càng được tip. Điện thoại reo = sắp quay đầu.',
    look: { skin: '#d9a07a', skinShade: '#b27b56', hairColor: '#231a14', hairShade: '#0c0806', shirt: '#2fa84f', prop: 'helmet' },
    hair: { length: 44, fringeLength: 30, gel: {} },
    patience: 70,
    patienceDecay: 1.1,
    target: null,
    satisfaction: fromWants({
      base: 55,
      penalties: { baldFrac: 160, tintedFrac: 30, longFrac: 40 },
      bonuses: { change: 25 },
      speedBonus: 45,
    }),
    special: (_m, sat) => sat >= 85,
    specialLine: { line: 'Nhanh như giao hỏa tốc! Năm sao cho em!', mood: 'ecstatic' },
    likes: ['Nhanh', 'Tông đơ'],
    dislikes: ['Chờ đợi', 'Nồi cơm điện'],
    behaviors: ['rush'],
    toolReactions: {
      cooker: { kind: 'hate', patience: -15, chaos: 8, lines: ['Úp nồi một phút rưỡi?! Đơn của anh!'] },
      clipper: { kind: 'love', patience: 3, chaos: 0 },
    },
    lines: {
      phone: ['Alo, anh đang tới đây! Năm phút!', 'Alo? Đơn trà sữa à? Đang cắt tóc!', 'Ơ khách hủy đơn rồi!'],
      walkoutWarn: ['Thôi anh đi giao đơn đây!'],
    },
    mirror: {
      love: ['Nhanh mà đẹp! Năm sao!'],
      ok: ['Được, đội mũ bảo hiểm vào là ai biết.'],
      meh: ['Ờ… may mà anh đội mũ cả ngày.'],
      bad: ['Anh không dám bỏ mũ bảo hiểm nữa.'],
      disaster: ['Anh giao hàng mà khách tưởng người ngoài hành tinh.'],
    },
    pay: { base: 50000, tip: 30000 },
    repWeight: 1,
    viralWeight: 0.8,
    appear: { minDay: 1, weight: 2 },
    returns: { onDisaster: true, onLove: true },
    startTool: 'clipper',
    timeLimit: 40,
  },
  {
    id: 'vosu',
    name: 'Thầy Long',
    title: 'Võ Sư Phản Xạ Nhanh',
    personality: 'picky',
    trait: 'Ba mươi năm luyện võ. Giật mình là ra đòn theo phản xạ, đánh văng luôn dụng cụ.',
    request: 'Cắt gọn như lá tre cho tôi.',
    catch: 'Và đừng làm tôi giật mình. Tay tôi không chờ não đâu.',
    hint: 'Đầu đinh đều. Tiếng nổ, gió bão, quay đầu bất ngờ = thầy ra đòn, dụng cụ văng.',
    look: { skin: '#d8a27b', skinShade: '#b07a54', hairColor: '#151515', hairShade: '#000', shirt: '#f2f2f2', headband: '#d6332f', mustache: true },
    hair: { length: 40, fringeLength: 28, gel: {} },
    patience: 90,
    patienceDecay: 0.4,
    target: { left: 0.25, right: 0.25, top: 0.3, fringe: 0.25 },
    satisfaction: fromWants({
      base: 100,
      zones: { left: 0.25, right: 0.25, top: 0.3, fringe: 0.25 },
      zoneWeight: 180,
      penalties: { unevenLR: 150, baldFrac: 250, tintedFrac: 120, fluffAvg: 40, lean: 60, choppiness: 70 },
    }),
    special: (_m, sat) => sat >= 85,
    specialLine: { line: 'Gọn như lá tre! Hôm nay tôi nhận cậu làm đệ tử!', mood: 'happy' },
    likes: ['Tông đơ', 'Gọn gàng', 'Sự tĩnh lặng'],
    dislikes: ['Tiếng nổ', 'Gió bão', 'Bất ngờ'],
    behaviors: ['reflex'],
    toolReactions: {
      clipper: { kind: 'love', patience: 3, chaos: 0 },
      ray: { kind: 'fear', patience: -8, chaos: 6 },
      storm: { kind: 'fear', patience: -8, chaos: 6 },
    },
    lines: {
      chop: ['HÂY-YA!', 'Á à! Xin lỗi, phản xạ!', 'HỰ! …Tay tôi tự đánh đấy.'],
    },
    mirror: {
      love: ['Gọn như lá tre. Tốt.'],
      ok: ['Được. Ra đòn vẫn không vướng.'],
      meh: ['Tóc này vào võ đường học trò cười mất.'],
      bad: ['Cậu muốn tỉ thí không?'],
      disaster: ['Ba mươi năm võ nghệ, lần đầu tôi muốn bỏ chạy.'],
    },
    pay: { base: 70000, tip: 20000 },
    repWeight: 1.2,
    viralWeight: 1,
    appear: { minDay: 2, weight: 2 },
    returns: { onDisaster: true, onLove: true },
    startTool: 'clipper',
  },
  {
    id: 'phuc',
    name: 'Anh Phúc',
    title: 'Người Sợ Hói',
    personality: 'dramatic',
    trait: 'Đỉnh đầu đã thưa. Cực kỳ sợ mất thêm sợi nào. Chỉ cần che được chỗ hói là vui.',
    request: 'Em làm sao che được cái chỗ… ấy giúp anh.',
    catch: 'Và tuyệt đối không được mất thêm sợi nào!',
    hint: 'Che chỗ hói: chải/thổi tóc qua, hoặc dùng phép cho tóc mọc lại. Thêm một chỗ trọc = hoảng loạn.',
    look: { skin: '#eec3a0', skinShade: '#cf9b77', hairColor: '#3b2a1e', hairShade: '#1a120b', shirt: '#7aa5d6', glasses: true },
    hair: { length: 52, fringeLength: 34, gel: {}, preBald: { x: 200, y: 160, r: 34 } },
    patience: 90,
    patienceDecay: 0.45,
    target: null,
    satisfaction(m, ctx) {
      // Fewer bald roots than he came in with = he is thrilled; hair blown over the gap helps too.
      const before = ctx?.before.baldFrac ?? m.baldFrac;
      const regrow = clamp((before - m.baldFrac) / Math.max(before, 0.01), -2, 1);
      const cover = clamp(Math.abs(m.leanAvg) * 2.2 + m.fluffAvg * 0.4, 0, 1);
      return clamp(30 + regrow * 60 + cover * 30 - m.tintedFrac * 40, 0, 100);
    },
    special: (m, sat) => sat >= 85 || m.baldFrac > 0.25,
    specialLine: { line: 'Tóc anh… mọc lại rồi?! Anh trẻ ra mười tuổi!', mood: 'ecstatic' },
    likes: ['Gậy Như Ý', 'Thuốc mọc tóc', 'Chải che'],
    dislikes: ['Tông đơ', 'Máy hút', 'Chỗ trọc mới'],
    behaviors: ['fearBald'],
    toolReactions: {
      clipper: { kind: 'fear', patience: -12, chaos: 8, lines: ['TÔNG ĐƠ?! Em định giết nốt mấy sợi cuối à?!'] },
      vacuum: { kind: 'fear', patience: -15, chaos: 10, lines: ['Máy hút?! Anh còn có mấy sợi thôi!'] },
      wand: { kind: 'love', patience: 10, chaos: 0, lines: ['Cây gậy đó… làm tóc mọc được hả em?!'] },
    },
    lines: {
      bald: ['KHÔNG! KHÔNG! Mất thêm một mảng rồi!', 'Em… em vừa cạo vào đúng hy vọng cuối của anh!'],
      regrow: ['Mọc! Nó mọc lại! Phép màu!'],
    },
    mirror: {
      love: ['Hết hói rồi! Anh đi xem mắt được rồi!'],
      ok: ['Ừ… nhìn thẳng thì không thấy.'],
      meh: ['Vẫn lộ… nhưng thôi, anh đội mũ.'],
      bad: ['Em làm nó lộ rõ hơn!'],
      disaster: ['Anh thành ông nội của anh rồi!'],
    },
    pay: { base: 100000, tip: 50000 },
    repWeight: 1.2,
    viralWeight: 1,
    appear: { minDay: 2, weight: 2 },
    returns: { onDisaster: true, onLove: true },
    startTool: 'scissors',
  },
  {
    id: 'vip',
    name: 'Chị Diễm',
    title: 'Khách VIP Chủ Tịch Hội Phụ Nữ Phường',
    personality: 'picky',
    trait: 'Trả tiền gấp mười. Nói một câu cả phường nghe. Vui thì nổi tiếng, giận thì… phá sản.',
    request: 'Làm cho chị kiểu sang trọng, quý phái.',
    catch: 'Chiều nay chị chụp ảnh cho báo phường.',
    hint: 'Đều, phồng nhẹ (máy sấy/lược), không màu, không dựng. Uy tín ×3 cả khi vui lẫn khi giận.',
    look: { skin: '#f4d1b5', skinShade: '#d8a98a', hairColor: '#2d1b10', hairShade: '#120a05', shirt: '#7b3fa0', sunglasses: true, necklace: true, earring: true },
    hair: { length: 68, fringeLength: 44, gel: {} },
    patience: 75,
    patienceDecay: 0.7,
    target: { left: 0.75, right: 0.75, top: 0.8, fringe: 0.6 },
    satisfaction: fromWants({
      base: 92,
      zones: { left: 0.75, right: 0.75, top: 0.8, fringe: 0.6 },
      zoneWeight: 160,
      penalties: { unevenLR: 160, baldFrac: 500, tintedFrac: 150, spikedFrac: 150, sculptedFrac: 200, choppiness: 90, lean: 40 },
      bonuses: { fluffAvg: 25 },
    }),
    special: (m, sat) => sat >= 88 || m.baldFrac > 0.05,
    specialLine: { line: 'Sang! Chị sẽ giới thiệu cả hội phụ nữ phường đến đây!', mood: 'ecstatic' },
    likes: ['Phồng nhẹ', 'Lược Rồng', 'Sự chu đáo'],
    dislikes: ['Màu mè', 'Dựng đứng', 'Hỗn loạn'],
    behaviors: ['vip'],
    toolReactions: {
      ray: { kind: 'hate', patience: -20, chaos: 15, lines: ['Em có biết chị là ai không?!'] },
      vacuum: { kind: 'hate', patience: -15, chaos: 12, lines: ['Máy hút bụi?! Chị là khách VIP!'] },
      comb: { kind: 'love', patience: 6, chaos: 0, lines: ['Ừ, chải nhẹ tay thế mới là phục vụ.'] },
    },
    lines: {
      bald: ['Em… vừa làm gì với tóc của Chủ tịch Hội?!'],
      walkoutWarn: ['Chị sẽ cho cả phường biết tiệm này!'],
    },
    mirror: {
      love: ['Quý phái! Đúng tầm Chủ tịch!'],
      ok: ['Tạm được. Chị chụp nghiêng bên này.'],
      meh: ['Thôi, ảnh báo phường chị dùng ảnh cũ.'],
      bad: ['Chị sẽ đánh giá một sao. Không, không sao.'],
      disaster: ['Ngày mai cả phường sẽ biết tên tiệm này.'],
    },
    pay: { base: 500000, tip: 200000 },
    repWeight: 3,
    viralWeight: 1.5,
    appear: { minDay: 3, minRep: 55, weight: 1 },
    returns: { onDisaster: false, onLove: true },
    startTool: 'scissors',
  },
  {
    id: 'alien',
    name: 'Khách X-79',
    title: 'Vị Khách Đến Từ "Quận Mười Ba"',
    personality: 'dramatic',
    trait: 'Da xanh, có râu ăng-ten. Tóc phản trọng lực: máy sấy thổi đâu, tóc bay ngược về đó.',
    request: 'Tôi… muốn… kiểu tóc… phổ biến nhất… của người Trái Đất.',
    catch: 'Tôi đã xem… trên mạng… của các bạn.',
    hint: 'Muốn đúng kiểu tóc đang viral. Thích tia Súng Tóc. Tóc chạy NGƯỢC chiều máy sấy.',
    look: { skin: '#9be37a', skinShade: '#5fae45', hairColor: '#e8f0ff', hairShade: '#8a9ac8', shirt: '#33334d', antennae: true },
    hair: { length: 56, fringeLength: 40, gel: {} },
    patience: 95,
    patienceDecay: 0.35,
    target: null,
    satisfaction: fromWants({
      base: 35,
      penalties: { baldFrac: 60 },
      bonuses: { tintedFrac: 50, spikedFrac: 40, change: 30 },
    }),
    special: (m, sat) => sat >= 85 || m.tintedFrac > 0.3,
    specialLine: { line: 'Bíp bíp! Tôi… sẽ mang… kiểu tóc này… về hành tinh!', mood: 'ecstatic' },
    likes: ['Súng Tóc 3000', 'Kiểu tóc đang viral', 'Ánh sáng'],
    dislikes: ['Nồi cơm điện'],
    behaviors: ['alien'],
    toolReactions: {
      ray: { kind: 'love', patience: 10, chaos: 0, lines: ['Ánh sáng… quê nhà… bíp!'] },
      cooker: { kind: 'fear', patience: -12, chaos: 8, lines: ['Tàu… không gian… bắt cóc tôi! Bíp bíp!'] },
    },
    lines: {
      bald: ['Bíp… lỗi… đầu… không xác định.'],
      walkoutWarn: ['Bíp! Tôi… về tàu… đây!'],
    },
    mirror: {
      love: ['Bíp! Giống người Trái Đất… một trăm phần trăm!'],
      ok: ['Khá giống… người Trái Đất.'],
      meh: ['Người Trái Đất… trông thế này… thật à?'],
      bad: ['Tôi sẽ… báo cáo… hành tinh mẹ.'],
      disaster: ['Trái Đất… không an toàn… rút quân!'],
    },
    pay: { base: 200000, tip: 100000 },
    repWeight: 0.6,
    viralWeight: 2.2,
    appear: { minDay: 3, minViral: 45, needsItem: 'neon', weight: 1 },
    returns: { onDisaster: false, onLove: true },
    startTool: 'ray',
  },
  {
    id: 'teo',
    name: 'Tèo',
    title: 'Học Sinh Trốn Học',
    personality: 'loyal',
    trait: 'Trốn tiết ra cắt tóc. Cứ thấy bóng người qua cửa là thụp đầu xuống: “Bố em!”',
    request: 'Anh cắt sao cho bố mẹ em không nhận ra em nhé!',
    catch: 'Nhưng không được trọc, cô chủ nhiệm phạt đấy.',
    hint: 'Thay đổi càng nhiều càng tốt (độ dài, màu…), nhưng không trọc. Thụp đầu = đầu tụt xuống.',
    look: { skin: '#f0c19a', skinShade: '#d39c74', hairColor: '#20160f', hairShade: '#0a0604', shirt: '#ffffff', tie: '#1f4fb5', freckles: true, prop: 'schoolBag' },
    hair: { length: 46, fringeLength: 44, gel: {} },
    patience: 80,
    patienceDecay: 0.6,
    target: null,
    satisfaction: fromWants({
      base: 25,
      penalties: { baldFrac: 300 },
      bonuses: { change: 90, curlAvg: 30 },
    }),
    special: (m, sat) => sat >= 88 || m.baldFrac > 0.1,
    specialLine: { line: 'Đến em còn không nhận ra em! Tuyệt vời!', mood: 'ecstatic' },
    likes: ['Thay đổi lớn', 'Gậy Như Ý'],
    dislikes: ['Trọc', 'Bị phát hiện'],
    behaviors: ['duck'],
    toolReactions: {},
    lines: {
      duckWarn: ['Ơ… bố em!', 'Chết, cô chủ nhiệm!', 'Suỵt! Có người quen!'],
      turnStray: ['Em thụp xuống có tí mà!'],
      bald: ['Trọc là cô phạt em đứng góc lớp cả tuần!'],
    },
    mirror: {
      love: ['Bố em nhìn thẳng mặt cũng không nhận ra!'],
      ok: ['Hơi giống em… nhưng chắc bố không để ý.'],
      meh: ['Vẫn là em. Chết rồi.'],
      bad: ['Giờ cả trường nhận ra em.'],
      disaster: ['Em xin chuyển trường.'],
    },
    pay: { base: 30000, tip: 5000 },
    repWeight: 0.6,
    viralWeight: 1.2,
    appear: { minDay: 1, weight: 2 },
    returns: { onDisaster: true, onLove: false },
    startTool: 'scissors',
  },
  {
    id: 'vang',
    fallback: 'dog',
    name: 'Cậu Vàng',
    title: 'Khách Hàng Bốn Chân',
    personality: 'dramatic',
    trait: 'Chó vàng nhà bà Hai. Sợ tiếng tông đơ, mê gió máy sấy, ngửi thấy đồ ăn là quay đầu. Sợ quá thì rũ lông bay khắp tiệm.',
    request: 'Gâu! (Bà Hai: “Tỉa cho Cậu Vàng gọn gọn, mát mát nhé cháu.”)',
    catch: 'Gâu gâu! (Bà Hai: “Cẩn thận, nó sợ cái máy kêu rè rè lắm.”)',
    hint: 'Tỉa gọn lông. Tông đơ làm Vàng sợ → rũ lông. Máy sấy làm Vàng sướng. Xúc xích giúp Vàng ngồi yên.',
    look: { skin: '#f0d3a0', skinShade: '#c79c5c', hairColor: '#d9a441', hairShade: '#9a6d1e', shirt: '#d6332f', species: 'dog' },
    hair: { length: 40, fringeLength: 22, gel: {}, phiRange: [-35, 215], messiness: 0.2 },
    patience: 80,
    patienceDecay: 0.5,
    target: { left: 0.6, right: 0.6, top: 0.65, fringe: 0.6 },
    satisfaction: fromWants({
      base: 90,
      zones: { left: 0.6, right: 0.6, top: 0.65, fringe: 0.6 },
      zoneWeight: 140,
      penalties: { baldFrac: 300, tintedFrac: 30, unevenLR: 60 },
      bonuses: { fluffAvg: 15 },
      loveStyles: ['dog-lion', 'dog-cotton'],
    }),
    special: (m, sat) => sat >= 85 || m.baldFrac > 0.1,
    specialLine: { line: 'Gâu gâu gâu! (Bà Hai: “Đẹp chưa kìa! Cậu Vàng nhà bà như hoa hậu!”)', mood: 'ecstatic' },
    likes: ['Máy sấy', 'Xúc xích', 'Được khen'],
    dislikes: ['Tông đơ', 'Máy hút', 'Tiếng nổ'],
    behaviors: ['dog'],
    toolReactions: {
      clipper: { kind: 'fear', patience: -4, chaos: 4, nerves: 25 },
      vacuum: { kind: 'fear', patience: -6, chaos: 6, nerves: 35 },
      ray: { kind: 'fear', patience: -4, chaos: 4, nerves: 20 },
      dryer: { kind: 'love', patience: 4, chaos: 0 },
    },
    lines: {
      dogFearWarn: ['Ư ử… ư ử…', 'Grừ… (run run)'],
      dogShake: ['Cậu Vàng, đứng yên! Đây là tiệm tóc, không phải chỗ tắm!'],
      dogSniff: ['Cậu Vàng, đứng yên! Đây là tiệm tóc, không phải tiệm xúc xích!', '(Bà Hai: “Thôi chết, nó ngửi thấy mùi xôi xéo đầu ngõ rồi!”)'],
      dogHappy: ['Gâu! (vẫy đuôi tít mù)', '(Bà Hai: “Nó thích gió lắm đấy cháu!”)'],
      bald: ['Ẳng! (Bà Hai: “Ơ kìa, sao lưng nó lại trọc một mảng thế kia?!”)'],
      walkoutWarn: ['Gâu gâu gâu! (Cậu Vàng nhảy xuống ghế!)'],
    },
    mirror: {
      love: ['Gâu gâu! (Bà Hai: “Đẹp quá, mai bà dẫn cả đàn đến!”)'],
      ok: ['Gâu. (Bà Hai: “Ừ, gọn gọn rồi.”)'],
      meh: ['Ư ử. (Bà Hai: “Sao nó trông như con mèo thế cháu?”)'],
      bad: ['Grừ… (Bà Hai: “Cậu Vàng giận cháu rồi đấy.”)'],
      disaster: ['Ẳng ẳng! (Bà Hai: “Trả lại bà con chó cũ đây!”)'],
    },
    pay: { base: 150000, tip: 50000 },
    repWeight: 1,
    viralWeight: 2,
    appear: { minDay: 2, needsItem: 'petSign', weight: 2 },
    returns: { onDisaster: true, onLove: true },
    startTool: 'scissors',
  },
  {
    id: 'copycat',
    name: 'Bạn Fan Cuồng Trend',
    title: 'Khách Muốn Bắt Chước Kiểu Tóc Viral',
    personality: 'loyal',
    trait: 'Thấy kiểu tóc “thảm họa” của tiệm trên mạng. Muốn y hệt. Không hơn, không kém.',
    request: 'Anh ơi, cho em kiểu tóc đang hot trên mạng ấy!',
    catch: 'Phải y hệt cái clip nhé, em xem đi xem lại hai mươi lần rồi.',
    hint: 'Làm ra đúng kiểu tóc đã viral hôm trước (xem tên ở yêu cầu).',
    look: { skin: '#f1c7a3', skinShade: '#d3a07c', hairColor: '#2c1f17', hairShade: '#100a06', shirt: '#14b8a6', earring: true },
    hair: { length: 54, fringeLength: 40, gel: { top: 0.5 } },
    patience: 90,
    patienceDecay: 0.45,
    target: null,
    satisfaction(m, ctx) {
      if (!ctx || !ctx.wantStyle) return clamp(30 + Math.abs(m.avg - (ctx?.before.avg ?? 1)) * 60, 0, 100);
      if (ctx.styleId === ctx.wantStyle) return 95;
      return clamp(20 + Math.abs(m.avg - ctx.before.avg) * 40 + m.tintedFrac * 20 + m.spikedFrac * 20, 0, 60);
    },
    special: (_m, sat) => sat >= 90,
    specialLine: { line: 'Y HỆT! Em sẽ lên clip “Tôi đã cắt được kiểu tóc huyền thoại”!', mood: 'ecstatic' },
    likes: ['Kiểu tóc viral'],
    dislikes: ['Bị cắt khác clip'],
    behaviors: [],
    toolReactions: {},
    mirror: {
      love: ['Y hệt trên mạng! Em lên đời!'],
      ok: ['Gần giống… chắc tại ánh sáng trong clip.'],
      meh: ['Trong clip đâu có như thế này.'],
      bad: ['Đây đâu phải kiểu trên mạng!'],
      disaster: ['Em sẽ quay clip mới. Clip bóc phốt.'],
    },
    pay: { base: 80000, tip: 40000 },
    repWeight: 0.8,
    viralWeight: 1.5,
    appear: { minDay: 99, weight: 0 },
    returns: NO_RETURN,
    startTool: 'scissors',
  },
];

export function customerById(id: CustomerId): CustomerDef {
  return CUSTOMERS.find((c) => c.id === id) ?? CUSTOMERS[0];
}

/** The three classic customers of the free-play mode. */
export const CLASSIC_IDS: CustomerId[] = ['tuan', 'bay', 'khoa'];
