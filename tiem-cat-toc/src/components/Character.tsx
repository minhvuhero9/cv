import type { CustomerLook } from '../game/customers';
import type { Mood } from '../game/evaluate';
import { HEAD, Vec } from '../game/geometry';
import { HairState, Tuft, Zone, hairlineY, tuftPoints } from '../game/hair';
import type { HairMetrics } from '../game/metrics';

/**
 * Pure SVG drawing of a customer. Uses presentation attributes only (no CSS classes),
 * so the same markup can be serialised into the shareable PNG.
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
}

const { cx, cy, rx, ry } = HEAD;

function bezier(p: Vec[], t: number): Vec {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p[0].x + b * p[1].x + c * p[2].x + d * p[3].x, y: a * p[0].y + b * p[1].y + c * p[2].y + d * p[3].y };
}

function bladePath(t: Tuft): string {
  const pts = tuftPoints(t);
  if (t.bald || t.len < 1) return '';
  if (t.spiked) {
    const [r, , , tip] = pts;
    const ang = Math.atan2(tip.y - r.y, tip.x - r.x) + Math.PI / 2;
    const w = 7.5;
    const ox = Math.cos(ang) * w;
    const oy = Math.sin(ang) * w;
    return `M${(r.x + ox).toFixed(1)},${(r.y + oy).toFixed(1)}L${tip.x.toFixed(1)},${tip.y.toFixed(1)}L${(r.x - ox).toFixed(1)},${(r.y - oy).toFixed(1)}Z`;
  }
  const baseW = (t.kind === 'fringe' ? 5.6 : t.kind === 'crown' ? 6.5 : 7.5) * (1 + t.fluff * 0.8);
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

function massPath(t: Tuft): string {
  if (t.bald || t.len < 1 || t.spiked) return '';
  const [a, b, c, d] = tuftPoints(t);
  const f = (v: Vec) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`;
  return `M${f(a)}C${f(b)} ${f(c)} ${f(bezierTrim([a, b, c, d]))}`;
}

/** Point at 82% along the curve, so the soft mass stays inside the pointy blade tip. */
function bezierTrim(p: Vec[]): Vec {
  return bezier(p, 0.82);
}

