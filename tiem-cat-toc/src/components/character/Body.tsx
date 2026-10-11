import type { CustomerLook, Idle } from '../../game/look';
import { G, f1 } from './geo';

/** Body sway/bounce per idle style. Moves only the body: the head (what the player cuts) stays put. */
export function idleOffset(idle: Idle | undefined, t: number, phase: number): { x: number; y: number } {
  const p = t + phase;
  switch (idle) {
    case 'breathe':
      return { x: 0, y: Math.sin(p * 1.7) * 2 };
    case 'bounce':
      return { x: 0, y: -Math.abs(Math.sin(p * 6.5)) * 3 };
    case 'sway':
      return { x: Math.sin(p * 1.3) * 4, y: 0 };
    case 'nod':
      return { x: 0, y: Math.sin(p * 0.9) * 3 };
    case 'jitter':
      return { x: Math.sin(p * 31) * 1.1, y: Math.sin(p * 23) * 0.6 };
    case 'tap':
      return { x: 0, y: (p % 1.2 < 0.12 ? -2 : 0) };
    default:
      return { x: 0, y: 0 };
  }
}

/** Things standing behind the customer (ring light, cane, hoodie hood). */
export function BehindBody({ g, look, t }: { g: G; look: CustomerLook; t: number }) {
  const { cx, S } = g;
  const nw = 30 * g.neck;
  const a = nw + 6;
  return (
    <g>
      {look.prop === 'ringLight' && (
        <g transform={`translate(${f1(cx - 132)},${f1(S - 170)})`}>
          <path d="M0,52 L-6,340 M0,52 L10,340" stroke="#4a4f57" strokeWidth={4} />
          <circle r={50} fill="none" stroke="#fffbe6" strokeWidth={14} />
          <circle r={50} fill="none" stroke="#ffd9f0" strokeWidth={4} opacity={0.6 + Math.sin(t * 4) * 0.3} />
          <rect x={-13} y={-22} width={26} height={44} rx={5} fill="#1d1f24" />
          <rect x={-10} y={-18} width={20} height={34} rx={3} fill="#ff4fa0" />
        </g>
      )}
      {look.prop === 'cane' && (
        <g>
          <path d={`M${f1(cx - 150)},530 L${f1(cx - 130)},${f1(S - 60)} q4,-30 30,-24 q14,6 6,22`} fill="none" stroke="#7a4a22" strokeWidth={9} strokeLinecap="round" />
        </g>
      )}
      {look.body?.collar === 'hoodie' && (
        <path d={`M${f1(cx - a - 46)},${f1(S + 14)} Q${f1(cx - a - 56)},${f1(S - 50)} ${f1(cx)},${f1(S - 62)} Q${f1(cx + a + 56)},${f1(S - 50)} ${f1(cx + a + 46)},${f1(S + 14)}Z`} fill={look.shirt} stroke="#00000033" strokeWidth={3} />
      )}
    </g>
  );
}

