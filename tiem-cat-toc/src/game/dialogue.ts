import { Personality } from './customers';
import { Zone } from './hair';
import { Rng, pick } from './rng';

/**
 * Every line here is chosen by a rule (personality × situation), never at random from
 * one global list. Randomness only picks between equivalent phrasings.
 */

export const ZONE_LABEL: Record<Zone, string> = {
  left: 'bên trái',
  right: 'bên phải',
  top: 'phía trên',
  fringe: 'cái mái',
};

/** Chaos tier lines, said once when chaos climbs into a tier. */
export const TIER_LINES: Record<Personality, string[][]> = {
  loyal: [
    [],
    ['Em ơi… ảnh mẫu đây nhé, em nhìn kỹ chưa?', 'Hình như hơi khác ảnh rồi đấy em.'],
    ['Em học cắt tóc ở đâu thế?', 'Anh bắt đầu thấy không giống ảnh lắm…'],
    ['ẢNH MẪU ĐÂY! EM NHÌN ĐI!', 'Anh xin lại cái ảnh của anh được không?'],
  ],
  picky: [
    [],
    ['Này, cẩn thận đấy.', 'Chú cắt ở đây 20 năm rồi nhé.'],
    ['Thằng bé này mới vào nghề à?', 'Hồi xưa bố cháu cắt có thế này đâu.'],
    ['Thôi thôi thôi! Dừng tay!', 'Chú mà về thế này bà nhà cho ngủ ngoài hiên!'],
  ],
  dramatic: [
    [],
    ['Ơ… ổn không em?', 'Anh tin em mà. Chắc thế.'],
    ['Tim anh đập nhanh quá…', 'Đây là thử thách của vũ trụ đúng không?'],
    ['ANH KHÔNG THỞ ĐƯỢC!', 'Người yêu cũ mà thấy chắc cười cả năm!'],
  ],
};

export function tierLine(rng: Rng, p: Personality, tier: number): string | null {
  const pool = TIER_LINES[p][tier];
  return pool && pool.length ? pick(rng, pool) : null;
}

export type EventLineKey =
  | 'bald'
  | 'baldAgain'
  | 'combOver'
  | 'gelSpikes'
  | 'turnWarn'
  | 'turnStray'
  | 'turnSafe'
  | 'fixLoop'
  | 'ruin'
  | 'sneezeWarn'
  | 'sneeze'
  | 'walkoutWarn'
  | 'begAccepted'
  | 'walkout'
  | 'wrongTool'
  | 'hotDryer'
  | 'flinchWarn';

