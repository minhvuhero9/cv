import type { CustomerDef, CustomerId, MirrorLines, SatisfactionCtx } from './customers';
import { fromWants, Wants } from './customers';
import { clamp } from './geometry';
import type { HairState, Zone } from './hair';
import type { BodySpec, CustomerLook, FaceSpec } from './look';
import type { HairMetrics } from './metrics';

/**
 * Gương Thần Biến Hình — a folk-art magic mirror that dresses the customer up as a
 * fictional Vietnamese internet archetype. Every persona is an original, made-up
 * character type (no real people, no real faces, no real quotes): its own outfit and
 * silhouette pieces, a signature hair treatment, a target cut (shown as a ghost outline),
 * its own lines and its own verdict in the mirror.
 */
export type PersonaId = 'tiktoker' | 'giangho' | 'tocdung' | 'idol' | 'daigia' | 'hongbien';

/** Look layer: replaces outfit/accessories, merges face and body details. */
export interface LookLayer extends Partial<Omit<CustomerLook, 'face' | 'body'>> {
  face?: Partial<FaceSpec>;
  body?: Partial<BodySpec>;
}

export interface Persona {
  id: PersonaId;
  name: string;
  /** One-line description on the mirror card. */
  blurb: string;
  /** Short label used in the hairstyle name. */
  tag: string;
  /** Mirror card colour. */
  color: string;
  look: LookLayer;
  /** Signature hair treatment (colour, gel, spikes, curls) — lengths are left to the barber. */
  treat(h: HairState): void;
  /** The cut this persona needs, shown as a ghost outline. */
  target: Record<Zone, number>;
  wants: Wants;
  /** Said the moment the mirror flashes. */
  entrance: string[];
  /** Event line overrides while transformed. */
  lines: Record<string, string[]>;
  mirror: MirrorLines;
  specialLine: { line: string; mood: 'ecstatic' | 'happy' | 'shocked' | 'crying' | 'angry' };
  /** Customers who love / hate becoming this. */
  fans: CustomerId[];
  haters: CustomerId[];
  chaos: number;
  viewers: number;
}

const live = (h: HairState) => h.tufts.filter((t) => !t.bald && t.len > 1);

