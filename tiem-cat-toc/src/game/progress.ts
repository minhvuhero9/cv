import type { Progress } from './tools';

/** Player progress kept in the browser: drives the collection and tool unlocks. */
const KEY = 'tctbo-progress-v1';
const LEGACY_STYLES_KEY = 'tctbo-styles-v1';

const EMPTY: Progress = { rounds: 0, styles: [], events: [] };

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return { rounds: Number(v.rounds) || 0, styles: strings(v.styles), events: strings(v.events) };
    }
    // Players from the first version only had a style collection.
    const legacy = localStorage.getItem(LEGACY_STYLES_KEY);
    if (legacy) return { ...EMPTY, styles: strings(JSON.parse(legacy)) };
  } catch {
    /* blocked or corrupt storage: start fresh */
  }
  return { ...EMPTY };
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode etc. — progress is a convenience */
  }
}

/** Adds a finished round to the progress (pure). */
export function recordRound(p: Progress, styleId: string, events: string[]): Progress {
  return {
    rounds: p.rounds + 1,
    styles: p.styles.includes(styleId) ? p.styles : [...p.styles, styleId],
    events: [...new Set([...p.events, ...events])],
  };
}