export const EVENT_LINES: Record<EventLineKey, Record<Personality, string[]>> = {
  bald: {
    loyal: ['…Ơ? Sao đầu anh mát mát?', 'Trong ảnh làm gì có chỗ đó trọc hả em?'],
    picky: ['…Cái gì vừa mát lạnh trên đầu chú thế?', 'Chú bảo TỈA. NHẸ.'],
    dramatic: ['…Em vừa làm gì vậy?', 'Anh nghe thấy tiếng gì đó vừa ra đi…'],
  },
  baldAgain: {
    loyal: ['Lại mát nữa à em?!', 'Ảnh mẫu có MỘT kiểu thôi mà em!'],
    picky: ['Lại nữa?!', 'Cháu định khai hoang cả cái đầu chú à?'],
    dramatic: ['Lại… lại nữa…', 'Anh mất thêm một phần ký ức rồi.'],
  },
  combOver: {
    loyal: ['Em đang… giấu cái gì trên đầu anh đấy?', 'Sao tóc anh chạy hết sang một bên thế?'],
    picky: ['Vuốt sang thế kia là định che cái gì?', 'Đừng tưởng chú không biết nhé!'],
    dramatic: ['Tóc anh đang bỏ chạy à?', 'Ơ kìa, tóc anh đi đâu hết rồi?'],
  },
  gelSpikes: {
    loyal: ['Ảnh mẫu đâu có dựng đứng thế này?!', 'Ơ… anh bị điện giật à?'],
    picky: ['Chú đi cắt tóc, không phải đi biểu diễn ca nhạc!', 'Dầu bóng của chú! Nó cứng như đinh rồi!'],
    dramatic: ['ĐÚNG RỒI! Thổi nữa đi em!', 'Đây! Đây là con người mới của anh!'],
  },
  turnWarn: {
    loyal: ['Khoan, để anh xem lại ảnh…', 'Ơ ai gọi anh đấy?'],
    picky: ['Để chú ngó cái xem nào…', 'Cái quạt kia kêu gì thế?'],
    dramatic: ['Hình như người yêu cũ đi ngang qua!', 'Khoan, tin nhắn!'],
  },
  turnStray: {
    loyal: ['Ơ… vừa rồi là anh quay hay em cắt?', 'Cái đường gì vừa chạy qua đầu anh thế?'],
    picky: ['Cháu đẩy tông đơ vào đầu chú à?!', 'Ai bảo cắt lúc chú đang quay?!'],
    dramatic: ['Anh chỉ quay có một giây thôi mà!!', 'Số phận… thật tàn nhẫn.'],
  },
  turnSafe: {
    loyal: ['Ừ, ngồi yên đây. Em cắt tiếp đi.'],
    picky: ['Hừm. Biết dừng tay đấy.'],
    dramatic: ['Không phải cô ấy. Cắt tiếp đi em.'],
  },
  fixLoop: {
    loyal: ['Sửa mãi chỗ đó vậy em? Trong ảnh có thế đâu.', 'Chỗ đó giờ ngắn hơn cả ảnh rồi!'],
    picky: ['Sửa nữa là chỗ đó thành sân bay đấy cháu.', 'Cháu cắt một chỗ hay cắt cả đời ở đó?'],
    dramatic: ['Em đang khắc chữ lên đầu anh à?', 'Chỗ đó… còn gì nữa đâu em…'],
  },
  ruin: {
    loyal: ['Vừa nãy đang giống ảnh lắm cơ mà!', 'Sao tự nhiên lại khác ảnh thế?'],
    picky: ['Vừa nãy đẹp rồi! Ai bảo cắt thêm?!', 'Đang yên đang lành!'],
    dramatic: ['Vừa nãy anh còn định chụp ảnh…', 'Em vừa phá hủy tương lai của anh.'],
  },
  sneezeWarn: {
    loyal: ['Hắt… hắt…', 'Tóc… bay vào mũi… hắt…'],
    picky: ['Hắt… cái máy sấy… hắt…', 'Ác… ác… ÁCH…'],
    dramatic: ['Hắt… anh… sắp…', 'Tóc vụn… vào mũi… hắt…'],
  },
  sneeze: {
    loyal: ['HẮT XÌ!!!'],
    picky: ['HẮT XÌÌÌ!!!'],
    dramatic: ['HẮT XÌ!!! …Xin lỗi.'],
  },
  walkoutWarn: {
    loyal: ['Thôi… anh về đây.', 'Anh nghĩ mình nên dừng ở đây.'],
    picky: ['Thôi! Chú về!', 'Đủ rồi! Đưa khăn đây chú về!'],
    dramatic: ['Anh… anh cần không khí!', 'Anh phải ra ngoài một lúc!'],
  },
  begAccepted: {
    loyal: ['…Được rồi. Nhưng nhìn ảnh vào đấy.'],
    picky: ['Hừ. Lần này nữa thôi đấy.'],
    dramatic: ['Được… anh sẽ mạnh mẽ.'],
  },
  walkout: {
    loyal: ['Anh đi tìm tiệm khác giống ảnh hơn!'],
    picky: ['20 năm! 20 năm chú cắt ở đây!'],
    dramatic: ['Người yêu cũ ơi… anh xin lỗi vì đã ra ngoài thế này!'],
  },
  wrongTool: {
    loyal: ['Ơ, tông đơ á? Trên đầu thì để dài mà!', 'Cẩn thận phía trên đấy nhé!'],
    picky: ['Tông đơ?! Chú bảo TỈA NHẸ cơ mà!', 'Cất ngay cái tông đơ đấy đi!'],
    dramatic: ['ĐỪNG! Tông đơ là tội ác!', 'Cái máy đó kêu đáng sợ quá!'],
  },
  hotDryer: {
    loyal: ['Nóng! Nóng đầu anh!', 'Chỗ đó không còn tóc đâu mà sấy!'],
    picky: ['NÓNG! Cháu sấy da đầu chú à?!', 'Sấy chỗ trọc làm gì?!'],
    dramatic: ['Nóng quá! Như tình cũ!', 'Da đầu anh đang khóc!'],
  },
  flinchWarn: {
    loyal: ['Ơ ơ…'],
    picky: ['Ơ ơ…'],
    dramatic: ['Ơ ơ ơ… ANH SỢ!', 'Khoan khoan khoan!', 'Nhiều quá! Nhiều quá rồi!'],
  },
};

