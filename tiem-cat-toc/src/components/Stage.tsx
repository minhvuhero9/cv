import { useRef } from 'react';
import { CLIPPER_RADIUS, DRYER_RADIUS } from '../game/hair';
import { HEAD, Vec } from '../game/geometry';
import { RoundState, Tool, currentMood } from '../game/session';
import { Character } from './Character';

/** Wide screens see the whole chair; narrow (portrait phone) screens zoom onto the head. */
export const VIEW = { x: 0, y: 24, w: 400, h: 496 };
export const VIEW_NARROW = { x: 40, y: 20, w: 320, h: 500 };

interface Props {
  s: RoundState;
  narrow: boolean;
  now: number;
  onDown(p: Vec): void;
  onMove(p: Vec): void;
  onUp(): void;
  onLeave(): void;
}

function ToolCursor({ tool, p, down, now }: { tool: Tool; p: Vec; down: boolean; now: number }) {
  const t = now / 1000;
  if (tool === 'clipper') {
    const buzz = down ? Math.sin(t * 90) * 1.2 : 0;
    return (
      <g transform={`translate(${p.x + buzz},${p.y})`} pointerEvents="none">
        <circle r={CLIPPER_RADIUS} fill="none" stroke="#ff4d4d" strokeWidth={1.5} strokeDasharray="3 4" opacity={0.8} />
        <rect x={-15} y={-6} width={30} height={10} rx={2} fill="#d9dde2" stroke="#4a4f57" strokeWidth={2} />
        <path d="M-14,-6 v-5 M-9,-6 v-5 M-4,-6 v-5 M1,-6 v-5 M6,-6 v-5 M11,-6 v-5" stroke="#4a4f57" strokeWidth={2} />
        <rect x={-13} y={4} width={26} height={52} rx={11} fill="#2f6fd6" stroke="#173c7a" strokeWidth={2.5} />
        <rect x={-4} y={18} width={8} height={14} rx={3} fill={down ? '#7dff9a' : '#c4d6f5'} />
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

export function Stage({ s, narrow, now, onDown, onMove, onUp, onLeave }: Props) {
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
      {/* chair back */}
      <path d="M70,520 L84,330 Q200,300 316,330 L330,520Z" fill="#8b2e2a" stroke="#5a1b18" strokeWidth={4} />
      <path d="M96,520 L106,345 Q200,322 294,345 L304,520Z" fill="#a93a34" />
      <g transform={mirror ? `translate(400,0) scale(-1,1)` : undefined}>
        <Character
          look={s.customer.look}
          hair={s.hair}
          metrics={s.metrics}
          mood={mood}
          headOffset={offset}
          ghost={showPhoto ? s.customer.target : null}
          highlightZone={cutting && s.demand ? s.demand.zone : null}
          pulse={pulse}
          idPrefix="live"
          showDanger={cutting}
        />
      </g>
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
      {showPhoto && <Phone s={s} />}
      {(warn || s.walkout) && (
        <g transform={`translate(${HEAD.cx + 92},${HEAD.cy - 120})`}>
          <circle r={18} fill="#ffd23f" stroke="#2b1a12" strokeWidth={3} />
          <text y={9} textAnchor="middle" fontSize={28} fontWeight={900} fill="#2b1a12">
            !
          </text>
        </g>
      )}
      {cutting && s.pointer.stage && <ToolCursor tool={s.tool} p={s.pointer.stage} down={s.pointer.down} now={now} />}
      {s.time < s.flashUntil && <rect x={0} y={0} width={400} height={600} fill="#fff" opacity={0.85} />}
    </svg>
  );
}
