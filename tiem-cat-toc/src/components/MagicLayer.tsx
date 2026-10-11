import type { Fx } from '../game/gear';
import { Vec, dist } from '../game/geometry';
import { RAY_RADIUS, VACUUM_GULP_TIME, WAND_RADIUS } from '../game/magic';
import type { RoundState } from '../game/session';
import { ToolArt } from './ToolIcons';

/** Cursor for the magic tools: the gadget itself plus the area it will affect. */
export function MagicCursor({ s, p, now }: { s: RoundState; p: Vec; now: number }) {
  const t = now / 1000;
  const m = s.magic;
  const down = s.pointer.down;
  const tired = s.gear[s.tool]?.overheated;
  switch (s.tool) {
    case 'wand':
      return (
        <g pointerEvents="none">
          <circle cx={p.x} cy={p.y} r={WAND_RADIUS} fill="#ffe066" fillOpacity={down ? 0.18 : 0.08} stroke="#e0a800" strokeDasharray="4 5" strokeWidth={2} />
          {down && m.wandSel && (
            <g fill="#2b1a12" fontSize={12} fontWeight={900} textAnchor="middle">
              <text x={p.x} y={p.y - WAND_RADIUS - 6}>▲ dài</text>
              <text x={p.x} y={p.y + WAND_RADIUS + 14}>▼ ngắn</text>
            </g>
          )}
          <g transform={`translate(${p.x - 6},${p.y - 6}) scale(1.4)`} opacity={tired ? 0.4 : 1}>
            <ToolArt id="wand" />
          </g>
        </g>
      );
    case 'ray':
      return (
        <g pointerEvents="none">
          <circle cx={p.x} cy={p.y} r={RAY_RADIUS} fill="none" stroke="#ff3fa4" strokeWidth={2} strokeDasharray="3 4" />
          <path d={`M${p.x - 10},${p.y} h20 M${p.x},${p.y - 10} v20`} stroke="#ff3fa4" strokeWidth={2} />
          <g transform={`translate(${p.x + 14},${p.y + 10}) scale(1.3)`} opacity={tired ? 0.4 : 1}>
            <ToolArt id="ray" />
          </g>
        </g>
      );
    case 'storm': {
      const aim = m.aim;
      const off = s.headOffset;
      return (
        <g pointerEvents="none">
          {aim && <AimArrow from={{ x: aim.from.x + off.x, y: aim.from.y + off.y }} to={{ x: aim.to.x + off.x, y: aim.to.y + off.y }} />}
          <g transform={`translate(${p.x - 10},${p.y + 6}) scale(1.3)`} opacity={tired ? 0.4 : 1}>
            <ToolArt id="storm" />
          </g>
        </g>
      );
    }
    case 'vacuum': {
      const danger = down ? Math.min(1, m.vacuumHold / VACUUM_GULP_TIME) : 0;
      const r = down ? m.vacuumRadius : 28;
      const color = danger > 0.7 ? '#ff2a2a' : danger > 0.35 ? '#ff9f1c' : '#18c8ff';
      return (
        <g pointerEvents="none">
          <circle cx={p.x} cy={p.y} r={r} fill={color} fillOpacity={down ? 0.12 + danger * 0.2 : 0.05} stroke={color} strokeWidth={2 + danger * 3} />
          {down && (
            <g transform={`rotate(${(t * 400) % 360} ${p.x} ${p.y})`}>
              <circle cx={p.x} cy={p.y} r={r * 0.65} fill="none" stroke={color} strokeWidth={2} strokeDasharray="6 8" />
            </g>
          )}
          <g transform={`translate(${p.x - 34},${p.y - 4}) scale(1.4)`} opacity={tired ? 0.4 : 1}>
            <ToolArt id="vacuum" />
          </g>
        </g>
      );
    }
    case 'comb':
      return (
        <g pointerEvents="none" transform={`translate(${p.x - 20},${p.y - 22}) scale(1.2)`} opacity={tired ? 0.4 : 1}>
          <ToolArt id="comb" />
        </g>
      );
    case 'cooker':
      return (
        <g pointerEvents="none" transform={`translate(${p.x - 24},${p.y - 30}) scale(1.2)`} opacity={tired ? 0.4 : 0.85}>
          <ToolArt id="cooker" />
        </g>
      );
    default:
      return null;
  }
}

