import type { CustomerLook } from '../game/look';
import type { Mood } from '../game/evaluate';
import type { Vec } from '../game/geometry';
import { HairState, Tuft, Zone, tuftPoints } from '../game/hair';
import type { HairMetrics } from '../game/metrics';
import { Body, BehindBody, idleOffset } from './character/Body';
import { DogFace, Face } from './character/Face';
import { Ears, HeadWear } from './character/Head';
import { capPath, f1, geo, lookPhase, skullPath } from './character/geo';

/**
 * Pure SVG drawing of a customer. Uses presentation attributes only (no CSS classes),
 * so the same markup can be serialised into the shareable PNG.
 * The skull comes from the hair (hair.head), the face and body from look.face / look.body,
 * so customers differ in build and features, not just colours.
 */
export interface CharacterProps {
  look: CustomerLook;
  hair: HairState;
  metrics: HairMetrics;
  mood: Mood;
  headOffset?: Vec;
  /** Ghost outline of the reference photo (coverage ratio per zone). */
  ghost?: Record<Zone, number> | null;
  highlightZone?: Zone | null;
  /** 0..1 pulse for highlights. */
  pulse?: number;
  idPrefix: string;
  showDanger?: boolean;
  /** Seconds, for idle animation and blinking. Omit for a still picture (share card). */
  t?: number;
}

function bezier(p: Vec[], t: number): Vec {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y };
}

function bladePathRaw(t: Tuft): string {
  const pts = tuftPoints(t);
  if (t.bald || t.len < 1) return '';
  if (t.spiked) {
    const [r, , , tip] = pts;
    const ang = Math.atan2(tip.y - r.y, tip.x - r.x) + Math.PI / 2;
    const w = 7.5 * t.thick;
    const ox = Math.cos(ang) * w;
    const oy = Math.sin(ang) * w;
    return `M${(r.x + ox).toFixed(1)},${(r.y + oy).toFixed(1)}L${tip.x.toFixed(1)},${tip.y.toFixed(1)}L${(r.x - ox).toFixed(1)},${(r.y - oy).toFixed(1)}Z`;
  }
  const baseW = (t.kind === 'fringe' ? 5.6 : t.kind === 'crown' ? 6.5 : 7.5) * (1 + t.fluff * 0.8) * t.thick;
  const N = 7;
  const left: string[] = [];
  const right: string[] = [];
  const wave = t.fluff * 4.5;
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1);
    const p = bezier(pts, s);
    const q = bezier(pts, Math.min(1, s + 0.02));
    const pr = bezier(pts, Math.max(0, s - 0.02));
    const ang = Math.atan2(q.y - pr.y, q.x - pr.x) + Math.PI / 2;
    const w = baseW * (1 - 0.8 * s * s);
    const off = Math.sin(s * Math.PI * 3 + t.id) * wave * s;
    const x = p.x + Math.cos(ang) * off;
    const y = p.y + Math.sin(ang) * off;
    left.push(`${(x + Math.cos(ang) * w).toFixed(1)},${(y + Math.sin(ang) * w).toFixed(1)}`);
    right.push(`${(x - Math.cos(ang) * w).toFixed(1)},${(y - Math.sin(ang) * w).toFixed(1)}`);
  }
  return `M${left.join('L')}L${right.reverse().join('L')}Z`;
}

