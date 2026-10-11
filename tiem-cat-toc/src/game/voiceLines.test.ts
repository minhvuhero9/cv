import { describe, expect, it } from 'vitest';
import { CUSTOMERS, customerById } from './customers';
import { RoundState, Tool, beg, createRound, finish, pointerDown, pointerMove, pointerUp, setTool, startCutting, tick } from './session';
import { unlockedTools } from './tools';
import { allVoiceLines, linesFor, speakable } from './voiceLines';

const ALL = unlockedTools({ rounds: 0, styles: [], events: [] }, true);
const FRAME = 1 / 60;

describe('voice line catalogue', () => {
  it('new customers never borrow the classic three’s personal lines', () => {
    const linh = linesFor(customerById('linh')).map((l) => l.text);
    expect(linh.some((t) => /Chú cắt ở đây|bố cháu|người yêu cũ/i.test(t))).toBe(false);
    const vang = linesFor(customerById('vang')).map((l) => l.text);
    expect(vang.every((t) => /Gâu|Ẳng|Grừ|Ư ử|Khịt|HẮT|Bà Hai|Cậu Vàng|\(/.test(t))).toBe(true);
  });

  it('speakable() keeps the words and drops typography', () => {
    expect(speakable('Gâu! (Bà Hai: “Đẹp chưa kìa!”)')).toBe('Gâu!, Bà Hai: Đẹp chưa kìa!,');
    expect(speakable('Khò… khò…')).toBe('Khò, khò,');
  });

  it('every line said during play is in the catalogue (except numeric templates)', () => {
    const catalogue = new Set(allVoiceLines().map((l) => `${l.speaker}|${l.text}`));
    const missing = new Set<string>();
    const tools: Tool[] = ALL;
    for (const c of CUSTOMERS) {
      for (let seed = 1; seed <= 3; seed++) {
        const s: RoundState = createRound(c.id, seed, { unlocked: ALL, ctx: { stock: { potion: 5, gel: 5 }, dayEvents: ['foodStall'] } });
        startCutting(s);
        let r = seed * 7 + c.id.length;
        const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
        let lastBubble: unknown = null;
        const record = () => {
          if (s.bubble && s.bubble !== lastBubble) {
            lastBubble = s.bubble;
            const key = `${c.id}|${s.bubble.text}`;
            if (!catalogue.has(key) && !/\d/.test(s.bubble.text) && s.bubble.text !== '…') missing.add(key);
          }
        };
        while (s.phase !== 'result') {
          if (s.walkout?.canBeg) beg(s);
          if (s.phase === 'cutting') {
            setTool(s, tools[Math.floor(rnd() * tools.length)]);
            pointerDown(s, { x: 80 + rnd() * 240, y: 100 + rnd() * 220 });
            for (let i = 0; i < 25; i++) {
              pointerMove(s, { x: 80 + rnd() * 240, y: 100 + rnd() * 220 });
              tick(s, FRAME);
              record();
            }
            pointerUp(s);
            if (s.time > 30) finish(s, 'done');
          }
          for (let i = 0; i < 20; i++) {
            tick(s, FRAME);
            record();
          }
        }
      }
    }
    expect([...missing]).toEqual([]);
  });
});
