import { useRef } from 'react';
import { BALD_DWELL, CLIPPER_RADIUS, DRYER_RADIUS } from '../game/hair';
import type { Vec } from '../game/geometry';
import { RoundState, Tool, currentMood } from '../game/session';
import { Character } from './Character';
import { requestSheet } from '../game/request';
import { BRUSH_RADIUS, carvingAt, carvingLines, colorDistance } from '../game/art';
import { carvingsMatched } from '../game/design';
import { FxLayer, MagicCursor } from './MagicLayer';
import { isMagic } from '../game/gear';

/** Wide screens see the whole chair; narrow (portrait phone) screens zoom onto the head. */
export const VIEW = { x: 0, y: 24, w: 400, h: 496 };
export const VIEW_NARROW = { x: 40, y: 20, w: 320, h: 500 };

interface Props {
  s: RoundState;
  /** Show the green outline of the target for any customer that has one. */
  ghostOn?: boolean;
  /** Barber chair: the Ghế Massage upgrade looks different. */
  chair?: 'basic' | 'massage';
  narrow: boolean;
  now: number;
  onDown(p: Vec): void;
  onMove(p: Vec): void;
  onUp(): void;
  onLeave(): void;
}

function ToolCursor({ tool, p, down, now, danger }: { tool: Tool; p: Vec; down: boolean; now: number; danger: number }) {
  const t = now / 1000;
  if (tool === 'clipper') {
    const buzz = down ? Math.sin(t * 90) * 1.2 : 0;
    return (
      <g transform={`translate(${p.x + buzz},${p.y})`} pointerEvents="none">
        {/* Warning: the ring fills red while the clipper sits on the same roots. */}
        {danger > 0.05 && <circle r={CLIPPER_RADIUS + 4} fill="#ff2a2a" opacity={Math.min(0.6, danger * 0.6)} />}
        <circle
          r={CLIPPER_RADIUS + 4}
          fill="none"
          stroke={danger > 0.05 ? '#ff2a2a' : '#ff4d4d'}
          strokeWidth={danger > 0.05 ? 3 + danger * 3 : 1.5}
          strokeDasharray={danger > 0.05 ? undefined : '3 4'}
          opacity={0.9}
        />
        <g transform="translate(16,14) rotate(-35)">
          <rect x={-15} y={-6} width={30} height={10} rx={2} fill="#d9dde2" stroke="#4a4f57" strokeWidth={2} />
          <path d="M-14,-6 v-5 M-9,-6 v-5 M-4,-6 v-5 M1,-6 v-5 M6,-6 v-5 M11,-6 v-5" stroke="#4a4f57" strokeWidth={2} />
          <rect x={-13} y={4} width={26} height={52} rx={11} fill="#2f6fd6" stroke="#173c7a" strokeWidth={2.5} />
          <rect x={-4} y={18} width={8} height={14} rx={3} fill={down ? '#7dff9a' : '#c4d6f5'} />
        </g>
      </g>
    );
  }
  if (tool === 'scissors') {
    const open = down ? 0.15 + Math.abs(Math.sin(t * 18)) * 0.35 : 0.45;
    const deg = (open * 180) / Math.PI;
    return (
      <g transform={`translate(${p.x},${p.y})`} pointerEvents="none">
        <g transform={`rotate(${-deg})`}>
          <path d="M0,0 L-3,-30 L3,-2Z" fill="#e8ecef" stroke="#59616b" strokeWidth={1.6} />
          <circle cx={-6} cy={22} r={8} fill="none" stroke="#e23b3b" strokeWidth={4} />
          <path d="M0,0 L-5,15" stroke="#59616b" strokeWidth={3} />
        </g>
        <g transform={`rotate(${deg})`}>
          <path d="M0,0 L3,-30 L-3,-2Z" fill="#f5f7f8" stroke="#59616b" strokeWidth={1.6} />
          <circle cx={6} cy={22} r={8} fill="none" stroke="#e23b3b" strokeWidth={4} />
          <path d="M0,0 L5,15" stroke="#59616b" strokeWidth={3} />
        </g>
        <circle r={2.4} fill="#59616b" />
      </g>
    );
  }
  const phase = (t * 3) % 1;
  return (
    <g transform={`translate(${p.x},${p.y})`} pointerEvents="none">
      {down && (
        <g fill="none" stroke="#9fd8ff" strokeWidth={2.5} opacity={0.7}>
          <circle r={DRYER_RADIUS * (0.3 + phase * 0.7)} opacity={1 - phase} />
          <circle r={DRYER_RADIUS * (0.3 + ((phase + 0.5) % 1) * 0.7)} opacity={1 - ((phase + 0.5) % 1)} />
        </g>
      )}
      <circle r={DRYER_RADIUS} fill="none" stroke="#9fd8ff" strokeWidth={1} strokeDasharray="4 6" opacity={0.6} />
      <rect x={-8} y={-2} width={16} height={18} rx={3} fill="#333" />
      <rect x={-16} y={14} width={44} height={28} rx={14} fill="#ff6fa8" stroke="#a3305e" strokeWidth={2.5} />
      <rect x={14} y={36} width={13} height={34} rx={5} fill="#ff6fa8" stroke="#a3305e" strokeWidth={2.5} />
      <circle cx={12} cy={28} r={6} fill="#ffd1e4" />
    </g>
  );
}

