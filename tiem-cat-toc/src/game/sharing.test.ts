import { describe, expect, it } from 'vitest';
import { CareerState, applyRound, careerTools, endDay, newCareer, planDay, roundContext, SAVE_KEY } from './career';
import { snapCreation } from './creation';
import { exportSave, importSave } from './saveCode';
import { createRound, finish, startCutting, tick } from './session';
import { packChallenge, packReply, recordBest, loadBests, unpackReply } from './shopStyle';

class Mem implements Storage {
  m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

function serveAll(c: CareerState) {
  c.today.phase = 'open';
  while (c.today.index < c.today.queue.length) {
    const q = c.today.queue[c.today.index];
    const s = createRound(q.customer, 5, { unlocked: careerTools(c), ctx: roundContext(c) });
    startCutting(s);
    finish(s, 'done');
    for (let i = 0; i < 300 && !s.result; i++) tick(s, 1 / 30);
    applyRound(c, s);
  }
}

describe('mã lưu tiệm', () => {
  it('moves a whole shop to another browser', () => {
    const a = new Mem();
    const c = newCareer(3);
    c.day = 9;
    c.money = 1234000;
    a.setItem(SAVE_KEY, JSON.stringify(c));
    a.setItem('tctbo-studio-book', JSON.stringify([{ id: 'x' }]));
    const code = exportSave(a);
    expect(code.startsWith('TCTBO1:')).toBe(true);
    const b = new Mem();
    const r = importSave(`  ${code}\n`, b);
    expect(r).toEqual({ ok: true, day: 9 });
    expect(JSON.parse(b.getItem(SAVE_KEY)!).money).toBe(1234000);
    expect(b.getItem('tctbo-studio-book')).toBe(a.getItem('tctbo-studio-book'));
  });

  it('refuses broken or foreign codes without touching anything', () => {
    const b = new Mem();
    b.setItem(SAVE_KEY, '{"day":2}');
    expect(importSave('hello', b).ok).toBe(false);
    expect(importSave('TCTBO1:@@@', b).ok).toBe(false);
    const bad = 'TCTBO1:' + btoa(JSON.stringify({ v: 1, data: { 'tctbo-career-v1': '{"day":"x"}' } }));
    expect(importSave(bad, b).ok).toBe(false);
    expect(b.getItem(SAVE_KEY)).toBe('{"day":2}');
  });
});

describe('thách đấu hai chiều', () => {
  it('a reply carries the design, the attempt, the score and the name', () => {
    const s = createRound('tuan', 2);
    const design = snapCreation(s, 'Mẫu Gốc', '', { mood: 'happy', bg: 'salon', frame: 'none', stickers: [] });
    const code = packChallenge(design);
    s.hair.tufts.forEach((t) => (t.len *= 0.5));
    const attempt = snapCreation(s, 'Bài của Lan', '', { mood: 'happy', bg: 'salon', frame: 'none', stickers: [] });
    const r = unpackReply(packReply(code, attempt, 87.4, 'Lan'))!;
    expect(r.by).toBe('Lan');
    expect(r.score).toBe(87);
    expect(r.original.name).toBe('Mẫu Gốc');
    expect(r.attempt.tufts[0][0]).toBeCloseTo(design.tufts[0][0] * 0.5, 0);
    expect(r.code).toBe(code);
    expect(unpackReply('garbage')).toBeNull();
  });

  it('keeps your personal best per challenge', () => {
    const m = new Mem();
    expect(recordBest('c1', 'Mẫu', 60, m)).toBeNull();
    expect(recordBest('c1', 'Mẫu', 50, m)).toBe(60);
    expect(recordBest('c1', 'Mẫu', 80, m)).toBe(60);
    expect(loadBests(m).c1.best).toBe(80);
  });
});

describe('tạp chí tiệm', () => {
  it("keeps the week's four best heads and starts over after the weekly report", () => {
    const c = newCareer(5);
    for (let d = 1; d <= 7; d++) {
      c.day = d;
      if (d > 1) planDay(c);
      serveAll(c);
      expect(c.weekShots!.length).toBeLessThanOrEqual(4);
      const sats = c.weekShots!.map((x) => x.sat);
      expect([...sats].sort((a, b) => b - a)).toEqual(sats);
      endDay(c);
    }
    expect(c.weekShots).toEqual([]);
    expect(c.lastWeekShots!.length).toBe(4);
  });
});
