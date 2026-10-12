import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './achievements';
import { assistantCut, assistantLevel, assistantSlots } from './assistant';
import { CareerState, applyRound, assistantLeft, canAssist, careerTools, customersPerDay, dayCosts, endDay, newCareer, planDay, roundContext, takeAssistant } from './career';
import { customerById } from './customers';
import { createRound, finish, tick } from './session';

function round(c: CareerState) {
  const q = c.today.queue[c.today.index];
  return createRound(q.customer, 9, { unlocked: careerTools(c), ctx: roundContext(c) });
}
function done(s: ReturnType<typeof createRound>) {
  if (s.phase === 'intro') s.phase = 'cutting';
  finish(s, 'done');
  for (let i = 0; i < 300 && !s.result; i++) tick(s, 1 / 30);
}

describe('phòng mở rộng', () => {
  it('the wash room calms customers and the wash is paid on top', () => {
    const c = newCareer(2);
    c.day = 5;
    planDay(c);
    c.today.phase = 'open';
    const plain = round(c);
    c.owned.push('washRoom');
    const washed = round(c);
    expect(washed.patience).toBe(Math.min(100, plain.patience + 10));
    expect(washed.customer.patienceDecay).toBeLessThan(plain.customer.patienceDecay);
    done(washed);
    const sv = applyRound(c, washed);
    if (!sv.walkedOut) expect(sv.paid).toBe(washed.result!.paid + 20000);
  });

  it('the VIP room brings one more customer a day; the thợ phụ is paid every day', () => {
    const c = newCareer(2);
    c.day = 5;
    const n = customersPerDay(c, []);
    c.owned.push('vipRoom', 'assistant');
    expect(customersPerDay(c, [])).toBe(n + 1);
    expect(dayCosts(c).some((x) => x.label.includes('thợ phụ') && x.amount === 40000)).toBe(true);
  });
});

describe('thợ phụ Bé Tư', () => {
  it('learns with every cut and gets a second slot at level 5', () => {
    expect([0, 2, 3, 12, 40].map(assistantLevel)).toEqual([1, 1, 2, 5, 10]);
    expect(assistantSlots(0)).toBe(1);
    expect(assistantSlots(12)).toBe(2);
  });

  it('takes walk-ins only, a limited number a day, and cuts towards the request', () => {
    const c = newCareer(3);
    c.today.queue = [
      { customer: 'linh', reason: 'walkin', note: '' },
      { customer: 'bay', reason: 'walkin', note: '' },
      { customer: 'tuan', reason: 'design', note: '', templateId: 'highlight' },
    ];
    c.today.phase = 'open';
    expect(canAssist(c)).toBe(false);
    c.owned.push('assistant');
    expect(canAssist(c)).toBe(true);
    const s = round(c);
    assistantCut(s, takeAssistant(c));
    expect(s.byAssistant).toBe(true);
    expect(s.phase).toBe('mirror');
    for (let i = 0; i < 300 && !s.result?.sat; i++) tick(s, 1 / 30);
    const sv = applyRound(c, s);
    expect(sv.byAssistant).toBe(true);
    expect(c.assistant!.jobs).toBe(1);
    expect(assistantLeft(c)).toBe(0);
    expect(canAssist(c)).toBe(false);
    // A skilled assistant gets close to what Chị Linh asked for.
    const t = createRound('linh', 4);
    t.phase = 'cutting';
    assistantCut(t, 10);
    expect(t.result!.sat).toBeGreaterThan(60);
  });
});

describe('thành tựu', () => {
  it('reached goals unlock a title and +10 kinh nghiệm, once', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    const c = newCareer(1);
    c.stats.served = 9;
    c.today.phase = 'open';
    const s = round(c);
    done(s);
    const xp0 = c.xp ?? 0;
    const sv = applyRound(c, s);
    expect(sv.achievements).toContain('Mười Cái Đầu Đầu Tiên');
    expect(c.achievements).toContain('first10');
    expect(c.xp).toBeGreaterThanOrEqual(xp0 + 10);
    const s2 = round(c);
    done(s2);
    expect(applyRound(c, s2).achievements ?? []).not.toContain('Mười Cái Đầu Đầu Tiên');
  });

  it('a week open is noticed at closing', () => {
    const c = newCareer(1);
    c.stats.days = 6;
    while (c.today.index < c.today.queue.length) {
      const s = round(c);
      done(s);
      applyRound(c, s);
    }
    const sum = endDay(c);
    expect(sum.achievements).toContain('Trụ Được Một Tuần');
    expect(customerById('tuan').id).toBe('tuan');
  });
});
