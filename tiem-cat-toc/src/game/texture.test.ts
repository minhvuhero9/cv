import { describe, expect, it } from 'vitest';
import { createHair, dryerBlow, scissorsSweep, clipperDwell, BALD_DWELL, tuftPoints } from './hair';
import { measureHair } from './metrics';
import { createRound, pointerDown, pointerUp, setTool, startCutting, tick } from './session';

const base = { length: 50, fringeLength: 40, gel: {} };

describe('chất tóc', () => {
  it('curly hair is wavy and frizzes more under the dryer', () => {
    const c = createHair({ ...base, texture: 'curly' });
    const s = createHair({ ...base });
    expect(measureHair(c).curlAvg).toBeGreaterThan(0.1);
    for (let i = 0; i < 30; i++) {
      dryerBlow(c, { x: 200, y: 140 }, 1 / 30);
      dryerBlow(s, { x: 200, y: 140 }, 1 / 30);
    }
    expect(measureHair(c).fluffAvg - 0.2).toBeGreaterThan(measureHair(s).fluffAvg);
  });

  it('wiry hair barely droops and blunts the scissors', () => {
    const w = createHair({ ...base, length: 70, texture: 'wiry' });
    const s = createHair({ ...base, length: 70 });
    const tip = (h: typeof w) => tuftPoints(h.tufts[0])[3].y;
    expect(tip(w)).toBeLessThan(tip(s));
    scissorsSweep(w, { x: 60, y: 240 }, { x: 340, y: 240 }, 1);
    scissorsSweep(s, { x: 60, y: 240 }, { x: 340, y: 240 }, 1);
    expect(measureHair(w).avg).toBeGreaterThan(measureHair(s).avg);
  });

  it('thin hair goes bald faster under a resting clipper', () => {
    const r = createRound('cutu', 3);
    startCutting(r);
    r.nextTurnCheck = 1e9;
    r.nextBehaviorAt = 1e9;
    setTool(r, 'clipper');
    pointerDown(r, { x: 140, y: 230 });
    for (let t = 0; t < BALD_DWELL * 0.75; t += 1 / 60) tick(r, 1 / 60);
    pointerUp(r);
    expect(r.metrics.baldCount).toBeGreaterThan(r.beforeMetrics.baldCount);
    const thin = createHair({ ...base, texture: 'thin' });
    const normal = createHair({ ...base });
    clipperDwell(thin, { x: 140, y: 230 }, BALD_DWELL * 0.7, 1, BALD_DWELL * 0.6);
    clipperDwell(normal, { x: 140, y: 230 }, BALD_DWELL * 0.7, 1, BALD_DWELL);
    expect(measureHair(thin).baldCount).toBeGreaterThan(measureHair(normal).baldCount);
  });

  it('starting cuts change lengths without changing the scored ratios', () => {
    for (const cut of ['sidePart', 'mullet', 'bowl'] as const) {
      const h = createHair({ ...base, cut });
      const m = measureHair(h);
      expect(m.avg).toBeCloseTo(1, 1);
      expect(m.baldCount).toBe(0);
    }
    const side = createHair({ ...base, cut: 'sidePart' });
    const fr = side.tufts.filter((t) => t.kind === 'fringe');
    expect(fr[0].len).toBeGreaterThan(fr[fr.length - 1].len * 1.5);
  });
});
