import { afterEach, describe, expect, it } from 'vitest';
import { CareerState, applyRound, careerTools, customersPerDay, dayEvents, endDay, newCareer, planDay, roundContext, runPromo } from './career';
import { createRound, finish, startCutting, tick } from './session';
import { seasonClock } from './templates';
import { RIVAL_DAY, isFestival, weatherFor } from './world';
import { customerById } from './customers';

function serveAll(c: CareerState, sat?: number) {
  c.today.phase = 'open';
  while (c.today.index < c.today.queue.length) {
    const q = c.today.queue[c.today.index];
    const s = createRound(q.customer, 5, { unlocked: careerTools(c), ctx: roundContext(c) });
    startCutting(s);
    finish(s, 'done');
    for (let i = 0; i < 300 && !s.result; i++) tick(s, 1 / 30);
    if (sat !== undefined) {
      s.result!.sat = sat;
      s.result!.walkedOut = false;
    }
    applyRound(c, s);
  }
}

describe('thời tiết', () => {
  it('mixes fair, rainy and hot days; the first two days are fair', () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 60; d++) seen.add(weatherFor(7, d));
    expect(seen).toEqual(new Set(['fair', 'rain', 'heat']));
    expect([1, 2].map((d) => weatherFor(7, d))).toEqual(['fair', 'fair']);
  });

  it('rain means one customer fewer and calmer customers; heat wants it short', () => {
    const c = newCareer(1);
    let rainDay = 0;
    for (let d = 3; d < 80 && !rainDay; d++) if (weatherFor(c.seed!, d) === 'rain' && !isFestival(d)) rainDay = d;
    c.day = rainDay;
    const ids = dayEvents(c).map((e) => e.id);
    expect(ids).toContain('rain');
    expect(customersPerDay(c, ids)).toBe(customersPerDay(c, ids.filter((x) => x !== 'rain')) - 1);
    const dry = createRound('linh', 1, { ctx: { weather: 'fair' } });
    const wet = createRound('linh', 1, { ctx: { weather: 'rain' } });
    expect(wet.customer.patienceDecay).toBeLessThan(dry.customer.patienceDecay);
    const hot = createRound('linh', 1, { ctx: { weather: 'heat' } });
    const cool = createRound('linh', 1, { ctx: { weather: 'heat', items: ['aircon'] } });
    expect(hot.customer.patienceDecay).toBeGreaterThan(cool.customer.patienceDecay);
    // Same short cut: a hot day likes it more.
    const m = { ...hot.metrics, avg: 0.4, baldFrac: 0 };
    expect(hot.customer.satisfaction(m)).toBeGreaterThanOrEqual(customerById('linh').satisfaction(m));
  });
});

describe('tiệm đối thủ', () => {
  it('opens on day 9; a happy week makes it close and pays off', () => {
    const c = newCareer(2);
    for (let d = 1; d < RIVAL_DAY; d++) {
      c.day = d;
      planDay(c);
      expect(c.rival).toBeUndefined();
    }
    c.day = RIVAL_DAY;
    planDay(c);
    expect(c.rival?.state).toBe('open');
    expect(c.today.events.some((e) => e.id === 'rival')).toBe(true);
    let sum = null;
    for (let d = RIVAL_DAY; d <= c.rival!.until; d++) {
      c.day = d;
      if (d > RIVAL_DAY) planDay(c);
      serveAll(c, 85);
      sum = endDay(c);
    }
    expect(c.rival!.state).toBe('beaten');
    expect(sum!.rival).toMatch(/dẹp tiệm/);
  });

  it('an unhappy shop gets four more days of competition, then the rival moves away', () => {
    const c = newCareer(2);
    c.day = RIVAL_DAY;
    planDay(c);
    const firstEnd = c.rival!.until;
    for (let d = RIVAL_DAY; d <= firstEnd; d++) {
      c.day = d;
      if (d > RIVAL_DAY) planDay(c);
      serveAll(c, 30);
      endDay(c);
    }
    expect(c.rival!.until).toBe(firstEnd + 4);
    for (let d = firstEnd + 1; d <= c.rival!.until; d++) {
      c.day = d;
      planDay(c);
      serveAll(c, 30);
      endDay(c);
    }
    expect(c.rival!.state).toBe('left');
  });
});

describe('khuyến mãi và lễ hội', () => {
  afterEach(() => {
    seasonClock.now = () => new Date();
  });

  it('a promo brings two more walk-ins, once, in the morning, at 20% off', () => {
    const c = newCareer(4);
    c.day = 5;
    planDay(c);
    const n = c.today.queue.length;
    const pay = roundContext(c).payMultiplier!;
    expect(runPromo(c)).toBe(true);
    expect(c.today.queue.length).toBe(n + 2);
    expect(runPromo(c)).toBe(false);
    expect(roundContext(c).payMultiplier!).toBeCloseTo(pay * 0.8);
    c.today.phase = 'open';
    c.today.promo = false;
    expect(runPromo(c)).toBe(false);
  });

  it('festival days: more customers, better pay, more tùy thợ', () => {
    seasonClock.now = () => new Date(2026, 9, 1);
    const c = newCareer(4);
    c.day = 12;
    planDay(c);
    expect(c.today.events.find((e) => e.id === 'festival')?.title).toBe('Lễ hội Phố Tóc mùa Halloween');
    expect(c.today.queue.filter((q) => q.reason === 'freestyle').length).toBe(2);
    const ids = c.today.events.map((e) => e.id);
    expect(customersPerDay(c, ids)).toBe(customersPerDay(c, ids.filter((x) => x !== 'festival')) + 2);
    expect([12, 13, 26, 27].every(isFestival)).toBe(true);
    expect(isFestival(14)).toBe(false);
  });
});

describe('khách dùng this.target (Tuấn, Bảy, Khoa) qua các lớp bọc', () => {
  it('heat, accessories and the mirror all keep their verdict working', async () => {
    const { spinMirror, setAccessory } = await import('./session');
    for (const id of ['tuan', 'bay', 'khoa']) {
      const s = createRound(id, 3, { ctx: { weather: 'heat', items: ['mirror', 'accessoryBox'], mirrorRandom: true } });
      startCutting(s);
      spinMirror(s);
      setAccessory(s, 'shades');
      finish(s, 'done');
      for (let i = 0; i < 300 && !s.result; i++) tick(s, 1 / 30);
      expect(Number.isFinite(s.result!.sat), id).toBe(true);
    }
  });
});