function Collar({ g, look }: { g: G; look: CustomerLook }) {
  const { cx, S } = g;
  const nw = 30 * g.neck;
  const a = nw + 6;
  const shirt = look.shirt;
  const trim = look.trim ?? '#ffffff';
  const edge = '#00000040';
  switch (look.body?.collar) {
    case 'tee':
      return <path d={`M${f1(cx - a)},${f1(S - 4)} Q${f1(cx)},${f1(S + 20)} ${f1(cx + a)},${f1(S - 4)} L${f1(cx + a + 8)},${f1(S + 6)} Q${f1(cx)},${f1(S + 32)} ${f1(cx - a - 8)},${f1(S + 6)}Z`} fill={shirt} stroke={edge} strokeWidth={2} />;
    case 'shirt':
    case 'uniform':
      return (
        <g fill={look.body?.collar === 'uniform' ? '#ffffff' : trim} stroke={edge} strokeWidth={2} strokeLinejoin="round">
          <path d={`M${f1(cx - 2)},${f1(S + 20)} L${f1(cx - a - 4)},${f1(S - 12)} L${f1(cx - a - 16)},${f1(S + 12)}Z`} />
          <path d={`M${f1(cx + 2)},${f1(S + 20)} L${f1(cx + a + 4)},${f1(S - 12)} L${f1(cx + a + 16)},${f1(S + 12)}Z`} />
          <circle cx={cx} cy={S + 26} r={2.6} fill="#ccc" />
        </g>
      );
    case 'polo':
      return (
        <g stroke={edge} strokeWidth={2} strokeLinejoin="round">
          <rect x={cx - 6} y={S + 4} width={12} height={30} fill={shirt} />
          <path d={`M${f1(cx - 3)},${f1(S + 10)} L${f1(cx - a - 2)},${f1(S - 12)} L${f1(cx - a - 20)},${f1(S + 8)} L${f1(cx - 8)},${f1(S + 18)}Z`} fill={shirt} />
          <path d={`M${f1(cx + 3)},${f1(S + 10)} L${f1(cx + a + 2)},${f1(S - 12)} L${f1(cx + a + 20)},${f1(S + 8)} L${f1(cx + 8)},${f1(S + 18)}Z`} fill={shirt} />
          <circle cx={cx} cy={S + 16} r={2.4} fill={trim} />
          <circle cx={cx} cy={S + 26} r={2.4} fill={trim} />
        </g>
      );
    case 'suit':
      return (
        <g stroke={edge} strokeWidth={2} strokeLinejoin="round">
          <path d={`M${f1(cx - a + 2)},${f1(S - 10)} L${f1(cx)},${f1(S + 34)} L${f1(cx + a - 2)},${f1(S - 10)}Z`} fill="#ffffff" />
          <path d={`M${f1(cx - a - 22)},${f1(S + 4)} L${f1(cx - 4)},${f1(S + 46)} L${f1(cx - a + 2)},${f1(S - 10)}Z`} fill={trim} />
          <path d={`M${f1(cx + a + 22)},${f1(S + 4)} L${f1(cx + 4)},${f1(S + 46)} L${f1(cx + a - 2)},${f1(S - 10)}Z`} fill={trim} />
        </g>
      );
    case 'blouse':
      return (
        <g fill={trim} stroke={edge} strokeWidth={1.6}>
          {Array.from({ length: 9 }, (_, i) => {
            const u = -1 + (2 * i) / 8;
            const x = cx + u * (a + 10);
            const y = S - 2 + (1 - u * u) * 16;
            return <circle key={i} cx={x} cy={y} r={8} />;
          })}
        </g>
      );
    case 'gi':
      return (
        <g stroke="#1d1d1d" strokeWidth={2} strokeLinejoin="round">
          <path d={`M${f1(cx + a + 14)},${f1(S - 6)} L${f1(cx - 8)},${f1(S + 42)} L${f1(cx + 8)},${f1(S + 42)} L${f1(cx + a + 26)},${f1(S + 8)}Z`} fill="#f4f4f4" />
          <path d={`M${f1(cx - a - 14)},${f1(S - 6)} L${f1(cx + 14)},${f1(S + 46)} L${f1(cx - 4)},${f1(S + 48)} L${f1(cx - a - 26)},${f1(S + 8)}Z`} fill="#f4f4f4" />
          <path d={`M${f1(cx - a - 20)},${f1(S + 1)} L${f1(cx + 5)},${f1(S + 47)}`} stroke={trim} strokeWidth={6} />
        </g>
      );
    case 'tank':
      return (
        <g>
          <path d={`M${f1(cx - a - 8)},${f1(S - 6)} Q${f1(cx)},${f1(S + 46)} ${f1(cx + a + 8)},${f1(S - 6)}Z`} fill={look.skin} />
          <path d={`M${f1(cx - a - 8)},${f1(S - 6)} Q${f1(cx)},${f1(S + 46)} ${f1(cx + a + 8)},${f1(S - 6)}`} fill="none" stroke={shirt} strokeWidth={7} />
          <path d={`M${f1(cx - a - 12)},${f1(S - 8)} L${f1(cx - a - 24)},${f1(S + 18)} M${f1(cx + a + 12)},${f1(S - 8)} L${f1(cx + a + 24)},${f1(S + 18)}`} stroke={shirt} strokeWidth={9} strokeLinecap="round" />
        </g>
      );
    case 'hoodie':
      return (
        <g>
          <path d={`M${f1(cx - a - 6)},${f1(S - 4)} Q${f1(cx)},${f1(S + 26)} ${f1(cx + a + 6)},${f1(S - 4)} L${f1(cx + a + 14)},${f1(S + 8)} Q${f1(cx)},${f1(S + 40)} ${f1(cx - a - 14)},${f1(S + 8)}Z`} fill={shirt} stroke={edge} strokeWidth={2} />
          <path d={`M${f1(cx - 12)},${f1(S + 18)} l-2,34 M${f1(cx + 12)},${f1(S + 18)} l2,34`} stroke={trim} strokeWidth={3} strokeLinecap="round" />
          <circle cx={cx - 14} cy={S + 54} r={3.5} fill={trim} />
          <circle cx={cx + 14} cy={S + 54} r={3.5} fill={trim} />
        </g>
      );
    case 'jacket':
      return (
        <g stroke={edge} strokeWidth={2}>
          <path d={`M${f1(cx - a - 6)},${f1(S - 20)} L${f1(cx - a - 12)},${f1(S + 12)} Q${f1(cx)},${f1(S + 28)} ${f1(cx + a + 12)},${f1(S + 12)} L${f1(cx + a + 6)},${f1(S - 20)} Q${f1(cx)},${f1(S - 6)} ${f1(cx - a - 6)},${f1(S - 20)}Z`} fill={shirt} />
          <path d={`M${f1(cx - a - 9)},${f1(S - 2)} Q${f1(cx)},${f1(S + 14)} ${f1(cx + a + 9)},${f1(S - 2)}`} fill="none" stroke={trim} strokeWidth={5} />
          <path d={`M${f1(cx)},${f1(S - 6)} V${f1(S + 46)}`} stroke="#c9ced6" strokeWidth={3} strokeDasharray="2 2" />
        </g>
      );
    case 'aodai':
      return (
        <g stroke={edge} strokeWidth={2}>
          <path d={`M${f1(cx - a + 2)},${f1(S - 28)} L${f1(cx - a - 2)},${f1(S + 4)} Q${f1(cx)},${f1(S + 14)} ${f1(cx + a + 2)},${f1(S + 4)} L${f1(cx + a - 2)},${f1(S - 28)} Q${f1(cx)},${f1(S - 20)} ${f1(cx - a + 2)},${f1(S - 28)}Z`} fill={shirt} />
          <path d={`M${f1(cx - a + 2)},${f1(S - 26)} Q${f1(cx)},${f1(S - 18)} ${f1(cx + a - 2)},${f1(S - 26)}`} fill="none" stroke={trim} strokeWidth={3} />
          <path d={`M${f1(cx + a)},${f1(S + 4)} Q${f1(cx + a + 22)},${f1(S + 18)} ${f1(cx + a + 44)},${f1(S + 22)}`} fill="none" stroke={trim} strokeWidth={4} />
        </g>
      );
    case 'cardigan':
      return (
        <g stroke={edge} strokeWidth={2}>
          <path d={`M${f1(cx - a)},${f1(S - 4)} Q${f1(cx)},${f1(S + 18)} ${f1(cx + a)},${f1(S - 4)} L${f1(cx + a + 6)},${f1(S + 4)} Q${f1(cx)},${f1(S + 28)} ${f1(cx - a - 6)},${f1(S + 4)}Z`} fill={trim} />
          <path d={`M${f1(cx - a - 16)},${f1(S + 2)} L${f1(cx - 2)},${f1(S + 52)} M${f1(cx + a + 16)},${f1(S + 2)} L${f1(cx + 2)},${f1(S + 52)}`} stroke={shirt} strokeWidth={9} strokeLinecap="round" />
          <circle cx={cx - 6} cy={S + 38} r={3} fill="#6a4a2a" />
        </g>
      );
    case 'hawaii':
      return (
        <g stroke={edge} strokeWidth={2} strokeLinejoin="round">
          <path d={`M${f1(cx - a - 2)},${f1(S - 6)} L${f1(cx)},${f1(S + 44)} L${f1(cx + a + 2)},${f1(S - 6)}Z`} fill={look.skin} />
          <path d={`M${f1(cx - a - 4)},${f1(S - 10)} L${f1(cx - 6)},${f1(S + 30)} L${f1(cx - a - 34)},${f1(S + 18)}Z`} fill={shirt} />
          <path d={`M${f1(cx + a + 4)},${f1(S - 10)} L${f1(cx + 6)},${f1(S + 30)} L${f1(cx + a + 34)},${f1(S + 18)}Z`} fill={shirt} />
          <g fill={trim} stroke="none">
            <circle cx={cx - a - 16} cy={S + 10} r={4} />
            <circle cx={cx + a + 20} cy={S + 12} r={4} />
            <circle cx={cx - a - 6} cy={S + 2} r={2.5} />
          </g>
        </g>
      );
    case 'pajama':
      return (
        <g stroke={edge} strokeWidth={2}>
          <path d={`M${f1(cx - 2)},${f1(S + 12)} Q${f1(cx - a - 30)},${f1(S + 26)} ${f1(cx - a - 8)},${f1(S - 8)}Z`} fill={shirt} />
          <path d={`M${f1(cx + 2)},${f1(S + 12)} Q${f1(cx + a + 30)},${f1(S + 26)} ${f1(cx + a + 8)},${f1(S - 8)}Z`} fill={shirt} />
          <g fill={trim} stroke="none">
            <circle cx={cx - a - 6} cy={S + 6} r={3} />
            <circle cx={cx + a + 8} cy={S + 4} r={3} />
            <circle cx={cx - 14} cy={S + 12} r={2.4} />
            <circle cx={cx + 16} cy={S + 13} r={2.4} />
          </g>
        </g>
      );
    default:
      return null;
  }
}

