import { CustomerDef, Personality } from './customers';
import { HairMetrics, LEAN_RUNAWAY } from './metrics';
import { Rng, pick } from './rng';

export type EventId =
  | 'baldPatch'
  | 'combOver'
  | 'gelSpikes'
  | 'headTurn'
  | 'strayCut'
  | 'fixLoop'
  | 'lastMinuteRuin'
  | 'sneeze'
  | 'walkoutThreat'
  | 'walkout'
  | 'wrongTool'
  | 'hotDryer'
  | 'wandGiant'
  | 'regrow'
  | 'vacuumGulp'
  | 'comboStormLong'
  | 'comboSculpt'
  | 'comboPotSuck'
  | 'startle'
  | 'karateChop'
  | 'dogShake'
  | 'dogSniff'
  | 'baldPanic'
  | 'growRace'
  | 'concreteSpikes'
  | 'malfunction';

/** Human-readable names for the incident log / result screen. */
export const EVENT_TITLES: Record<EventId, string> = {
  baldPatch: 'Đường Cạo Định Mệnh',
  combOver: 'Mái Tóc Chạy Trốn',
  gelSpikes: 'Gió Đổi Chiều',
  headTurn: 'Khách Không Chịu Ngồi Yên',
  strayCut: 'Đường Cắt Lệch',
  fixLoop: 'Càng Sửa Càng Sai',
  lastMinuteRuin: 'Phút Chót Toang',
  sneeze: 'Cú Hắt Xì Định Mệnh',
  walkoutThreat: 'Khách Đòi Về',
  walkout: 'Khách Bỏ Chạy',
  wrongTool: 'Nhầm Dụng Cụ',
  hotDryer: 'Sấy Da Đầu',
  wandGiant: 'Mọc Như Nấm Sau Mưa',
  regrow: 'Mọc Lại Thần Kỳ',
  vacuumGulp: 'Hút Nhầm Vùng',
  comboStormLong: 'COMBO: Bão Tóc Dài',
  comboSculpt: 'COMBO: Kỳ Lân Bảy Sắc',
  comboPotSuck: 'COMBO: Hút Nhầm Cả Nồi',
  startle: 'Đánh Thức Cụ Dậy',
  karateChop: 'Võ Sư Ra Đòn',
  dogShake: 'Cậu Vàng Rũ Lông',
  dogSniff: 'Cậu Vàng Ngửi Thấy Mùi Thơm',
  baldPanic: 'Hoảng Loạn Vì Hói',
  growRace: 'Mọc Nhanh Hơn Cắt',
  concreteSpikes: 'Ăng-ten Bê Tông',
  malfunction: 'Máy Trục Trặc',
};

export interface RoundFacts {
  customer: CustomerDef;
  metrics: HairMetrics;
  /** Hair metrics when the customer sat down. */
  before: HairMetrics;
  chaos: number;
  events: Partial<Record<EventId, number>>;
  fixCount: number;
  /** Most separate cutting strokes spent on one zone. */
  maxZoneStrokes: number;
  walkedOut: boolean;
  timedOut: boolean;
  /** Seconds spent and allowed (speed-sensitive customers). */
  timeUsed?: number;
  timeLimit?: number;
  /** Livestream viewers at the end (Na Bông). */
  viewers?: number;
  /** Hairstyle a copycat customer asked for. */
  wantStyle?: string | null;
  /** Multipliers from the shop/upgrades (career mode). */
  payBonus?: number;
}

export interface StyleName {
  id: string;
  name: string;
  why: string;
}

interface StyleRule extends StyleName {
  when(f: RoundFacts, sat: number): boolean;
}

/**
 * Hairstyle naming: first matching rule wins. Every rule reads the real final hair, so
 * the name always describes what is on the customer's head.
 */
const isDog = (f: RoundFacts) => f.customer.look.species === 'dog';

