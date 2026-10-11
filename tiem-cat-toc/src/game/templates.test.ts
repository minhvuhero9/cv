import { describe, expect, it } from 'vitest';
import { applyRound, canBuy, careerTools, newCareer, planDay, shopLevel } from './career';
import { designScore, templateOrder } from './design';
import { LEVELS, levelFor, xpFor } from './level';
import { measureHair } from './metrics';
import { createRound, finish, startCutting, tick } from './session';
import { shopItem } from './shop';
import { setTrace, studioRound } from './studio';
import { TEMPLATES, templateHair, templateReady } from './templates';

describe('mẫu có sẵn', () => {
  it('every template builds on every head and scores ~100 against itself', () => {
    for (const t of TEMPLATES)
      for (const who of ['tuan', 'na', 'vosu', 'teo']) {
        const o = templateOrder(t, who);
        expect(designScore(o, o.hair), `${t.id} on ${who}`).toBeGreaterThanOrEqual(95);
        const m = measureHair(o.hair);
        expect(m.carvingCount).toBe(t.carvings?.length ?? 0);
        if (t.color) expect(m.tintedFrac).toBeGreaterThan(0.05);
      }
  });

  it('an untouched head is far from any template that needs work', () => {
    for (const t of TEMPLATES) {
      const plain = createRound('tuan', 1);
      expect(designScore(templateOrder(t, 'tuan'), plain.hair), t.id).toBeLessThan(80);
    }
  });

  it('templates climb with the shop level and need the right tools', () => {
    expect(TEMPLATES.filter((t) => t.level === 1).every((t) => t.tools.length === 0)).toBe(true);
    const lv5 = TEMPLATES.find((t) => t.id === 'chuky')!;
    expect(templateReady(lv5, 5, ['brush', 'stencil'], ['paletteXL', 'stencilPro'])).toBe(true);
    expect(templateReady(lv5, 4, ['brush', 'stencil'], ['paletteXL', 'stencilPro'])).toBe(false);
    expect(templateReady(lv5, 5, ['brush'], ['paletteXL', 'stencilPro'])).toBe(false);
  });

  it('vẽ theo mẫu in the Xưởng: guides, live score, celebration at 90 %', () => {
    const s = studioRound('tuan');
    setTrace(s, 'highlight');
    expect(s.design?.template?.id).toBe('highlight');
    s.hair = templateHair(s.design!.template!, 'tuan');
    for (let t = 0; t < 0.5; t += 1 / 30) tick(s, 1 / 30);
    expect(s.studio!.traceDone).toBe(true);
    setTrace(s, null);
    expect(s.design).toBeNull();
  });

  it('a template order in a real round rewards copying it', () => {
    const t = TEMPLATES.find((x) => x.id === 'undercut')!;
    const s = createRound('khoa', 3, { ctx: { designTemplate: 'undercut' } });
    startCutting(s);
    expect(s.requestText).toContain(t.name);
    s.hair = templateHair(t, 'khoa');
    finish(s, 'done');
    expect(s.result!.sat).toBeGreaterThanOrEqual(85);
  });
});

describe('cấp tiệm', () => {
  it('levels go up with XP and bring better prices and more customers', () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(LEVELS[2].xp).level).toBe(3);
    expect(LEVELS[4].price).toBeGreaterThan(LEVELS[0].price);
    expect(xpFor({ sat: 80, tier: 'ok', walkedOut: false }, { design: true, art: true, boss: false, quests: 1 })).toBe(8 + 10 + 3 + 5);
    expect(xpFor({ sat: 80, tier: 'ok', walkedOut: true }, { design: true, art: true, boss: false, quests: 1 })).toBe(0);
  });

  it('art tools are sold by level, not by day', () => {
    const c = newCareer();
    c.money = 9e6;
    c.day = 10;
    expect(canBuy(c, shopItem('brush')!).ok).toBe(false);
    c.xp = LEVELS[1].xp;
    expect(canBuy(c, shopItem('brush')!).ok).toBe(true);
    expect(canBuy(c, shopItem('stencil')!).ok).toBe(false);
    c.xp = LEVELS[4].xp;
    expect(canBuy(c, shopItem('stencilPro')!).ok).toBe(true);
  });

  it('a round adds XP and can level the shop up', () => {
    const c = newCareer();
    c.xp = LEVELS[1].xp - 1;
    c.today.phase = 'open';
    const s = createRound(c.today.queue[0].customer, 5, { unlocked: careerTools(c) });
    startCutting(s);
    finish(s, 'done');
    s.result!.sat = 90;
    s.result!.tier = 'love';
    const sv = applyRound(c, s);
    expect(sv.xp).toBeGreaterThan(0);
    expect(sv.levelUp).toBe(2);
    expect(shopLevel(c).level).toBe(2);
  });

  it('day 1 already has a template order the basic shop can do', () => {
    const c = newCareer();
    const q = c.today.queue.find((x) => x.reason === 'design');
    expect(q?.templateId).toBeTruthy();
    expect(TEMPLATES.find((t) => t.id === q!.templateId)!.level).toBe(1);
    planDay(c);
    expect(c.today.queue.filter((x) => x.reason === 'design')).toHaveLength(1);
  });
});
