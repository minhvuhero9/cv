import { dist } from './geometry';
import { HairState, Tuft, Zone, tuftPoints, tuftRatio } from './hair';

/** Everything the scorer, namer and dialogue need to know about the hair right now. */
export interface HairMetrics {
  zone: Record<Zone, number>;
  avg: number;
  baldCount: number;
  baldFrac: number;
  /** Bald islands (connected groups of bald roots). */
  baldClusters: number;
  /** Longest bald strip in px — a "highway" when long enough. */
  longestBaldStrip: number;
  highway: { a: { x: number; y: number }; b: { x: number; y: number } } | null;
  spikedFrac: number;
  fluffAvg: number;
  /** Average sideways push of the hair tips vs. their natural fall, per unit length (-left / +right). */
  leanAvg: number;
  /** |left - right| coverage. */
  unevenLR: number;
  /** Spread of fringe tip heights (px); small = cut in a straight line. */
  fringeTipSpread: number;
  /** Highest number of strokes any single tuft received. */
  maxTouches: number;
  /** How jagged the cut is: spread of lengths inside each zone (0 = neat). */
  choppiness: number;
  /* magic tools */
  /** Share of tufts dyed by Súng Tóc 3000. */
  tintedFrac: number;
  /** Distinct dye colours on the head. */
  colorCount: number;
  /** Share of tufts at least 1.6× their original length (Gậy Như Ý). */
  longFrac: number;
  /** Share of tufts sculpted into a point (combo Súng + Lược). */
  sculptedFrac: number;
  /** Share of tufts still puffed by the rice cooker. */
  steamedFrac: number;
  /** Average width multiplier of live tufts. */
  thickAvg: number;
  /** Average |curl| of live tufts. */
  curlAvg: number;
}

/** Sideways push of one tuft's tip vs. its natural fall, per unit length. */
export function tuftPush(t: Tuft): number {
  const tip = tuftPoints(t)[3];
  const natural = tuftPoints({ ...t, lean: 0 })[3];
  return (tip.x - natural.x) / Math.max(t.len, 12);
}

/** Average push of the hair growing around a point (e.g. around a bald patch). */
export function localLean(h: HairState, c: { x: number; y: number }, radius: number): number {
  return mean(h.tufts.filter((t) => !t.bald && t.len > 2 && dist(t.root, c) < radius).map(tuftPush));
}

const ZONES: Zone[] = ['left', 'top', 'right', 'fringe'];

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function zoneRatio(h: HairState, z: Zone): number {
  return mean(h.tufts.filter((t) => t.zone === z).map(tuftRatio));
}

export const HIGHWAY_MIN = 64;
/** Average sideways push at which the whole hairdo counts as "blown away". */
export const LEAN_RUNAWAY = 0.25;

export function measureHair(h: HairState): HairMetrics {
  const zone = Object.fromEntries(ZONES.map((z) => [z, zoneRatio(h, z)])) as Record<Zone, number>;
  const tufts = h.tufts;
  const bald = tufts.filter((t) => t.bald);

  // Connected components of bald roots.
  const seen = new Set<number>();
  let clusters = 0;
  let longest = 0;
  let highway: HairMetrics['highway'] = null;
  for (const start of bald) {
    if (seen.has(start.id)) continue;
    clusters++;
    const comp: Tuft[] = [];
    const stack = [start];
    seen.add(start.id);
    while (stack.length) {
      const t = stack.pop()!;
      comp.push(t);
      for (const o of bald) {
        if (!seen.has(o.id) && dist(o.root, t.root) < 27) {
          seen.add(o.id);
          stack.push(o);
        }
      }
    }
    for (let i = 0; i < comp.length; i++) {
      for (let j = i + 1; j < comp.length; j++) {
        const d = dist(comp[i].root, comp[j].root);
        if (d > longest) {
          longest = d;
          if (d >= HIGHWAY_MIN) highway = { a: comp[i].root, b: comp[j].root };
        }
      }
    }
  }

  const live = tufts.filter((t) => !t.bald && t.len > 2);
  const fringeTips = tufts.filter((t) => t.zone === 'fringe' && !t.bald).map((t) => tuftPoints(t)[3].y);
  const spread = fringeTips.length > 1 ? Math.max(...fringeTips) - Math.min(...fringeTips) : 0;

  return {
    zone,
    avg: mean(tufts.map(tuftRatio)),
    baldCount: bald.length,
    baldFrac: bald.length / tufts.length,
    baldClusters: clusters,
    longestBaldStrip: longest,
    highway,
    spikedFrac: tufts.filter((t) => t.spiked).length / tufts.length,
    fluffAvg: mean(live.map((t) => t.fluff)),
    leanAvg: mean(live.map(tuftPush)),
    unevenLR: Math.abs(zone.left - zone.right),
    fringeTipSpread: spread,
    maxTouches: Math.max(0, ...tufts.map((t) => t.touches)),
    tintedFrac: tufts.filter((t) => !t.bald && t.tint).length / tufts.length,
    colorCount: new Set(tufts.filter((t) => !t.bald && t.tint).map((t) => t.tint)).size,
    longFrac: tufts.filter((t) => !t.bald && t.len >= t.origLen * 1.6).length / tufts.length,
    sculptedFrac: tufts.filter((t) => !t.bald && t.sculpt).length / tufts.length,
    steamedFrac: tufts.filter((t) => !t.bald && t.steamed > 0.3).length / tufts.length,
    thickAvg: live.length ? mean(live.map((t) => t.thick)) : 1,
    curlAvg: mean(live.map((t) => Math.abs(t.curl))),
    choppiness: mean(
      ZONES.map((z) => {
        const r = tufts.filter((t) => t.zone === z && !t.bald).map(tuftRatio);
        const m = mean(r);
        return Math.sqrt(mean(r.map((x) => (x - m) * (x - m))));
      }),
    ),
  };
}