export const STYLE_RULES: StyleRule[] = [
  {
    id: 'dog-shaved',
    name: 'Chó Cỏ Hạng Sang',
    why: 'Cậu Vàng bị cạo lộ cả da như chó cỏ đi spa.',
    when: (f) => isDog(f) && f.metrics.baldFrac > 0.08,
  },
  {
    id: 'dog-lion',
    name: 'Sư Tử Mini',
    why: 'Bờm quanh đầu dài, phần còn lại tỉa ngắn: Cậu Vàng hóa sư tử.',
    when: (f) => isDog(f) && f.metrics.zone.top > 0.7 && (f.metrics.zone.left + f.metrics.zone.right) / 2 > 0.7 && f.metrics.fluffAvg > 0.25,
  },
  {
    id: 'dog-cotton',
    name: 'Cún Bông Gòn',
    why: 'Lông được sấy phồng tròn như cục bông.',
    when: (f) => isDog(f) && f.metrics.fluffAvg >= 0.4,
  },
  {
    id: 'dog-neat',
    name: 'Cậu Vàng Đi Thi Hoa Hậu',
    why: 'Lông tỉa gọn gàng, đều tăm tắp.',
    when: (f) => isDog(f) && f.metrics.avg < 0.85 && f.metrics.unevenLR < 0.15 && f.metrics.baldFrac === 0,
  },
  {
    id: 'egg',
    name: 'Trứng Luộc Bóc Vỏ',
    why: 'Gần như không còn sợi nào.',
    when: (f) => f.metrics.baldFrac > 0.55 || f.metrics.avg < 0.08,
  },
  {
    id: 'blackhole',
    name: 'Lỗ Đen Vũ Trụ',
    why: 'Máy hút đã nuốt mất một mảng tóc.',
    when: (f) => f.metrics.baldCount > 0 && !!(f.events.vacuumGulp || f.events.comboPotSuck),
  },
  {
    id: 'unicorn',
    name: 'Kỳ Lân Bảy Sắc',
    why: 'Tóc nhuộm màu bị chải dựng thành một cái sừng.',
    when: (f) => f.metrics.sculptedFrac >= 0.05,
  },
  {
    id: 'highway',
    name: 'Đường Cao Tốc Trên Đầu',
    why: 'Một vệt trọc dài chạy thẳng qua đầu.',
    when: (f) => f.metrics.highway !== null,
  },
  {
    id: 'islands',
    name: 'Bản Đồ Quần Đảo',
    why: 'Nhiều mảng trọc rải rác khắp đầu.',
    when: (f) => f.metrics.baldClusters >= 3,
  },
  {
    id: 'stormy',
    name: 'Bão Cấp 12 Vừa Đi Qua',
    why: 'Tóc dài bất thường bị gió thổi tung về một phía.',
    when: (f) => !!f.events.comboStormLong && f.metrics.fluffAvg >= 0.3,
  },
  {
    id: 'rainbow',
    name: 'Cầu Vồng Không Xin Phép',
    why: 'Nhiều mảng tóc mang những màu chẳng ai yêu cầu.',
    when: (f) => f.metrics.colorCount >= 3 && f.metrics.tintedFrac >= 0.15,
  },
  {
    id: 'saiyan',
    name: 'Siêu Saiyan Bình Dân',
    why: 'Keo vuốt gặp máy sấy, tóc dựng đứng toàn bộ.',
    when: (f) => f.metrics.spikedFrac >= 0.5,
  },
  {
    id: 'hedgehog',
    name: 'Nhím Bị Điện Giật',
    why: 'Nhiều lọn tóc dựng đứng vì keo.',
    when: (f) => f.metrics.spikedFrac >= 0.22,
  },
  {
    id: 'rapunzel',
    name: 'Rapunzel Bất Đắc Dĩ',
    why: 'Một phần tóc dài gấp đôi, gấp ba lúc vào tiệm.',
    when: (f) => f.metrics.longFrac >= 0.2,
  },
  {
    id: 'bun',
    name: 'Bánh Bao Nhân Tóc',
    why: 'Phần trên được hấp phồng tròn như bánh bao.',
    when: (f) => f.metrics.steamedFrac >= 0.3,
  },
  {
    id: 'runaway',
    name: 'Mái Tóc Chạy Trốn',
    why: 'Cả mái tóc bị thổi lệch hẳn sang một bên.',
    when: (f) => Math.abs(f.metrics.leanAvg) >= LEAN_RUNAWAY,
  },
  {
    id: 'halfhalf',
    name: 'Nửa Nạc Nửa Mỡ',
    why: 'Hai bên dài ngắn chênh nhau thấy rõ.',
    when: (f) => f.metrics.unevenLR >= 0.25,
  },
  {
    id: 'undercut',
    name: 'Undercut Nhưng Không Ai Đồng Ý',
    why: 'Hai bên cạo ngắn, phía trên dài, nhưng lệch.',
    when: (f) => {
      const z = f.metrics.zone;
      return (z.left + z.right) / 2 < 0.4 && z.top > 0.55 && f.metrics.unevenLR >= 0.12;
    },
  },
  {
    id: 'bowl',
    name: 'Úp Bát Thành Công',
    why: 'Mái và hai bên bị cắt bằng một đường thẳng tắp.',
    when: (f) => {
      const z = f.metrics.zone;
      return (
        z.fringe < 0.7 &&
        f.metrics.fringeTipSpread < 7 &&
        Math.abs(z.left - z.right) < 0.15 &&
        z.left < 0.75 &&
        z.left > 0.25 &&
        Math.abs(z.fringe - (z.left + z.right) / 2) < 0.2
      );
    },
  },
  {
    id: 'rooster',
    name: 'Mào Gà Tự Phát',
    why: 'Hai bên cạo sát, phía trên dựng một dải dài.',
    when: (f, sat) => {
      const z = f.metrics.zone;
      return z.left < 0.5 && z.right < 0.5 && z.top > 0.65 && !(f.customer.id === 'tuan' && sat >= 75);
    },
  },
  {
    id: 'mushroom',
    name: 'Nấm Rơm Lộn Ngược',
    why: 'Phía trên bị cắt cụt, hai bên vẫn dài thượt.',
    when: (f) => {
      const z = f.metrics.zone;
      return z.top < 0.5 && z.left > 0.75 && z.right > 0.75;
    },
  },
  {
    id: 'forehead',
    name: 'Trán Rộng Thênh Thang',
    why: 'Cái mái biến mất, phần còn lại thì vẫn nguyên.',
    when: (f) => {
      const z = f.metrics.zone;
      return z.fringe < 0.35 && z.left > 0.6 && z.right > 0.6 && z.top > 0.6;
    },
  },
  {
    id: 'noodle',
    name: 'Uốn Xoăn Mì Tôm',
    why: 'Các lọn tóc bị uốn xoăn tít.',
    when: (f) => f.metrics.curlAvg >= 0.3,
  },
  {
    id: 'hat',
    name: 'Đầu To Như Cái Nón Lá',
    why: 'Từng lọn tóc to bất thường.',
    when: (f) => f.metrics.thickAvg >= 1.6,
  },
  {
    id: 'nest',
    name: 'Tổ Chim Sau Bão',
    why: 'Máy sấy làm cả đầu bung xù.',
    when: (f) => f.metrics.fluffAvg >= 0.45,
  },
  {
    id: 'onepatch',
    name: 'Cắt Một Lần, Nhớ Cả Đời',
    why: 'Có một mảng trọc không ai yêu cầu.',
    when: (f) => f.metrics.baldCount > 0,
  },
  {
    id: 'untouched',
    name: 'Như Chưa Hề Có Cuộc Chia Ly',
    why: 'Gần như chưa cắt sợi nào.',
    when: (f) => f.metrics.avg > f.before.avg - 0.06,
  },
  {
    id: 'token',
    name: 'Tỉa Cho Có Lệ',
    why: 'Cắt vài nhát lấy lệ, nhìn kỹ mới thấy.',
    when: (f, sat) => f.metrics.avg > f.before.avg - 0.18 && sat < 75,
  },
  {
    id: 'perfect-tuan',
    name: 'Chuẩn Ảnh Mẫu (Hiếm Có Khó Tìm)',
    why: 'Hai bên ngắn, trên dài — đúng ảnh mẫu.',
    when: (f, sat) => f.customer.id === 'tuan' && sat >= 75,
  },
  {
    id: 'perfect-bay',
    name: 'Tỉa Nhẹ Đúng Nghĩa Đen',
    why: 'Tỉa đều, nhẹ, hai bên bằng nhau.',
    when: (f, sat) => f.customer.id === 'bay' && sat >= 75,
  },
  {
    id: 'perfect-khoa',
    name: 'Bản Nâng Cấp Gây Hối Hận',
    why: 'Ấn tượng mà vẫn giữ được độ dài.',
    when: (f, sat) => f.customer.id === 'khoa' && sat >= 75,
  },
  {
    id: 'chewed',
    name: 'Chó Gặm Nghệ Thuật',
    why: 'Dài ngắn lởm chởm, mỗi lọn một số phận.',
    when: (f) => f.metrics.choppiness >= 0.26,
  },
  {
    id: 'buzz',
    name: 'Đầu Đinh Bất Đắc Dĩ',
    why: 'Cả đầu bị cắt rất ngắn.',
    when: (f) => f.metrics.avg < 0.35,
  },
  {
    id: 'heavyhand',
    name: 'Tỉa Nhẹ… Nhưng Tay Nặng',
    why: 'Cắt đều tay, chỉ là hơi nhiều.',
    when: (f) => f.metrics.unevenLR < 0.15 && f.metrics.choppiness < 0.18 && f.metrics.avg < 0.75,
  },
  {
    id: 'science',
    name: 'Phong Cách Chưa Được Khoa Học Công Nhận',
    why: 'Không giống bất kỳ kiểu tóc nào đã biết.',
    when: () => true,
  },
];

