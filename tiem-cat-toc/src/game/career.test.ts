import { describe, expect, it } from 'vitest';
import {
  CareerState,
  applyRound,
  buy,
  careerTools,
  customersPerDay,
  endDay,
  loadCareer,
  newCareer,
  nextDay,
  repair,
  roundContext,
  saveCareer,
  SAVE_KEY,
} from './career';
import { Vec } from './geometry';
import { measureHair } from './metrics';
import { RoundState, Tool, createRound, finish, pointerDown, pointerMove, pointerUp, setTool, startCutting, tick } from './session';

const FRAME = 1 / 60;
const run = (s: RoundState, sec: number) => {
  for (let t = 0; t < sec; t += FRAME) tick(s, FRAME);
};

function drag(s: RoundState, tool: Tool, a: Vec, b: Vec, steps = 30) {
  setTool(s, tool);
  pointerDown(s, a);
  for (let k = 1; k <= steps; k++) {
    pointerMove(s, { x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps });
    tick(s, FRAME);
  }
  pointerUp(s);
}

function tap(s: RoundState, tool: Tool, p: Vec) {
  setTool(s, tool);
  pointerDown(s, p);
  tick(s, FRAME);
  pointerUp(s);
}

/** Starts the round for the current customer in the queue, exactly as the app does. */
function startRound(c: CareerState): RoundState {
  const q = c.today.queue[c.today.index];
  const s = createRound(q.customer, 100 + c.day * 10 + c.today.index, { unlocked: careerTools(c), ctx: roundContext(c) });
  startCutting(s);
  s.nextTurnCheck = 1e9;
  s.nextPhotoAt = 1e9;
  s.nextBehaviorAt = 1e9;
  return s;
}

/** Plays a careful trim, or a deliberate disaster. */
function serve(c: CareerState, style: 'neat' | 'disaster' = 'neat') {
  const s = startRound(c);
  if (style === 'neat') {
    drag(s, 'scissors', { x: 110, y: 232 }, { x: 290, y: 232 });
  } else {
    setTool(s, 'clipper');
    pointerDown(s, { x: 200, y: 165 });
    run(s, 2.5);
    pointerUp(s);
    if (s.walkout?.canBeg) s.walkout = null;
  }
  if (s.phase === 'cutting') finish(s, 'done');
  run(s, 0.1);
  return { s, served: applyRound(c, s) };
}

function playDay(c: CareerState, style: 'neat' | 'disaster' = 'neat') {
  c.today.phase = 'open';
  while (c.today.index < c.today.queue.length) serve(c, style);
  return endDay(c);
}

function memoryStore(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    setItem: (k, v) => void m.set(k, String(v)),
  };
}

describe('day loop', () => {
  it('plays three days: money, reputation and the queue all move', () => {
    const c = newCareer();
    expect(c.today.queue.length).toBeGreaterThanOrEqual(3);
    const startMoney = c.money;
    for (let d = 0; d < 3; d++) {
      const sum = playDay(c);
      expect(sum.served.length).toBeGreaterThanOrEqual(2);
      expect(sum.costs[0].label).toMatch(/thuê/);
      nextDay(c);
    }
    expect(c.day).toBe(4);
    expect(c.stats.served).toBeGreaterThanOrEqual(8);
    expect(c.money).not.toBe(startMoney);
  });

  it('a disaster costs reputation, brings the customer back tomorrow with the same hair', () => {
    const c = newCareer();
    c.today.queue = [{ customer: 'bay', reason: 'walkin', note: '' }];
    const rep = c.rep;
    const { s } = serve(c, 'disaster');
    expect(c.rep).toBeLessThan(rep);
    endDay(c);
    nextDay(c);
    const back = c.today.queue.find((q) => q.customer === 'bay');
    expect(back?.reason).toBe('return');
    const ctx = roundContext(c);
    c.today.index = c.today.queue.indexOf(back!);
    const again = createRound('bay', 1, { ctx: roundContext(c) });
    expect(ctx).toBeTruthy();
    expect(again.hair.tufts.filter((t) => t.bald).length).toBe(s.hair.tufts.filter((t) => t.bald).length);
  });

  it('a customer who came back and is still unhappy gives up (no endless returns)', () => {
    const c = newCareer();
    c.today.queue = [{ customer: 'bay', reason: 'return', note: '' }];
    serve(c, 'disaster');
    expect(c.pending.some((p) => p.customer === 'bay')).toBe(false);
  });

  it('copycats do not start a new trend', () => {
    const c = newCareer();
    c.today.queue = [{ customer: 'copycat', reason: 'copycat', note: '', wantStyle: 'saiyan' }];
    const s = startRound(c);
    for (const t of s.hair.tufts) t.spiked = true;
    finish(s, 'done');
    applyRound(c, s);
    expect(c.viralStyle).toBeNull();
  });

  it('a viral disaster brings a copycat who wants that exact style', () => {
    const c = newCareer();
    c.today.queue = [{ customer: 'khoa', reason: 'walkin', note: '' }];
    const s = startRound(c);
    for (let i = 0; i < 6; i++) {
      setTool(s, 'dryer');
      pointerDown(s, { x: 120 + i * 30, y: 150 });
      run(s, 0.8);
      pointerUp(s);
    }
    finish(s, 'done');
    const served = applyRound(c, s);
    expect(served.viralDelta).toBeGreaterThanOrEqual(6);
    endDay(c);
    nextDay(c);
    const copy = c.today.queue.find((q) => q.reason === 'copycat');
    expect(copy?.wantStyle).toBe(served.styleId);
    expect(c.today.events.some((e) => e.id === 'viralClip')).toBe(true);
  });
});

