import { describe, expect, it } from 'vitest';
import { BOSSES, CareerState, applyRound, careerTools, endDay, newCareer, nextDay, planDay, roundContext } from './career';
import { customerById } from './customers';
import { Album, ALBUM_SIZE, recordAlbum } from './album';
import { RoundState, createRound, finish, pointerDown, pointerMove, pointerUp, setTool, startCutting, tick, transform } from './session';

const FRAME = 1 / 60;
const run = (s: RoundState, sec: number) => {
  for (let t = 0; t < sec; t += FRAME) tick(s, FRAME);
};
function startRound(c: CareerState): RoundState {
  const q = c.today.queue[c.today.index];
  const s = createRound(q.customer, 100 + c.day * 10 + c.today.index, { unlocked: careerTools(c), ctx: roundContext(c) });
  startCutting(s);
  s.nextTurnCheck = 1e9;
  s.nextPhotoAt = 1e9;
  s.nextBehaviorAt = 1e9;
  return s;
}
function trim(s: RoundState) {
  setTool(s, 'scissors');
  pointerDown(s, { x: 110, y: 232 });
  for (let k = 1; k <= 30; k++) {
    pointerMove(s, { x: 110 + (180 * k) / 30, y: 232 });
    tick(s, FRAME);
  }
  pointerUp(s);
}

describe('nhiệm vụ trong ngày', () => {
  it('every day has up to three goals with rewards', () => {
    const c = newCareer();
    expect(c.today.quests!.length).toBe(3);
    for (const q of c.today.quests!) expect(q.reward.money).toBeGreaterThan(0);
  });

  it('a reached goal pays immediately and shows on the summary', () => {
    const c = newCareer();
    c.today.quests = [{ id: 'earn', label: 'Thu ít nhất 1đ', goal: 1, progress: 0, failed: false, done: false, reward: { money: 50000 } }];
    c.today.phase = 'open';
    const s = startRound(c);
    trim(s);
    finish(s, 'done');
    run(s, 0.1);
    s.result!.paid = 60000;
    const before = c.money;
    const sv = applyRound(c, s);
    expect(sv.quests).toEqual(['Thu ít nhất 1đ']);
    expect(c.money).toBe(before + sv.paid + sv.tip + 50000);
    while (c.today.index < c.today.queue.length) {
      const r = startRound(c);
      finish(r, 'done');
      applyRound(c, r);
    }
    const sum = endDay(c);
    expect(sum.questMoney).toBe(50000);
    expect(sum.quests![0].done).toBe(true);
  });

  it('"no bald" fails the moment someone is shaved and pays nothing at closing', () => {
    const c = newCareer();
    c.today.quests = [{ id: 'noBald', label: 'x', goal: 1, progress: 0, failed: false, done: false, reward: { money: 50000 } }];
    const s = startRound(c);
    setTool(s, 'clipper');
    pointerDown(s, { x: 200, y: 165 });
    run(s, 1.5);
    pointerUp(s);
    s.walkout = null;
    if (s.phase === 'cutting') finish(s, 'done');
    applyRound(c, s);
    expect(c.today.quests![0].failed).toBe(true);
    const sum = endDay(c);
    expect(sum.questMoney ?? 0).toBe(0);
  });
});

describe('khách trùm cuối tuần', () => {
  it('every seventh day ends with a boss, in rotation, with a boss goal', () => {
    const c = newCareer();
    for (const day of [7, 14]) {
      c.day = day;
      planDay(c);
      const last = c.today.queue[c.today.queue.length - 1];
      expect(last.reason).toBe('boss');
      expect(last.customer).toBe(BOSSES[(day / 7 - 1) % BOSSES.length]);
      expect(c.today.quests![0].id).toBe('boss');
    }
    c.day = 8;
    planDay(c);
    expect(c.today.queue.some((q) => q.reason === 'boss')).toBe(false);
  });

  it('bosses reveal their request one step at a time and pay by steps met', () => {
    const s = createRound('chure', 5);
    startCutting(s);
    s.nextTurnCheck = 1e9;
    expect(s.requestText).toBe(customerById('chure').stages![0].say);
    expect(s.stage).toBe(0);
    // Step 1: short sides.
    for (const t of s.hair.tufts) if (t.zone === 'left' || t.zone === 'right') t.len = t.origLen * 0.5;
    trim(s);
    expect(s.stage).toBeGreaterThanOrEqual(1);
    const partial = s.stage;
    finish(s, 'done');
    const none = createRound('chure', 5);
    startCutting(none);
    finish(none, 'done');
    expect(s.result!.sat).toBeGreaterThan(none.result!.sat);
    expect(partial).toBeLessThan(customerById('chure').stages!.length);
  });

  it('bosses never walk in on their own', () => {
    const c = newCareer();
    for (let d = 1; d <= 6; d++) {
      expect(c.today.queue.some((q) => BOSSES.includes(q.customer))).toBe(false);
      nextDay(c);
    }
  });
});

describe('album Gương Thần', () => {
  it('records each customer × persona once, keeping the best score', () => {
    const a: Album = {};
    const s = createRound('ti', 2, { mirror: true });
    startCutting(s);
    transform(s, 'giangho');
    finish(s, 'done');
    expect(recordAlbum(a, s)).toBe(true);
    expect(Object.keys(a)).toEqual(['ti:giangho']);
    expect(recordAlbum(a, s)).toBe(false);
    const plain = createRound('ti', 2);
    startCutting(plain);
    finish(plain, 'done');
    expect(recordAlbum(a, plain)).toBe(false);
    expect(ALBUM_SIZE).toBeGreaterThanOrEqual(13 * 6);
  });
});