function AimArrow({ from, to }: { from: Vec; to: Vec }) {
  const len = dist(from, to);
  if (len < 4) return <circle cx={from.x} cy={from.y} r={6} fill="#7a5cff" />;
  const a = Math.atan2(to.y - from.y, to.x - from.x);
  const power = Math.min(1, len / 140);
  const head = 14;
  const hx = to.x - Math.cos(a) * head;
  const hy = to.y - Math.sin(a) * head;
  return (
    <g>
      <line x1={from.x} y1={from.y} x2={hx} y2={hy} stroke="#7a5cff" strokeWidth={5 + power * 6} strokeLinecap="round" opacity={0.8} />
      <path
        d={`M${to.x},${to.y} L${hx + Math.cos(a + Math.PI / 2) * 12},${hy + Math.sin(a + Math.PI / 2) * 12} L${hx - Math.cos(a + Math.PI / 2) * 12},${hy - Math.sin(a + Math.PI / 2) * 12}Z`}
        fill="#7a5cff"
      />
      <text x={from.x} y={from.y - 12} textAnchor="middle" fontSize={13} fontWeight={900} fill="#35208f">
        Gió {Math.round(Math.max(0.25, power) * 100)}%
      </text>
    </g>
  );
}

/** All short-lived visual effects of the magic tools. */
export function FxLayer({ s }: { s: RoundState }) {
  return (
    <g pointerEvents="none">
      {s.fx.map((f) => (
        <FxItem key={f.id} f={f} u={Math.min(1, Math.max(0, (s.time - f.t0) / f.dur))} />
      ))}
    </g>
  );
}

