import { describe, expect, it } from 'vitest';
import { CUSTOMERS, customerById } from './customers';
import { STYLE_RULES, nameHairstyle } from './evaluate';
import { HEAD, NOSE, Vec } from './geometry';
import { BALD_DWELL, CLIPPER_GUARD, clipperDwell, clipperSweep, createHair, dryerBlow, scissorsSweep, tuftRatio } from './hair';
import { measureHair } from './metrics';
import {
  RoundState,
  Tool,
  beg,
  createRound,
  finish,
  pointerDown,
  pointerMove,
  pointerUp,
  setTool,
  startCutting,
  tick,
} from './session';

const FRAME = 1 / 60;

function run(s: RoundState, seconds: number) {
  for (let t = 0; t < seconds; t += FRAME) tick(s, FRAME);
}

/** Drags the tool through points at `speed` px/s, ticking the simulation like the real loop. */
function drag(s: RoundState, tool: Tool, pts: Vec[], speed = 400) {
  setTool(s, tool);
  pointerDown(s, pts[0]);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(len / speed / FRAME));
    for (let k = 1; k <= steps; k++) {
      pointerMove(s, { x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps });
      tick(s, FRAME);
    }
  }
  pointerUp(s);
}

function holdAt(s: RoundState, tool: Tool, p: Vec, seconds: number) {
  setTool(s, tool);
  pointerDown(s, p);
  run(s, seconds);
  pointerUp(s);
}

function playing(id: 'tuan' | 'bay' | 'khoa', seed = 1) {
  const s = createRound(id, seed);
  startCutting(s);
  // Keep head-turns out of tests that are not about them.
  s.nextTurnCheck = 1e9;
  s.nextPhotoAt = 1e9;
  return s;
}

describe('hair model', () => {
  it('starts full in every zone', () => {
    const h = createHair(customerById('tuan').hair);
    const m = measureHair(h);
    for (const z of ['left', 'right', 'top', 'fringe'] as const) {
      expect(h.tufts.some((t) => t.zone === z)).toBe(true);
      expect(m.zone[z]).toBeCloseTo(1, 5);
    }
    expect(m.baldCount).toBe(0);
  });

  it('scissors cut along the blade (with a little reach), never stubbing locks at the root', () => {
    const h = createHair(customerById('tuan').hair);
    scissorsSweep(h, { x: 120, y: 212 }, { x: 280, y: 212 }, 1);
    const fringe = h.tufts.filter((t) => t.zone === 'fringe');
    const sides = h.tufts.filter((t) => (t.zone === 'left' || t.zone === 'right') && t.kind === 'edge');
    expect(fringe.every((t) => t.len < t.origLen)).toBe(true);
    for (const t of fringe) expect(t.root.y + t.len).toBeLessThan(220);
    // Side locks are only touched where the blade really passes over them, never cut to a stub.
    const touched = sides.filter((t) => t.len < t.origLen);
    expect(touched.length).toBeLessThanOrEqual(sides.length * 0.15);
    for (const t of touched) expect(t.len).toBeGreaterThanOrEqual(6);
  });

  it('a slightly-off drag still catches the locks it passes over', () => {
    const h = createHair(customerById('tuan').hair);
    // A short stroke that runs just beside the fringe locks instead of exactly across them.
    const before = h.tufts.filter((t) => t.zone === 'fringe').reduce((a, t) => a + t.len, 0);
    for (let x = 140; x < 260; x += 3) scissorsSweep(h, { x, y: 208 }, { x: x + 3, y: 208.5 }, 2);
    const after = h.tufts.filter((t) => t.zone === 'fringe').reduce((a, t) => a + t.len, 0);
    expect(after).toBeLessThan(before * 0.8);
  });

  it('clipper buzzes to the guard length; a quick pass never makes bald', () => {
    const h = createHair(customerById('tuan').hair);
    const r = clipperSweep(h, { x: 100, y: 170 }, { x: 95, y: 300 }, 1);
    expect(r.cut.length).toBeGreaterThan(0);
    expect(r.cut.every((t) => Math.abs(t.len - CLIPPER_GUARD) < 1e-6)).toBe(true);
    expect(h.tufts.some((t) => t.bald)).toBe(false);
  });

  it('a clipper held still on the scalp shaves a bald patch', () => {
    const h = createHair(customerById('tuan').hair);
    const p = { x: HEAD.cx, y: HEAD.cy - HEAD.ry };
    let bald = 0;
    for (let t = 0; t < BALD_DWELL + 0.1; t += FRAME) bald += clipperDwell(h, p, FRAME, 1).newlyBald.length;
    expect(bald).toBeGreaterThan(0);
    expect(h.tufts.filter((t) => t.bald).every((t) => tuftRatio(t) === 0)).toBe(true);
  });

  it('the dryer sets gel into spikes, and only pushes/fluffs hair without gel', () => {
    const gel = createHair(customerById('khoa').hair);
    const dry = createHair({ length: 50, fringeLength: 40, gel: {} });
    for (let t = 0; t < 1.5; t += FRAME) {
      dryerBlow(gel, { x: 200, y: 140 }, FRAME);
      dryerBlow(dry, { x: 120, y: 160 }, FRAME);
    }
    expect(gel.tufts.filter((t) => t.spiked).length).toBeGreaterThan(5);
    expect(dry.tufts.some((t) => t.spiked)).toBe(false);
    expect(measureHair(dry).leanAvg).toBeGreaterThan(0.05); // blown from the left -> leans right
    expect(measureHair(dry).fluffAvg).toBeGreaterThan(0.05);
  });
});

