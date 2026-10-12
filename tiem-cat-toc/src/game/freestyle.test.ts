import { describe, expect, it } from 'vitest';
import { ArtSettings, carveHair } from './art';
import { applyRound, buy, careerTools, newCareer, planDay, roundContext } from './career';
import { CUSTOMERS } from './customers';
import { TASTES, Taste, colorFamily, scoreHair, tasteById, tasteMax } from './freestyle';
import { HairState, Zone, createHair } from './hair';
import { measureHair } from './metrics';
import { checkSheet, requestSheet } from './request';
import { createRound, finish, startCutting, tick } from './session';

const hairOf = (id = 'tuan') => createHair(CUSTOMERS.find((d) => d.id === id)!.hair);
function cut(h: HairState, z: Partial<Record<Zone, number>>) {
  for (const t of h.tufts) if (!t.bald && z[t.zone] !== undefined) t.len = t.origLen * z[t.zone]!;
}
function dye(h: HairState, colors: string[], zones?: Zone[]) {
  h.tufts.forEach((t, i) => {
    if (!t.bald && (!zones || zones.includes(t.zone))) t.tint = colors[i % colors.length];
  });
}
function carve(h: HairState, kind: ArtSettings['stencil'], u: number) {
  const art: ArtSettings = { colorA: '#000', colorB: '#000', blend: false, stencil: kind, text: 'TÓC', size: 0.8 };
  carveHair(h, art, { x: h.head.cx + u * h.head.rx, y: h.head.cy - 0.2 * h.head.ry });
}

/** A reasonable answer to each taste. */
const ANSWERS: Record<string, (h: HairState) => void> = {
  gon: (h) => cut(h, { left: 0.5, right: 0.5, top: 0.6, fringe: 0.5 }),
  chat: (h) => cut(h, { left: 0.2, right: 0.2, top: 0.3, fringe: 0.3 }),
  lech: (h) => cut(h, { left: 0.25, right: 0.9, top: 0.8, fringe: 0.8 }),
  lua: (h) => (cut(h, { left: 0.5, right: 0.5, top: 0.85, fringe: 0.7 }), dye(h, ['#ffd400'], ['top', 'fringe']), carve(h, 'bolt', -0.7)),
  bien: (h) => (cut(h, { left: 0.6, right: 0.6, top: 0.9, fringe: 0.7 }), dye(h, ['#18c8ff'], ['top', 'fringe'])),
  dethuong: (h) => (cut(h, { left: 0.7, right: 0.7, top: 0.85, fringe: 0.8 }), dye(h, ['#ff3fa4'], ['top', 'fringe']), carve(h, 'star', 0.7)),
  ngau: (h) => (cut(h, { left: 0.35, right: 0.35, top: 0.85, fringe: 0.6 }), carve(h, 'bolt', -0.7), carve(h, 'stripes', 0.7)),
  cauvong: (h) => (cut(h, { left: 0.7, right: 0.7, top: 0.85, fringe: 0.7 }), dye(h, ['#ff3fa4', '#ffd400', '#18c8ff', '#2ee86a'])),
  nghesi: (h) => (cut(h, { left: 0.6, right: 0.6, top: 0.85, fringe: 0.7 }), dye(h, ['#ff3fa4', '#18c8ff'], ['top', 'fringe']), carve(h, 'star', 0.7)),
};

