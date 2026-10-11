import { clamp } from './geometry';
import { HairStyleInit, Zone } from './hair';
import { HairMetrics } from './metrics';

export type CustomerId = 'tuan' | 'bay' | 'khoa';
export type Personality = 'loyal' | 'picky' | 'dramatic';

export interface CustomerLook {
  skin: string;
  skinShade: string;
  hairColor: string;
  hairShade: string;
  shirt: string;
  glasses?: boolean;
  mustache?: boolean;
  earring?: boolean;
  chain?: boolean;
  wrinkles?: boolean;
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
  satisfaction(m: HairMetrics): number;
  /** Over-the-top reaction trigger (result "vượt ngoài mong đợi"). */
  special(m: HairMetrics, sat: number): boolean;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const CUSTOMERS: CustomerDef[] = [
  {
    id: 'tuan',
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
      return clamp(100 - err * 185 - m.baldFrac * 320 - tooShort - m.spikedFrac * 70 - Math.abs(m.leanAvg) * 60, 0, 100);
    },
    special(m, sat) {
      return sat >= 88 || m.baldFrac > 0.25;
    },
  },
  {
    id: 'bay',
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
        100 - err * 210 - m.unevenLR * 170 - m.baldFrac * 420 - m.spikedFrac * 130 - m.fluffAvg * 25 - Math.abs(m.leanAvg) * 80,
        0,
        100,
      );
    },
    special(m, sat) {
      return sat >= 85 || m.highway !== null || m.avg < 0.35;
    },
  },
  {
    id: 'khoa',
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
      const drama = clamp(m.spikedFrac * 1.7 + m.fluffAvg * 0.45 + Math.abs(m.leanAvg) * 0.8, 0, 1);
      const kept = clamp((m.avg - 0.35) / 0.5, 0, 1);
      return clamp(drama * 70 + kept * 30 - m.baldFrac * 260, 0, 100);
    },
    special(m, sat) {
      return sat >= 80 || m.spikedFrac > 0.55 || m.baldFrac > 0.2;
    },
  },
];

export function customerById(id: CustomerId): CustomerDef {
  return CUSTOMERS.find((c) => c.id === id)!;
}
