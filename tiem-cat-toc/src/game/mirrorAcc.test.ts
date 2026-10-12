import { afterEach, describe, expect, it } from 'vitest';
import { ACCESSORIES, accessoryById, accessoryPoints } from './accessories';
import { newCareer, planDay } from './career';
import { customerById } from './customers';
import { measureHair } from './metrics';
import { PERSONA_IDS, affinity, personaById } from './mirror';
import { createRound, finish, setAccessory, spinMirror, startCutting, tick } from './session';
import { SEASONAL, seasonClock, seasonFor, templateHair } from './templates';
import { tasteById } from './freestyle';

function verdict(s: ReturnType<typeof createRound>) {
  startCutting(s);
  finish(s, 'done');
  for (let i = 0; i < 300 && !s.result; i++) tick(s, 1 / 30);
  return s.result!.sat;
}

describe('Gương Thần ngẫu nhiên (ở tiệm)', () => {
  it('one tap gives a random persona; the customer loves it or not', () => {
    const moods = new Set<string>();
    const picked = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      const s = createRound('tuan', seed, { ctx: { items: ['mirror'], mirrorRandom: true } });
      startCutting(s);
      const id = spinMirror(s);
      expect(id).not.toBeNull();
      picked.add(id!);
      moods.add(s.personaMood!);
      expect(s.personaMood).not.toBe('neutral');
      // A fixed fan/hater keeps their feelings.
      const p = personaById(id)!;
      const fixed = affinity(p, 'tuan');
      if (fixed !== 'neutral') expect(s.personaMood).toBe(fixed);
      expect(spinMirror(s)).toBeNull(); // once per customer
    }
    expect(picked.size).toBeGreaterThanOrEqual(5);
    expect(moods.has('fan') && moods.has('hater')).toBe(true);
  });

  it('a loved persona scores better than a hated one for the same cut', () => {
    let fan = -1;
    let hater = -1;
    for (let seed = 1; seed <= 40 && (fan < 0 || hater < 0); seed++) {
      const s = createRound('bay', seed, { ctx: { items: ['mirror'], mirrorRandom: true } });
      startCutting(s);
      const id = spinMirror(s);
      if (id !== 'idol') continue;
      const sat = verdict(s);
      if (s.personaMood === 'fan') fan = sat;
      if (s.personaMood === 'hater') hater = sat;
    }
    if (fan >= 0 && hater >= 0) expect(fan).toBeGreaterThan(hater);
  });

  it('Bé Ba Hóa Thân may look three times', () => {
    const s = createRound('hoathan', 3, { ctx: { items: ['mirror'], mirrorRandom: true } });
    startCutting(s);
    expect(s.mirrorSpins).toBe(3);
    const seen = [spinMirror(s), spinMirror(s), spinMirror(s)];
    expect(seen.every(Boolean)).toBe(true);
    expect(seen[1]).not.toBe(seen[0]);
    expect(spinMirror(s)).toBeNull();
    expect(PERSONA_IDS).toContain(s.persona);
  });

  it('free play keeps the picker (no random flag)', () => {
    const s = createRound('tuan', 1, { mirror: true });
    expect(s.mirrorRandom).toBe(false);
  });
});

describe('phụ kiện tóc', () => {
  it('needs the box from the shop (free play has it)', () => {
    const shop = createRound('ngan', 1, { ctx: { items: [] } });
    startCutting(shop);
    expect(setAccessory(shop, 'bow')).toBe(false);
    const free = createRound('ngan', 1, { mirror: true });
    expect(free.accessoriesReady).toBe(true);
  });

  it('who likes what', () => {
    const bow = accessoryById('bow')!;
    expect(accessoryPoints(customerById('ngan'), bow, null)).toBeGreaterThan(0);
    expect(accessoryPoints(customerById('dat'), bow, null)).toBeLessThan(0);
    expect(accessoryPoints(customerById('linh'), bow, tasteById('dethuong'))).toBeGreaterThan(0);
    expect(accessoryPoints(customerById('tuan'), bow, tasteById('gon'))).toBeLessThan(0);
    expect(ACCESSORIES).toHaveLength(5);
  });

  it('changes the look and the verdict, and can be taken off', () => {
    const base = createRound('ngan', 2, { ctx: { items: ['accessoryBox'] } });
    startCutting(base);
    const s0 = verdict(createRound('ngan', 2, { ctx: { items: ['accessoryBox'] } }));
    const s = createRound('ngan', 2, { ctx: { items: ['accessoryBox'] } });
    startCutting(s);
    expect(setAccessory(s, 'bow')).toBe(true);
    expect(s.customer.look.hat).toBe('bow');
    const s1 = verdict(s);
    expect(s1).toBeGreaterThanOrEqual(s0);
    expect(setAccessory(base, 'crown')).toBe(true);
    expect(setAccessory(base, null)).toBe(true);
    expect(base.customer.look.hat).toBe(customerById('ngan').look.hat);
  });
});

describe('mẫu theo mùa', () => {
  afterEach(() => {
    seasonClock.now = () => new Date();
  });

  it('seasons follow the calendar', () => {
    expect(seasonFor(new Date(2026, 0, 20))?.id).toBe('tet');
    expect(seasonFor(new Date(2026, 9, 31))?.id).toBe('halloween');
    expect(seasonFor(new Date(2026, 3, 1))).toBeNull();
  });

  it('every seasonal look is two-tone or patterned on any head', () => {
    for (const t of SEASONAL) {
      const m = measureHair(templateHair(t, 'tuan'));
      expect(m.tintedFrac, t.id).toBeGreaterThan(0.1);
    }
  });

  it('in season, a shop with the tools gets seasonal orders', () => {
    seasonClock.now = () => new Date(2026, 9, 15); // Halloween
    const c = newCareer(3);
    c.xp = 250;
    c.owned.push('brush', 'stencil');
    const notes: string[] = [];
    for (const d of [4, 7, 10, 13]) {
      c.day = d;
      planDay(c);
      for (const q of c.today.queue) if (q.templateId) notes.push(q.templateId);
    }
    expect(notes).toContain('halloween-ma');
    seasonClock.now = () => new Date(2026, 3, 15);
    c.day = 16;
    planDay(c);
    expect(c.today.queue.some((q) => q.templateId === 'halloween-ma')).toBe(false);
  });
});