describe('khách tùy thợ', () => {
  it('colour families', () => {
    expect(colorFamily('#ffd400')).toBe('warm');
    expect(colorFamily('#ff6a00')).toBe('warm');
    expect(colorFamily('#ff3fa4')).toBe('pink');
    expect(colorFamily('#18c8ff')).toBe('cool');
    expect(colorFamily('#8a4dff')).toBe('cool');
    expect(colorFamily('#2ee86a')).toBe('green');
    expect(colorFamily('#ffffff')).toBe('neutral');
  });

  it.each(TASTES.map((t) => [t.id, t] as [string, Taste]))('%s: a good answer is loved, doing nothing is not', (id, t) => {
    expect(tasteMax(t)).toBeGreaterThanOrEqual(90);
    const h = hairOf();
    expect(scoreHair(t, h)).toBeLessThan(75);
    ANSWERS[id](h);
    expect(scoreHair(t, h)).toBeGreaterThanOrEqual(80);
  });

  it('shaving them bald ruins every taste', () => {
    for (const t of TASTES) {
      const h = hairOf();
      ANSWERS[t.id](h);
      h.tufts.slice(0, 20).forEach((x) => (x.bald = true));
      expect(scoreHair(t, h)).toBeLessThan(70);
    }
  });

  it('the round uses the taste: no outline, a checklist of likes and dislikes, no hate for the tools they asked for', () => {
    const s = createRound('linh', 3, { unlocked: ['brush'], ctx: { taste: 'dethuong' } });
    expect(s.taste?.id).toBe('dethuong');
    expect(s.customer.target).toBeNull();
    expect(s.customer.toolReactions.brush).toBeUndefined();
    const sheet = requestSheet(s);
    expect(sheet.target).toBeNull();
    expect(sheet.items.some((i) => i.label.startsWith('Thích'))).toBe(true);
    expect(sheet.items.some((i) => i.label.startsWith('Ghét'))).toBe(true);
    ANSWERS.dethuong(s.hair);
    startCutting(s);
    tick(s, 0.05);
    expect(checkSheet(sheet, s, measureHair(s.hair)).filter((r) => !r.ok)).toEqual([]);
  });

  it('career: tasteful customers come from day 2; colour tastes only once the shop has the brush', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const c = newCareer(seed);
      expect(c.today.queue.some((q) => q.reason === 'freestyle')).toBe(false);
      c.day = 2;
      planDay(c);
      for (const q of c.today.queue.filter((x) => x.reason === 'freestyle')) seen.add(q.tasteId!);
    }
    expect(seen.size).toBeGreaterThan(0);
    for (const id of seen) expect(tasteById(id)!.needs).toEqual([]);

    const c = newCareer(5);
    c.money = 9e6;
    c.xp = 200;
    buy(c, 'brush');
    const art = new Set<string>();
    for (let d = 2; d < 30; d++) {
      c.day = d;
      planDay(c);
      for (const q of c.today.queue.filter((x) => x.reason === 'freestyle')) art.add(q.tasteId!);
    }
    expect([...art].some((id) => tasteById(id)!.needs.includes('brush'))).toBe(true);
    expect(careerTools(c)).toContain('brush');
  });

  it('a loved freestyle cut is offered to the catalog and ordered first the next day', () => {
    const c = newCareer(9);
    c.day = 2;
    c.today.queue = [{ customer: 'tuan', reason: 'freestyle', note: '', tasteId: 'gon' }];
    c.today.index = 0;
    c.today.phase = 'open';
    const s = createRound('tuan', 1, { unlocked: careerTools(c), ctx: roundContext(c) });
    expect(s.taste?.id).toBe('gon');
    startCutting(s);
    ANSWERS.gon(s.hair);
    tick(s, 0.05);
    finish(s, 'done');
    for (let i = 0; i < 300 && !s.result; i++) tick(s, 1 / 30);
    expect(s.result!.sat).toBeGreaterThanOrEqual(75);
    const sv = applyRound(c, s);
    expect(sv.saveDesign?.name).toContain('Gọn Gàng');
    // The app saves it and remembers it; with creative tools it is ordered first tomorrow.
    c.freshDesign = 'abc';
    c.owned.push('brush');
    c.day = 3;
    planDay(c, [{ id: 'zzz', customer: 'bay', name: 'Cũ' }, { id: 'abc', customer: 'tuan', name: 'Gọn Gàng của Anh Tuấn' }]);
    expect(c.today.queue.find((q) => q.reason === 'design')?.designId).toBe('abc');
    expect(c.freshDesign).toBeNull();
  });
});