export const PERSONAS: Persona[] = [
  {
    id: 'tiktoker',
    name: 'Nữ TikToker Sang Chảnh',
    blurb: 'Nơ hồng to, kính đẩy lên đầu, môi căng, tóc bồng nhuộm hồng. Nói gì cũng “xỉu ngang”.',
    tag: 'Sang Chảnh',
    color: '#ff6fae',
    look: {
      shirt: '#ffe0ee',
      trim: '#ff86ba',
      hat: 'bow',
      sunglasses: 'onHead',
      glasses: false,
      earring: 'hoop',
      prop: 'ringLight',
      chain: false,
      tie: undefined,
      badge: false,
      face: { eyes: 'lashes', lips: '#ff4f8b', shadow: '#ffb3d9', cheeks: 'blush', sticker: 'heart', rest: 'smirk', mustache: undefined, beard: undefined, toothpick: false },
      body: { collar: 'blouse', idle: 'sway' },
    },
    treat(h) {
      live(h).forEach((t, i) => {
        if (i % 3 === 0) t.tint = '#ffb3d9';
        t.fluff = Math.max(t.fluff, 0.35);
      });
    },
    target: { left: 0.95, right: 0.95, top: 0.9, fringe: 0.6 },
    wants: { base: 82, zones: { left: 0.95, right: 0.95, top: 0.9, fringe: 0.6 }, zoneWeight: 110, penalties: { baldFrac: 180, choppiness: 30 }, bonuses: { fluffAvg: 20, tintedFrac: 25 } },
    entrance: ['Xỉu ngang! Đèn ring đâu, quay cho chị góc nghiêng thần thánh!', 'Ơ mai gót, sang chảnh xỉu!'],
    lines: {
      bald: ['Chết, mất content rồi! Cắt lại đi, chưa lên sóng mà!'],
      walkoutWarn: ['Chị unfollow tiệm này luôn đấy nhé!'],
      turnWarn: ['Đợi tí, chị chụp story cái đã!'],
      wrongTool: ['Cái này không có trong trend nha em.'],
      fixLoop: ['Em cắt kiểu này là bị flop đó.'],
    },
    mirror: {
      love: ['Sang. Chảnh. Xỉu. Lên xu hướng chắc luôn!', 'Góc nào cũng đẹp! Em là thợ ruột của chị!'],
      ok: ['Ổn áp, lên filter vào là ok.'],
      meh: ['Hơi bị… bình dân. Chị phải chỉnh app thôi.'],
      bad: ['Cái này mà đăng thì mất follow hết!'],
      disaster: ['Tắt live! TẮT LIVE NGAY!'],
    },
    specialLine: { line: 'Một triệu view! Không, MƯỜI triệu view! Sang chảnh tột đỉnh!', mood: 'ecstatic' },
    fans: ['na', 'linh', 'copycat', 'hoathan'],
    haters: ['bay', 'cutu', 'vosu'],
    chaos: 10,
    viewers: 160,
  },
  {
    id: 'giangho',
    name: 'Giang Hồ Mạng Phông Bạt',
    blurb: 'Áo hoa, dây chuyền vàng to bản, kính đen nhỏ, tăm xỉa răng. Nói to nhưng sợ kéo.',
    tag: 'Phông Bạt',
    color: '#3a3a3a',
    look: {
      shirt: '#e5322d',
      trim: '#ffd23f',
      chain: 'thick',
      sunglasses: 'small',
      glasses: false,
      earring: true,
      hat: undefined,
      tie: undefined,
      badge: false,
      redScarf: false,
      prop: undefined,
      face: { teeth: 'gold', toothpick: true, tattoo: true, rest: 'smirk', brows: 'angled', lips: undefined, sticker: undefined, chinMask: undefined },
      body: { collar: 'hawaii', shoulders: 1.22, idle: 'still' },
    },
    treat(h) {
      for (const t of live(h)) {
        if (t.zone === 'top' || t.zone === 'fringe') t.gel = 1;
      }
    },
    target: { left: 0.3, right: 0.3, top: 0.85, fringe: 0.45 },
    wants: { base: 84, zones: { left: 0.3, right: 0.3, top: 0.85, fringe: 0.45 }, zoneWeight: 140, penalties: { unevenLR: 70, baldFrac: 50 } },
    entrance: ['Đại ca khu này đây! …À mà em cắt nhẹ tay thôi nhé, anh sợ đau.', 'Biết anh là ai không? Anh là… khách quen thôi.'],
    lines: {
      bald: ['Ê ê! Anh… anh không giận đâu. Nhưng anh khóc đấy!'],
      walkoutWarn: ['Anh gọi hội anh em đến bây giờ! …Mà thôi hội bận.'],
      turnWarn: ['Khoan, có đứa nhìn đểu anh ngoài kia!'],
      wrongTool: ['Cái gì đấy?! Cất đi! Anh… anh không sợ. Cất đi!'],
      flinchWarn: ['Á! Nhẹ thôi! Anh là giang hồ chứ có phải siêu nhân đâu!'],
    },
    mirror: {
      love: ['Chuẩn đầu đại ca! Hai bên sát, trên bóng loáng. Anh tip!', 'Đầu này đi đâu cũng được nhường đường!'],
      ok: ['Được. Cũng có số má đấy.'],
      meh: ['Trông hơi… hiền. Giang hồ gì mà hiền thế.'],
      bad: ['Đầu này thì bị hội anh em cười cho.'],
      disaster: ['Anh… anh về mách mẹ!'],
    },
    specialLine: { line: 'Từ nay gọi anh là Đại Ca Hai Mái! Tiệm này anh bảo kê!', mood: 'ecstatic' },
    fans: ['ti', 'shipper', 'hoathan'],
    haters: ['vip', 'linh', 'phuc'],
    chaos: 14,
    viewers: 120,
  },
  {
    id: 'tocdung',
    name: 'Dân Chơi Tóc Dựng',
    blurb: 'Tóc dựng ngược nhuộm vàng chóe, áo khoác da đinh tán, tai nghe đeo cổ, nhún nhảy liên tục.',
    tag: 'Dựng Đứng',
    color: '#ffb000',
    look: {
      shirt: '#1d1d1d',
      trim: '#c9ced6',
      hat: 'headphones',
      earring: 'both',
      chain: true,
      sunglasses: false,
      glasses: false,
      tie: undefined,
      badge: false,
      redScarf: false,
      prop: undefined,
      face: { eyes: 'narrow', rest: 'smirk', brows: 'angled', lips: undefined, sticker: undefined, chinMask: undefined },
      body: { collar: 'jacket', idle: 'bounce' },
    },
    treat(h) {
      live(h).forEach((t, i) => {
        if (t.zone === 'top' || t.zone === 'fringe') {
          t.spiked = true;
          t.gel = 1;
          if (i % 2 === 0) t.tint = '#ffd23f';
        }
      });
    },
    target: { left: 0.45, right: 0.45, top: 1, fringe: 0.9 },
    wants: { base: 80, zones: { left: 0.45, right: 0.45, top: 1, fringe: 0.9 }, zoneWeight: 120, penalties: { baldFrac: 120 }, bonuses: { spikedFrac: 45, tintedFrac: 15 } },
    entrance: ['Tóc phải dựng! Dựng như ăng-ten bắt sóng wifi!', 'Lên nhạc! Tóc phải nhún theo nhịp!'],
    lines: {
      bald: ['Mất cột ăng-ten rồi! Mất sóng!'],
      walkoutWarn: ['Anh đi quẩy chỗ khác đây!'],
      turnWarn: ['Khoan, đoạn này drop nhạc hay!'],
      gelSpikes: ['Đúng rồi! Dựng nữa! Dựng nữa!'],
    },
    mirror: {
      love: ['Dựng đứng như cột thu lôi! Quẩy thôi!', 'Tóc này bắt được sóng 5G luôn!'],
      ok: ['Cũng dựng. Nhưng chưa đủ đô.'],
      meh: ['Tóc gì mà nằm im thế này? Dậy đi chứ!'],
      bad: ['Tóc xẹp như bánh đa nhúng nước!'],
      disaster: ['Tắt nhạc. Tắt hết. Anh buồn.'],
    },
    specialLine: { line: 'Tóc chọc thủng trần nhà luôn! Đỉnh của chóp!', mood: 'ecstatic' },
    fans: ['ti', 'teo', 'khoa', 'hoathan'],
    haters: ['phuc', 'cutu', 'linh'],
    chaos: 12,
    viewers: 140,
  },
  {
    id: 'idol',
    name: 'Idol Livestream',
    blurb: 'Tai nghe có mic, tai mèo, áo hoodie pastel, mắt long lanh. Cảm ơn quà tặng liên tục.',
    tag: 'Idol',
    color: '#8f6bff',
    look: {
      shirt: '#c7b8ff',
      trim: '#ffffff',
      hat: 'catEars',
      glasses: false,
      sunglasses: false,
      earring: false,
      chain: false,
      tie: undefined,
      badge: false,
      redScarf: false,
      prop: 'phoneStick',
      bluetooth: true,
      face: { eyes: 'big', cheeks: 'blush', sticker: 'star', rest: 'open', lips: '#ff8fb0', toothpick: false, mustache: undefined, beard: undefined, chinMask: undefined },
      body: { collar: 'hoodie', idle: 'sway' },
    },
    treat(h) {
      live(h).forEach((t, i) => {
        t.tint = i % 2 === 0 ? '#c7a6ff' : '#9fd8ff';
        t.fluff = Math.max(t.fluff, 0.2);
      });
    },
    target: { left: 0.7, right: 0.7, top: 0.8, fringe: 0.85 },
    wants: { base: 82, zones: { left: 0.7, right: 0.7, top: 0.8, fringe: 0.85 }, zoneWeight: 120, penalties: { baldFrac: 160, choppiness: 50 }, bonuses: { tintedFrac: 15 } },
    entrance: ['Chào cả nhà iu! Hôm nay idol đổi kiểu tóc nè!', 'Cảm ơn bạn Kẹo Mút đã tặng một chiếc tên lửa!'],
    lines: {
      bald: ['Ối cả nhà ơi tắt cam! Tắt cam giùm idol!'],
      walkoutWarn: ['Idol đi off live đây, bye cả nhà!'],
      turnWarn: ['Khoan, đọc bình luận cái đã!'],
      sneezeWarn: ['Hắt… cả nhà đừng chụp màn hình nha!'],
    },
    mirror: {
      love: ['Cả nhà ơi thả tim đi! Idol đẹp chưa nè!', 'Tóc này lên top donate luôn!'],
      ok: ['Ổn nè, cả nhà cho xin cái tim.'],
      meh: ['Cả nhà ơi… idol vẫn đáng yêu mà, đúng không?'],
      bad: ['Bình luận đang chửi idol… huhu.'],
      disaster: ['Idol xin phép nghỉ live một tháng.'],
    },
    specialLine: { line: 'Mắt chữ A mồm chữ O! Cả nhà ơi idol lên top một!', mood: 'ecstatic' },
    fans: ['na', 'copycat', 'teo', 'hoathan'],
    haters: ['vosu', 'bay', 'shipper'],
    chaos: 8,
    viewers: 260,
  },
  {
    id: 'daigia',
    name: 'Đại Gia Thích Thể Hiện',
    blurb: 'Vest trắng, nơ đỏ, kính gọng vàng, quạt tiền đồ chơi phe phẩy. Tóc vuốt keo bóng như gương.',
    tag: 'Đại Gia',
    color: '#d4af37',
    look: {
      shirt: '#f7f2e4',
      trim: '#f7f2e4',
      bowTie: '#c0143c',
      sunglasses: true,
      glasses: false,
      chain: 'thick',
      earring: false,
      hat: undefined,
      tie: undefined,
      badge: false,
      redScarf: false,
      prop: 'moneyFan',
      face: { teeth: 'gold', mustache: 'pencil', facialHair: '#2a1d17', rest: 'smirk', lips: undefined, sticker: undefined, chinMask: undefined },
      body: { collar: 'suit', shoulders: 1.15, belly: 0.7, idle: 'still' },
    },
    treat(h) {
      live(h).forEach((t, i) => {
        t.gel = 1;
        t.fluff = 0;
        if (i % 5 === 0) t.tint = '#e6b422';
      });
    },
    target: { left: 0.55, right: 0.55, top: 0.75, fringe: 0.3 },
    wants: { base: 84, zones: { left: 0.55, right: 0.55, top: 0.75, fringe: 0.3 }, zoneWeight: 130, penalties: { baldFrac: 140, choppiness: 70, fluffAvg: 40, unevenLR: 40 } },
    entrance: ['Cắt cho anh kiểu nào nhìn thấy ngay là… có điều kiện!', 'Tiền không thành vấn đề. Vấn đề là phải bóng!'],
    lines: {
      bald: ['Anh trả tiền để có tóc chứ không phải để mất tóc!'],
      walkoutWarn: ['Anh mua luôn tiệm khác bây giờ!'],
      turnWarn: ['Khoan, để anh khoe đồng hồ với người ngoài kia.'],
      wrongTool: ['Đồ rẻ tiền! …Mà bao nhiêu một cái, anh mua.'],
    },
    mirror: {
      love: ['Bóng! Bóng như sàn nhà anh! Tip gấp đôi!', 'Đầu này đi họp hội đồng quản trị được!'],
      ok: ['Tạm được. Thêm tí keo nữa thì đắt.'],
      meh: ['Trông hơi… tiết kiệm.'],
      bad: ['Tóc này nhìn như đang nợ ngân hàng!'],
      disaster: ['Anh phá sản về tinh thần rồi!'],
    },
    specialLine: { line: 'Đầu bóng tới mức soi gương không cần gương! Thưởng nóng!', mood: 'ecstatic' },
    fans: ['vip', 'bay', 'hoathan'],
    haters: ['shipper', 'teo', 'khoa'],
    chaos: 10,
    viewers: 100,
  },
  {
    id: 'hongbien',
    name: 'Cô Tám Hóng Biến',
    blurb: 'Lô cuốn đầy đầu, đồ bộ hoa, quạt nan phe phẩy, khẩu trang kéo cằm. Chuyện gì cũng biết trước.',
    tag: 'Hóng Biến',
    color: '#2fa84f',
    look: {
      shirt: '#ffb3c7',
      trim: '#e5322d',
      hat: 'curlers',
      glasses: false,
      sunglasses: false,
      chain: false,
      earring: true,
      tie: undefined,
      badge: false,
      redScarf: false,
      prop: 'fan',
      face: { lips: '#d6336c', brows: 'thick', browColor: '#3a1d10', chinMask: '#bfe3f5', rest: 'open', mole: true, toothpick: false, sticker: undefined },
      body: { collar: 'pajama', idle: 'sway' },
    },
    treat(h) {
      for (const t of live(h)) {
        t.curl = 0.22;
        t.fluff = Math.max(t.fluff, 0.45);
      }
    },
    target: { left: 0.85, right: 0.85, top: 0.85, fringe: 0.7 },
    wants: { base: 80, zones: { left: 0.85, right: 0.85, top: 0.85, fringe: 0.7 }, zoneWeight: 100, penalties: { baldFrac: 150 }, bonuses: { curlAvg: 60, fluffAvg: 20 } },
    entrance: ['Ê nghe gì chưa? Nhà đầu ngõ vừa mua cái tủ lạnh ba cánh!', 'Cắt thì cắt, nhưng cho cô hóng nốt chuyện bên kia đường đã.'],
    lines: {
      bald: ['Thôi xong, mai cả xóm biết cô hói!'],
      walkoutWarn: ['Cô đi hóng tiệm bên cạnh đây!'],
      turnWarn: ['Khoan! Có biến ngoài cửa!'],
      sneezeWarn: ['Hắt… ối, ai vừa nhắc cô thế?'],
    },
    mirror: {
      love: ['Xoăn bồng thế này cả xóm phải hỏi thăm!', 'Ra chợ là thành tâm điểm hóng biến!'],
      ok: ['Được. Để cô đi khoe bà Bảy.'],
      meh: ['Hơi thẳng. Cô thích xoăn tít cơ.'],
      bad: ['Đầu này mà ra chợ thì thành biến luôn!'],
      disaster: ['Mai cả phường bàn về cái đầu này!'],
    },
    specialLine: { line: 'Biến lớn! Cô Tám có kiểu tóc đẹp nhất phường!', mood: 'ecstatic' },
    fans: ['vip', 'cutu', 'hoathan'],
    haters: ['khoa', 'linh', 'ti'],
    chaos: 9,
    viewers: 110,
  },
];