describe('shop changes gameplay', () => {
  it('buying a magic tool adds it to the toolbar; consumables have stock', () => {
    const c = newCareer();
    c.day = 2;
    c.money = 1_000_000;
    expect(careerTools(c)).not.toContain('wand');
    expect(buy(c, 'wand').ok).toBe(true);
    expect(careerTools(c)).toContain('wand');
    expect(buy(c, 'wand').ok).toBe(false); // already owned
    expect(buy(c, 'potion').ok).toBe(true);
    expect(c.stock.potion).toBe(3);
    expect(careerTools(c)).toContain('potion');
  });

  it('cannot buy without money or before the unlock condition', () => {
    const c = newCareer();
    expect(buy(c, 'wand').ok).toBe(false); // day 1
    c.day = 2;
    c.money = 10;
    const r = buy(c, 'wand');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/Thiếu/);
  });

  it('extra bench = one more customer per day', () => {
    const c = newCareer();
    const n = customersPerDay(c, []);
    c.day = 2;
    c.money = 1_000_000;
    buy(c, 'bench');
    expect(customersPerDay(c, [])).toBe(n + 1);
  });

  it('Japanese clipper takes longer to make a bald patch', () => {
    const plain = createRound('tuan', 1, { ctx: { items: [] } });
    const jp = createRound('tuan', 1, { ctx: { items: ['japanClipper'] } });
    for (const s of [plain, jp]) {
      startCutting(s);
      s.nextTurnCheck = 1e9;
      s.nextPhotoAt = 1e9;
      setTool(s, 'clipper');
      pointerDown(s, { x: 200, y: 160 });
      run(s, 0.65);
      pointerUp(s);
    }
    expect(measureHair(plain.hair).baldCount).toBeGreaterThan(0);
    expect(measureHair(jp.hair).baldCount).toBe(0);
  });

  it('the massage chair keeps restless customers seated more often', () => {
    const turns = (items: string[]) => {
      let n = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const s = createRound('tuan', seed, { ctx: { items } });
        startCutting(s);
        s.patience = 10;
        s.nextPhotoAt = 1e9;
        run(s, 20);
        n += s.events.headTurn ?? 0;
      }
      return n;
    };
    expect(turns(['chair'])).toBeLessThan(turns([]));
  });

  it('pet sign makes Cậu Vàng a possible customer', () => {
    const c = newCareer();
    c.day = 5;
    const seen = (cc: CareerState) => {
      for (let d = 0; d < 20; d++) {
        cc.day = 5 + d;
        cc.pending = [];
        nextDay(cc);
        if (cc.today.queue.some((q) => q.customer === 'vang')) return true;
      }
      return false;
    };
    expect(seen(structuredClone(c))).toBe(false);
    c.owned.push('petSign');
    expect(seen(c)).toBe(true);
  });

  it('repairs restore worn machines; worn machines malfunction', () => {
    const c = newCareer();
    c.condition.clipper = 10;
    c.money = 1_000_000;
    const s = createRound('tuan', 1, { ctx: { condition: { clipper: 10 } } });
    startCutting(s);
    s.nextTurnCheck = 1e9;
    s.nextPhotoAt = 1e9;
    drag(s, 'clipper', { x: 60, y: 300 }, { x: 60, y: 300 }, 1);
    setTool(s, 'clipper');
    pointerDown(s, { x: 40, y: 330 });
    run(s, 4.5);
    pointerUp(s);
    expect(s.events.malfunction).toBe(1);
    expect(repair(c).ok).toBe(true);
    expect(c.condition.clipper).toBe(100);
  });
});

