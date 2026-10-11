import { describe, expect, it } from 'vitest';
import { CUSTOMERS, customerById } from './customers';
import { Vec } from './geometry';
import { measureHair } from './metrics';
import { RoundState, Tool, createRound, finish, pointerDown, pointerMove, pointerUp, setTool, startCutting, tick } from './session';
import { unlockedTools } from './tools';

const FRAME = 1 / 60;
const ALL = unlockedTools({ rounds: 0, styles: [], events: [] }, true);
const run = (s: RoundState, sec: number) => {
  for (let t = 0; t < sec; t += FRAME) tick(s, FRAME);
};
function game(id: string, ctx = {}) {
  const s = createRound(id, 7, { unlocked: ALL, ctx });
  startCutting(s);
  s.nextTurnCheck = 1e9;
  s.nextPhotoAt = 1e9;
  return s;
}
function hold(s: RoundState, tool: Tool, p: Vec, sec: number) {
  setTool(s, tool);
  pointerDown(s, p);
  run(s, sec);
  pointerUp(s);
}
function drag(s: RoundState, tool: Tool, a: Vec, b: Vec) {
  setTool(s, tool);
  pointerDown(s, a);
  for (let k = 1; k <= 30; k++) {
    pointerMove(s, { x: a.x + ((b.x - a.x) * k) / 30, y: a.y + ((b.y - a.y) * k) / 30 });
    tick(s, FRAME);
  }
  pointerUp(s);
}

describe('customer catalogue', () => {
  it('has 15 customers with complete, distinct data', () => {
    expect(CUSTOMERS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(CUSTOMERS.map((c) => c.id)).size).toBe(CUSTOMERS.length);
    for (const c of CUSTOMERS) {
      expect(c.name && c.trait && c.request && c.voice.espeak && c.pay.base > 0).toBeTruthy();
      expect(Array.isArray(c.behaviors) && Array.isArray(c.likes)).toBe(true);
    }
    // Not just recolours: behaviour sets differ across the cast.
    const sets = new Set(CUSTOMERS.map((c) => c.behaviors.join('+')));
    expect(sets.size).toBeGreaterThanOrEqual(12);
  });

  it('every customer can play a full round without errors', () => {
    for (const c of CUSTOMERS) {
      const s = game(c.id);
      drag(s, 'scissors', { x: 110, y: 230 }, { x: 290, y: 230 });
      run(s, 2);
      finish(s, 'done');
      expect(s.result, c.id).not.toBeNull();
      expect(Number.isFinite(s.result!.sat)).toBe(true);
    }
  });
});