export function nameHairstyle(f: RoundFacts, sat: number): StyleName {
  const r = STYLE_RULES.find((rule) => rule.when(f, sat))!;
  return { id: r.id, name: r.name, why: r.why };
}

export type ReactionTier = 'love' | 'ok' | 'meh' | 'bad' | 'disaster';
export type Mood =
  | 'neutral'
  | 'happy'
  | 'ecstatic'
  | 'suspicious'
  | 'worried'
  | 'angry'
  | 'shocked'
  | 'crying'
  | 'flinch'
  | 'sneeze'
  | 'sleepy';

export function reactionTier(sat: number): ReactionTier {
  if (sat >= 80) return 'love';
  if (sat >= 60) return 'ok';
  if (sat >= 40) return 'meh';
  if (sat >= 20) return 'bad';
  return 'disaster';
}

type Defect = 'highway' | 'bald' | 'spikes' | 'lean' | 'uneven' | 'fluff' | 'short' | 'untouched' | 'none';

function mainDefect(f: RoundFacts): Defect {
  const m = f.metrics;
  if (m.highway) return 'highway';
  if (m.baldCount > 0) return 'bald';
  if (m.spikedFrac >= 0.22 && f.customer.personality !== 'dramatic') return 'spikes';
  if (Math.abs(m.leanAvg) >= LEAN_RUNAWAY) return 'lean';
  if (m.unevenLR >= 0.25) return 'uneven';
  if (m.fluffAvg >= 0.45) return 'fluff';
  if (m.avg < 0.4) return 'short';
  if (m.avg > f.before.avg - 0.06) return 'untouched';
  return 'none';
}