/** Generic lines for behaviour events, used when a customer has no line of their own. */
export const GENERIC: Record<string, string[]> = {
  sleepy: ['Khò… khò…'],
  startle: ['Hả?! Gì đấy?!'],
  flexWarn: ['Xem này!'],
  phone: ['Alo? Alo?'],
  duckWarn: ['Suỵt!'],
  chop: ['Hây-ya!'],
  dogFearWarn: ['Ư ử…'],
  dogShake: ['Rũ rũ rũ!'],
  dogSniff: ['Khịt khịt…'],
  dogHappy: ['Gâu!'],
  deadline: ['Nhanh lên em ơi!'],
  boring: ['Chán quá…'],
  growRace: ['Sao càng cắt càng dài thế?!', 'Tóc tôi chứ có phải cỏ đâu mà mọc nhanh vậy!'],
  concreteSpikes: ['Tóc tôi chứ có phải cột ăng-ten đâu!', 'Gõ vào đầu nghe cốc cốc luôn!'],
  autoMisread: ['Ơ, tôi đâu có yêu cầu kiểu này?!', 'Cái máy nghe ai nói thế?!'],
  malfunction: ['Ối! Cái máy bị làm sao thế?!', 'Máy giật! Máy giật!'],
};

export function eventLine(rng: Rng, key: EventLineKey | string, p: Personality): string {
  const pool = EVENT_LINES[key as EventLineKey]?.[p] ?? MAGIC_LINES[key as MagicLineKey]?.[p] ?? GENERIC[key];
  return pool?.length ? pick(rng, pool) : '…';
}

export const PHOTO_LINES = {
  bald: ['Trong ảnh… không có cái lỗ nào như thế này.', 'Anh phóng to ảnh rồi, không thấy chỗ trọc nào cả.'],
  topShort: ['Ơ, anh bảo đừng ngắn quá cơ mà!', 'Phía trên trong ảnh còn dài mà em!'],
  sidesLong: ['Hai bên trong ảnh ngắn hơn nhiều mà em.', 'Hai bên này, nhìn ảnh này, ngắn tũn!'],
  uneven: ['Ảnh mẫu hai bên bằng nhau nhé em.'],
  almost: ['Hai bên ngắn thêm tí nữa… nhưng đừng ngắn quá.'],
  good: ['Ừ… giống rồi đấy. Mà hình như ảnh này chụp nghiêng.', 'Giống! Giống tám mươi phần trăm! Mà chắc tại góc chụp.'],
};

/** Tuấn checks the reference photo. The line depends on what the hair looks like right now. */
export function photoLine(rng: Rng, zone: Record<Zone, number>, target: Record<Zone, number>, bald: boolean): string {
  if (bald) return pick(rng, PHOTO_LINES.bald);
  const sides = (zone.left + zone.right) / 2;
  if (zone.top < target.top - 0.2) return pick(rng, PHOTO_LINES.topShort);
  if (sides > target.left + 0.35) return pick(rng, PHOTO_LINES.sidesLong);
  if (Math.abs(zone.left - zone.right) > 0.25) return PHOTO_LINES.uneven[0];
  if (sides > target.left + 0.12) return PHOTO_LINES.almost[0];
  return pick(rng, PHOTO_LINES.good);
}

export const DEMAND_FIRST = ['Này, {z} còn dài hơn đấy. Sửa tí.', 'Ơ, {z} dài hơn rồi. Tỉa thêm tí.'];
export const DEMAND_AGAIN = ['Giờ {z} lại dài hơn rồi. Sửa tiếp.', 'Ừ… mà giờ {z} lệch. Tí nữa thôi.', 'Thế là {z} lại dài nhất rồi. Cháu thấy chưa?', 'Chú nói thật, {z} vẫn chưa ổn.'];
export const DEMAND_IGNORED = ['Chú nói mà cháu không nghe à?', 'Cháu có nghe chú nói không đấy?', 'Đấy, đấy, cái chỗ chú bảo ấy!'];
export const DEMAND_MET = ['Ừ. Được.', 'Ừ… thế được.', 'Tạm.'];

export function demandLine(rng: Rng, zone: Zone, n: number): string {
  return pick(rng, n === 0 ? DEMAND_FIRST : DEMAND_AGAIN).replace('{z}', ZONE_LABEL[zone]);
}

export function demandIgnored(rng: Rng): string {
  return pick(rng, DEMAND_IGNORED);
}

