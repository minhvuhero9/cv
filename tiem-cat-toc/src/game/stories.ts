import { CustomerDef, fromWants } from './customers';
import { tasteById, tasteCustomer } from './freestyle';
import type { Zone } from './hair';

/**
 * Khách có câu chuyện: one customer comes back over several days, and what you do each
 * visit decides how their story goes. Pass a chapter and they come back for the next;
 * fail one and the story ends there. The last chapter pays off for the whole shop.
 */
export interface Chapter {
  /** Queue note in the morning. */
  note: string;
  request?: string;
  catch?: string;
  hint?: string;
  /** A concrete look… */
  target?: Record<Zone, number>;
  /** …or "tùy thợ" with a taste. */
  taste?: string;
  /** Satisfaction needed to move the story on. */
  pass: number;
  /** Shown when the chapter is passed. */
  win: string;
  /** Days until the next chapter. */
  gap: number;
}

export interface StoryReward {
  money: number;
  viral: number;
  rep: number;
  /** Extra walk-ins the next day (friends they bring). */
  friends: number;
  text: string;
}

export interface Story {
  id: string;
  title: string;
  customer: string;
  startDay: number;
  minLevel: number;
  chapters: Chapter[];
  reward: StoryReward;
  /** Shown when a chapter is failed and the story ends. */
  fail: string;
}

export const STORIES: Story[] = [
  {
    id: 'vannghe',
    title: 'Bé Ngân đi diễn văn nghệ',
    customer: 'ngan',
    startDay: 3,
    minLevel: 1,
    chapters: [
      { note: 'Chuyện của Bé Ngân (1/3): đi tập văn nghệ', pass: 65, gap: 2, win: 'Bé Ngân tự tin hẳn lên. Hai hôm nữa bé diễn chính thức!' },
      {
        note: 'Chuyện của Bé Ngân (2/3): hôm nay diễn chính thức',
        request: 'Hôm nay cháu diễn rồi ạ! Cô tỉa mái thật đều để cháu xoay múa nhé.',
        catch: 'Cháu run quá cô ơi…',
        hint: 'Mái ngắn vừa và thật đều, hai bên tỉa nhẹ đều nhau. Không trọc.',
        target: { left: 0.75, right: 0.75, top: 0.85, fringe: 0.5 },
        pass: 70,
        gap: 2,
        win: 'Bé Ngân đạt giải Nhất văn nghệ toàn trường!',
      },
      {
        note: 'Chuyện của Bé Ngân (3/3): được giải, muốn kiểu mới',
        request: 'Cháu được giải Nhất rồi! Cô làm gì cũng được, miễn hợp gu cháu ạ: gọn gàng, xinh xinh.',
        taste: 'gon',
        pass: 70,
        gap: 0,
        win: 'Bé Ngân khoe tóc với cả lớp.',
      },
    ],
    reward: { money: 150000, viral: 6, rep: 2, friends: 2, text: 'Bé Ngân dẫn cả lớp đến: ngày mai có thêm 2 khách!' },
    fail: 'Bé Ngân buồn, không quay lại tiệm nữa.',
  },
  {
    id: 'xinviec',
    title: 'Anh Đạt đi xin việc',
    customer: 'dat',
    startDay: 5,
    minLevel: 1,
    chapters: [
      { note: 'Chuyện của Anh Đạt (1/3): mai đi phỏng vấn', pass: 70, gap: 2, win: 'Anh Đạt đậu phỏng vấn!' },
      {
        note: 'Chuyện của Anh Đạt (2/3): ngày đầu đi làm',
        request: 'Anh đậu rồi! Mai đi làm ngày đầu, em cắt ngắn gọn hơn nữa giúp anh.',
        catch: 'Sếp anh thích nhân viên gọn gàng.',
        hint: 'Ngắn hơn lần trước: hai bên ngắn, phía trên tỉa vừa, đều. Không màu.',
        target: { left: 0.35, right: 0.35, top: 0.65, fringe: 0.4 },
        pass: 70,
        gap: 3,
        win: 'Ngày đầu đi làm suôn sẻ, sếp khen tóc gọn.',
      },
      {
        note: 'Chuyện của Anh Đạt (3/3): lên chức!',
        request: 'Anh lên trưởng nhóm rồi! Giờ em làm gì cũng được, miễn hợp gu anh: càng ngắn càng chất.',
        taste: 'chat',
        pass: 70,
        gap: 0,
        win: 'Anh Đạt tự tin dẫn dắt cả nhóm.',
      },
    ],
    reward: { money: 250000, viral: 3, rep: 4, friends: 1, text: 'Anh Đạt giới thiệu cả công ty: uy tín +4, mai có thêm 1 khách!' },
    fail: 'Anh Đạt trượt phỏng vấn, đổ tại cái đầu. Anh không quay lại nữa.',
  },
  {
    id: 'demnhac',
    title: 'Đêm nhạc của Long Rốc',
    customer: 'rocker',
    startDay: 6,
    minLevel: 3,
    chapters: [
      { note: 'Chuyện của Long Rốc (1/2): diễn ở quán cà phê', pass: 65, gap: 3, win: 'Quán cà phê cháy vé! Ban nhạc được mời diễn sân khấu lớn.' },
      {
        note: 'Chuyện của Long Rốc (2/2): đêm nhạc lớn',
        request: 'Sân khấu lớn đấy em! Làm gì cũng được, miễn phá cách.',
        taste: 'lech',
        pass: 72,
        gap: 0,
        win: 'Đêm nhạc bùng nổ, clip lan khắp mạng.',
      },
    ],
    reward: { money: 200000, viral: 12, rep: 1, friends: 1, text: 'Clip đêm nhạc nhắc tên tiệm: Viral +12!' },
    fail: 'Long Rốc diễn tệ, ban nhạc đổ lỗi cho kiểu tóc.',
  },
];

export const storyById = (id: string | null | undefined) => STORIES.find((s) => s.id === id) ?? null;

export interface StoryProgress {
  step: number;
  due: number;
  state: 'active' | 'done' | 'failed';
}

/** The customer for this chapter of the story. */
export function storyCustomer(base: CustomerDef, st: Story, step: number): CustomerDef {
  const ch = st.chapters[Math.min(step, st.chapters.length - 1)];
  const taste = tasteById(ch.taste);
  const def = taste ? tasteCustomer(base, taste) : base;
  const target = ch.target ?? (taste ? null : base.target);
  return {
    ...def,
    request: ch.request ?? def.request,
    catch: ch.catch ?? def.catch,
    hint: ch.hint ?? def.hint,
    target,
    satisfaction:
      ch.target && !taste
        ? fromWants({ base: 100, zones: ch.target, zoneWeight: 180, penalties: { baldFrac: 400, unevenLR: 120, tintedFrac: 60, carvingCount: 12 } })
        : def.satisfaction,
  };
}