describe('behaviours', () => {
  it('deadline: Chị Linh only gives 50 seconds', () => {
    const s = game('linh');
    run(s, 51);
    expect(s.phase).not.toBe('cutting');
  });

  it('sleepy: Cụ Tư dozes off in a quiet shop; a machine wakes him with a jerk', () => {
    const s = game('cutu');
    run(s, 12);
    expect(s.motion?.kind).toBe('nod');
    run(s, 1.5);
    hold(s, 'clipper', { x: 100, y: 230 }, 0.3);
    expect(s.events.startle).toBe(1);
  });

  it('reflex: a storm gust makes the võ sư chop — the tool is knocked away for a while', () => {
    const s = game('vosu');
    drag(s, 'storm', { x: 100, y: 200 }, { x: 260, y: 200 });
    expect(s.events.karateChop).toBe(1);
    expect(s.jam).not.toBeNull();
    const before = s.hair.tufts.map((t) => t.len).join();
    setTool(s, 'clipper');
    s.jam = { tool: 'clipper', until: s.time + 2 };
    drag(s, 'clipper', { x: 100, y: 170 }, { x: 95, y: 300 });
    expect(s.hair.tufts.map((t) => t.len).join()).toBe(before);
    expect((s.wear.storm ?? 0) > 0).toBe(true);
  });

  it('livestream: incidents bring viewers, a boring shop loses them', () => {
    const s = game('na');
    const v0 = s.viewers;
    hold(s, 'ray', { x: 150, y: 150 }, 0.05);
    run(s, 0.4);
    hold(s, 'ray', { x: 250, y: 150 }, 0.05);
    run(s, 0.5);
    expect(s.viewers).toBeGreaterThan(v0);
    const peak = s.viewers;
    run(s, 25);
    expect(s.viewers).toBeLessThan(peak);
  });

  it('fearBald: a new bald patch makes Anh Phúc panic; regrowing his crown delights him', () => {
    const s = game('phuc');
    expect(s.metrics.baldCount).toBeGreaterThan(0); // he arrives thinning
    hold(s, 'clipper', { x: 120, y: 190 }, 0.8);
    expect(s.events.baldPanic).toBe(1);

    const g = game('phuc');
    drag(g, 'wand', { x: 200, y: 165 }, { x: 200, y: 110 });
    finish(g, 'done');
    expect(g.result!.sat).toBeGreaterThan(50);
  });

  it('alien: hair flies TOWARDS the dryer', () => {
    const a = game('alien');
    const h = game('tuan');
    hold(a, 'dryer', { x: 90, y: 200 }, 1.5);
    hold(h, 'dryer', { x: 90, y: 200 }, 1.5);
    expect(Math.sign(measureHair(a.hair).leanAvg)).toBe(-Math.sign(measureHair(h.hair).leanAvg));
  });

  it('copycat: only the exact viral style fully satisfies', () => {
    const s = game('copycat', { wantStyle: 'saiyan' });
    for (const t of s.hair.tufts) t.spiked = true;
    finish(s, 'done');
    expect(s.result!.style.id).toBe('saiyan');
    expect(s.result!.sat).toBeGreaterThanOrEqual(90);
    const n = game('copycat', { wantStyle: 'saiyan' });
    drag(n, 'scissors', { x: 110, y: 230 }, { x: 290, y: 230 });
    finish(n, 'done');
    expect(n.result!.sat).toBeLessThan(70);
  });

  it('a returning customer brings yesterday’s hair', () => {
    const first = game('bay');
    hold(first, 'clipper', { x: 200, y: 160 }, 1);
    finish(first, 'done');
    const back = createRound('bay', 1, { ctx: { returnHair: first.hair } });
    expect(back.hair.tufts.filter((t) => t.bald).length).toBe(first.hair.tufts.filter((t) => t.bald).length);
    expect(back.hair.tufts[0]).not.toBe(first.hair.tufts[0]);
  });
});

describe('Cậu Vàng', () => {
  it('the clipper scares him; enough fear and he shakes fur all over the shop', () => {
    const s = game('vang');
    setTool(s, 'clipper');
    pointerDown(s, { x: 200, y: 330 });
    run(s, 8);
    pointerUp(s);
    run(s, 2.5);
    expect(s.events.dogShake).toBeGreaterThanOrEqual(1);
    expect(s.mess).toBeGreaterThan(0);
  });

  it('the dryer calms him down', () => {
    const s = game('vang');
    s.nerves = 70;
    hold(s, 'dryer', { x: 200, y: 140 }, 3);
    expect(s.nerves).toBeLessThan(40);
  });

  it('food smell distracts him only when there is food nearby, and sausages fix it', () => {
    const smell = game('vang', { dayEvents: ['foodStall'] });
    run(smell, 14);
    expect(smell.events.dogSniff).toBeGreaterThanOrEqual(1);
    const none = game('vang');
    run(none, 14);
    expect(none.events.dogSniff).toBeUndefined();
    const fed = game('vang', { dayEvents: ['foodStall'], items: ['sausage'] });
    run(fed, 14);
    expect(fed.events.dogSniff).toBeUndefined();
  });

  it('gets dog hairstyle names', () => {
    const s = game('vang');
    hold(s, 'dryer', { x: 200, y: 140 }, 2);
    hold(s, 'dryer', { x: 120, y: 200 }, 2);
    hold(s, 'dryer', { x: 280, y: 200 }, 2);
    finish(s, 'done');
    expect(s.result!.style.id.startsWith('dog-')).toBe(true);
  });

  it('is unknown to the classic data (species is data, not an id check)', () => {
    expect(customerById('vang').look.species).toBe('dog');
  });
});