const DEFECT_LINES: Record<Personality, Partial<Record<Defect, string[]>>> = {
  loyal: {
    highway: ['Trong ảnh làm gì có cái đường băng nào?!'],
    bald: ['Ảnh mẫu đâu có cái lỗ này hả em?', 'Đẹp đấy. Đẹp đến mức anh không dám về nhà.'],
    spikes: ['Anh giống ảnh mẫu… nếu ảnh mẫu bị sét đánh.'],
    lean: ['Sao tóc anh chạy hết sang một bên như đang trốn nợ thế?'],
    uneven: ['Một bên giống ảnh. Bên kia giống… ảnh khác.'],
    fluff: ['Anh đưa ảnh tóc nam, em trả về tổ chim.'],
    short: ['Anh đã bảo ĐỪNG ngắn quá rồi mà!!'],
    untouched: ['Ơ… em cắt chưa? Anh trả tiền cho cái gì?'],
  },
  picky: {
    highway: ['Chú bảo tỉa nhẹ, cháu xây đường cao tốc trên đầu chú à?'],
    bald: ['Tỉa nhẹ. Chú đã nói rõ ràng là TỈA. NHẸ.'],
    spikes: ['Chú 60 tuổi rồi, dựng tóc thế này đi họp tổ dân phố à?'],
    lean: ['Tóc chú nghiêng hết về một phía như cây sau bão.'],
    uneven: ['Bên này ngắn, bên kia dài. Chú nhìn nghiêng là thấy ngay!'],
    fluff: ['Sấy kiểu gì mà đầu chú như cái chổi lông gà?'],
    short: ['Cái này gọi là tỉa nhẹ hả cháu?', 'Đẹp đấy. Đẹp đến mức chú không dám về nhà.'],
    untouched: ['Ừ… thế cháu cắt cái gì từ nãy đến giờ?'],
  },
  dramatic: {
    highway: ['Người yêu cũ sẽ hối hận… vì đã từng quen anh.'],
    bald: ['Anh muốn cô ấy hối hận, không phải thương hại!'],
    lean: ['Tóc anh cũng bỏ anh mà đi rồi!'],
    uneven: ['Một nửa con người cũ, một nửa con người mới… Ừ, cũng có ý nghĩa.'],
    fluff: ['Anh trông như vừa thoát khỏi một cơn bão… cảm xúc.'],
    short: ['Anh bảo đừng thay đổi nhiều cơ mà!!!'],
    untouched: ['Vẫn là anh của ngày hôm qua… Cô ấy sẽ không hối hận đâu.'],
    none: ['Ổn… nhưng chưa đủ để cô ấy hối hận.'],
  },
};

