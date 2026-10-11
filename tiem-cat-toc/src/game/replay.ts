import type { Mood } from './evaluate';
import type { HairState } from './hair';
import type { Vec } from './geometry';
import type { RoundState } from './session';

/** One picture of the replay (look changes when the Gương Thần is used mid-round). */
export interface ReplayShot {
  hair: HairState;
  off: Vec;
  mood: Mood;
  /** 0..1 through the round. */
  at: number;
  final: boolean;
  transformed: boolean;
}

export const REPLAY_FPS = 12;
const BODY_FRAMES = 48;
const HOLD_FRAMES = 12;

/** ~5 seconds: the round squeezed into 4 s, then a 1 s hold on the verdict. */
export function replayShots(s: RoundState, finalMood?: Mood): ReplayShot[] {
  const src = s.replay;
  const out: ReplayShot[] = [];
  const end = Math.max(s.time, 0.01);
  if (src.length) {
    for (let i = 0; i < BODY_FRAMES; i++) {
      const f = src[Math.min(src.length - 1, Math.floor((i / BODY_FRAMES) * src.length))];
      out.push({ hair: f.hair, off: f.off, mood: f.mood, at: f.t / end, final: false, transformed: f.transformed });
    }
  }
  for (let i = 0; i < HOLD_FRAMES; i++) out.push({ hair: s.hair, off: { x: 0, y: 0 }, mood: finalMood ?? s.result?.mood ?? 'neutral', at: 1, final: true, transformed: !!s.persona });
  return out;
}

export const shotLook = (s: RoundState, f: ReplayShot) => (f.transformed ? s.customer.look : s.baseCustomer.look);
