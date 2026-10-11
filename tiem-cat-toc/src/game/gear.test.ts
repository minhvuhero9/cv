import { describe, expect, it } from 'vitest';
import { comboReady, gearStatus } from './gear';
import { Vec } from './geometry';
import { VACUUM_GULP_TIME } from './magic';
import { measureHair } from './metrics';
import { RoundState, Tool, createRound, finish, pointerDown, pointerMove, pointerUp, setTool, startCutting, tick } from './session';
import { TOOLS, ToolId, isUnlocked, unlockedTools } from './tools';

const FRAME = 1 / 60;
const ALL = unlockedTools({ rounds: 0, styles: [], events: [] }, true);

function run(s: RoundState, seconds: number) {
  for (let t = 0; t < seconds; t += FRAME) tick(s, FRAME);
}

function game(id: 'tuan' | 'bay' | 'khoa' = 'tuan', unlocked: ToolId[] = ALL) {
  const s = createRound(id, 3, { unlocked });
  startCutting(s);
  s.nextTurnCheck = 1e9;
  s.nextPhotoAt = 1e9;
  return s;
}

function drag(s: RoundState, tool: Tool, pts: Vec[], stepPx = 4) {
  setTool(s, tool);
  pointerDown(s, pts[0]);
  tick(s, FRAME);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / stepPx));
    for (let k = 1; k <= n; k++) {
      pointerMove(s, { x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
      tick(s, FRAME);
    }
  }
  pointerUp(s);
}

function tap(s: RoundState, tool: Tool, p: Vec) {
  setTool(s, tool);
  pointerDown(s, p);
  tick(s, FRAME);
  pointerUp(s);
}

const totalLen = (s: RoundState) => s.hair.tufts.reduce((a, t) => a + t.len, 0);

describe('tool registry', () => {
  it('every tool has the required config fields', () => {
    for (const t of TOOLS) {
      expect(t.id && t.name && t.blurb && t.howTo && t.effect && t.rarity && t.input).toBeTruthy();
      expect(t.unlock).toBeDefined();
    }
  });
  it('new players only have the three basic tools; unlocks follow progress', () => {
    const fresh = { rounds: 0, styles: [], events: [] };
    expect(unlockedTools(fresh)).toEqual(['clipper', 'scissors', 'dryer']);
    const wand = TOOLS.find((t) => t.id === 'wand')!;
    expect(isUnlocked(wand, { ...fresh, rounds: 1 })).toBe(true);
    const storm = TOOLS.find((t) => t.id === 'storm')!;
    expect(isUnlocked(storm, { ...fresh, events: ['gelSpikes'] })).toBe(true);
    expect(TOOLS.filter((t) => t.unlock.kind === 'soon').every((t) => !unlockedTools(fresh, true).includes(t.id))).toBe(true);
  });
  it('a locked tool cannot be selected', () => {
    const s = createRound('tuan', 1);
    startCutting(s);
    expect(setTool(s, 'wand')).toBe(false);
    expect(s.tool).not.toBe('wand');
  });
});

describe('Gậy Như Ý', () => {
  it('dragging up grows hair (capped at 3×), down shrinks it, sideways thickens', () => {
    const s = game();
    const before = totalLen(s);
    drag(s, 'wand', [{ x: 120, y: 200 }, { x: 120, y: 120 }]);
    const grown = s.hair.tufts.filter((t) => t.len > t.origLen * 1.2);
    expect(grown.length).toBeGreaterThan(3);
    expect(totalLen(s)).toBeGreaterThan(before);
    expect(s.hair.tufts.every((t) => t.len <= t.origLen * 3 + 1e-6)).toBe(true);
    run(s, 4); // recharge
    drag(s, 'wand', [{ x: 120, y: 200 }, { x: 160, y: 200 }]);
    expect(Math.max(...s.hair.tufts.map((t) => t.thick))).toBeGreaterThan(1.2);
    run(s, 4);
    const ids = grown.map((t) => t.id);
    drag(s, 'wand', [{ x: 120, y: 200 }, { x: 120, y: 330 }]);
    const after = s.hair.tufts.filter((t) => ids.includes(t.id));
    expect(after.some((t) => t.len < t.origLen)).toBe(true);
    expect(after.every((t) => !t.bald)).toBe(true);
  });

  it('a tap curls the hair; it regrows bald patches', () => {
    const s = game();
    tap(s, 'wand', { x: 110, y: 230 });
    expect(s.hair.tufts.some((t) => t.curl > 0)).toBe(true);
    const t = s.hair.tufts.find((x) => x.kind === 'crown')!;
    t.bald = true;
    t.len = 0;
    run(s, 5);
    drag(s, 'wand', [t.root, { x: t.root.x, y: t.root.y - 40 }]);
    expect(t.bald).toBe(false);
    expect(t.len).toBeGreaterThan(3);
    expect(s.events.regrow).toBe(1);
  });

  it('runs out of energy when held too long, then recharges', () => {
    const s = game();
    setTool(s, 'wand');
    pointerDown(s, { x: 120, y: 200 });
    run(s, 3);
    pointerUp(s);
    expect(gearStatus(s, 'wand').state).toBe('overheated');
    const len = totalLen(s);
    drag(s, 'wand', [{ x: 120, y: 200 }, { x: 120, y: 120 }]);
    expect(totalLen(s)).toBe(len); // refused while overheated
    expect(s.deniedAt).toBeGreaterThan(0);
    run(s, 4.5);
    expect(gearStatus(s, 'wand').state).toBe('ready');
  });
});