export const PERSONA_IDS = PERSONAS.map((p) => p.id);

export function personaById(id: string | null | undefined): Persona | null {
  return PERSONAS.find((p) => p.id === id) ?? null;
}

/** Puts the persona's look layer on top of the customer's own (their face shape stays theirs). */
export function applyLook(base: CustomerLook, layer: LookLayer): CustomerLook {
  const { face, body, ...rest } = layer;
  return {
    ...base,
    ...rest,
    face: { ...(base.face ?? {}), ...(face ?? {}) },
    body: { ...(base.body ?? {}), ...(body ?? {}) },
  };
}

/** How the customer feels about becoming this persona. */
export function affinity(p: Persona, id: CustomerId): 'fan' | 'hater' | 'neutral' {
  if (p.fans.includes(id)) return 'fan';
  if (p.haters.includes(id)) return 'hater';
  return 'neutral';
}

/** 0..100: how well a finished cut fits the persona. */
export function personaFit(p: Persona, m: HairMetrics, ctx?: SatisfactionCtx): number {
  return fromWants(p.wants)(m, ctx);
}

/**
 * The customer as they sit after the mirror: same person and behaviours, persona look,
 * persona lines and a verdict that mixes their own taste with the persona's.
 * A customer who came in asking for a persona (wantPersona) judges only by that.
 */
export function transformCustomer(base: CustomerDef, p: Persona, wantPersona: PersonaId | null, mood?: 'fan' | 'hater' | 'neutral'): CustomerDef {
  const aff = mood ?? affinity(p, base.id);
  const own = base.satisfaction;
  return {
    ...base,
    look: applyLook(base.look, p.look),
    lines: { ...(base.lines ?? {}), ...p.lines },
    mirror: p.mirror,
    specialLine: p.specialLine,
    target: p.target,
    satisfaction(m, ctx) {
      const fit = personaFit(p, m, ctx);
      if (wantPersona) return wantPersona === p.id ? fit : clamp(fit * 0.4, 0, 100);
      const mood = aff === 'fan' ? 15 : aff === 'hater' ? -25 : 0;
      return clamp(own(m, ctx) * 0.5 + fit * 0.5 + mood, 0, 100);
    },
    special: (m, sat) => sat >= 88 && personaFit(p, m) >= 85,
  };
}
