import { describe, expect, it } from 'vitest';
import { careerKit, fullKit, BASIC_COLORS } from './art';
import { careerTools, newCareer, planDay } from './career';
import { customerById } from './customers';
import { designOrder, designScore } from './design';
import { snapCreation, studioRound, brush, carve } from './studio';
import { createRound, finish, pointerDown, pointerMove, pointerUp, setTool, startCutting, tick, RoundState } from './session';
import { measureHair } from './metrics';

const FRAME = 1 / 60;
function round(id: string, opts = {}) {
  const s = createRound(id, 3, { onlyTools: ['scissors', 'clipper', 'dryer', 'brush', 'stencil'], ...opts });
  startCutting(s);
  s.nextTurnCheck = 1e9;
  s.nextPhotoAt = 1e9;
  s.nextBehaviorAt = 1e9;
  return s;
}
function stroke(s: RoundState, pts: { x: number; y: number }[]) {
  pointerDown(s, pts[0]);
  for (const p of pts.slice(1)) {
    pointerMove(s, p);
    tick(s, FRAME);
  }
  pointerUp(s);
}
const photo = { mood: 'happy' as const, bg: 'salon' as const, frame: 'none' as const, stickers: [] };

describe('đồ nghề sáng tạo trong ván thật', () => {
  it('Cọ Nhuộm dyes and Khuôn Cạo carves through the normal pointer flow', () => {
    const s = round('ti');
    setTool(s, 'brush');
    stroke(s, [{ x: 150, y: 170 }, { x: 200, y: 160 }, { x: 250, y: 170 }]);
    expect(s.metrics.tintedFrac).toBeGreaterThan(0.05);
    setTool(s, 'stencil');
    stroke(s, [{ x: 200, y: 175 }]);
    expect(s.metrics.carvingCount).toBe(1);
  });

  it('the career kit is what the shop sold', () => {
    const basic = careerKit([]);
    expect(basic.colors).toEqual(BASIC_COLORS);
    expect(basic.custom).toBe(false);
    expect(basic.stencils).toEqual(['bolt', 'star', 'stripes']);
    const pro = careerKit(['paletteXL', 'stencilPro']);
    expect(pro.custom).toBe(true);
    expect(pro.stencils).toContain('text');
    expect(fullKit().colors.length).toBe(10);
    const c = newCareer();
    expect(careerTools(c)).not.toContain('brush');
    c.owned.push('brush', 'stencil');
    expect(careerTools(c)).toEqual(expect.arrayContaining(['brush', 'stencil']));
  });

  it('art lovers pay for patterns, strict customers punish them', () => {
    const score = (id: string, carved: boolean) => {
      const s = round(id);
      if (carved) {
        setTool(s, 'stencil');
        stroke(s, [{ x: 200, y: 175 }]);
        stroke(s, [{ x: 150, y: 190 }]);
      }
      finish(s, 'done');
      return s.result!.sat;
    };
    expect(customerById('ti').artTaste).toBeGreaterThan(0);
    expect(customerById('bay').artTaste).toBeLessThan(0);
    expect(score('ti', true)).toBeGreaterThan(score('ti', false));
    expect(score('bay', true)).toBeLessThan(score('bay', false));
  });

  it('art gets its own hairstyle names', () => {
    const s = round('teo');
    setTool(s, 'stencil');
    s.art.stencil = 'text';
    s.art.text = 'tèo';
    stroke(s, [{ x: 200, y: 185 }]);
    finish(s, 'done');
    expect(s.result!.style.id).toBe('signature');
  });
});

describe('cuốn mẫu: khách đặt theo mẫu bạn tạo', () => {
  function makeDesign() {
    const st = studioRound('khoa');
    st.art.colorA = '#18c8ff';
    for (const p of [{ x: 150, y: 170 }, { x: 200, y: 160 }, { x: 250, y: 170 }]) brush(st, p);
    carve(st, { x: 200, y: 175 });
    return snapCreation(st, 'Sét Xanh', '', photo, 'd1');
  }

  it('from day 2 one customer a day orders a design', () => {
    const c = newCareer();
    c.day = 2;
    planDay(c, [{ id: 'd1', customer: 'khoa', name: 'Sét Xanh' }]);
    const q = c.today.queue.find((x) => x.reason === 'design');
    expect(q?.customer).toBe('khoa');
    expect(q?.designId).toBe('d1');
    // Odd days (and day 1) order a built-in template instead.
    c.day = 1;
    planDay(c, [{ id: 'd1', customer: 'khoa', name: 'Sét Xanh' }]);
    const t = c.today.queue.filter((x) => x.reason === 'design');
    expect(t).toHaveLength(1);
    expect(t[0].templateId).toBeTruthy();
    expect(t[0].designId).toBeUndefined();
  });

  it('copying the design scores high, ignoring it scores low', () => {
    const d = makeDesign();
    const o = designOrder(d);
    expect(designScore(o, o.hair)).toBeGreaterThanOrEqual(95);
    const plain = createRound('khoa', 3);
    expect(designScore(o, plain.hair)).toBeLessThan(60);
  });

  it('a design round shows the design, checks colour and pattern, and pays more', () => {
    const d = makeDesign();
    const s = round('khoa', { ctx: { design: d } });
    expect(s.design).not.toBeNull();
    expect(s.requestText).toContain('Sét Xanh');
    expect(s.customer.pay.base).toBeGreaterThan(customerById('khoa').pay.base);
    // Do the design: same colour, same pattern.
    s.art.colorA = '#18c8ff';
    setTool(s, 'brush');
    stroke(s, [{ x: 150, y: 170 }, { x: 200, y: 160 }, { x: 250, y: 170 }]);
    setTool(s, 'stencil');
    s.art.stencil = 'bolt';
    stroke(s, [{ x: 200, y: 175 }]);
    finish(s, 'done');
    const good = s.result!.sat;
    const lazy = round('khoa', { ctx: { design: d } });
    finish(lazy, 'done');
    expect(good).toBeGreaterThan(lazy.result!.sat + 20);
    expect(measureHair(s.hair).carvingCount).toBe(1);
  });
});

describe('cuốn mẫu trên đầu người khác', () => {
  it('a design made on one model can be ordered by another customer', async () => {
    const { creationHairOn } = await import('./creation');
    const st = studioRound('khoa');
    st.art.colorA = '#18c8ff';
    for (const p of [{ x: 150, y: 170 }, { x: 200, y: 160 }, { x: 250, y: 170 }]) brush(st, p);
    carve(st, { x: 200, y: 175 });
    const d = snapCreation(st, 'Sét Xanh', '', photo, 'd2');
    const on = creationHairOn(d, 'teo');
    expect(on.head.ry).toBe(createRound('teo', 1).hair.head.ry);
    expect(measureHair(on).tintedFrac).toBeGreaterThan(0.05);
    expect(on.carvings).toHaveLength(1);
    const o = designOrder(d, 'teo');
    expect(designScore(o, o.hair)).toBeGreaterThanOrEqual(95);
    // The model is busy (already queued): someone else orders it.
    const c = newCareer();
    c.day = 2;
    c.pending = [{ customer: 'khoa', reason: 'loyal', day: 2, note: '' }];
    planDay(c, [{ id: 'd2', customer: 'khoa', name: 'Sét Xanh' }]);
    const q = c.today.queue.find((x) => x.reason === 'design');
    expect(q).toBeTruthy();
    expect(q!.customer).not.toBe('khoa');
  });
});
