import type { CareerState, Served } from './career';
import type { Rng } from './rng';
import type { RoundState } from './session';

/**
 * Nhiệm vụ trong ngày: three small goals each morning, checked against what really
 * happened in each round. Rewards are paid the moment a goal is reached; goals that can
 * only be judged at closing time ("không cạo trọc ai") are settled in endDay.
 */
export interface Quest {
  id: QuestId;
  label: string;
  goal: number;
  progress: number;
  /** Failed for good today (e.g. somebody got shaved). */
  failed: boolean;
  done: boolean;
  reward: { money: number; rep?: number; viral?: number };
}

export type QuestId = 'happy' | 'noBald' | 'mirrorRight' | 'newStyle' | 'fast' | 'chaosKeep' | 'earn' | 'calmDog' | 'boss';

interface QuestDef {
  id: QuestId;
  make(c: CareerState): Omit<Quest, 'progress' | 'failed' | 'done'> | null;
  /** Progress after a round (absolute value), or 'fail'. */
  onRound?(q: Quest, s: RoundState, served: Served, c: CareerState): number | 'fail';
  /** Settled at closing: true = reached. */
  atClose?(q: Quest, c: CareerState): boolean;
}

const QUESTS: QuestDef[] = [
  {
    id: 'happy',
    make: (c) => {
      const n = Math.min(3, Math.max(2, Math.floor(c.today.queue.length / 2)));
      return { id: 'happy', label: `Làm ${n} khách hài lòng trở lên`, goal: n, reward: { money: 40000 + n * 10000, rep: 1 } };
    },
    onRound: (q, _s, sv) => q.progress + (!sv.walkedOut && (sv.tier === 'love' || sv.tier === 'ok') ? 1 : 0),
  },
  {
    id: 'noBald',
    make: () => ({ id: 'noBald', label: 'Không cạo trọc mảng nào cả ngày', goal: 1, reward: { money: 50000, rep: 2 } }),
    onRound: (q, s) => (s.events.baldPatch ? 'fail' : q.progress),
    atClose: (q) => !q.failed,
  },
  {
    id: 'mirrorRight',
    make: (c) => (c.owned.includes('mirror') ? { id: 'mirrorRight', label: 'Biến hình một khách bằng Gương Thần mà khách vẫn hài lòng', goal: 1, reward: { money: 60000, viral: 3 } } : null),
    onRound: (q, s, sv) => q.progress + (s.persona && (sv.tier === 'love' || sv.tier === 'ok') ? 1 : 0),
  },
  {
    id: 'newStyle',
    make: () => ({ id: 'newStyle', label: 'Tạo ra một kiểu tóc mới cho bộ sưu tập', goal: 1, reward: { money: 40000, viral: 2 } }),
    onRound: (q, _s, sv, c) => q.progress + (c.today.newStyles?.includes(sv.styleId) ? 1 : 0),
  },
  {
    id: 'fast',
    make: () => ({ id: 'fast', label: 'Xong một khách trong 30 giây mà khách không chê', goal: 1, reward: { money: 45000 } }),
    onRound: (q, s, sv) => q.progress + (s.time <= 30 && !sv.walkedOut && sv.tier !== 'bad' && sv.tier !== 'disaster' ? 1 : 0),
  },
  {
    id: 'chaosKeep',
    make: (c) => (c.day >= 2 ? { id: 'chaosKeep', label: 'Một ván Chaos từ 70 trở lên mà khách không bỏ về', goal: 1, reward: { money: 30000, viral: 4 } } : null),
    onRound: (q, s, sv) => q.progress + (s.chaos >= 70 && !sv.walkedOut ? 1 : 0),
  },
  {
    id: 'earn',
    make: (c) => {
      const goal = 150000 + Math.min(10, c.day) * 25000;
      return { id: 'earn', label: `Thu ít nhất ${Math.round(goal / 1000)}.000đ trong ngày`, goal, reward: { money: 50000 } };
    },
    onRound: (q, _s, sv) => q.progress + sv.paid + sv.tip,
  },
  {
    id: 'calmDog',
    make: (c) => (c.today.queue.some((x) => x.customer === 'vang') ? { id: 'calmDog', label: 'Cắt cho Cậu Vàng mà không bị rũ lông', goal: 1, reward: { money: 50000, rep: 1 } } : null),
    onRound: (q, s) => (s.customer.id !== 'vang' ? q.progress : s.events.dogShake ? 'fail' : 1),
  },
  {
    id: 'boss',
    make: (c) => {
      const boss = c.today.queue.find((x) => x.reason === 'boss');
      return boss ? { id: 'boss', label: 'Làm khách trùm cuối tuần hài lòng', goal: 1, reward: { money: 150000, rep: 4, viral: 4 } } : null;
    },
    onRound: (q, _s, sv, c) => {
      const isBoss = c.today.queue[c.today.index]?.reason === 'boss';
      if (!isBoss) return q.progress;
      return !sv.walkedOut && (sv.tier === 'love' || sv.tier === 'ok') ? 1 : 'fail';
    },
  },
];

/** Picks today's goals (the boss goal always comes first when there is one). */
export function planQuests(c: CareerState, rng: Rng): Quest[] {
  const made = QUESTS.map((d) => d.make(c)).filter((q): q is NonNullable<typeof q> => !!q);
  const boss = made.filter((q) => q.id === 'boss');
  const rest = made.filter((q) => q.id !== 'boss');
  const out = [...boss];
  while (out.length < 3 && rest.length) out.push(rest.splice(Math.floor(rng() * rest.length) % rest.length, 1)[0]);
  return out.map((q) => ({ ...q, progress: 0, failed: false, done: false }));
}

function pay(c: CareerState, q: Quest) {
  q.done = true;
  c.money += q.reward.money;
  if (q.reward.rep) c.rep = Math.min(100, c.rep + q.reward.rep);
  if (q.reward.viral) c.viral = Math.min(100, c.viral + q.reward.viral);
}

/** Updates today's goals after a round; returns goals completed just now. Call before the queue index moves on. */
export function updateQuests(c: CareerState, s: RoundState, served: Served): Quest[] {
  const fresh: Quest[] = [];
  for (const q of c.today.quests ?? []) {
    if (q.done || q.failed) continue;
    const def = QUESTS.find((d) => d.id === q.id);
    const r = def?.onRound?.(q, s, served, c);
    if (r === undefined) continue;
    if (r === 'fail') {
      q.failed = true;
      continue;
    }
    q.progress = r;
    if (!def!.atClose && q.progress >= q.goal) {
      pay(c, q);
      fresh.push(q);
    }
  }
  return fresh;
}

/** Closing time: settles goals judged on the whole day. Returns their reward lines. */
export function settleQuests(c: CareerState): Quest[] {
  const out: Quest[] = [];
  for (const q of c.today.quests ?? []) {
    if (q.done || q.failed) continue;
    const def = QUESTS.find((d) => d.id === q.id);
    if (def?.atClose?.(q, c) && c.today.served.length > 0) {
      q.progress = q.goal;
      pay(c, q);
      out.push(q);
    }
  }
  return out;
}
