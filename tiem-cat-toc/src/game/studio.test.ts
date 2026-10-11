import { describe, expect, it } from 'vitest';
import { measureHair } from './metrics';
import { pointerDown, pointerMove, pointerUp, setTool, tick } from './session';
import { BOOK_MAX, brush, carve, creationHair, deleteFromBook, loadBook, openCreation, pushUndo, redo, resetHair, saveToBook, snapCreation, studioRound, undo } from './studio';
import { mixColor } from './art';

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
const photo = { mood: 'happy' as const, bg: 'neon' as const, frame: 'gold' as const, stickers: [{ id: 'fire', x: 80, y: 120 }] };

describe('Xưởng Tạo Kiểu', () => {
  it('has every tool, no clock and a model who never loses patience or moves', () => {
    const s = studioRound('vosu');
    expect(s.phase).toBe('cutting');
    expect(s.unlocked).toContain('ray');
    expect(s.unlocked).toContain('wand');
    expect(s.timeLimit).toBe(Infinity);
    for (let t = 0; t < 200; t += 1 / 30) tick(s, 1 / 30);
    expect(s.patience).toBe(100);
    expect(s.motion).toBeNull();
    expect(s.phase).toBe('cutting');
  });

  it('brush dyes without changing length; blend fades top → bottom', () => {
    const s = studioRound('tuan');
    const len = measureHair(s.hair).avg;
    s.art.colorA = '#ff0000';
    s.art.colorB = '#0000ff';
    s.art.blend = true;
    for (const p of [{ x: 200, y: 160 }, { x: 130, y: 230 }, { x: 270, y: 230 }]) brush(s, p);
    const m = measureHair(s.hair);
    expect(m.tintedFrac).toBeGreaterThan(0.1);
    expect(m.avg).toBeCloseTo(len, 5);
    expect(m.colorCount).toBeGreaterThan(1);
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('stencils carve a pattern into the scalp, only on the head', () => {
    const s = studioRound('tuan');
    s.art.stencil = 'bolt';
    expect(carve(s, { x: 200, y: 175 })).not.toBeNull();
    expect(s.hair.carvings).toHaveLength(1);
    expect(s.hair.tufts.some((t) => t.len === 2)).toBe(true);
    expect(carve(s, { x: 30, y: 30 })).toBeNull();
    s.art.stencil = 'text';
    s.art.text = 'abc';
    expect(carve(s, { x: 200, y: 190 })!.text).toBe('ABC');
  });

  it('undo / redo walk through strokes, carvings and resets', () => {
    const s = studioRound('tuan');
    const L0 = measureHair(s.hair).avg;
    pushUndo(s);
    setTool(s, 'scissors');
    pointerDown(s, { x: 90, y: 240 });
    for (let k = 1; k <= 20; k++) {
      pointerMove(s, { x: 90 + k * 11, y: 240 });
      tick(s, 1 / 60);
    }
    pointerUp(s);
    const L1 = measureHair(s.hair).avg;
    expect(L1).toBeLessThan(L0);
    pushUndo(s);
    carve(s, { x: 200, y: 175 });
    expect(undo(s)).toBe(true);
    expect(s.hair.carvings ?? []).toHaveLength(0);
    expect(measureHair(s.hair).avg).toBeCloseTo(L1, 5);
    expect(undo(s)).toBe(true);
    expect(measureHair(s.hair).avg).toBeCloseTo(L0, 5);
    expect(undo(s)).toBe(false);
    expect(redo(s)).toBe(true);
    expect(measureHair(s.hair).avg).toBeCloseTo(L1, 5);
    resetHair(s);
    expect(measureHair(s.hair).avg).toBeCloseTo(L0, 5);
    expect(undo(s)).toBe(true);
    expect(measureHair(s.hair).avg).toBeCloseTo(L1, 5);
  });

  it('saves to the book and reopens the exact creation (hair, carvings, persona, photo)', () => {
    const store = memoryStore();
    const s = studioRound('khoa');
    s.art.colorA = '#00ff00';
    brush(s, { x: 200, y: 160 });
    carve(s, { x: 200, y: 175 });
    const c = snapCreation(s, 'Tên của tôi', 'Chú thích', photo);
    expect(saveToBook(c, store)).toBe(true);
    const book = loadBook(store);
    expect(book).toHaveLength(1);
    expect(book[0].name).toBe('Tên của tôi');
    const h = creationHair(book[0]);
    expect(h.carvings).toHaveLength(1);
    expect(measureHair(h).tintedFrac).toBeCloseTo(measureHair(s.hair).tintedFrac, 5);
    const r = openCreation(book[0]);
    expect(r.baseCustomer.id).toBe('khoa');
    expect(r.studio).toBeTruthy();
    // Saving again with the same id replaces it; the book is capped.
    saveToBook({ ...c, name: 'Sửa lại' }, store);
    expect(loadBook(store)).toHaveLength(1);
    for (let i = 0; i < BOOK_MAX + 5; i++) saveToBook({ ...c, id: `x${i}` }, store);
    expect(loadBook(store)).toHaveLength(BOOK_MAX);
    deleteFromBook('x0', store);
    expect(loadBook(store).some((x) => x.id === 'x0')).toBe(false);
  });

  it('a corrupt book loads as empty', () => {
    const store = memoryStore();
    store.setItem('tctbo-studio-book', '{oops');
    expect(loadBook(store)).toEqual([]);
  });
});