const TIER_REACTIONS: Record<Personality, Record<ReactionTier, string[]>> = {
  loyal: {
    love: ['Giống ảnh! Giống y như ảnh! Em là thiên tài!'],
    ok: ['Ừ… cũng giống ảnh. Nếu nheo mắt lại.'],
    meh: ['Cũng được. Chắc tại ảnh mẫu chụp đẹp quá.'],
    bad: ['Cái này không giống ảnh nào anh từng xem.'],
    disaster: ['Anh sẽ xóa cái ảnh mẫu này đi. Mãi mãi.'],
  },
  picky: {
    love: ['Được. Lần sau cháu cắt cho chú tiếp.'],
    ok: ['Tạm được. Tạm thôi nhé.'],
    meh: ['Hừm. Về bà nhà lại bắt sửa cho xem.'],
    bad: ['Hai mươi năm nay chú chưa thấy cái đầu nào thế này.'],
    disaster: ['Chú… chú không nhận ra mình nữa.'],
  },
  dramatic: {
    love: ['Đây rồi! Đây là con người mới của anh!'],
    ok: ['Được! Chắc cô ấy sẽ hơi hối hận.'],
    meh: ['Ổn… nhưng chưa đủ để cô ấy hối hận.'],
    bad: ['Cô ấy sẽ hối hận… vì đã từng quen anh.'],
    disaster: ['Anh xin phép đội mũ bảo hiểm đến hết năm.'],
  },
};

function specialReaction(f: RoundFacts, sat: number): { line: string; mood: Mood } | null {
  const m = f.metrics;
  if (!f.customer.special(m, sat)) return null;
  switch (f.customer.id) {
    case 'tuan':
      if (m.baldFrac > 0.25) return { line: 'Thôi… để anh đổi ảnh mẫu cho khớp với tóc vậy.', mood: 'shocked' };
      return { line: 'Giống ảnh đến mức anh tưởng mình là người trong ảnh!', mood: 'ecstatic' };
    case 'bay':
      if (m.highway) return { line: 'Chú bảo tỉa nhẹ, cháu xây đường cao tốc trên đầu chú à?', mood: 'angry' };
      if (m.avg < 0.35) return { line: 'Tỉa nhẹ… cả phần đời còn lại của chú luôn à?', mood: 'shocked' };
      return { line: 'Được. Hai mươi năm nay mới có đứa cắt được thế này.', mood: 'happy' };
    case 'khoa':
      if (m.baldFrac > 0.2) return { line: 'Cô ấy sẽ hối hận… vì đã từng quen anh. Hu hu.', mood: 'crying' };
      return { line: 'Người yêu cũ ơi, nhìn đi! NHÌN ĐI!!', mood: 'ecstatic' };
    default:
      // Data-driven customers: a good result gets their special line; a disaster gets their worst mirror line.
      if (sat >= 70 && f.customer.specialLine) return f.customer.specialLine;
      if (sat < 70 && f.customer.mirror?.disaster?.length) return { line: f.customer.mirror.disaster[0], mood: f.customer.personality === 'dramatic' ? 'crying' : 'shocked' };
      return null;
  }
}