/** Tuấn's phone with the reference photo. */
function Phone({ s }: { s: RoundState }) {
  return (
    <g transform="translate(300,300) rotate(-8)">
      <path d="M40,120 q-10,-40 6,-60 l30,-6 q10,30 4,70z" fill={s.customer.look.skin} stroke={s.customer.look.skinShade} strokeWidth={2.5} />
      <rect x={0} y={0} width={78} height={130} rx={10} fill="#1d1f24" />
      <rect x={5} y={10} width={68} height={108} rx={4} fill="#eaf6ff" />
      {/* the reference: short sides, long top */}
      <ellipse cx={39} cy={74} rx={20} ry={24} fill="#f2c49b" />
      <path d="M19,66 q2,-34 20,-36 q18,2 20,36 q-4,-8 -8,-14 q-12,-10 -24,0 q-4,6 -8,14z" fill="#2a1d17" />
      <path d="M22,52 q8,-26 30,-16 q8,6 6,14" fill="#2a1d17" />
      <text x={39} y={112} fontSize={9} textAnchor="middle" fill="#2a6" fontWeight={700}>
        ẢNH MẪU ✓
      </text>
    </g>
  );
}

/** Brush ring or a ghost of the stencil under the pointer. */
function ArtCursor({ s, p }: { s: RoundState; p: Vec }) {
  const art = s.art;
  if (s.tool === 'brush') {
    return (
      <g pointerEvents="none">
        <circle cx={p.x} cy={p.y} r={BRUSH_RADIUS} fill={art.colorA} fillOpacity={0.25} stroke={art.colorA} strokeWidth={3} />
        {art.blend && <circle cx={p.x} cy={p.y} r={BRUSH_RADIUS - 6} fill="none" stroke={art.colorB} strokeWidth={3} strokeDasharray="4 4" />}
        <path d={`M${p.x + 14},${p.y - 14} l16,-16`} stroke="#6b4a22" strokeWidth={5} strokeLinecap="round" />
      </g>
    );
  }
  const local = { x: p.x - s.headOffset.x, y: p.y - s.headOffset.y };
  const c = carvingAt(s.hair, art, local);
  const off = (q: Vec) => `${(q.x + s.headOffset.x).toFixed(1)},${(q.y + s.headOffset.y).toFixed(1)}`;
  if (c.kind === 'text')
    return (
      <text x={p.x} y={p.y + 9 * c.s} textAnchor="middle" fontSize={26 * c.s} fontWeight={900} fill="none" stroke="#ff3fa4" strokeWidth={1.5} strokeDasharray="3 2" transform={`rotate(${c.r.toFixed(1)} ${p.x} ${p.y})`} pointerEvents="none">
        {c.text}
      </text>
    );
  return (
    <g pointerEvents="none" fill="none" stroke="#ff3fa4" strokeWidth={2.5} strokeDasharray="4 3">
      {carvingLines(c).map((l, i) => (
        <path key={i} d={`M${l.map(off).join('L')}`} />
      ))}
    </g>
  );
}