export function demandMet(rng: Rng): string {
  return pick(rng, DEMAND_MET);
}

/* ------------------------------------------------------------------ Bộ Đồ Nghề Bất Ổn */

export type MagicLineKey =
  | 'first_wand'
  | 'first_ray'
  | 'first_storm'
  | 'first_vacuum'
  | 'first_comb'
  | 'first_cooker'
  | 'regrow'
  | 'wandGiant'
  | 'cooked'
  | 'vacuumGulp'
  | 'comboStormLong'
  | 'comboSculpt'
  | 'comboPotSuck';

export const MAGIC_LINES: Record<MagicLineKey, Record<Personality, string[]>> = {
  first_wand: {
    loyal: ['Ơ… cái gậy gì phát sáng thế em? Trong ảnh không có.', 'Gậy đấy cắt tóc được à?'],
    picky: ['Gậy phép? Cháu tưởng chú là trẻ con à?', 'Hai mươi năm chưa thấy ai cắt bằng gậy.'],
    dramatic: ['Gậy phép thuật! Đúng là định mệnh!', 'Biến anh thành người mới đi em!'],
  },
  first_ray: {
    loyal: ['ĐÓ LÀ SÚNG À?!', 'Em ơi, ảnh mẫu không có tia laze!'],
    picky: ['Cháu chĩa cái gì vào đầu chú thế?!', 'Súng?! Ở tiệm cắt tóc?!'],
    dramatic: ['Bắn đi em! Bắn vào quá khứ của anh!', 'Pằng! Anh thấy mình tỏa sáng!'],
  },
  first_storm: {
    loyal: ['Gió gì mà mạnh thế em?!', 'Anh bay mất kính bây giờ!'],
    picky: ['Cái quạt này mua ở đâu mà như bão thế?!', 'Ối giời, mái tóc của chú!'],
    dramatic: ['Gió ơi, thổi bay nỗi buồn của anh đi!', 'Đẹp như trong MV!'],
  },
  first_vacuum: {
    loyal: ['Máy hút bụi?! Em định hút gì của anh?', 'Ơ, nó kêu to quá!'],
    picky: ['Hút cái gì? Chú còn chưa rụng sợi nào!', 'Cái máy này hút cả hồn chú mất!'],
    dramatic: ['Hút hết ký ức về cô ấy đi em!', 'Anh nghe thấy tiếng vũ trụ…'],
  },
  first_comb: {
    loyal: ['Lược có hình con rồng à? Ảnh mẫu đâu cần rồng.', 'Chải nhẹ thôi em.'],
    picky: ['Lược rồng? Thời chú dùng lược sừng thôi.', 'Chải kiểu gì mà nghe tiếng gầm thế?'],
    dramatic: ['Lược rồng! Anh là rồng!', 'Chải cho anh thành truyền thuyết!'],
  },
  first_cooker: {
    loyal: ['Ơ… nồi cơm? Úp lên đầu anh làm gì?!', 'Anh không phải nồi xôi!'],
    picky: ['Cháu úp nồi cơm lên đầu chú à?!', 'Nồi này nhà chú cũng có, đừng có lừa!'],
    dramatic: ['Hấp anh đi! Hấp cho chín chắn!', 'Ấm quá… như vòng tay cũ…'],
  },
  regrow: {
    loyal: ['Ơ… tóc anh vừa… mọc lại?!', 'Chỗ trọc lúc nãy đâu rồi?!'],
    picky: ['Mọc lại? Thế sao lúc nãy cháu cạo?!', 'Phép thuật gì mà mọc nhanh hơn rau muống!'],
    dramatic: ['Tóc anh tái sinh! Như anh vậy!', 'Phép màu có thật!'],
  },
  wandGiant: {
    loyal: ['Sao tóc anh dài hơn lúc vào?!', 'Ảnh mẫu là tóc NGẮN mà em!'],
    picky: ['Chú vào để cắt ngắn, sao giờ dài như chổi?!', 'Tóc mọc như nấm sau mưa thế này!'],
    dramatic: ['DÀI NỮA! Dài như nỗi nhớ!', 'Anh có tóc như ca sĩ rồi!'],
  },
  cooked: {
    loyal: ['Sao đầu anh tròn vo như cái bánh bao?!', 'Ảnh mẫu đâu có… hấp chín!'],
    picky: ['Đầu chú thơm mùi cơm!', 'Cháu hấp tóc chú như hấp xôi à?!'],
    dramatic: ['Mềm mại! Tròn trịa! Anh thích!', 'Tóc anh phồng như hy vọng!'],
  },
  vacuumGulp: {
    loyal: ['…Máy vừa nuốt một miếng tóc của anh à?', 'Cái lỗ trên đầu anh là sao em?!'],
    picky: ['MÁY HÚT ĂN TÓC CHÚ RỒI!', 'Trả tóc cho chú!'],
    dramatic: ['Một phần của anh đã bay vào vũ trụ…', 'Tóc anh đi tìm tự do rồi.'],
  },
  comboStormLong: {
    loyal: ['TÓC ANH VỪA CẤT CÁNH!', 'Ảnh mẫu không có cảnh bão!'],
    picky: ['Tóc chú bay ra tận ngoài đường rồi!', 'Bão cấp 12 trên đầu chú!'],
    dramatic: ['ĐÚNG RỒI! ANH LÀ CƠN BÃO!', 'Tóc anh tung bay như phim Hồng Kông!'],
  },
  comboSculpt: {
    loyal: ['Sao trên đầu anh có… cái sừng bảy màu?!', 'Em nặn tóc anh thành gì thế này?!'],
    picky: ['Chú thành con kỳ lân rồi! Bà nhà thấy thì sao?!', 'Cái gì nhọn hoắt trên đầu chú thế?!'],
    dramatic: ['KỲ LÂN! Anh là kỳ lân duy nhất!', 'Tác phẩm nghệ thuật! Cô ấy phải hối hận!'],
  },
  comboPotSuck: {
    loyal: ['Cái bánh bao trên đầu anh… đi đâu rồi?!', 'Em hút luôn cả… cả kiểu tóc!'],
    picky: ['HÚT CẢ NỒI À?!', 'Vừa hấp xong đã hút sạch! Chú là cái nồi à?!'],
    dramatic: ['Không… tóc anh… vào lỗ đen rồi…', 'Mất hết rồi! Như cuộc tình của anh!'],
  },
};

