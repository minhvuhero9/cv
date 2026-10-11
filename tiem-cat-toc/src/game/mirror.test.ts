import { describe, expect, it } from 'vitest';
import { CUSTOMERS } from './customers';
import { PERSONAS, applyLook } from './mirror';
import { measureHair } from './metrics';
import { RoundState, canTransform, createRound, finish, startCutting, tick, transform } from './session';
import { newCareer, sanitizeCareer } from './career';

const FRAME = 1 / 60;
function game(id: string, mirror = true, ctx = {}) {
  const s = createRound(id, 7, { mirror, ctx });
  startCutting(s);
  s.nextTurnCheck = 1e9;
  s.nextPhotoAt = 1e9;
  return s;
}
/** Cut every tuft to the persona's target ratio (a perfect barber). */
function cutTo(s: RoundState) {
  const target = s.customer.target!;
  for (const t of s.hair.tufts) if (!t.bald) t.len = t.origLen * Math.min(1, target[t.zone]);
}

describe('Gương Thần Biến Hình', () => {
  it('has six fictional personas with their own look, lines and verdicts', () => {
    expect(PERSONAS.length).toBeGreaterThanOrEqual(6);
    for (const p of PERSONAS) {
      expect(p.look.body?.collar).toBeTruthy();
      expect(p.entrance.length).toBeGreaterThan(0);
      expect(Object.keys(p.lines).length).toBeGreaterThanOrEqual(3);
      expect(p.mirror.love.length).toBeGreaterThan(0);
    }
    // No two personas share the same outfit + headwear + prop combination.
    const sig = new Set(PERSONAS.map((p) => `${p.look.body?.collar}|${p.look.hat}|${p.look.prop}`));
    expect(sig.size).toBe(PERSONAS.length);
  });

  it('only works when the mirror is available, once, and never on the dog', () => {
    expect(canTransform(game('tuan', false))).toBe(false);
    const s = game('tuan');
    expect(transform(s, 'giangho')).toBe(true);
    expect(s.persona).toBe('giangho');
    expect(transform(s, 'idol')).toBe(false);
    expect(s.persona).toBe('giangho');
    const d = game('vang');
    expect(transform(d, 'idol')).toBe(false);
    expect(d.persona).toBeNull();
  });

  it('changes look, hair, lines and adds chaos, keeping the customer id', () => {
    const s = game('khoa');
    const chaos = s.chaos;
    transform(s, 'tocdung');
    expect(s.customer.id).toBe('khoa');
    expect(s.customer.look.body?.collar).toBe('jacket');
    expect(s.customer.look.face?.jaw).toBe('pointed'); // still Khoa's own face
    expect(s.hair.head.rx).toBe(s.before.head.rx);
    expect(measureHair(s.hair).spikedFrac).toBeGreaterThan(0.2);
    expect(s.chaos).toBeGreaterThan(chaos);
    expect(s.events.transform).toBe(1);
    expect(s.customer.lines?.gelSpikes?.length).toBeGreaterThan(0);
  });

  it('cutting to the persona outline pleases a fan; the result names the persona', () => {
    const s = game('ti');
    transform(s, 'giangho');
    cutTo(s);
    for (let t = 0; t < 0.5; t += FRAME) tick(s, FRAME);
    finish(s, 'done');
    expect(s.result!.sat).toBeGreaterThanOrEqual(70);
    expect(s.result!.style.name).toMatch(/Phông Bạt/);
  });

  it('Bé Ba Hóa Thân only loves the persona they asked for', () => {
    const ok = game('hoathan', true, { wantPersona: 'idol' });
    expect(ok.bubble?.text).toMatch(/Idol Livestream/);
    transform(ok, 'idol');
    cutTo(ok);
    finish(ok, 'done');
    const wrong = game('hoathan', true, { wantPersona: 'idol' });
    transform(wrong, 'daigia');
    cutTo(wrong);
    finish(wrong, 'done');
    const none = game('hoathan', true, { wantPersona: 'idol' });
    finish(none, 'done');
    expect(ok.result!.sat).toBeGreaterThanOrEqual(75);
    expect(wrong.result!.sat).toBeLessThan(50);
    expect(none.result!.sat).toBeLessThan(40);
  });

  it('applyLook keeps the face shape and replaces the outfit', () => {
    const vip = CUSTOMERS.find((c) => c.id === 'vip')!;
    const l = applyLook(vip.look, PERSONAS[0].look);
    expect(l.face?.jaw).toBe('wide');
    expect(l.body?.collar).toBe(PERSONAS[0].look.body?.collar);
  });
});

