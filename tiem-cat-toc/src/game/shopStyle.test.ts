import { describe, expect, it } from 'vitest';
import { ArtSettings, carveHair } from './art';
import { creationHair, snapCreation } from './creation';
import { designOrder, designScore } from './design';
import { createRound } from './session';
import { DEFAULT_NAME, NAME_MAX, arrange, cleanName, decorIds, defaultLook, moveDecor, packChallenge, toggleDecor, unpackChallenge } from './shopStyle';

describe('tiệm của riêng bạn', () => {
  it('names are trimmed, capped, and never empty', () => {
    expect(cleanName('   Tiệm   Anh  Ba  ')).toBe('Tiệm Anh Ba');
    expect(cleanName('')).toBe(DEFAULT_NAME);
    expect(cleanName('x'.repeat(80)).length).toBe(NAME_MAX);
  });

  it('wall items: only what the shop has, in the player order, hidden ones taken down', () => {
    const ids = decorIds(['plant', 'award', 'wand'], 2, 1);
    expect(ids).toEqual(['works', 'trophies', 'award', 'plant']);
    let look = defaultLook();
    expect(arrange(ids, look)).toEqual(ids);
    look = moveDecor(ids, look, 'plant', 0);
    expect(arrange(ids, look)).toEqual(['plant', 'works', 'trophies', 'award']);
    look = moveDecor(ids, look, 'works', 3);
    expect(arrange(ids, look)).toEqual(['plant', 'trophies', 'award', 'works']);
    look = toggleDecor(look, 'trophies');
    expect(arrange(ids, look)).toEqual(['plant', 'award', 'works']);
    look = toggleDecor(look, 'trophies');
    expect(arrange(ids, look)).toContain('trophies');
    // A newly bought item appears at the end.
    expect(arrange(decorIds(['plant', 'award', 'bench'], 2, 1), look).at(-1)).toBe('bench');
  });
});

describe('thách bạn bè', () => {
  function design() {
    const s = createRound('tuan', 3);
    s.hair.tufts.forEach((t, i) => {
      if (t.zone === 'left' || t.zone === 'right') t.len = t.origLen * 0.4;
      if (t.zone === 'top' && i % 2) t.tint = '#ff3fa4';
    });
    const art: ArtSettings = { colorA: '#000', colorB: '#000', blend: false, stencil: 'text', text: 'TÓC', size: 0.7 };
    carveHair(s.hair, art, { x: s.hair.head.cx + 50, y: s.hair.head.cy - 20 });
    return snapCreation(s, 'Mẫu của Lan', '', { mood: 'happy', bg: 'salon', frame: 'none', stickers: [] });
  }

  it('a design survives the trip through a short link', () => {
    const c = design();
    const code = packChallenge(c);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeLessThan(2500);
    const back = unpackChallenge(code)!;
    expect(back.name).toBe('Mẫu của Lan');
    expect(back.customer).toBe('tuan');
    expect(back.carvings[0].text).toBe('TÓC');
    // Copying the original exactly scores (almost) 100 against the unpacked design.
    const order = designOrder(back, 'tuan');
    expect(designScore(order, creationHair(c))).toBeGreaterThanOrEqual(95);
  });

  it('broken or foreign codes are refused', () => {
    expect(unpackChallenge('not-a-code')).toBeNull();
    expect(unpackChallenge(btoa(JSON.stringify({ v: 1, n: 'x', c: 'nobody', t: '1', k: [] })))).toBeNull();
  });
});