export function magicLine(rng: Rng, key: MagicLineKey, p: Personality): string {
  return pick(rng, MAGIC_LINES[key][p]);
}

/* ------------------------------------------------------------------ fallback lines */

/**
 * Fallback lines for customers who don't override an event. The classic three use the
 * personality tables above (written for them); everyone else uses these neutral lines
 * (self: "tôi", no age-specific way of addressing the barber), and Cậu Vàng uses DOG.
 */
export const NEUTRAL: Record<string, string[]> = {
  bald: ['…Sao đầu tôi tự nhiên mát thế?', 'Cái chỗ vừa rồi… còn tóc không đấy?'],
  baldAgain: ['Lại mát nữa?!', 'Thêm một chỗ nữa à?!'],
  combOver: ['Đang giấu cái gì trên đầu tôi đấy?', 'Sao tóc tôi chạy hết sang một bên thế?'],
  gelSpikes: ['Tóc tôi chứ có phải cánh quạt đâu!', 'Ơ, sao nó dựng đứng hết lên thế này?!'],
  turnWarn: ['Khoan, để tôi xem cái…', 'Ơ, ai gọi tôi đấy?'],
  turnStray: ['Tôi quay có một giây thôi mà!', 'Cái đường gì vừa chạy qua đầu tôi thế?'],
  turnSafe: ['Rồi, cắt tiếp đi.'],
  fixLoop: ['Sửa mãi một chỗ thế, còn gì nữa đâu?', 'Chỗ đó giờ ngắn nhất đầu rồi!'],
  ruin: ['Vừa nãy đang đẹp mà!', 'Đang yên đang lành, cắt thêm làm gì?!'],
  sneezeWarn: ['Hắt… hắt…', 'Tóc vụn… bay vào mũi… hắt…'],
  sneeze: ['HẮT XÌ!!!'],
  walkoutWarn: ['Thôi, tôi về đây!', 'Đủ rồi, tôi đi tiệm khác!'],
  begAccepted: ['Thôi được, lần cuối đấy.'],
  walkout: ['Tôi không bao giờ quay lại đây nữa!'],
  wrongTool: ['Ông cắt tóc hay ông đang trả thù tôi thế?', 'Cái máy đấy dùng cho tóc người à?!'],
  hotDryer: ['Nóng! Nóng đầu tôi!', 'Sấy chỗ không có tóc làm gì?!'],
  flinchWarn: ['Ơ ơ… từ từ!'],
  first_wand: ['Cái gậy gì phát sáng thế kia?', 'Cắt tóc bằng gậy à?'],
  first_ray: ['Súng?! Ở tiệm cắt tóc?!', 'Chĩa cái gì vào đầu tôi thế?!'],
  first_storm: ['Gió gì mà như bão thế này?!'],
  first_vacuum: ['Máy hút bụi?! Định hút gì của tôi?'],
  first_comb: ['Lược gì mà có cả đầu rồng thế?'],
  first_cooker: ['Úp nồi cơm lên đầu tôi làm gì?!'],
  regrow: ['Ơ… tóc vừa mọc lại à?!'],
  wandGiant: ['Sao tóc tôi dài hơn lúc vào thế này?!'],
  cooked: ['Sao đầu tôi tròn như cái bánh bao thế?!'],
  vacuumGulp: ['Cái máy vừa nuốt mất một miếng tóc của tôi à?!'],
  comboStormLong: ['Tóc tôi vừa cất cánh!'],
  comboSculpt: ['Trên đầu tôi có cái sừng bảy màu?!'],
  comboPotSuck: ['Hút cả nồi à?! Tóc tôi đâu rồi?!'],
  tier1: ['Ổn không đấy?', 'Từ từ thôi nhé.'],
  tier2: ['Tôi bắt đầu thấy lo rồi đấy.', 'Có chắc là biết cắt không?'],
  tier3: ['Dừng tay! Dừng tay ngay!', 'Tôi bảo đẹp trai chứ có bảo biến thành cái chổi đâu!'],
};