describe('distinct customer designs', () => {
  const humans = CUSTOMERS.filter((c) => c.look.species !== 'dog');
  it('every human customer has a face and body spec', () => {
    for (const c of humans) {
      expect(c.look.face, c.id).toBeTruthy();
      expect(c.look.body?.collar, c.id).toBeTruthy();
    }
  });
  it('no two customers share a build (head size, jaw, eyes, nose, collar)', () => {
    const sig = humans.map((c) => [c.hair.head?.rx ?? 86, c.hair.head?.ry ?? 100, c.look.face?.jaw, c.look.face?.eyes, c.look.face?.nose, c.look.body?.collar].join('|'));
    expect(new Set(sig).size).toBe(humans.length);
  });
  it('every pair differs in at least three identifying features', () => {
    const feats = (c: (typeof humans)[number]) => [
      `head:${c.hair.head?.rx ?? 86}x${c.hair.head?.ry ?? 100}`,
      `jaw:${c.look.face?.jaw ?? 'oval'}`,
      `eyes:${c.look.face?.eyes ?? 'bean'}`,
      `nose:${c.look.face?.nose ?? 'hook'}`,
      `brows:${c.look.face?.brows ?? 'normal'}`,
      `rest:${c.look.face?.rest ?? 'smile'}`,
      `collar:${c.look.body?.collar}`,
      `shoulders:${c.look.body?.shoulders ?? 1}`,
      `hat:${c.look.hat ?? c.look.headband ?? '-'}`,
      `prop:${c.look.prop ?? '-'}`,
      `hairColor:${c.look.hairColor}`,
      `idle:${c.look.body?.idle ?? 'still'}`,
    ];
    for (let i = 0; i < humans.length; i++)
      for (let j = i + 1; j < humans.length; j++) {
        const a = feats(humans[i]);
        const b = feats(humans[j]);
        const diff = a.filter((f, k) => f !== b[k]).length;
        expect(diff, `${humans[i].id} vs ${humans[j].id}`).toBeGreaterThanOrEqual(6);
      }
  });
  it('the hair grows on each customer’s own skull', () => {
    const teo = createRound('teo', 1);
    const phuc = createRound('phuc', 1);
    expect(teo.hair.head.ry).toBeLessThan(phuc.hair.head.ry);
    const top = (s: RoundState) => Math.min(...s.hair.tufts.map((t) => t.root.y));
    expect(top(phuc)).toBeLessThan(top(teo));
    for (const s of [teo, phuc])
      for (const t of s.hair.tufts) {
        const u = (t.root.x - s.hair.head.cx) / s.hair.head.rx;
        const v = (t.root.y - s.hair.head.cy) / s.hair.head.ry;
        expect(u * u + v * v).toBeLessThanOrEqual(1.02);
      }
  });
});

describe('old saves', () => {
  it('a save that still has the removed alien customer loads cleanly', () => {
    const c = newCareer();
    c.today.queue = [
      { customer: 'tuan', reason: 'walkin', note: '' },
      { customer: 'alien', reason: 'walkin', note: '' },
    ];
    c.today.index = 1;
    c.pending = [{ customer: 'alien', reason: 'loyal', day: 3, note: '' }];
    c.returnHair = { alien: [] };
    c.history = { alien: { day: 1, styleId: 'x', sat: 90, tier: 'love' } };
    const s = sanitizeCareer(JSON.parse(JSON.stringify(c)));
    expect(s.today.queue[1].customer).toBe('tuan');
    expect(s.pending).toHaveLength(0);
    expect(s.returnHair.alien).toBeUndefined();
    expect(s.history.alien).toBeUndefined();
  });
});