function moodFor(p: Personality, tier: ReactionTier): Mood {
  switch (tier) {
    case 'love':
      return p === 'picky' ? 'happy' : 'ecstatic';
    case 'ok':
      return 'happy';
    case 'meh':
      return 'suspicious';
    case 'bad':
      return p === 'dramatic' ? 'crying' : 'angry';
    case 'disaster':
      return p === 'picky' ? 'angry' : p === 'dramatic' ? 'crying' : 'shocked';
  }
}

/** Narrator caption: what *caused* this. Ordered by how good a story it is. */
function caption(f: RoundFacts, sat: number): string {
  const e = f.events;
  if (f.walkedOut) return 'Khách bỏ về giữa chừng, mang theo nửa cái đầu và khăn choàng của tiệm.';
  if (e.comboPotSuck) return 'Hấp tóc phồng như bánh bao, rồi cầm máy hút… hút luôn cả bánh.';
  if (e.comboSculpt) return 'Bắn màu bằng Súng Tóc, chải bằng Lược Rồng. Khách mọc sừng.';
  if (e.comboStormLong) return 'Kéo tóc dài gấp ba bằng Gậy Như Ý, rồi bật Máy Sấy Bão.';
  if (e.vacuumGulp) return 'Giữ máy hút hơi lâu. Máy hút hơi nhiều.';
  if (e.strayCut && f.metrics.baldCount > 0) return 'Khách quay đầu đúng lúc tông đơ đang chạy.';
  if (e.fixLoop) return `Sửa đi sửa lại một chỗ ${f.maxZoneStrokes} lần. Càng sửa càng sai.`;
  if (e.combOver) return 'Cố che chỗ trọc bằng máy sấy. Tóc quyết định bỏ trốn.';
  if (e.sneeze) return 'Thổi tóc vụn vào mũi khách. Khách đáp lễ bằng một cú hắt xì.';
  if (e.gelSpikes) return 'Keo vuốt + máy sấy = điện giật miễn phí.';
  if (e.lastMinuteRuin) return 'Đang đẹp thì cắt thêm một nhát cho chắc.';
  if (e.regrow) return 'Cạo trọc rồi dùng phép mọc lại. Tóc mọc lại hơi… xoăn.';
  if (e.wandGiant) return 'Khách vào để cắt ngắn. Khách ra với mái tóc dài hơn.';
  if (f.metrics.tintedFrac > 0.1) return 'Súng Tóc 3000 không có chế độ an toàn.';
  if (e.strayCut) return 'Khách quay đầu, đường kéo quay theo.';
  if (f.metrics.highway) return 'Cầm tông đơ đi chậm rãi, cẩn thận… quá cẩn thận.';
  if (f.metrics.baldCount > 0) return 'Giữ tông đơ hơi lâu một chút. Chỉ một chút thôi.';
  if (f.fixCount >= 4) return `Chiều khách ${f.fixCount} lần liền. Khách vẫn chưa vừa ý.`;
  if (f.timedOut) return 'Hết giờ. Khách tự đứng dậy soi gương.';
  if (f.metrics.avg > f.before.avg - 0.06) return 'Thợ cắt tóc chọn cách… không cắt.';
  if (sat >= 80) return 'Một ngày bình yên hiếm hoi ở Tiệm Cắt Tóc Bất Ổn.';
  if (sat < 40) return 'Không có tai nạn nào. Chỉ là không ai hiểu thợ đang cắt theo ý ai.';
  return 'Mọi thứ diễn ra bình thường. Theo tiêu chuẩn của tiệm này.';
}