/** Neck, shirt, barber cape, collar and everything worn below the chin. */
export function Body({ g, look, t }: { g: G; look: CustomerLook; t: number }) {
  const { cx, S, chinY } = g;
  const k = g.shoulders;
  const b = look.body?.belly ?? 0;
  const nw = 30 * g.neck;
  const nb = nw + 14;
  const dog = look.species === 'dog';
  return (
    <g>
      {/* neck */}
      <path d={`M${f1(cx - nw)},${f1(chinY - 40)} L${f1(cx - nw - 3)},${f1(S + 16)} L${f1(cx + nw + 3)},${f1(S + 16)} L${f1(cx + nw)},${f1(chinY - 40)}Z`} fill={look.skinShade} />
      <path d={`M${f1(cx - nw + 4)},${f1(chinY - 20)} L${f1(cx - nw + 2)},${f1(S + 10)} L${f1(cx + nw - 2)},${f1(S + 10)} L${f1(cx + nw - 4)},${f1(chinY - 20)}Z`} fill={look.skin} opacity={0.55} />
      {look.face?.tattoo && (
        <path d={`M${f1(cx + nw - 6)},${f1(chinY + 2)} q-14,6 -6,14 q10,6 -2,14 q-10,6 2,12`} fill="none" stroke="#2b6b5a" strokeWidth={3.5} strokeLinecap="round" />
      )}
      {/* shirt under the cape */}
      <path d={`M${f1(cx - 150 * k)},530 Q${f1(cx - 140 * k)},${f1(S + 22)} ${f1(cx - nb)},${f1(S)} L${f1(cx + nb)},${f1(S)} Q${f1(cx + 140 * k)},${f1(S + 22)} ${f1(cx + 150 * k)},530Z`} fill={look.shirt} />
      {/* barber cape: shoulder width and belly change the silhouette */}
      <path
        d={`M${f1(cx - 168 * k - b * 26)},530 Q${f1(cx - 140 * k - b * 56)},${f1(S + 110)} ${f1(cx - 120 * k)},${f1(S + 32)} Q${f1(cx)},${f1(S - 16)} ${f1(cx + 120 * k)},${f1(S + 32)} Q${f1(cx + 140 * k + b * 56)},${f1(S + 110)} ${f1(cx + 168 * k + b * 26)},530Z`}
        fill="#e9f3f1"
        stroke="#9fbcb7"
        strokeWidth={3}
      />
      <g stroke="#7fc4ba" strokeWidth={6} opacity={0.6}>
        <path
          d={`M${f1(cx - 120 * k)},${f1(S + 77)} L${f1(cx - 140 * k)},520 M${f1(cx - 60 * k)},${f1(S + 47)} L${f1(cx - 70 * k)},520 M${cx},${f1(S + 40)} L${cx},520 M${f1(cx + 60 * k)},${f1(S + 47)} L${f1(cx + 70 * k)},520 M${f1(cx + 120 * k)},${f1(S + 77)} L${f1(cx + 140 * k)},520`}
        />
      </g>
      {b > 0 && <path d={`M${f1(cx - 80 * k)},${f1(S + 112)} Q${f1(cx)},${f1(S + 140 + b * 26)} ${f1(cx + 80 * k)},${f1(S + 112)}`} fill="none" stroke="#9fbcb7" strokeWidth={3} opacity={0.8} />}
      <path d={`M${f1(cx - nb)},${f1(S)} Q${cx},${f1(S + 24)} ${f1(cx + nb)},${f1(S)} Q${cx},${f1(S + 14)} ${f1(cx - nb)},${f1(S)}Z`} fill="#c9dcd8" />
      <Collar g={g} look={look} />
      {look.chain === 'thick' ? (
        <g>
          <path d={`M${f1(cx - nw - 6)},${f1(S - 14)} Q${cx},${f1(S + 44)} ${f1(cx + nw + 6)},${f1(S - 14)}`} fill="none" stroke="#b8860b" strokeWidth={10} />
          <path d={`M${f1(cx - nw - 6)},${f1(S - 14)} Q${cx},${f1(S + 44)} ${f1(cx + nw + 6)},${f1(S - 14)}`} fill="none" stroke="#ffd34d" strokeWidth={6} strokeDasharray="6 3" />
          <circle cx={cx} cy={S + 20} r={11} fill="#ffd34d" stroke="#a8740c" strokeWidth={3} />
          <text x={cx} y={S + 25} textAnchor="middle" fontSize={13} fontWeight={900} fill="#a8740c">
            $
          </text>
        </g>
      ) : (
        look.chain && <path d={`M${f1(cx - nw)},${f1(S - 16)} Q${cx},${f1(S + 22)} ${f1(cx + nw)},${f1(S - 16)}`} fill="none" stroke="#f2c230" strokeWidth={5} strokeDasharray="5 3" />
      )}
      {look.necklace && (
        <g fill="#fffaf0" stroke="#c9c2b0" strokeWidth={1}>
          {Array.from({ length: 9 }, (_, i) => {
            const a = Math.PI * (0.15 + (0.7 * i) / 8);
            return <circle key={i} cx={cx - Math.cos(a) * (nw + 6)} cy={S - 16 + Math.sin(a) * 24} r={4.5} />;
          })}
        </g>
      )}
      {look.tie && <path d={`M${f1(cx - 9)},${f1(S - 4)} h18 l-4,10 l6,26 l-11,10 l-11,-10 l6,-26z`} fill={look.tie} stroke="#0d2a66" strokeWidth={2} />}
      {look.bowTie && (
        <g fill={look.bowTie} stroke="#00000066" strokeWidth={2}>
          <path d={`M${cx},${f1(S + 2)} l-18,-10 v20z M${cx},${f1(S + 2)} l18,-10 v20z`} />
          <circle cx={cx} cy={S + 2} r={5} />
        </g>
      )}
      {look.redScarf && (
        <g fill="#e5322d" stroke="#8f1512" strokeWidth={2} strokeLinejoin="round">
          <path d={`M${f1(cx - nb)},${f1(S - 6)} Q${cx},${f1(S + 18)} ${f1(cx + nb)},${f1(S - 6)} L${f1(cx + nb - 4)},${f1(S + 4)} Q${cx},${f1(S + 26)} ${f1(cx - nb + 4)},${f1(S + 4)}Z`} />
          <path d={`M${f1(cx - 4)},${f1(S + 14)} l-14,40 l12,-4 z M${f1(cx + 4)},${f1(S + 14)} l14,40 l-12,-4 z`} />
          <circle cx={cx} cy={S + 14} r={7} />
        </g>
      )}
      {look.badge && (
        <g transform={`rotate(${f1(Math.sin(t * 2.2) * 5)} ${cx} ${f1(S)})`}>
          <path d={`M${f1(cx - nw + 4)},${f1(S - 10)} L${f1(cx - 4)},${f1(S + 44)} M${f1(cx + nw - 4)},${f1(S - 10)} L${f1(cx + 4)},${f1(S + 44)}`} stroke="#1f4fb5" strokeWidth={4} />
          <rect x={cx - 16} y={S + 42} width={32} height={40} rx={4} fill="#fff" stroke="#1f4fb5" strokeWidth={2.5} />
          <rect x={cx - 10} y={S + 48} width={20} height={14} fill="#bcd2f5" />
          <path d={`M${f1(cx - 10)},${f1(S + 68)} h20 M${f1(cx - 10)},${f1(S + 74)} h14`} stroke="#9aa3ad" strokeWidth={2} />
        </g>
      )}
      {look.hat === 'headphones' && (
        <g>
          <path d={`M${f1(cx - nw - 16)},${f1(S - 4)} Q${cx},${f1(S + 30)} ${f1(cx + nw + 16)},${f1(S - 4)}`} fill="none" stroke="#1d1d1d" strokeWidth={7} />
          <rect x={cx - nw - 34} y={S - 22} width={26} height={34} rx={10} fill="#ff3b6b" stroke="#1d1d1d" strokeWidth={3} />
          <rect x={cx + nw + 8} y={S - 22} width={26} height={34} rx={10} fill="#ff3b6b" stroke="#1d1d1d" strokeWidth={3} />
        </g>
      )}
      {dog && (
        <g>
          <path d={`M${f1(cx - 40)},${f1(S - 12)} Q${cx},${f1(S + 6)} ${f1(cx + 40)},${f1(S - 12)} l0,12 Q${cx},${f1(S + 18)} ${f1(cx - 40)},${f1(S)}Z`} fill={look.shirt} stroke="#7a1512" strokeWidth={2} />
          <circle cx={cx} cy={S + 12} r={8} fill="#ffd23f" stroke="#a8740c" strokeWidth={2} />
        </g>
      )}
      <Props g={g} look={look} t={t} />
    </g>
  );
}