describe('Súng Tóc 3000', () => {
  it('each shot dyes, stands up and enlarges hair at the impact point', () => {
    const s = game();
    tap(s, 'ray', { x: 130, y: 170 });
    const hit = s.hair.tufts.filter((t) => t.tint);
    expect(hit.length).toBeGreaterThan(2);
    expect(hit.every((t) => t.spiked && t.thick > 1)).toBe(true);
    run(s, 0.4);
    tap(s, 'ray', { x: 270, y: 170 });
    expect(new Set(s.hair.tufts.filter((t) => t.tint).map((t) => t.tint)).size).toBe(2);
  });

  it('has a minimum gap between shots and a 6-shot magazine', () => {
    const s = game();
    tap(s, 'ray', { x: 130, y: 170 });
    tap(s, 'ray', { x: 270, y: 170 }); // too soon
    expect(s.magic.rayShots).toBe(1);
    for (let i = 0; i < 8; i++) {
      run(s, 0.36);
      tap(s, 'ray', { x: 120 + i * 20, y: 160 });
    }
    expect(s.magic.rayShots).toBe(6);
    expect(gearStatus(s, 'ray').state).not.toBe('ready');
  });
});

describe('Máy Sấy Bão', () => {
  it('aim and release: hair is blown in the aimed direction; a tiny drag does nothing', () => {
    const s = game('bay');
    drag(s, 'storm', [{ x: 200, y: 200 }, { x: 205, y: 200 }]);
    expect(s.hair.tufts.every((t) => t.lean === 0)).toBe(true);
    drag(s, 'storm', [{ x: 100, y: 200 }, { x: 260, y: 200 }]);
    expect(measureHair(s.hair).leanAvg).toBeGreaterThan(0.1);
    const left = createRound('bay', 3, { unlocked: ALL });
    startCutting(left);
    drag(left, 'storm', [{ x: 300, y: 200 }, { x: 140, y: 200 }]);
    expect(measureHair(left.hair).leanAvg).toBeLessThan(-0.1);
  });
});

describe('combo Gậy Như Ý + Máy Sấy Bão', () => {
  it('fires only when long (wand-grown) hair meets the storm', () => {
    const plain = game();
    drag(plain, 'storm', [{ x: 100, y: 200 }, { x: 260, y: 200 }]);
    expect(plain.events.comboStormLong).toBeUndefined();

    const s = game();
    for (const x of [110, 150, 200, 250, 290]) {
      drag(s, 'wand', [{ x, y: 190 }, { x, y: 90 }]);
      run(s, 4);
    }
    expect(measureHair(s.hair).longFrac).toBeGreaterThan(0.1);
    drag(s, 'storm', [{ x: 100, y: 200 }, { x: 260, y: 200 }]);
    expect(s.events.comboStormLong).toBe(1);
    // Cooldown: an immediate second gust does not re-trigger.
    run(s, 4);
    drag(s, 'storm', [{ x: 100, y: 200 }, { x: 260, y: 200 }]);
    expect(s.events.comboStormLong).toBe(1);
    finish(s, 'done');
    expect(s.result!.caption).toMatch(/Gậy Như Ý/);
  });
});

describe('switching and resetting', () => {
  it('switching tools mid-gesture cancels cleanly (no stray gust)', () => {
    const s = game();
    setTool(s, 'storm');
    pointerDown(s, { x: 100, y: 200 });
    pointerMove(s, { x: 260, y: 200 });
    setTool(s, 'scissors');
    pointerUp(s);
    run(s, 0.2);
    expect(s.hair.tufts.every((t) => t.lean === 0)).toBe(true);
    expect(s.magic.aim).toBeNull();
  });

  it('a new round has fresh gear, combos and hair', () => {
    const s = game();
    tap(s, 'ray', { x: 130, y: 170 });
    finish(s, 'done');
    const n = createRound('tuan', 3, { unlocked: ALL });
    expect(n.hair.tufts.some((t) => t.tint || t.thick !== 1 || t.curl || t.sculpt || t.steamed)).toBe(false);
    expect(n.gear.ray.charge).toBe(1);
    expect(n.combos).toEqual({});
    expect(n.magic.rayShots).toBe(0);
  });
});

export { VACUUM_GULP_TIME, comboReady };