/** Vẽ theo mẫu: colour still missing (dots in the design colour) and patterns still to cut (dashed). */
function DesignGuides({ s }: { s: RoundState }) {
  const o = s.design!;
  const dots: { x: number; y: number; c: string }[] = [];
  o.hair.tufts.forEach((d, i) => {
    const t = s.hair.tufts[i];
    if (!d.tint || !t || t.bald) return;
    if (t.tint && colorDistance(t.tint, d.tint) < 110) return;
    dots.push({ x: t.root.x, y: t.root.y, c: d.tint });
  });
  const matched = carvingsMatched(s.hair, o.hair).matched;
  return (
    <g pointerEvents="none" transform={`translate(${s.headOffset.x.toFixed(1)},${s.headOffset.y.toFixed(1)})`} data-testid="design-guides">
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={4.5} fill={d.c} stroke="#fff" strokeWidth={1.5} opacity={0.85} />
      ))}
      {(o.hair.carvings ?? []).map((c, i) =>
        matched[i] ? null : c.kind === 'text' ? (
          <text key={i} x={c.x} y={c.y + 9 * c.s} textAnchor="middle" fontSize={26 * c.s} fontWeight={900} fill="none" stroke="#8a4dff" strokeWidth={1.6} strokeDasharray="3 2" transform={`rotate(${c.r.toFixed(1)} ${c.x} ${c.y})`}>
            {c.text}
          </text>
        ) : (
          <g key={i} fill="none" stroke="#8a4dff" strokeWidth={2.6} strokeDasharray="4 3">
            {carvingLines(c).map((l, k) => (
              <path key={k} d={`M${l.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}`} />
            ))}
          </g>
        ),
      )}
    </g>
  );
}

function maxDwell(s: RoundState): number {
  let m = 0;
  for (const t of s.hair.tufts) if (!t.bald && t.dwell > m) m = t.dwell;
  return m;
}