function FxItem({ f, u }: { f: Fx; u: number }) {
  const fade = 1 - u;
  switch (f.kind) {
    case 'beam':
      return (
        <g opacity={fade}>
          <line x1={f.x} y1={f.y} x2={f.x2} y2={f.y2} stroke={f.color} strokeWidth={14} strokeLinecap="round" opacity={0.35} />
          <line x1={f.x} y1={f.y} x2={f.x2} y2={f.y2} stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        </g>
      );
    case 'ring':
      return <circle cx={f.x} cy={f.y} r={8 + u * 40} fill="none" stroke={f.color} strokeWidth={6 * fade + 1} opacity={fade} />;
    case 'sparkle': {
      const r = 6 + u * 10;
      return (
        <path
          d={`M${f.x},${f.y - r} L${f.x + r * 0.25},${f.y - r * 0.25} L${f.x + r},${f.y} L${f.x + r * 0.25},${f.y + r * 0.25} L${f.x},${f.y + r} L${f.x - r * 0.25},${f.y + r * 0.25} L${f.x - r},${f.y} L${f.x - r * 0.25},${f.y - r * 0.25}Z`}
          fill={f.color}
          opacity={fade}
          transform={`rotate(${u * 90} ${f.x} ${f.y})`}
        />
      );
    }
    case 'gust': {
      const dx = f.x2 ?? 1;
      const dy = f.y2 ?? 0;
      const lines = [];
      for (let i = 0; i < 9; i++) {
        const off = (i - 4) * 28;
        const px = 200 - dy * off + dx * (u * 520 - 260 + (i % 3) * 30);
        const py = 230 + dx * off + dy * (u * 520 - 260 + (i % 3) * 30);
        lines.push(<line key={i} x1={px} y1={py} x2={px - dx * 60} y2={py - dy * 60} stroke={f.color} strokeWidth={4} strokeLinecap="round" />);
      }
      return <g opacity={0.9 * fade}>{lines}</g>;
    }
    case 'steam':
      return (
        <g fill="#ffffff" opacity={0.85 * fade}>
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={f.x - 60 + i * 30} cy={f.y - u * 90 - (i % 2) * 15} r={14 + u * 18} />
          ))}
        </g>
      );
    case 'pot': {
      // Drop (0-13%), cook with a wobble (13-80%), lift away (80-100%).
      const drop = u < 0.13 ? -160 * (1 - u / 0.13) : u > 0.8 ? -200 * ((u - 0.8) / 0.2) : 0;
      const wob = u > 0.13 && u < 0.8 ? Math.sin(u * 80) * 3 : 0;
      return (
        <g transform={`translate(${f.x + wob},${f.y + drop})`}>
          <path d="M-105,-20 h210 v70 q0,30 -30,30 h-150 q-30,0 -30,-30z" fill="#f4f4f0" stroke="#6b6b66" strokeWidth={5} />
          <path d="M-112,-20 q112,-80 224,0z" fill="#e6e6e0" stroke="#6b6b66" strokeWidth={5} />
          <rect x={-18} y={-80} width={36} height={18} rx={8} fill="#6b6b66" />
          <circle cx={0} cy={30} r={18} fill="#ff7aa8" />
          <text x={0} y={36} textAnchor="middle" fontSize={16} fontWeight={900} fill="#fff">
            {u < 0.8 ? 'NẤU' : 'XONG'}
          </text>
          {u > 0.13 && u < 0.8 && (
            <g fill="#fff" opacity={0.8}>
              <circle cx={-30} cy={-90 - (u * 200) % 40} r={10} />
              <circle cx={30} cy={-100 - (u * 260) % 40} r={12} />
            </g>
          )}
        </g>
      );
    }
    case 'suck':
      return (
        <line
          x1={f.x + ((f.x2 ?? f.x) - f.x) * u}
          y1={f.y + ((f.y2 ?? f.y) - f.y) * u}
          x2={f.x + ((f.x2 ?? f.x) - f.x) * Math.min(1, u + 0.25)}
          y2={f.y + ((f.y2 ?? f.y) - f.y) * Math.min(1, u + 0.25)}
          stroke="#2b1a12"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={fade}
        />
      );
    case 'combo': {
      const sc = u < 0.15 ? 0.5 + (u / 0.15) * 0.7 : 1.2 - Math.min(0.2, (u - 0.15) * 0.5);
      const x = Math.min(320, Math.max(80, f.x));
      const y = Math.min(420, Math.max(110, f.y));
      return (
        <g transform={`translate(${x},${y}) scale(${sc})`} opacity={u > 0.8 ? (1 - u) / 0.2 : 1}>
          <path d="M0,-46 L12,-16 L44,-20 L20,2 L36,30 L6,16 L-14,42 L-16,10 L-46,6 L-20,-12 L-30,-40 L-4,-22Z" fill="#ffd23f" stroke="#d6332f" strokeWidth={4} />
          <text y={70} textAnchor="middle" fontSize={20} fontWeight={900} fill="#d6332f" stroke="#fff" strokeWidth={5} paintOrder="stroke">
            {f.text}
          </text>
        </g>
      );
    }
    case 'praise':
      return (
        <text x={f.x} y={f.y - 20 - u * 34} textAnchor="middle" fontSize={20} fontWeight={900} fill="#1f9d55" stroke="#fff" strokeWidth={5} paintOrder="stroke" opacity={fade} transform={`rotate(-6 ${f.x} ${f.y})`}>
          {f.text}
        </text>
      );
    case 'banner': {
      const sc = u < 0.12 ? 2.2 - (u / 0.12) * 1.2 : 1;
      return (
        <g transform={`translate(200,${f.y}) scale(${sc.toFixed(2)}) rotate(-4)`} opacity={u > 0.8 ? (1 - u) / 0.2 : 1}>
          <rect x={-130} y={-30} width={260} height={56} rx={10} fill="#d6332f" stroke="#2b1a12" strokeWidth={5} />
          <text y={12} textAnchor="middle" fontSize={34} fontWeight={900} fill="#ffd23f" stroke="#2b1a12" strokeWidth={3} paintOrder="stroke">
            {f.text}
          </text>
        </g>
      );
    }
    case 'overheat':
      return (
        <text x={f.x} y={f.y - 30 - u * 30} textAnchor="middle" fontSize={18} fontWeight={900} fill="#e0201a" stroke="#fff" strokeWidth={4} paintOrder="stroke" opacity={fade}>
          {f.text}
        </text>
      );
  }
}
