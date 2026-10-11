import { CUSTOMERS } from './customers';
import type { RoundOptions, RoundState } from './session';
import type { ToolId } from './tools';

/**
 * Thử thách hằng ngày: the same customer, seed and house rule for everyone on a given
 * date (derived from the date only), with a small leaderboard kept in this browser.
 */
export type DailyRule = 'none' | 'scissorsOnly' | 'short' | 'mirror' | 'noDryer';

export interface DailyChallenge {
  date: string;
  seed: number;
  customer: string;
  rule: DailyRule;
}

export const RULE_TEXT: Record<DailyRule, string> = {
  none: 'Luật thường. Cắt sao cho khách mê nhất.',
  scissorsOnly: 'Chỉ được dùng Kéo.',
  short: 'Chỉ có 45 giây!',
  mirror: 'Bắt buộc dùng Gương Thần (không dùng thì điểm chia đôi).',
  noDryer: 'Máy sấy hỏng: không được dùng máy sấy.',
};

const RULES: DailyRule[] = ['none', 'scissorsOnly', 'short', 'mirror', 'noDryer'];

/** Local calendar date as YYYY-MM-DD. */
export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function dailyFor(date: string): DailyChallenge {
  const h = hash(date);
  const pool = CUSTOMERS.filter((c) => c.appear.weight > 0 && c.look.species !== 'dog' && c.id !== 'hoathan');
  return {
    date,
    seed: h & 0xffff,
    customer: pool[h % pool.length].id,
    rule: RULES[(h >>> 8) % RULES.length],
  };
}

/** Round options for the daily rule (on top of the tools the player has). */
export function dailyOptions(d: DailyChallenge, unlocked: ToolId[]): RoundOptions {
  switch (d.rule) {
    case 'scissorsOnly':
      return { onlyTools: ['scissors'], mirror: true };
    case 'short':
      return { unlocked, timeLimit: 45, mirror: true };
    case 'noDryer':
      return { onlyTools: ['clipper', 'scissors', ...unlocked.filter((t) => t !== 'dryer' && t !== 'storm')], mirror: true };
    default:
      return { unlocked, mirror: true };
  }
}

export function dailyScore(d: DailyChallenge, s: RoundState): number {
  const r = s.result;
  if (!r) return 0;
  const base = r.total;
  return d.rule === 'mirror' && !s.persona ? Math.round(base / 2) : base;
}

export interface DailyRun {
  score: number;
  sat: number;
  style: string;
  at: number;
}
export interface DailyBoard {
  /** Best runs per date (top 5). */
  days: Record<string, DailyRun[]>;
}

const KEY = 'tctbo-daily';

export function loadBoard(store: Storage | undefined = globalThis.localStorage): DailyBoard {
  try {
    const v = JSON.parse(store?.getItem(KEY) ?? 'null');
    if (v && typeof v.days === 'object') return v;
  } catch {
    /* ignore */
  }
  return { days: {} };
}

/** Adds a run; returns its rank (1-based) among today's runs, or null if it did not make the top 5. */
export function recordDaily(b: DailyBoard, date: string, run: DailyRun, store: Storage | undefined = globalThis.localStorage): number | null {
  const list = [...(b.days[date] ?? []), run].sort((x, y) => y.score - x.score || x.at - y.at).slice(0, 5);
  b.days[date] = list;
  // Keep the last 30 days only.
  for (const k of Object.keys(b.days).sort().slice(0, -30)) delete b.days[k];
  try {
    store?.setItem(KEY, JSON.stringify(b));
  } catch {
    /* ignore */
  }
  const i = list.indexOf(run);
  return i >= 0 ? i + 1 : null;
}

/** Consecutive days (ending today) with at least one run. */
export function streak(b: DailyBoard, today: string): number {
  let n = 0;
  const d = new Date(`${today}T12:00:00`);
  while (b.days[todayKey(d)]?.length) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