it('blowing the whole head from one side makes the hair run away', () => {
  const s = playing('tuan');
  for (let i = 0; i < 8; i++) holdAt(s, 'dryer', { x: 85, y: 140 + i * 18 }, 0.6);
  for (let i = 0; i < 4; i++) holdAt(s, 'dryer', { x: 120 + i * 30, y: 115 }, 0.6);
  finish(s, 'done');
  expect(s.result!.style.id).toBe('runaway');
});

describe('hairstyle names follow the actual hair', () => {
  const facts = (id: 'tuan' | 'bay' | 'khoa', mutate: (s: RoundState) => void) => {
    const s = createRound(id, 1);
    mutate(s);
    const metrics = measureHair(s.hair);
    const f = {
      customer: s.customer,
      metrics,
      before: s.beforeMetrics,
      chaos: 0,
      events: {},
      fixCount: 0,
      maxZoneStrokes: 0,
      walkedOut: false,
      timedOut: false,
    };
    return nameHairstyle(f, s.customer.satisfaction(metrics)).id;
  };

  it('untouched hair', () => expect(facts('bay', () => {})).toBe('untouched'));
  it('a bald strip is a highway', () =>
    expect(
      facts('bay', (s) => {
        for (const t of s.hair.tufts) if (Math.abs(t.root.y - (HEAD.cy - 70)) < 12 && Math.abs(t.root.x - HEAD.cx) < 60) t.bald = true;
      }),
    ).toBe('highway'));
  it('gel spikes', () => expect(facts('khoa', (s) => s.hair.tufts.forEach((t) => (t.spiked = true)))).toBe('saiyan'));
  it('one side shaved', () => expect(facts('tuan', (s) => s.hair.tufts.forEach((t) => t.zone === 'left' && (t.len = 5)))).toBe('halfhalf'));
  it('every rule has a unique id and the last one always matches', () => {
    expect(new Set(STYLE_RULES.map((r) => r.id)).size).toBe(STYLE_RULES.length);
    expect(STYLE_RULES[STYLE_RULES.length - 1].id).toBe('science');
  });
});