function Props({ g, look, t }: { g: G; look: CustomerLook; t: number }) {
  const { cx, S } = g;
  switch (look.prop) {
    case 'helmet':
      return (
        <g transform={`translate(${cx + 128},${S + 50})`}>
          <path d="M-40,10 Q-40,-38 0,-40 Q40,-38 40,10Z" fill="#2fa84f" stroke="#145c2a" strokeWidth={4} />
          <rect x={-44} y={6} width={88} height={12} rx={5} fill="#145c2a" />
          <path d="M-18,-20 h36" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.7} />
        </g>
      );
    case 'phoneStick':
      return (
        <g transform={`translate(${cx + 118},${S - 188})`}>
          <path d="M10,200 L-4,40" stroke="#555" strokeWidth={5} />
          <rect x={-26} y={-10} width={46} height={78} rx={8} fill="#1d1f24" />
          <rect x={-22} y={-4} width={38} height={64} rx={4} fill="#ff4fa0" />
          <circle cx={-3} cy={28} r={11} fill="#fff" />
          <text x={-3} y={33} textAnchor="middle" fontSize={12} fontWeight={900} fill="#ff4fa0">
            LIVE
          </text>
        </g>
      );
    case 'schoolBag':
      return (
        <g>
          <path d={`M${cx - 70},${S + 12} q-6,60 -4,110`} stroke="#1f4fb5" strokeWidth={12} fill="none" />
          <path d={`M${cx + 70},${S + 12} q6,60 4,110`} stroke="#1f4fb5" strokeWidth={12} fill="none" />
        </g>
      );
    case 'briefcase':
      return (
        <g transform={`translate(${cx - 140},${S + 72})`}>
          <rect x={-34} y={-24} width={68} height={48} rx={6} fill="#5a3a22" stroke="#2b1a0e" strokeWidth={3} />
          <path d="M-12,-24 v-10 h24 v10" fill="none" stroke="#2b1a0e" strokeWidth={4} />
        </g>
      );
    case 'fan': {
      const r = Math.sin(t * 5) * 12;
      return (
        <g transform={`translate(${cx + 128},${S + 40}) rotate(${f1(-30 + r)})`}>
          <path d="M0,0 L-34,-56 A66,66 0 0 1 34,-56Z" fill="#f2d48a" stroke="#a8740c" strokeWidth={3} />
          <path d="M0,0 L-20,-62 M0,0 L-6,-65 M0,0 L8,-65 M0,0 L22,-61" stroke="#c99a3a" strokeWidth={2} />
          <rect x={-4} y={0} width={8} height={30} rx={3} fill="#7a4a22" />
        </g>
      );
    }
    case 'moneyFan': {
      const r = Math.sin(t * 5) * 10;
      return (
        <g transform={`translate(${cx + 128},${S + 46}) rotate(${f1(-20 + r)})`}>
          {[-30, -15, 0, 15, 30].map((d) => (
            <g key={d} transform={`rotate(${d})`}>
              <rect x={-12} y={-64} width={24} height={60} rx={2} fill="#7cc576" stroke="#2f6e1f" strokeWidth={2} />
              <text x={0} y={-30} textAnchor="middle" fontSize={14} fontWeight={900} fill="#2f6e1f">
                ₫
              </text>
            </g>
          ))}
          <circle r={8} fill="#f2c49b" stroke="#c78f62" strokeWidth={2} />
        </g>
      );
    }
    case 'phone':
      return (
        <g transform={`translate(${cx + 120},${S + 30}) rotate(10)`}>
          <rect x={-20} y={-36} width={40} height={70} rx={7} fill="#1d1f24" />
          <rect x={-16} y={-30} width={32} height={56} rx={3} fill="#b9f3ea" />
          <circle cx={0} cy={-2} r={9} fill="#f2c49b" />
          <path d="M-9,-6 l3,-14 l3,8 l3,-12 l3,12 l3,-10 l3,14z" fill="#e5322d" />
          <text x={0} y={22} textAnchor="middle" fontSize={8} fontWeight={900} fill="#e5322d">
            VIRAL
          </text>
        </g>
      );
    default:
      return null;
  }
}