describe('daily events have causes', () => {
  it('power cut on day 4 blocks electric tools unless there is a generator', () => {
    const c = newCareer();
    c.day = 4;
    c.owned.push('storm');
    c.pending = [];
    nextDay(c);
    c.day = 4;
    c.today.events = [];
    // Re-plan day 4 directly.
    c.day = 3;
    nextDay(c);
    expect(c.today.events.some((e) => e.id === 'powerCut' && e.cause.length > 10)).toBe(true);
    const s = createRound(c.today.queue[0].customer, 1, { unlocked: careerTools(c), ctx: roundContext(c) });
    startCutting(s);
    expect(setTool(s, 'dryer')).toBe(false);
    expect(setTool(s, 'scissors')).toBe(true);
    c.owned.push('generator');
    const g = createRound(c.today.queue[0].customer, 1, { unlocked: careerTools(c), ctx: roundContext(c) });
    startCutting(g);
    expect(setTool(g, 'dryer')).toBe(true);
  });

  it('a messy day (dog shaking fur) brings a hygiene inspection and a fine', () => {
    const c = newCareer();
    c.today.queue = [{ customer: 'tuan', reason: 'walkin', note: '' }];
    playDay(c);
    c.today.mess = 60;
    const sum = endDay(c);
    expect(sum.mess).toBe(60);
    nextDay(c);
    expect(c.today.events.some((e) => e.id === 'inspection')).toBe(true);
    playDay(c);
    expect(c.lastSummary!.costs.some((x) => x.label.includes('Phạt'))).toBe(true);
  });
});

describe('tool interactions (shop items)', () => {
  const g = (id = 'tuan', items: string[] = []) => {
    const s = createRound(id, 3, { unlocked: ['potion', 'gel', 'storm', 'auto'], ctx: { items, stock: { potion: 3, gel: 3 } } });
    startCutting(s);
    s.nextTurnCheck = 1e9;
    s.nextPhotoAt = 1e9;
    return s;
  };

  it('Thuốc mọc tóc + tông đơ: the hair grows back while being cut', () => {
    const s = g();
    tap(s, 'potion', { x: 110, y: 200 });
    for (let i = 0; i < 6; i++) {
      drag(s, 'clipper', { x: 70, y: 180 + i * 8 }, { x: 150, y: 200 + i * 8 }, 10);
      run(s, 0.3);
    }
    expect(s.events.growRace).toBe(1);
    expect(s.stock.potion).toBe(2);
  });

  it('Thuốc mọc tóc regrows bald roots; out of stock = refused', () => {
    const s = g();
    const t = s.hair.tufts.find((x) => x.kind === 'crown')!;
    t.bald = true;
    t.len = 0;
    tap(s, 'potion', t.root);
    run(s, 2);
    expect(t.bald).toBe(false);
    expect(t.len).toBeGreaterThan(20);
    s.stock.potion = 0;
    const before = s.hair.tufts.map((x) => x.grow).join();
    run(s, 1);
    tap(s, 'potion', { x: 280, y: 200 });
    expect(s.deniedAt).toBeGreaterThan(0);
    void before;
  });

  it('Keo vĩnh cửu + Máy Sấy Bão: concrete antennas; storm without gel does not', () => {
    const plain = g();
    drag(plain, 'storm', { x: 100, y: 200 }, { x: 260, y: 200 });
    expect(plain.events.concreteSpikes).toBeUndefined();
    const s = g();
    tap(s, 'gel', { x: 200, y: 150 });
    run(s, 0.6);
    tap(s, 'gel', { x: 140, y: 170 });
    drag(s, 'storm', { x: 100, y: 200 }, { x: 260, y: 200 });
    expect(s.events.concreteSpikes).toBe(1);
    expect(s.hair.tufts.filter((t) => t.eternal && t.spiked).length).toBeGreaterThanOrEqual(8);
  });

  it('Máy tạo kiểu tự động: tidy when calm, mishears in a chaotic shop', () => {
    const calm = g('tuan');
    tap(calm, 'auto', { x: 200, y: 200 });
    expect(calm.events.autoMisread).toBeUndefined();
    finish(calm, 'done');
    expect(calm.result!.sat).toBeGreaterThan(60);
    const loud = g('tuan');
    loud.incident = 60;
    run(loud, 0.3);
    tap(loud, 'auto', { x: 200, y: 200 });
    expect(loud.events.autoMisread).toBe(1);
  });
});

describe('save / load', () => {
  it('round-trips through storage and survives a corrupt save via the backup', () => {
    const store = memoryStore();
    const c = newCareer();
    c.money = 123456;
    saveCareer(c, store);
    c.money = 777;
    saveCareer(c, store); // previous save becomes the backup
    expect(loadCareer(store)!.money).toBe(777);
    store.setItem(SAVE_KEY, '{broken json');
    expect(loadCareer(store)!.money).toBe(123456);
  });

  it('rejects saves from another version', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, JSON.stringify({ v: 99, day: 1 }));
    expect(loadCareer(store)).toBeNull();
  });
});
