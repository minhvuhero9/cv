import { describe, expect, it } from 'vitest';
import { CareerState, applyRound, careerTools, easeFor, endDay, newCareer, planDay, rentFor, roundContext, sanitizeCareer, shopLevel } from './career';
import { customerById } from './customers';
import { LEVELS } from './level';
import { createRound, finish, tick } from './session';

function serveAll(c: CareerState) {
  c.today.phase = 'open';
  while (c.today.index < c.today.queue.length) {
    const q = c.today.queue[c.today.index];
    const s = createRound(q.customer, 5, { unlocked: careerTools(c), ctx: roundContext(c) });
    s.phase = 'cutting';
    finish(s, 'done');
    for (let i = 0; i < 300 && !s.result; i++) tick(s, 1 / 30);
    applyRound(c, s);
  }
}

describe('ngày đầu dễ thở', () => {
  it('day 1 is gentle, day 2 a bit, day 3 is the real thing', () => {
    expect([1, 2, 3, 9].map(easeFor)).toEqual([1, 0.5, 0, 0]);
    const d1 = createRound('linh', 1, { ctx: { ease: 1 } });
    const d3 = createRound('linh', 1, { ctx: { ease: 0 } });
    expect(d1.timeLimit).toBe(d3.timeLimit + 15);
    expect(d1.customer.patienceDecay).toBeLessThan(d3.customer.patienceDecay);
    expect(d3.customer.patienceDecay).toBe(customerById('linh').patienceDecay);
    const c = newCareer(1);
    expect(roundContext(c).ease).toBe(1);
  });
});

describe('báo cáo tuần', () => {
  it('the seventh evening reviews the week, then starts a new one', () => {
    const c = newCareer(4);
    for (let d = 1; d <= 7; d++) {
      c.day = d;
      if (d > 1) planDay(c);
      serveAll(c);
      const sum = endDay(c);
      if (d < 7) expect(sum.week).toBeUndefined();
      else {
        expect(sum.week!.from).toBe(1);
        expect(sum.week!.to).toBe(7);
        expect(sum.week!.customers).toBeGreaterThanOrEqual(21);
        expect(sum.week!.topStyle).not.toBeNull();
      }
    }
    expect(c.weekDays).toEqual([]);
  });
});

describe('cân bằng', () => {
  it('levels need more experience; a bigger shop pays more rent', () => {
    expect(LEVELS.map((l) => l.xp)).toEqual([0, 80, 220, 430, 700]);
    const c = newCareer();
    const r1 = rentFor(c);
    c.xp = 450;
    expect(rentFor(c)).toBe(r1 + 45000);
  });

  it('older saves keep their shop level after the thresholds went up', () => {
    const old = newCareer();
    delete old.xpScale;
    old.xp = 170; // level 3 on the old thresholds
    expect(shopLevel(sanitizeCareer(old)).level).toBe(3);
    const fresh = newCareer();
    fresh.xp = 100;
    expect(sanitizeCareer(fresh).xp).toBe(100);
  });

  it('the VIP is never a catalog / tùy thợ / contest model', () => {
    for (let seed = 1; seed < 30; seed++) {
      const c = newCareer(seed);
      c.rep = 90;
      c.owned.push('brush');
      c.xp = 100;
      for (const d of [4, 6, 8, 11]) {
        c.day = d;
        planDay(c, [{ id: 'x', customer: 'tuan', name: 'X' }]);
        expect(c.today.queue.filter((q) => q.customer === 'vip' && q.reason !== 'vip' && q.reason !== 'loyal' && q.reason !== 'return')).toEqual([]);
      }
    }
  });
});
