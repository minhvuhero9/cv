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
const TIER_LINES: Record<Personality, string[][]> = {
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

const EVENT_LINES: Record<EventLineKey, Record<Personality, string[]>> = {
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

export function eventLine(rng: Rng, key: EventLineKey, p: Personality): string {
  return pick(rng, EVENT_LINES[key][p]);
}

/** Tuấn checks the reference photo. The line depends on what the hair looks like right now. */
export function photoLine(rng: Rng, zone: Record<Zone, number>, target: Record<Zone, number>, bald: boolean): string {
  if (bald) return pick(rng, ['Trong ảnh… không có cái lỗ nào như thế này.', 'Anh phóng to ảnh rồi, không thấy chỗ trọc nào cả.']);
  const sides = (zone.left + zone.right) / 2;
  if (zone.top < target.top - 0.2) return pick(rng, ['Ơ, anh bảo đừng ngắn quá cơ mà!', 'Phía trên trong ảnh còn dài mà em!']);
  if (sides > target.left + 0.35) return pick(rng, ['Hai bên trong ảnh ngắn hơn nhiều mà em.', 'Hai bên này, nhìn ảnh này, ngắn tũn!']);
  if (Math.abs(zone.left - zone.right) > 0.25) return 'Ảnh mẫu hai bên bằng nhau nhé em.';
  if (sides > target.left + 0.12) return 'Hai bên ngắn thêm tí nữa… nhưng đừng ngắn quá.';
  return pick(rng, ['Ừ… giống rồi đấy. Mà hình như ảnh này chụp nghiêng.', 'Giống! Giống tám mươi phần trăm! Mà chắc tại góc chụp.']);
}

export function demandLine(rng: Rng, zone: Zone, n: number): string {
  const z = ZONE_LABEL[zone];
  if (n === 0) return pick(rng, [`Này, ${z} còn dài hơn đấy. Sửa tí.`, `Ơ, ${z} dài hơn rồi. Tỉa thêm tí.`]);
  return pick(rng, [
    `Giờ ${z} lại dài hơn rồi. Sửa tiếp.`,
    `Ừ… mà giờ ${z} lệch. Tí nữa thôi.`,
    `Thế là ${z} lại dài nhất rồi. Cháu thấy chưa?`,
    `Chú nói thật, ${z} vẫn chưa ổn.`,
  ]);
}

export function demandIgnored(rng: Rng): string {
  return pick(rng, ['Chú nói mà cháu không nghe à?', 'Cháu có nghe chú nói không đấy?', 'Đấy, đấy, cái chỗ chú bảo ấy!']);
}

export function demandMet(rng: Rng): string {
  return pick(rng, ['Ừ. Được.', 'Ừ… thế được.', 'Tạm.']);
}
