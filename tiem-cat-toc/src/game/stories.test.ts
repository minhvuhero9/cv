import { describe, expect, it } from 'vitest';
import { CareerState, applyRound, careerTools, endDay, newCareer, planDay, roundContext } from './career';
import { CUSTOMERS, customerById } from './customers';
import { contestPrize } from './freestyle';
import { reactionTier } from './evaluate';
import { RoundState, createRound, finish, tick } from './session';
import { STORIES } from './stories';

/** Serve the current queue entry with a forced satisfaction. */
function serve(c: CareerState, sat: number): ReturnType<typeof applyRound> {
  const q = c.today.queue[c.today.index];
  const s: RoundState = createRound(q.customer, 7, { unlocked: careerTools(c), ctx: roundContext(c) });
  s.phase = 'cutting';
  finish(s, 'done');
  for (let i = 0; i < 300 && !s.result; i++) tick(s, 1 / 30);
  s.result!.sat = sat;
  s.result!.tier = reactionTier(sat);
  s.result!.walkedOut = false;
  return applyRound(c, s);
}
function dayWith(c: CareerState, day: number) {
  c.day = day;
  planDay(c);
  c.today.phase = 'open';
}

describe('khách mới theo cấp', () => {
  it('six new customers, the shop-level ones only after levelling up', () => {
    for (const id of ['gamer', 'bep', 'bavien', 'rocker', 'ngan', 'dat']) expect(customerById(id).id).toBe(id);
    const seen = (xp: number) => {
      const ids = new Set<string>();
      for (let seed = 1; seed < 40; seed++) {
        const c = newCareer(seed);
        c.xp = xp;
        for (let d = 3; d < 6; d++) {
          dayWith(c, d);
          c.today.queue.forEach((q) => ids.add(q.customer));
        }
      }
      return ids;
    };
    const lv1 = seen(0);
    expect(lv1.has('gamer')).toBe(true);
    expect(lv1.has('bep') || lv1.has('bavien') || lv1.has('rocker')).toBe(false);
    const lv3 = seen(260);
    expect(lv3.has('bep') && lv3.has('bavien') && lv3.has('rocker')).toBe(true);
  });

  it('every new customer can be loved by a fitting cut', () => {
    for (const id of ['gamer', 'bep', 'ngan', 'dat']) {
      const d = customerById(id);
      const s = createRound(id, 1);
      for (const t of s.hair.tufts) if (!t.bald) t.len = t.origLen * d.target![t.zone];
      s.phase = 'cutting';
      finish(s, 'done');
      for (let i = 0; i < 300 && !s.result; i++) tick(s, 1 / 30);
      expect(s.result!.sat, id).toBeGreaterThanOrEqual(80);
    }
    expect(CUSTOMERS.length).toBeGreaterThanOrEqual(23);
  });
});

describe('khách có câu chuyện', () => {
  it('Bé Ngân: three chapters over the days, then the whole class comes', () => {
    const c = newCareer(3);
    let day = 3;
    dayWith(c, day);
    const st = STORIES[0];
    for (let ch = 0; ch < st.chapters.length; ch++) {
      const i = c.today.queue.findIndex((q) => q.reason === 'story');
      expect(i, `chapter ${ch} on day ${day}`).toBeGreaterThanOrEqual(0);
      expect(c.today.queue[i].storyStep).toBe(ch);
      c.today.index = i;
      const sv = serve(c, 95);
      expect(sv.story?.passed).toBe(true);
      if (ch < st.chapters.length - 1) {
        // Not tomorrow… but after the gap.
        const due = c.stories![st.id].due;
        expect(due).toBeGreaterThan(day);
        day = due;
        dayWith(c, day);
      } else {
        expect(sv.story?.finished).toBe(true);
        expect(sv.bonus).toBe(st.reward.money);
      }
    }
    expect(c.stories![st.id].state).toBe('done');
    const before = c.bonusWalkins;
    expect(before).toBe(st.reward.friends);
    dayWith(c, day + 1);
    expect(c.bonusWalkins).toBe(0);
  });

  it('a failed chapter ends the story', () => {
    const c = newCareer(3);
    dayWith(c, 3);
    c.today.index = c.today.queue.findIndex((q) => q.reason === 'story');
    const sv = serve(c, 20);
    expect(sv.story?.passed).toBe(false);
    expect(c.stories!.vannghe.state).toBe('failed');
    expect(c.pending.some((p) => p.customer === 'ngan')).toBe(false);
    for (let d = 4; d < 12; d++) {
      dayWith(c, d);
      expect(c.today.queue.some((q) => q.storyId === 'vannghe')).toBe(false);
    }
  });

  it('a story chapter uses its own request (and a taste for the finale)', () => {
    const s = createRound('ngan', 1, { ctx: { story: { id: 'vannghe', step: 2 } } });
    expect(s.story?.step).toBe(2);
    expect(s.taste?.id).toBe('gon');
    expect(s.requestText).toMatch(/giải Nhất/);
  });
});

describe('cuộc thi tóc của phường', () => {
  it('day 4 brings a contest model; the prize follows the judges', () => {
    const c = newCareer(2);
    dayWith(c, 4);
    const i = c.today.queue.findIndex((q) => q.reason === 'contest');
    expect(i).toBeGreaterThanOrEqual(0);
    c.today.index = i;
    c.today.quests = [];
    const money = c.money;
    const sv = serve(c, 92);
    expect(sv.contest?.label).toBe('Giải Nhất');
    expect(c.trophies?.length).toBe(1);
    expect(c.money).toBe(money + sv.paid + sv.tip + 200000);
    while (c.today.index < c.today.queue.length) serve(c, 50);
    const sum = endDay(c);
    expect(sum.bonusMoney).toBe(200000);
    expect(contestPrize(59)).toBeNull();
    expect(contestPrize(75)?.label).toBe('Giải Nhì');
  });

  it('no contest on other days', () => {
    const c = newCareer(2);
    for (const d of [2, 3, 5, 6, 7, 8]) {
      dayWith(c, d);
      expect(c.today.queue.some((q) => q.reason === 'contest')).toBe(false);
    }
  });
});