describe('round rules', () => {
  it('scenario A: cutting Tuấn to the photo satisfies him', () => {
    const s = playing('tuan');
    for (const x of [92, 102, 112]) drag(s, 'clipper', [{ x, y: 170 }, { x: x - 6, y: 250 }, { x: x - 4, y: 300 }]);
    for (const x of [308, 298, 288]) drag(s, 'clipper', [{ x, y: 170 }, { x: x + 6, y: 250 }, { x: x + 4, y: 300 }]);
    drag(s, 'clipper', [{ x: 60, y: 230 }, { x: 70, y: 300 }]);
    drag(s, 'clipper', [{ x: 340, y: 230 }, { x: 330, y: 300 }]);
    drag(s, 'scissors', [{ x: 120, y: 214 }, { x: 280, y: 214 }]);
    finish(s, 'done');
    expect(s.result!.sat).toBeGreaterThanOrEqual(60);
    expect(s.metrics.baldCount).toBe(0);
    expect(['happy', 'ecstatic']).toContain(s.result!.mood);
  });

  it('scenario B: slow clipper on the scalp -> bald event, chaos, negative reaction', () => {
    const s = playing('bay');
    drag(s, 'clipper', [{ x: 140, y: 175 }, { x: 200, y: 160 }, { x: 262, y: 175 }], 25);
    run(s, 1);
    expect(s.events.baldPatch).toBeGreaterThan(0);
    expect(s.chaos).toBeGreaterThan(25);
    finish(s, 'done');
    expect(['highway', 'onepatch', 'islands', 'egg']).toContain(s.result!.style.id);
    expect(['angry', 'shocked', 'crying']).toContain(s.result!.mood);
  });

  it('scenario C: hammering one zone triggers Càng Sửa Càng Sai exactly once per zone', () => {
    const s = playing('bay');
    for (let i = 0; i < 9; i++) {
      drag(s, 'scissors', [{ x: 40, y: 285 - i * 12 }, { x: 130, y: 275 - i * 12 }]);
      run(s, 0.2);
    }
    expect(s.events.fixLoop).toBe(1);
    expect(s.metrics.zone.left).toBeLessThan(s.metrics.zone.right - 0.25);
    finish(s, 'done');
    expect(s.result!.caption).toMatch(/sửa/i);
  });

  it('scenario D: dryer on gelled hair -> Gió Đổi Chiều, Khoa loves it', () => {
    const s = playing('khoa');
    for (const p of [{ x: 150, y: 150 }, { x: 200, y: 140 }, { x: 250, y: 150 }, { x: 120, y: 220 }, { x: 280, y: 220 }, { x: 200, y: 190 }])
      holdAt(s, 'dryer', p, 0.7);
    run(s, 0.3);
    expect(s.events.gelSpikes).toBe(1);
    finish(s, 'done');
    expect(['saiyan', 'hedgehog', 'perfect-khoa']).toContain(s.result!.style.id);
    expect(['ecstatic', 'happy']).toContain(s.result!.mood);
  });

  it('scenario E: a new round shares nothing with the old one', () => {
    const a = playing('khoa');
    holdAt(a, 'dryer', { x: 200, y: 150 }, 1.5);
    finish(a, 'done');
    const b = createRound('khoa', 1);
    expect(b.hair.tufts.some((t) => t.spiked || t.lean !== 0)).toBe(false);
    expect(b.events).toEqual({});
    expect(b.chaos).toBe(0);
    expect(b.result).toBeNull();
    expect(b.hair.tufts[0]).not.toBe(a.hair.tufts[0]);
  });

  it('scissors: a click snips under the blades, a drag start does not', () => {
    const s = playing('tuan');
    const f = s.hair.tufts.find((t) => t.zone === 'fringe' && Math.abs(t.root.x - 200) < 6)!;
    setTool(s, 'scissors');
    pointerDown(s, { x: f.root.x, y: f.root.y + 20 });
    pointerUp(s);
    expect(f.len).toBeLessThan(22);
    const g = s.hair.tufts.find((t) => t.zone === 'fringe' && t.root.x > 240)!;
    const len = g.len;
    pointerDown(s, { x: g.root.x, y: g.root.y + 20 });
    tick(s, FRAME);
    expect(g.len).toBe(len); // pressing alone does not cut; only the drag path or a click does
    pointerMove(s, { x: g.root.x, y: g.root.y + 60 });
    pointerUp(s);
  });

  it('no cutting after the round ends; finishing twice is a no-op', () => {
    const s = playing('tuan');
    finish(s, 'done');
    const before = s.hair.tufts.map((t) => t.len);
    drag(s, 'clipper', [{ x: 100, y: 170 }, { x: 300, y: 170 }]);
    expect(s.hair.tufts.map((t) => t.len)).toEqual(before);
    const r = s.result;
    finish(s, 'timeout');
    expect(s.result).toBe(r);
  });

  it('result matches the final hair', () => {
    const s = playing('tuan');
    drag(s, 'clipper', [{ x: 60, y: 230 }, { x: 70, y: 300 }]);
    finish(s, 'done');
    expect(s.result!.style.id).toBe(
      nameHairstyle(
        {
          customer: s.customer,
          metrics: measureHair(s.hair),
          before: s.beforeMetrics,
          chaos: s.chaos,
          events: s.events,
          fixCount: s.fixCount,
          maxZoneStrokes: 0,
          walkedOut: false,
          timedOut: false,
        },
        s.result!.sat,
      ).id,
    );
  });

  it('comb-over: blowing hair over a bald patch makes it run away', () => {
    const s = playing('tuan');
    holdAt(s, 'clipper', { x: 150, y: 175 }, 0.7);
    expect(s.metrics.baldCount + s.hair.tufts.filter((t) => t.bald).length).toBeGreaterThan(0);
    for (let i = 0; i < 6; i++) holdAt(s, 'dryer', { x: 110 + i * 6, y: 190 }, 0.5);
    run(s, 0.3);

    expect(s.events.combOver).toBe(1);
  });

  it('sneeze: dryer full of clippings near the nose -> warning first, then a sneeze; capped', () => {
    const s = playing('tuan');
    let warned = false;
    for (let round = 0; round < 6; round++) {
      s.clippings = 40;
      setTool(s, 'dryer');
      pointerDown(s, NOSE);
      for (let t = 0; t < 3; t += FRAME) {
        tick(s, FRAME);
        if (s.motion?.kind === 'sneeze' && s.motion.stage === 'warn') warned = true;
        if (s.motion?.kind === 'sneeze' && s.motion.stage === 'act') expect(warned).toBe(true);
      }
      pointerUp(s);
      s.sneezeCooldown = 0;
    }
    expect(s.events.sneeze).toBe(3);
  });

  it('head turn: warning, then a stray cut only if the tool stays on the head', () => {
    const careful = playing('tuan');
    careful.patience = 10;
    careful.nextTurnCheck = 0;
    careful.rng = () => 0.1;
    run(careful, 3);
    expect(careful.events.headTurn).toBeGreaterThan(0);
    expect(careful.events.strayCut ?? 0).toBe(0);

    const reckless = playing('tuan');
    reckless.patience = 10;
    reckless.nextTurnCheck = 0;
    reckless.rng = () => 0.1;
    setTool(reckless, 'clipper');
    pointerDown(reckless, { x: 200, y: 160 });
    run(reckless, 2.5);
    pointerUp(reckless);
    expect(reckless.events.strayCut).toBe(1);
  });

  it('Chú Bảy keeps demanding the longest side; complying counts as a fix', () => {
    const s = playing('bay');
    drag(s, 'scissors', [{ x: 40, y: 262 }, { x: 130, y: 252 }]); // trim left
    run(s, 3);
    expect(s.demand).not.toBeNull();
    const zone = s.demand!.zone;
    expect(zone).not.toBe('left');
    const target = s.hair.tufts.find((t) => t.zone === zone && t.kind !== 'crown' && t.len > 10)!;
    const mid = { x: target.root.x, y: target.root.y + (zone === 'fringe' ? 15 : 0) };
    drag(s, 'scissors', [{ x: mid.x - 40, y: mid.y + 10 }, { x: mid.x + 40, y: mid.y + 10 }]);
    expect(s.fixCount).toBe(1);
  });

  it('Khoa flinches after a warning when cut too much too fast', () => {
    const s = playing('khoa');
    for (let i = 0; i < 4; i++) drag(s, 'scissors', [{ x: 30, y: 300 - i * 15 }, { x: 130, y: 290 - i * 15 }], 2000);
    let sawWarn = false;
    for (let t = 0; t < 2; t += FRAME) {
      tick(s, FRAME);
      if (s.motion?.kind === 'flinch' && s.motion.stage === 'warn') sawWarn = true;
    }
    expect(sawWarn).toBe(true);
  });

  it('walkout: one chance to beg, then the customer leaves', () => {
    const s = playing('bay');
    s.incident = 100;
    run(s, 0.3);
    expect(s.walkout).not.toBeNull();
    beg(s);
    expect(s.walkout).toBeNull();
    s.incident = 100;
    run(s, 0.3);
    expect(s.walkout!.canBeg).toBe(false);
    run(s, 4);
    expect(s.phase).toBe('mirror');
    expect(s.result!.walkedOut).toBe(true);
  });

  it('chaos stays bounded and events cannot loop forever under random abuse', () => {
    for (const c of CUSTOMERS) {
      const s = createRound(c.id, 42);
      startCutting(s);
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const tools: Tool[] = ['clipper', 'scissors', 'dryer'];
      while (s.phase === 'cutting') {
        if (s.walkout && s.walkout.canBeg) beg(s);
        setTool(s, tools[Math.floor(rnd() * 3)]);
        pointerDown(s, { x: 60 + rnd() * 280, y: 100 + rnd() * 250 });
        for (let i = 0; i < 20; i++) {
          pointerMove(s, { x: 60 + rnd() * 280, y: 100 + rnd() * 250 });
          tick(s, FRAME);
          expect(s.chaos).toBeGreaterThanOrEqual(0);
          expect(s.chaos).toBeLessThanOrEqual(100);
          expect(s.patience).toBeGreaterThanOrEqual(0);
        }
        pointerUp(s);
        run(s, 0.1);
      }
      expect(s.time).toBeLessThanOrEqual(s.timeLimit + 1);
      for (const n of Object.values(s.events)) expect(n).toBeLessThan(40);
      expect(s.events.sneeze ?? 0).toBeLessThanOrEqual(3);
      expect(s.events.gelSpikes ?? 0).toBeLessThanOrEqual(1);
      expect(s.result).not.toBeNull();
    }
  }, 15000);
});