export const DOG: string[] = ['Gâu gâu!', 'Ẳng!', 'Grừ…', 'Ư ử…'];

export const DOG_LINES: Record<string, string[]> = {
  baldAgain: ['Ẳng ẳng! (Bà Hai: “Lại trọc thêm một mảng à cháu?!”)'],
  combOver: ['Gâu? (Bà Hai: “Cháu chải lông nó sang một bên làm gì thế?”)'],
  gelSpikes: ['Gâu gâu! (Bà Hai: “Ơ kìa, Cậu Vàng thành con nhím rồi!”)'],
  turnWarn: ['Gâu! (ngó ra cửa)'],
  turnStray: ['Ẳng! (Bà Hai: “Nó quay có tí mà cháu cắt lẹm vào rồi!”)'],
  fixLoop: ['Grừ… (Bà Hai: “Cháu cắt mãi một chỗ, nó cáu đấy.”)'],
  ruin: ['Gâu… (Bà Hai: “Lúc nãy đẹp rồi mà cháu!”)'],
  sneezeWarn: ['Khịt… khịt…'],
  sneeze: ['HẮT XÌ! (Cậu Vàng hắt hơi tung cả lông)'],
  wrongTool: ['Ẳng ẳng! (Bà Hai: “Cái máy đấy làm nó sợ chết khiếp!”)'],
  hotDryer: ['Ẳng! (Bà Hai: “Nóng nó đấy cháu ơi!”)'],
  first_wand: ['Gâu? (ngửi ngửi cây gậy)'],
  first_ray: ['GÂU GÂU GÂU! (sủa vào khẩu súng)'],
  first_storm: ['Gâu! (vểnh tai đón gió)'],
  first_cooker: ['Ư ử… (Bà Hai: “Nồi cơm nhà bà mà cháu úp lên đầu nó à?”)'],
  regrow: ['Gâu! (Bà Hai: “Lông nó mọc lại rồi kìa!”)'],
  wandGiant: ['Gâu gâu! (Bà Hai: “Sao lông nó dài như chó Nhật thế này?!”)'],
  cooked: ['Gâu! (Bà Hai: “Cậu Vàng thành cục bông rồi!”)'],
  comboStormLong: ['GÂU! (Bà Hai: “Lông nó bay như cờ phướn!”)'],
  tier3: ['Gâu gâu gâu! (Cậu Vàng định nhảy khỏi ghế)'],
};

export function fallbackLine(rng: Rng, key: string, style: 'neutral' | 'dog'): string {
  if (style === 'dog') return pick(rng, DOG_LINES[key] ?? GENERIC_DOG(key));
  const pool = NEUTRAL[key] ?? GENERIC[key];
  return pool?.length ? pick(rng, pool) : '…';
}

function GENERIC_DOG(key: string): string[] {
  if (key.startsWith('first_')) return ['Gâu?'];
  return DOG;
}