export function Stage({ s, ghostOn, chair = 'basic', narrow, now, onDown, onMove, onUp, onLeave }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const toStage = (e: React.PointerEvent): Vec => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  };
  const mood = currentMood(s);
  const showPhoto = s.customer.id === 'tuan' && s.time < s.photoUntil && s.phase === 'cutting';
  const pulse = (Math.sin(now / 160) + 1) / 2;
  const mirror = s.phase === 'mirror' || s.phase === 'result';
  const cutting = s.phase === 'cutting';
  const warn = s.motion?.stage === 'warn';
  const shake = warn ? Math.sin(now / 25) * 1.6 : 0;
  const offset = { x: s.headOffset.x + shake, y: s.headOffset.y + (s.walkout ? -26 : 0) };
  const sk = s.time < s.shakeUntil ? s.shakeAmp * Math.min(1, (s.shakeUntil - s.time) / 0.25) : 0;
  const shakeT = sk > 0.2 ? `translate(${(Math.sin(now / 17) * sk).toFixed(1)},${(Math.cos(now / 23) * sk * 0.6).toFixed(1)})` : undefined;

  return (
    <svg
      ref={svgRef}
      className={`stage-svg ${cutting ? 'is-cutting' : ''}`}
      viewBox={(() => {
        const v = narrow ? VIEW_NARROW : VIEW;
        return `${v.x} ${v.y} ${v.w} ${v.h}`;
      })()}
      preserveAspectRatio="xMidYMax meet"
      data-testid="stage"
      onPointerDown={(e) => {
        if (!cutting) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        onDown(toStage(e));
      }}
      onPointerMove={(e) => onMove(toStage(e))}
      onPointerUp={() => onUp()}
      onPointerCancel={() => onUp()}
      onPointerLeave={() => onLeave()}
    >
      <g transform={shakeT}>
      {/* chair back */}
      {chair === 'massage' ? (
        <g data-chair="massage">
          <path d="M62,520 L76,322 Q200,288 324,322 L338,520Z" fill="#4b2a7a" stroke="#24123f" strokeWidth={4} />
          <path d="M90,520 L100,340 Q200,314 300,340 L310,520Z" fill="#6a3fb0" />
          <g fill="#9b7bdf" stroke="#24123f" strokeWidth={2}>
            <circle cx={84} cy={370} r={7} />
            <circle cx={316} cy={370} r={7} />
            <circle cx={88} cy={410} r={7} />
            <circle cx={312} cy={410} r={7} />
          </g>
          <circle cx={316} cy={330} r={5} fill="#3aff9a" />
        </g>
      ) : (
        <g>
          <path d="M70,520 L84,330 Q200,300 316,330 L330,520Z" fill="#8b2e2a" stroke="#5a1b18" strokeWidth={4} />
          <path d="M96,520 L106,345 Q200,322 294,345 L304,520Z" fill="#a93a34" />
        </g>
      )}
      <g transform={mirror ? `translate(400,0) scale(-1,1)` : undefined}>
        <Character
          look={s.customer.look}
          hair={s.hair}
          metrics={s.metrics}
          mood={mood}
          headOffset={offset}
          ghost={cutting && (showPhoto || ghostOn) ? requestSheet(s).target : null}
          highlightZone={cutting && s.demand ? s.demand.zone : null}
          pulse={pulse}
          idPrefix="live"
          showDanger={cutting}
          t={now / 1000}
        />
      </g>
      {cutting && ghostOn && s.design && <DesignGuides s={s} />}
      {/* clippings */}
      <g>
        {s.particles.map((p, i) => (
          <line
            key={i}
            x1={p.x}
            y1={p.y}
            x2={p.x + Math.cos((p.rot * Math.PI) / 180) * p.len}
            y2={p.y + Math.sin((p.rot * Math.PI) / 180) * p.len}
            stroke={s.customer.look.hairColor}
            strokeWidth={2.2}
            strokeLinecap="round"
            opacity={Math.min(1, p.life)}
          />
        ))}
      </g>
      <FxLayer s={s} />
      </g>
      {showPhoto && <Phone s={s} />}
      {(warn || s.walkout) && (
        <g transform={`translate(${s.hair.head.cx + s.hair.head.rx + 6},${s.hair.head.cy - s.hair.head.ry - 20})`}>
          <circle r={18} fill="#ffd23f" stroke="#2b1a12" strokeWidth={3} />
          <text y={9} textAnchor="middle" fontSize={28} fontWeight={900} fill="#2b1a12">
            !
          </text>
        </g>
      )}
      {cutting && s.pointer.stage && (s.tool === 'brush' || s.tool === 'stencil') ? (
        <ArtCursor s={s} p={s.pointer.stage} />
      ) : cutting && s.pointer.stage && (
        isMagic(s.tool) ? (
          <MagicCursor s={s} p={s.pointer.stage} now={now} />
        ) : (
          <ToolCursor tool={s.tool} p={s.pointer.stage} down={s.pointer.down} now={now} danger={s.tool === 'clipper' ? maxDwell(s) / BALD_DWELL : 0} />
        )
      )}
      {s.time < s.flashUntil && <rect x={0} y={0} width={400} height={600} fill="#fff" opacity={0.85} />}
    </svg>
  );
}