function capPath(): string {
  const pts: string[] = [];
  const steps = 40;
  // Upper outline of the head, slightly larger than the skull.
  const phiMax = 186;
  const phiMin = -6;
  for (let i = 0; i <= steps; i++) {
    const phi = ((phiMin + (i / steps) * (phiMax - phiMin)) * Math.PI) / 180;
    pts.push(`${(cx + rx * 1.01 * Math.cos(phi)).toFixed(1)},${(cy - ry * 1.01 * Math.sin(phi)).toFixed(1)}`);
  }
  // Back along the hairline.
  const left = cx + rx * 1.01 * Math.cos((phiMax * Math.PI) / 180);
  const right = cx + rx * 1.01 * Math.cos((phiMin * Math.PI) / 180);
  for (let i = 0; i <= 20; i++) {
    const x = left + (i / 20) * (right - left);
    const y = Math.min(hairlineY(x), cy + 14);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}
const CAP = capPath();

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

function Face({ mood, look }: { mood: Mood; look: CustomerLook }) {
  const ink = '#2b1a12';
  const ey = cy + 12;
  const ex = 32;
  const by = cy - 12;
  const eyes = (() => {
    switch (mood) {
      case 'happy':
        return (
          <g fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round">
            <path d={`M${cx - ex - 9},${ey + 3} Q${cx - ex},${ey - 8} ${cx - ex + 9},${ey + 3}`} />
            <path d={`M${cx + ex - 9},${ey + 3} Q${cx + ex},${ey - 8} ${cx + ex + 9},${ey + 3}`} />
          </g>
        );
      case 'ecstatic':
        return (
          <g fill="#ffd23f" stroke={ink} strokeWidth={2.5} strokeLinejoin="round">
            {[-ex, ex].map((dx) => (
              <path
                key={dx}
                d={`M${cx + dx},${ey - 14} L${cx + dx + 4},${ey - 4} L${cx + dx + 14},${ey - 2} L${cx + dx + 6},${ey + 5} L${cx + dx + 9},${ey + 15} L${cx + dx},${ey + 9} L${cx + dx - 9},${ey + 15} L${cx + dx - 6},${ey + 5} L${cx + dx - 14},${ey - 2} L${cx + dx - 4},${ey - 4}Z`}
              />
            ))}
          </g>
        );
      case 'suspicious':
        return (
          <g>
            <ellipse cx={cx - ex} cy={ey} rx={10} ry={4} fill="#fff" stroke={ink} strokeWidth={2.5} />
            <ellipse cx={cx + ex} cy={ey} rx={10} ry={4} fill="#fff" stroke={ink} strokeWidth={2.5} />
            <circle cx={cx - ex + 4} cy={ey} r={3} fill={ink} />
            <circle cx={cx + ex + 4} cy={ey} r={3} fill={ink} />
          </g>
        );
      case 'shocked':
        return (
          <g>
            <circle cx={cx - ex} cy={ey} r={13} fill="#fff" stroke={ink} strokeWidth={3} />
            <circle cx={cx + ex} cy={ey} r={13} fill="#fff" stroke={ink} strokeWidth={3} />
            <circle cx={cx - ex} cy={ey} r={2.6} fill={ink} />
            <circle cx={cx + ex} cy={ey} r={2.6} fill={ink} />
          </g>
        );
      case 'crying':
        return (
          <g>
            <g fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round">
              <path d={`M${cx - ex - 10},${ey - 2} Q${cx - ex},${ey + 7} ${cx - ex + 10},${ey - 2}`} />
              <path d={`M${cx + ex - 10},${ey - 2} Q${cx + ex},${ey + 7} ${cx + ex + 10},${ey - 2}`} />
            </g>
            <path d={`M${cx - ex - 4},${ey + 6} q-6,26 -2,60 l10,0 q2,-34 0,-60z`} fill="#6ec6ff" opacity={0.85} />
            <path d={`M${cx + ex + 4},${ey + 6} q6,26 2,60 l-10,0 q-2,-34 0,-60z`} fill="#6ec6ff" opacity={0.85} />
          </g>
        );
      case 'flinch':
      case 'sneeze':
        return (
          <g fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
            <path d={`M${cx - ex - 10},${ey - 7} L${cx - ex + 7},${ey} L${cx - ex - 10},${ey + 7}`} />
            <path d={`M${cx + ex + 10},${ey - 7} L${cx + ex - 7},${ey} L${cx + ex + 10},${ey + 7}`} />
          </g>
        );
      case 'angry':
        return (
          <g>
            <circle cx={cx - ex} cy={ey + 2} r={8} fill="#fff" stroke={ink} strokeWidth={2.5} />
            <circle cx={cx + ex} cy={ey + 2} r={8} fill="#fff" stroke={ink} strokeWidth={2.5} />
            <circle cx={cx - ex + 2} cy={ey + 3} r={3.6} fill={ink} />
            <circle cx={cx + ex - 2} cy={ey + 3} r={3.6} fill={ink} />
          </g>
        );
      case 'worried':
        return (
          <g>
            <ellipse cx={cx - ex} cy={ey} rx={9} ry={10} fill="#fff" stroke={ink} strokeWidth={2.5} />
            <ellipse cx={cx + ex} cy={ey} rx={9} ry={10} fill="#fff" stroke={ink} strokeWidth={2.5} />
            <circle cx={cx - ex} cy={ey + 3} r={4} fill={ink} />
            <circle cx={cx + ex} cy={ey + 3} r={4} fill={ink} />
          </g>
        );
      default:
        return (
          <g fill={ink}>
            <ellipse cx={cx - ex} cy={ey} rx={5.5} ry={7} />
            <ellipse cx={cx + ex} cy={ey} rx={5.5} ry={7} />
            <circle cx={cx - ex + 2} cy={ey - 3} r={1.8} fill="#fff" />
            <circle cx={cx + ex + 2} cy={ey - 3} r={1.8} fill="#fff" />
          </g>
        );
    }
  })();

  const brow = (() => {
    const w = 15;
    switch (mood) {
      case 'angry':
        return [`M${cx - ex - w},${by - 8} L${cx - ex + w},${by + 4}`, `M${cx + ex + w},${by - 8} L${cx + ex - w},${by + 4}`];
      case 'worried':
      case 'crying':
        return [`M${cx - ex - w},${by + 2} L${cx - ex + w},${by - 8}`, `M${cx + ex + w},${by + 2} L${cx + ex - w},${by - 8}`];
      case 'suspicious':
        return [`M${cx - ex - w},${by - 10} Q${cx - ex},${by - 18} ${cx - ex + w},${by - 8}`, `M${cx + ex + w},${by + 2} L${cx + ex - w},${by + 2}`];
      case 'shocked':
      case 'ecstatic':
        return [`M${cx - ex - w},${by - 10} Q${cx - ex},${by - 22} ${cx - ex + w},${by - 10}`, `M${cx + ex + w},${by - 10} Q${cx + ex},${by - 22} ${cx + ex - w},${by - 10}`];
      case 'flinch':
      case 'sneeze':
        return [`M${cx - ex - w},${by - 2} L${cx - ex + w},${by + 2}`, `M${cx + ex + w},${by - 2} L${cx + ex - w},${by + 2}`];
      default:
        return [`M${cx - ex - w},${by - 2} Q${cx - ex},${by - 7} ${cx - ex + w},${by - 2}`, `M${cx + ex + w},${by - 2} Q${cx + ex},${by - 7} ${cx + ex - w},${by - 2}`];
    }
  })();

  const my = cy + 56;
  const mouth = (() => {
    switch (mood) {
      case 'happy':
        return <path d={`M${cx - 22},${my - 4} Q${cx},${my + 18} ${cx + 22},${my - 4}`} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" />;
      case 'ecstatic':
        return (
          <g>
            <path d={`M${cx - 30},${my - 8} Q${cx},${my + 40} ${cx + 30},${my - 8} Z`} fill="#7a1f1f" stroke={ink} strokeWidth={3.5} strokeLinejoin="round" />
            <path d={`M${cx - 14},${my + 16} Q${cx},${my + 6} ${cx + 14},${my + 16} Q${cx},${my + 26} ${cx - 14},${my + 16}`} fill="#ff7a8a" />
          </g>
        );
      case 'suspicious':
        return <path d={`M${cx - 16},${my + 4} L${cx + 18},${my - 2}`} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" />;
      case 'shocked':
        return <ellipse cx={cx} cy={my + 6} rx={13} ry={18} fill="#5a1414" stroke={ink} strokeWidth={3.5} />;
      case 'crying':
        return <path d={`M${cx - 24},${my + 12} Q${cx - 12},${my - 6} ${cx},${my + 4} Q${cx + 12},${my - 6} ${cx + 24},${my + 12} Q${cx},${my + 24} ${cx - 24},${my + 12}Z`} fill="#5a1414" stroke={ink} strokeWidth={3} />;
      case 'angry':
        return (
          <g>
            <rect x={cx - 24} y={my - 6} width={48} height={18} rx={5} fill="#fff" stroke={ink} strokeWidth={3.5} />
            <path d={`M${cx - 24},${my + 3} H${cx + 24} M${cx - 12},${my - 6} V${my + 12} M${cx},${my - 6} V${my + 12} M${cx + 12},${my - 6} V${my + 12}`} stroke={ink} strokeWidth={2} />
          </g>
        );
      case 'worried':
        return <path d={`M${cx - 20},${my + 4} q5,-7 10,0 q5,7 10,0 q5,-7 10,0 q5,7 10,0`} fill="none" stroke={ink} strokeWidth={3.5} strokeLinecap="round" />;
      case 'flinch':
        return <path d={`M${cx - 18},${my + 4} l6,-6 l6,6 l6,-6 l6,6 l6,-6`} fill="none" stroke={ink} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />;
      case 'sneeze':
        return <ellipse cx={cx} cy={my + 4} rx={20} ry={12} fill="#5a1414" stroke={ink} strokeWidth={3.5} />;
      default:
        return <path d={`M${cx - 14},${my + 2} Q${cx},${my + 6} ${cx + 14},${my + 2}`} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" />;
    }
  })();

  return (
    <g>
      {(mood === 'happy' || mood === 'ecstatic' || mood === 'angry') && (
        <g fill={mood === 'angry' ? '#ff5a4a' : '#ff8c8c'} opacity={0.45}>
          <ellipse cx={cx - 52} cy={cy + 38} rx={14} ry={8} />
          <ellipse cx={cx + 52} cy={cy + 38} rx={14} ry={8} />
        </g>
      )}
      {eyes}
      {look.glasses && (
        <g fill="none" stroke="#1d1d1d" strokeWidth={3.5}>
          <rect x={cx - ex - 19} y={ey - 15} width={38} height={30} rx={9} fill="#bfe3ff" fillOpacity={0.18} />
          <rect x={cx + ex - 19} y={ey - 15} width={38} height={30} rx={9} fill="#bfe3ff" fillOpacity={0.18} />
          <path d={`M${cx - ex + 19},${ey - 4} Q${cx},${ey - 10} ${cx + ex - 19},${ey - 4}`} />
          <path d={`M${cx - ex - 19},${ey - 6} L${cx - rx + 2},${ey - 10} M${cx + ex + 19},${ey - 6} L${cx + rx - 2},${ey - 10}`} />
        </g>
      )}
      {/* nose */}
      <path d={`M${cx - 3},${cy + 20} Q${cx - 10},${cy + 38} ${cx - 2},${cy + 40} Q${cx + 8},${cy + 41} ${cx + 9},${cy + 36}`} fill="none" stroke={look.skinShade} strokeWidth={3.5} strokeLinecap="round" />
      {look.wrinkles && (
        <g fill="none" stroke={look.skinShade} strokeWidth={2} strokeLinecap="round" opacity={0.8}>
          <path d={`M${cx - 30},${cy + 46} q-6,10 -2,18 M${cx + 30},${cy + 46} q6,10 2,18`} />
          <path d={`M${cx - ex - 20},${ey + 2} l-6,-3 M${cx - ex - 20},${ey + 7} l-6,2 M${cx + ex + 20},${ey + 2} l6,-3 M${cx + ex + 20},${ey + 7} l6,2`} />
        </g>
      )}
      {mouth}
      {look.mustache && (
        <path
          d={`M${cx},${my - 10} q-14,-10 -30,-4 q-10,4 -12,14 q10,-6 22,-4 q12,2 20,-6 q8,8 20,6 q12,-2 22,4 q-2,-10 -12,-14 q-16,-6 -30,4z`}
          fill="#d9d4cf"
          stroke="#8f8a86"
          strokeWidth={2}
        />
      )}
      <g fill="none" stroke={ink} strokeWidth={5} strokeLinecap="round">
        <path d={brow[0]} />
        <path d={brow[1]} />
      </g>
      {mood === 'angry' && (
        <g stroke="#e0201a" strokeWidth={4} strokeLinecap="round" fill="none" transform={`translate(${cx + 46},${cy - 38})`}>
          <path d="M-8,-3 q5,0 5,-6 M3,-9 q0,5 6,5 M9,3 q-5,0 -5,6 M-3,9 q0,-5 -6,-5" />
        </g>
      )}
      {(mood === 'worried' || mood === 'shocked' || mood === 'flinch') && (
        <path d={`M${cx + rx - 10},${cy - 30} q-9,14 0,20 q9,-6 0,-20z`} fill="#8fd3ff" stroke="#3a8fd0" strokeWidth={2} />
      )}
    </g>
  );
}

export function Character({ look, hair, metrics, mood, headOffset, ghost, highlightZone, pulse = 0, idPrefix, showDanger }: CharacterProps) {
  const off = headOffset ?? { x: 0, y: 0 };
  const tufts = hair.tufts;
  const order = (k: Tuft['kind']) => (k === 'crown' ? 0 : k === 'edge' ? 1 : 2);
  const sorted = [...tufts].sort((a, b) => order(a.kind) - order(b.kind));
  const bald = tufts.filter((t) => t.bald);
  const clipId = `${idPrefix}-skull`;
  const tilt = off.x * 0.25;

  return (
    <g>
      {/* Body + cape (stays put while the head turns) */}
      <path d={`M${cx - 34},${cy + 70} L${cx - 30},${cy + 140} L${cx + 30},${cy + 140} L${cx + 34},${cy + 70}Z`} fill={look.skinShade} />
      <path d={`M${cx - 150},530 Q${cx - 140},${cy + 150} ${cx - 40},${cy + 128} L${cx + 40},${cy + 128} Q${cx + 140},${cy + 150} ${cx + 150},530Z`} fill={look.shirt} />
      <path
        d={`M${cx - 168},530 L${cx - 120},${cy + 160} Q${cx},${cy + 112} ${cx + 120},${cy + 160} L${cx + 168},530Z`}
        fill="#e9f3f1"
        stroke="#9fbcb7"
        strokeWidth={3}
      />
      <g stroke="#7fc4ba" strokeWidth={6} opacity={0.6}>
        <path d={`M${cx - 120},${cy + 205} L${cx - 140},520 M${cx - 60},${cy + 175} L${cx - 70},520 M${cx},${cy + 168} L${cx},520 M${cx + 60},${cy + 175} L${cx + 70},520 M${cx + 120},${cy + 205} L${cx + 140},520`} />
      </g>
      <path d={`M${cx - 44},${cy + 128} Q${cx},${cy + 152} ${cx + 44},${cy + 128} Q${cx},${cy + 142} ${cx - 44},${cy + 128}Z`} fill="#c9dcd8" />
      {look.chain && (
        <path d={`M${cx - 30},${cy + 112} Q${cx},${cy + 150} ${cx + 30},${cy + 112}`} fill="none" stroke="#f2c230" strokeWidth={5} strokeDasharray="5 3" />
      )}

      <g transform={`translate(${off.x.toFixed(1)},${off.y.toFixed(1)}) rotate(${tilt.toFixed(1)} ${cx} ${cy + 80})`}>
        <defs>
          <clipPath id={clipId}>
            <ellipse cx={cx} cy={cy} rx={rx + 1} ry={ry + 1} />
          </clipPath>
        </defs>
        {/* ears */}
        <ellipse cx={cx - rx + 2} cy={cy + 14} rx={15} ry={21} fill={look.skin} stroke={look.skinShade} strokeWidth={3} />
        <ellipse cx={cx + rx - 2} cy={cy + 14} rx={15} ry={21} fill={look.skin} stroke={look.skinShade} strokeWidth={3} />
        {look.earring && <circle cx={cx + rx + 2} cy={cy + 36} r={5} fill="none" stroke="#f2c230" strokeWidth={3} />}
        {/* skull */}
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={look.skin} stroke={look.skinShade} strokeWidth={3} />
        <path d={`M${cx - rx + 10},${cy + 40} Q${cx},${cy + ry + 30} ${cx + rx - 10},${cy + 40}`} fill="none" stroke={look.skinShade} strokeWidth={2} opacity={0.4} />

        {/* hair base */}
        <path d={CAP} fill={look.hairColor} stroke={look.hairShade} strokeWidth={2} />
        {/* bald patches on top of the base */}
        <g clipPath={`url(#${clipId})`}>
          {bald.map((t) => (
            <circle key={t.id} cx={t.root.x} cy={t.root.y} r={t.kind === 'crown' ? 14 : 13} fill={look.skin} />
          ))}
          {bald
            .filter((_, i) => i % 4 === 0)
            .map((t) => (
              <ellipse key={`s${t.id}`} cx={t.root.x - 4} cy={t.root.y - 5} rx={7} ry={3} fill="#fff" opacity={0.4} transform={`rotate(-25 ${t.root.x} ${t.root.y})`} />
            ))}
        </g>
        {metrics.highway && (
          <g>
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
          </g>
        )}
        {showDanger &&
          tufts
            .filter((t) => t.dwell > 0.1 && !t.bald)
            .map((t) => <circle key={`d${t.id}`} cx={t.root.x} cy={t.root.y} r={10} fill="#ff2a2a" opacity={Math.min(0.85, t.dwell * 1.6)} />)}

        {/* tufts: a soft mass for volume, then textured blades */}
        <g fill="none" stroke={look.hairColor} strokeLinecap="round">
          {sorted.map((t) => {
            const d = massPath(t);
            if (!d) return null;
            return <path key={`m${t.id}`} d={d} strokeWidth={(t.kind === 'fringe' ? 9 : t.kind === 'crown' ? 10 : 13) * (1 + t.fluff * 0.5)} />;
          })}
        </g>
        <g>
          {sorted.map((t) => {
            const d = bladePath(t);
            if (!d) return null;
            return (
              <path
                key={t.id}
                d={d}
                fill={t.spiked ? look.hairShade : look.hairColor}
                stroke={look.hairShade}
                strokeWidth={1.4}
                strokeLinejoin="round"
              />
            );
          })}
        </g>
        {highlightZone && (
          <g fill="none" stroke="#ffd400" strokeWidth={3} opacity={0.45 + pulse * 0.5}>
            {tufts
              .filter((t) => t.zone === highlightZone && !t.bald && t.len > 2)
              .map((t) => (
                <path key={`h${t.id}`} d={bladePath(t)} />
              ))}
          </g>
        )}
        {ghost && (
          <path d={ghostPath(hair, ghost)} fill="none" stroke="#21d07a" strokeWidth={3.5} strokeDasharray="7 6" strokeLinecap="round" opacity={0.9} />
        )}
        <Face mood={mood} look={look} />
      </g>
    </g>
  );
}