export interface RoundResult {
  sat: number;
  tier: ReactionTier;
  style: StyleName;
  mood: Mood;
  line: string;
  caption: string;
  chaos: number;
  skillScore: number;
  dramaScore: number;
  total: number;
  pay: string;
  /** Money actually received (VND). */
  paid: number;
  tip: number;
  incidents: EventId[];
  walkedOut: boolean;
  special: boolean;
}

export function evaluateRound(f: RoundFacts, rng: Rng): RoundResult {
  // Name from the hair first (some customers judge by the style they got), then judge.
  const preStyle = nameHairstyle(f, 0).id;
  // (sat is computed with the customer's own context below)
  const sat = Math.round(
    f.customer.satisfaction(f.metrics, {
      before: f.before,
      timeUsed: f.timeUsed ?? 0,
      timeLimit: f.timeLimit ?? 75,
      viewers: f.viewers ?? 0,
      styleId: preStyle,
      wantStyle: f.wantStyle ?? null,
    }),
  );
  const tier = reactionTier(sat);
  const style = nameHairstyle(f, sat);
  const p = f.customer.personality;
  const special = specialReaction(f, sat);
  let line: string;
  let mood: Mood;
  const own = f.customer.mirror;
  if (f.walkedOut) {
    line = own?.disaster?.[0] ?? TIER_REACTIONS[p].disaster[0];
    mood = p === 'dramatic' ? 'crying' : 'angry';
  } else if (special) {
    line = special.line;
    mood = special.mood;
  } else {
    mood = moodFor(p, tier);
    const defect = mainDefect(f);
    const defectPool = DEFECT_LINES[p][defect];
    if (f.customer.id === 'bay' && f.fixCount >= 5 && tier !== 'love') {
      line = `Sửa ${f.fixCount} lần, mỗi lần một bên. Giờ chú không nhận ra mình nữa.`;
    } else if (own?.[tier]?.length) {
      line = pick(rng, own[tier]!);
    } else if (defectPool && tier !== 'love') {
      line = pick(rng, defectPool);
    } else {
      line = pick(rng, TIER_REACTIONS[p][tier]);
    }
  }
  const incidents = (Object.keys(f.events) as EventId[]).filter((k) => (f.events[k] ?? 0) > 0);
  const skillScore = f.walkedOut ? 0 : sat * 10;
  const dramaScore = Math.round(f.chaos * 5) + incidents.length * 80;
  const base = f.customer.pay.base;
  const bonus = f.payBonus ?? 1;
  const paid = f.walkedOut ? 0 : Math.round((tier === 'bad' ? base / 3 : tier === 'disaster' ? 0 : base) / 1000) * 1000;
  const tip = !f.walkedOut && tier === 'love' ? Math.round((f.customer.pay.tip * bonus) / 1000) * 1000 : 0;
  const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
  let pay: string;
  if (f.walkedOut) pay = 'Khách bỏ về, không trả tiền, mang luôn khăn choàng.';
  else if (tier === 'love') pay = `Khách trả ${vnd(paid)} và boa thêm ${vnd(tip)}!`;
  else if (tier === 'ok') pay = `Khách trả đủ ${vnd(paid)}.`;
  else if (tier === 'meh') pay = `Khách trả ${vnd(paid)}… toàn bằng tiền lẻ.`;
  else if (tier === 'bad') pay = `Khách chỉ trả ${vnd(paid)} “tiền công cầm kéo”.`;
  else pay = 'Khách không trả tiền. Tiệm còn phải tặng mũ lưỡi trai.';
  return {
    sat,
    tier,
    style,
    mood,
    line,
    caption: caption(f, sat),
    chaos: Math.round(f.chaos),
    skillScore,
    dramaScore,
    total: skillScore + dramaScore,
    pay,
    paid,
    tip,
    incidents,
    walkedOut: f.walkedOut,
    special: special !== null && !f.walkedOut,
  };
}
