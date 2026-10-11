/** Head-local coordinate space shared by rendering, hit-testing and scoring. */
export const HEAD = { cx: 200, cy: 250, rx: 86, ry: 100 } as const;
/** y of the forehead hairline at the centre of the face. */
export const HAIRLINE_Y = HEAD.cy - 58;
/** Approximate nose position, used by the sneeze rule. */
export const NOSE = { x: HEAD.cx, y: HEAD.cy + 28 } as const;

export interface Vec {
  x: number;
  y: number;
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** Shortest signed difference between two angles, in (-PI, PI]. */
export function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** Distance from point p to segment ab, plus the projection parameter t in [0,1]. */
export function pointSegment(p: Vec, a: Vec, b: Vec): { d: number; t: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = clamp(t, 0, 1);
  return { d: Math.hypot(p.x - (a.x + abx * t), p.y - (a.y + aby * t)), t };
}

/** Intersection parameter along ab (0..1) with segment cd, or null. */
export function segmentIntersect(a: Vec, b: Vec, c: Vec, d: Vec): number | null {
  const r = { x: b.x - a.x, y: b.y - a.y };
  const s = { x: d.x - c.x, y: d.y - c.y };
  const denom = r.x * s.y - r.y * s.x;
  if (Math.abs(denom) < 1e-9) return null;
  const qp = { x: c.x - a.x, y: c.y - a.y };
  const t = (qp.x * s.y - qp.y * s.x) / denom;
  const u = (qp.x * r.y - qp.y * r.x) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return t;
}

/** Minimum distance between segments ab and cd, with the parameter along ab of the closest point. */
export function segmentSegment(a: Vec, b: Vec, c: Vec, d: Vec): { d: number; t: number } {
  const hit = segmentIntersect(a, b, c, d);
  if (hit !== null) return { d: 0, t: hit };
  const c1 = pointSegment(c, a, b);
  const c2 = pointSegment(d, a, b);
  const c3 = pointSegment(a, c, d);
  const c4 = pointSegment(b, c, d);
  let best = c1.d < c2.d ? c1 : c2;
  if (c3.d < best.d) best = { d: c3.d, t: 0 };
  if (c4.d < best.d) best = { d: c4.d, t: 1 };
  return best;
}