function massPathRaw(t: Tuft): string {
  if (t.bald || t.len < 1 || t.spiked) return '';
  const [a, b, c, d] = tuftPoints(t);
  const f = (v: Vec) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`;
  return `M${f(a)}C${f(b)} ${f(c)} ${f(bezierTrim([a, b, c, d]))}`;
}

/** Point at 82% along the curve, so the soft mass stays inside the pointy blade tip. */
function bezierTrim(p: Vec[]): Vec {
  return bezier(p, 0.82);
}


function ghostPath(hair: HairState, ghost: Record<Zone, number>): string {
  const edge = hair.tufts.filter((t) => t.kind === 'edge').slice(0, 22);
  const tips = edge.map((t) => tuftPoints({ ...t, len: t.origLen * ghost[t.zone], lean: 0, fluff: 0, spiked: false, bald: false })[3]);
  const fringe = hair.tufts
    .filter((t) => t.kind === 'fringe')
    .map((t) => tuftPoints({ ...t, len: t.origLen * ghost.fringe, lean: 0, fluff: 0, spiked: false, bald: false })[3]);
  const a = tips.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L');
  const b = fringe.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L');
  return `M${a}M${b}`;
}

/**
 * Tuft paths are the expensive part of a frame. Tufts are mutated in place, so cache by
 * object and recompute only when something that shapes the tuft changed.
 */
const pathCache = new WeakMap<Tuft, { key: string; blade: string; mass: string }>();
function shapeKey(t: Tuft): string {
  const sc = t.sculpt ? `${t.sculpt.x.toFixed(1)},${t.sculpt.y.toFixed(1)}` : '';
  return `${t.len.toFixed(2)}|${t.bald ? 1 : 0}|${t.spiked ? 1 : 0}|${t.lean.toFixed(3)}|${t.fluff.toFixed(3)}|${t.thick.toFixed(3)}|${t.curl.toFixed(3)}|${t.gel.toFixed(2)}|${t.stiff}|${t.root.x.toFixed(1)},${t.root.y.toFixed(1)}|${sc}`;
}
function cached(t: Tuft) {
  const key = shapeKey(t);
  const hit = pathCache.get(t);
  if (hit && hit.key === key) return hit;
  const v = { key, blade: bladePathRaw(t), mass: massPathRaw(t) };
  pathCache.set(t, v);
  return v;
}
const bladePath = (t: Tuft) => cached(t).blade;
const massPath = (t: Tuft) => cached(t).mass;

export function Character({ look, hair, metrics, mood, headOffset, ghost, highlightZone, pulse = 0, idPrefix, showDanger, t }: CharacterProps) {
  const off = headOffset ?? { x: 0, y: 0 };
  const live = t !== undefined;
  const time = t ?? 0;
  const g = geo(hair.head, look);
  const { cx, cy } = g;
  const tufts = hair.tufts;
  const order = (k: Tuft['kind']) => (k === 'crown' ? 0 : k === 'edge' ? 1 : 2);
  const sorted = [...tufts].sort((a, b) => order(a.kind) - order(b.kind));
  const bald = tufts.filter((tf) => tf.bald);
  const clipId = `${idPrefix}-skull`;
  const tilt = off.x * 0.25;
  const dog = look.species === 'dog';
  const phase = lookPhase(look);
  const idle = live ? idleOffset(look.body?.idle, time, phase) : { x: 0, y: 0 };
  const skull = skullPath(g, look.face?.jaw);

  return (
    <g>
      {/* Body (stays put while the head turns; idles on its own) */}
      <g transform={idle.x || idle.y ? `translate(${f1(idle.x)},${f1(idle.y)})` : undefined}>
        <BehindBody g={g} look={look} t={time} />
        <Body g={g} look={look} t={time} />
      </g>

      <g transform={`translate(${off.x.toFixed(1)},${off.y.toFixed(1)}) rotate(${tilt.toFixed(1)} ${cx} ${f1(cy + 80)})`}>
        <defs>
          <clipPath id={clipId}>
            <path d={skull} />
          </clipPath>
        </defs>
        <Ears g={g} look={look} />
        {/* skull + jaw */}
        <path d={skull} fill={look.skin} stroke={look.skinShade} strokeWidth={3} />
        {!dog && <path d={`M${f1(cx - g.rx * 0.6)},${f1(g.chinY - 8)} Q${cx},${f1(g.chinY + 4)} ${f1(cx + g.rx * 0.6)},${f1(g.chinY - 8)}`} fill="none" stroke={look.skinShade} strokeWidth={2} opacity={0.3} />}

        {/* hair base */}
        <path d={capPath(g)} fill={look.hairColor} stroke={look.hairShade} strokeWidth={2} opacity={hair.texture === 'thin' ? 0.45 : 1} />
        {/* bald patches on top of the base */}
        <g clipPath={`url(#${clipId})`}>
          {bald.map((tf) => (
            <circle key={tf.id} cx={tf.root.x} cy={tf.root.y} r={tf.kind === 'crown' ? 14 : 13} fill={look.skin} />
          ))}
          {bald
            .filter((_, i) => i % 4 === 0)
            .map((tf) => (
              <ellipse key={`s${tf.id}`} cx={tf.root.x - 4} cy={tf.root.y - 5} rx={7} ry={3} fill="#fff" opacity={0.4} transform={`rotate(-25 ${tf.root.x} ${tf.root.y})`} />
            ))}
        </g>
        {metrics.highway && (
          <line
            x1={metrics.highway.a.x}
            y1={metrics.highway.a.y}
            x2={metrics.highway.b.x}
            y2={metrics.highway.b.y}
            stroke="#ffffff"
            strokeWidth={3.5}
            strokeDasharray="9 8"
            strokeLinecap="round"
          />
        )}
        {showDanger &&
          tufts
            .filter((tf) => tf.dwell > 0.1 && !tf.bald)
            .map((tf) => <circle key={`d${tf.id}`} cx={tf.root.x} cy={tf.root.y} r={10} fill="#ff2a2a" opacity={Math.min(0.85, tf.dwell * 1.6)} />)}

        {/* tufts: a soft mass for volume, then textured blades */}
        <g fill="none" stroke={look.hairColor} strokeLinecap="round">
          {sorted.map((tf) => {
            const d = massPath(tf);
            if (!d) return null;
            return (
              <path
                key={`m${tf.id}`}
                d={d}
                stroke={tf.tint ?? look.hairColor}
                strokeWidth={(tf.kind === 'fringe' ? 9 : tf.kind === 'crown' ? 10 : 13) * (1 + tf.fluff * 0.5) * tf.thick}
              />
            );
          })}
        </g>
        <g>
          {sorted.map((tf) => {
            const d = bladePath(tf);
            if (!d) return null;
            return (
              <path
                key={tf.id}
                d={d}
                fill={tf.tint ?? (tf.spiked ? look.hairShade : look.hairColor)}
                stroke={tf.tint ? 'rgba(0,0,0,0.35)' : look.hairShade}
                strokeWidth={1.4}
                strokeLinejoin="round"
              />
            );
          })}
        </g>
        {highlightZone && (
          <g fill="none" stroke="#ffd400" strokeWidth={3} opacity={0.45 + pulse * 0.5}>
            {tufts
              .filter((tf) => tf.zone === highlightZone && !tf.bald && tf.len > 2)
              .map((tf) => (
                <path key={`h${tf.id}`} d={bladePath(tf)} />
              ))}
          </g>
        )}
        {ghost && <path d={ghostPath(hair, ghost)} fill="none" stroke="#21d07a" strokeWidth={3.5} strokeDasharray="7 6" strokeLinecap="round" opacity={0.9} />}
        <HeadWear g={g} look={look} t={time} />
        {dog ? <DogFace g={g} mood={mood} /> : <Face g={g} mood={mood} look={look} t={time} live={live} phase={phase} />}
      </g>
    </g>
  );
}
