import { describe, expect, it } from 'vitest';
import { newCareer, planDay } from './career';

const ids = (c: ReturnType<typeof newCareer>) => c.today.queue.map((q) => q.customer).join(',');

describe('khách đa dạng', () => {
  it('each new shop gets its own first customers', () => {
    const firsts = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => ids(newCareer(s * 7777))));
    expect(firsts.size).toBeGreaterThan(3);
  });

  it('a bad day brings back at most one complainer, plus at least two new faces', () => {
    const c = newCareer();
    const yesterday = c.today.queue.map((q) => q.customer);
    for (const id of yesterday) {
      c.history[id] = { day: 1, styleId: 'x', sat: 10, tier: 'disaster' };
      c.pending.push({ customer: id, reason: 'return', day: 2, note: 'đòi sửa' });
    }
    c.day = 2;
    planDay(c);
    const q = c.today.queue;
    expect(q.filter((x) => x.reason === 'return').length).toBe(1);
    expect(q.filter((x) => !yesterday.includes(x.customer)).length).toBeGreaterThanOrEqual(2);
    expect(c.pending.filter((p) => p.reason === 'return').length).toBe(0);
  });

  it('regulars due the same day are spread out', () => {
    const c = newCareer();
    for (const id of ['tuan', 'bay', 'shipper']) c.pending.push({ customer: id, reason: 'loyal', day: 3, note: 'quen' });
    c.day = 3;
    planDay(c);
    expect(c.today.queue.filter((x) => x.reason === 'loyal').length).toBe(1);
    expect(c.pending.filter((p) => p.reason === 'loyal' && p.day === 4).length).toBe(2);
  });
});
