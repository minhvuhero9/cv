import { clamp } from './geometry';
import type { Zone } from './hair';
import { RoundState, finish, startCutting, say } from './session';

/**
 * Thợ phụ Bé Tư: hired in the shop, takes a walk-in off your hands. Not as good as you —
 * at first. Every cut teaches her something (tay nghề 1 → 10).
 */
export interface AssistantState {
  jobs: number;
  /** Customers handed over today, and which day that was. */
  used: number;
  day: number;
}

export const ASSISTANT_WAGE = 40000;
export const assistantLevel = (jobs: number) => Math.min(10, 1 + Math.floor(jobs / 3));
export const assistantSlots = (jobs: number) => (assistantLevel(jobs) >= 5 ? 2 : 1);

const GENERIC: Record<Zone, number> = { left: 0.6, right: 0.6, top: 0.75, fringe: 0.55 };

const LINES = {
  start: ['Để em! Em học trên mạng rồi!', 'Anh chị cứ nghỉ, em lo!', 'Em làm nhẹ tay thôi ạ…'],
  oops: ['Ối… em lỡ tay một tí ạ.', 'Cái này… gọi là phong cách ạ!'],
};

/** She cuts the current customer towards what they asked for, with her own wobble, then finishes. */
export function assistantCut(s: RoundState, level: number): void {
  if (s.phase === 'intro') startCutting(s);
  if (s.phase !== 'cutting') return;
  const target = s.customer.target ?? GENERIC;
  const sd = clamp(0.3 - level * 0.025, 0.04, 0.3);
  const err = () => (s.rng() - 0.5) * 2 * sd;
  const off: Record<Zone, number> = { left: err(), right: err(), top: err(), fringe: err() };
  for (const t of s.hair.tufts) if (!t.bald) t.len = Math.min(t.len, t.origLen * clamp(target[t.zone] + off[t.zone], 0.08, 1));
  const oops = s.rng() < clamp(0.28 - level * 0.025, 0.02, 0.28);
  if (oops) s.hair.tufts.filter((t) => !t.bald && t.zone !== 'fringe').slice(0, 5 + Math.floor(s.rng() * 6)).forEach((t) => (t.bald = true));
  s.byAssistant = true;
  say(s, oops ? LINES.oops[Math.floor(s.rng() * LINES.oops.length)] : LINES.start[Math.floor(s.rng() * LINES.start.length)], oops ? 'worried' : 'happy');
  finish(s, 'done');
}
