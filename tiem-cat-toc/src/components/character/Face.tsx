import type { Mood } from '../../game/evaluate';
import type { CustomerLook, EyeStyle, FaceSpec } from '../../game/look';
import { G, f1, faceHalfWidth } from './geo';

const INK = '#2b1a12';

const EYE_SCALE: Record<EyeStyle, number> = { bean: 1, dot: 0.8, big: 1.25, narrow: 0.95, lashes: 1.05, droopy: 1, beady: 0.7 };

/** Eyes at rest, in the customer's own style. */
function RestEyes({ g, face, look, blink }: { g: G; face: FaceSpec; look: CustomerLook; blink: boolean }) {
  const { cx, ey, ex } = g;
  const style = face.eyes ?? 'bean';
  const xs = [cx - ex, cx + ex];
  if (blink && style !== 'narrow') {
    return (
      <g fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round">
        {xs.map((x) => (
          <path key={x} d={`M${f1(x - 9)},${f1(ey + 1)} Q${f1(x)},${f1(ey + 5)} ${f1(x + 9)},${f1(ey + 1)}`} />
        ))}
      </g>
    );
  }
  switch (style) {
    case 'dot':
      return (
        <g fill={INK}>
          {xs.map((x) => (
            <circle key={x} cx={x} cy={ey} r={4.6} />
          ))}
        </g>
      );
    case 'beady':
      return (
        <g>
          {xs.map((x) => (
            <g key={x}>
              <circle cx={x} cy={ey} r={6.5} fill="#fff" stroke={INK} strokeWidth={2} />
              <circle cx={x + (x < cx ? 1.5 : -1.5)} cy={ey} r={2.6} fill={INK} />
            </g>
          ))}
        </g>
      );
    case 'big':
      return (
        <g>
          {xs.map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={ey} rx={11.5} ry={13.5} fill="#fff" stroke={INK} strokeWidth={2.6} />
              <circle cx={x} cy={ey + 2} r={8} fill="#5b3420" />
              <circle cx={x} cy={ey + 2} r={4.4} fill={INK} />
              <circle cx={x + 3} cy={ey - 2} r={2.8} fill="#fff" />
              <circle cx={x - 3} cy={ey + 5} r={1.3} fill="#fff" />
            </g>
          ))}
        </g>
      );
    case 'narrow':
      return (
        <g>
          {xs.map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={ey + 1} rx={8} ry={3.4} fill={INK} />
              <path d={`M${f1(x - 12)},${f1(ey - 2)} Q${f1(x)},${f1(ey - 7)} ${f1(x + 12)},${f1(ey - 2)}`} fill="none" stroke={INK} strokeWidth={3.6} strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    case 'droopy':
      return (
        <g>
          {xs.map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={ey} rx={10} ry={9} fill="#fff" stroke={INK} strokeWidth={2.4} />
              <circle cx={x} cy={ey + 3.5} r={4.4} fill={INK} />
              <path d={`M${f1(x - 11)},${f1(ey)} A10,9 0 0 1 ${f1(x + 11)},${f1(ey)} Z`} fill={look.skin} />
              <path d={`M${f1(x - 11)},${f1(ey)} L${f1(x + 11)},${f1(ey + 1.5)}`} stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
    default:
      return (
        <g fill={INK}>
          {xs.map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={ey} rx={5.5} ry={7} />
              <circle cx={x + 2} cy={ey - 3} r={1.8} fill="#fff" />
            </g>
          ))}
        </g>
      );
  }
}

function MoodEyes({ g, mood, k }: { g: G; mood: Mood; k: number }) {
  const { cx, ey, ex } = g;
  const xs = [cx - ex, cx + ex];
  switch (mood) {
    case 'happy':
      return (
        <g fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round">
          {xs.map((x) => (
            <path key={x} d={`M${f1(x - 9 * k)},${f1(ey + 3)} Q${f1(x)},${f1(ey - 8 * k)} ${f1(x + 9 * k)},${f1(ey + 3)}`} />
          ))}
        </g>
      );
    case 'ecstatic':
      return (
        <g fill="#ffd23f" stroke={INK} strokeWidth={2.5} strokeLinejoin="round">
          {xs.map((x) => (
            <path
              key={x}
              transform={`translate(${f1(x)},${f1(ey)}) scale(${k.toFixed(2)})`}
              d="M0,-14 L4,-4 L14,-2 L6,5 L9,15 L0,9 L-9,15 L-6,5 L-14,-2 L-4,-4Z"
            />
          ))}
        </g>
      );
    case 'suspicious':
      return (
        <g>
          {xs.map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={ey} rx={10 * k} ry={4} fill="#fff" stroke={INK} strokeWidth={2.5} />
              <circle cx={x + 4 * k} cy={ey} r={3} fill={INK} />
            </g>
          ))}
        </g>
      );
    case 'shocked':
      return (
        <g>
          {xs.map((x) => (
            <g key={x}>
              <circle cx={x} cy={ey} r={13 * k} fill="#fff" stroke={INK} strokeWidth={3} />
              <circle cx={x} cy={ey} r={2.6} fill={INK} />
            </g>
          ))}
        </g>
      );
    case 'crying':
      return (
        <g>
          <g fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round">
            {xs.map((x) => (
              <path key={x} d={`M${f1(x - 10)},${f1(ey - 2)} Q${f1(x)},${f1(ey + 7)} ${f1(x + 10)},${f1(ey - 2)}`} />
            ))}
          </g>
          <path d={`M${f1(cx - ex - 4)},${f1(ey + 6)} q-6,26 -2,60 l10,0 q2,-34 0,-60z`} fill="#6ec6ff" opacity={0.85} />
          <path d={`M${f1(cx + ex + 4)},${f1(ey + 6)} q6,26 2,60 l-10,0 q-2,-34 0,-60z`} fill="#6ec6ff" opacity={0.85} />
        </g>
      );
    case 'sleepy':
      return (
        <g>
          <g fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round">
            {xs.map((x) => (
              <path key={x} d={`M${f1(x - 10)},${f1(ey + 2)} Q${f1(x)},${f1(ey + 6)} ${f1(x + 10)},${f1(ey + 2)}`} />
            ))}
          </g>
          <text x={g.cx + g.rx - 4} y={g.cy - 60 * g.sy} fontSize={22} fontWeight={900} fill="#5a6bd6" stroke="#fff" strokeWidth={3} paintOrder="stroke">
            Zzz
          </text>
        </g>
      );
    case 'flinch':
    case 'sneeze':
      return (
        <g fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M${f1(cx - ex - 10)},${f1(ey - 7)} L${f1(cx - ex + 7)},${f1(ey)} L${f1(cx - ex - 10)},${f1(ey + 7)}`} />
          <path d={`M${f1(cx + ex + 10)},${f1(ey - 7)} L${f1(cx + ex - 7)},${f1(ey)} L${f1(cx + ex + 10)},${f1(ey + 7)}`} />
        </g>
      );
    case 'angry':
      return (
        <g>
          {xs.map((x) => (
            <g key={x}>
              <circle cx={x} cy={ey + 2} r={8 * k} fill="#fff" stroke={INK} strokeWidth={2.5} />
              <circle cx={x + (x < cx ? 2 : -2)} cy={ey + 3} r={3.6} fill={INK} />
            </g>
          ))}
        </g>
      );
    case 'worried':
      return (
        <g>
          {xs.map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={ey} rx={9 * k} ry={10 * k} fill="#fff" stroke={INK} strokeWidth={2.5} />
              <circle cx={x} cy={ey + 3} r={4} fill={INK} />
            </g>
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** Lashes and eyeliner wings on top of whatever the eyes are doing. */
function Lashes({ g, mood }: { g: G; mood: Mood }) {
  if (mood === 'crying' || mood === 'sleepy' || mood === 'flinch' || mood === 'sneeze' || mood === 'happy') return null;
  const { cx, ey, ex } = g;
  return (
    <g fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round">
      {[-1, 1].map((d) => {
        const x = cx + d * ex;
        return <path key={d} d={`M${f1(x + d * 7)},${f1(ey - 7)} l${d * 7},-5 M${f1(x + d * 2)},${f1(ey - 9)} l${d * 3},-7 M${f1(x - d * 4)},${f1(ey - 9)} l${-d * 1},-7 M${f1(x + d * 9)},${f1(ey - 1)} l${d * 8},-3`} />;
      })}
    </g>
  );
}

function browPaths(g: G, mood: Mood, face: FaceSpec): [string, string] {
  const { cx, by, ex } = g;
  const w = (face.brows === 'thick' || face.brows === 'bushy' ? 17 : 15) * Math.max(0.85, g.sx);
  const L = cx - ex;
  const R = cx + ex;
  switch (mood) {
    case 'angry':
      return [`M${f1(L - w)},${f1(by - 8)} L${f1(L + w)},${f1(by + 4)}`, `M${f1(R + w)},${f1(by - 8)} L${f1(R - w)},${f1(by + 4)}`];
    case 'worried':
    case 'crying':
      return [`M${f1(L - w)},${f1(by + 2)} L${f1(L + w)},${f1(by - 8)}`, `M${f1(R + w)},${f1(by + 2)} L${f1(R - w)},${f1(by - 8)}`];
    case 'suspicious':
      return [`M${f1(L - w)},${f1(by - 10)} Q${f1(L)},${f1(by - 18)} ${f1(L + w)},${f1(by - 8)}`, `M${f1(R + w)},${f1(by + 2)} L${f1(R - w)},${f1(by + 2)}`];
    case 'shocked':
    case 'ecstatic':
      return [`M${f1(L - w)},${f1(by - 10)} Q${f1(L)},${f1(by - 22)} ${f1(L + w)},${f1(by - 10)}`, `M${f1(R + w)},${f1(by - 10)} Q${f1(R)},${f1(by - 22)} ${f1(R - w)},${f1(by - 10)}`];
    case 'flinch':
    case 'sneeze':
      return [`M${f1(L - w)},${f1(by - 2)} L${f1(L + w)},${f1(by + 2)}`, `M${f1(R + w)},${f1(by - 2)} L${f1(R - w)},${f1(by + 2)}`];
    default:
      if (face.brows === 'arched') return [`M${f1(L - w)},${f1(by)} Q${f1(L - 2)},${f1(by - 16)} ${f1(L + w)},${f1(by - 4)}`, `M${f1(R + w)},${f1(by)} Q${f1(R + 2)},${f1(by - 16)} ${f1(R - w)},${f1(by - 4)}`];
      if (face.brows === 'angled') return [`M${f1(L - w)},${f1(by - 6)} L${f1(L + w)},${f1(by + 1)}`, `M${f1(R + w)},${f1(by - 6)} L${f1(R - w)},${f1(by + 1)}`];
      if (face.rest === 'frown' || face.rest === 'pout') return [`M${f1(L - w)},${f1(by)} L${f1(L + w)},${f1(by - 5)}`, `M${f1(R + w)},${f1(by)} L${f1(R - w)},${f1(by - 5)}`];
      return [`M${f1(L - w)},${f1(by - 2)} Q${f1(L)},${f1(by - 7)} ${f1(L + w)},${f1(by - 2)}`, `M${f1(R + w)},${f1(by - 2)} Q${f1(R)},${f1(by - 7)} ${f1(R - w)},${f1(by - 2)}`];
  }
}

function Brows({ g, mood, face, look }: { g: G; mood: Mood; face: FaceSpec; look: CustomerLook }) {
  const [a, b] = browPaths(g, mood, face);
  const color = face.browColor ?? INK;
  const style = face.brows ?? 'normal';
  const width = style === 'thick' ? 9 : style === 'thin' ? 2.8 : style === 'bushy' ? 9 : style === 'arched' ? 4 : 5;
  return (
    <g fill="none" stroke={color} strokeWidth={width} strokeLinecap="round">
      <path d={a} />
      <path d={b} />
      {style === 'bushy' && (
        <g strokeWidth={3} stroke={look.hairShade}>
          <path d={a} strokeDasharray="3 5" transform="translate(0,-4)" />
          <path d={b} strokeDasharray="3 5" transform="translate(0,-4)" />
        </g>
      )}
      {style === 'uni' && <path d={`M${f1(g.cx - g.ex + 12)},${f1(g.by - 1)} Q${f1(g.cx)},${f1(g.by + 3)} ${f1(g.cx + g.ex - 12)},${f1(g.by - 1)}`} strokeWidth={6} />}
    </g>
  );
}

function Nose({ g, face, look }: { g: G; face: FaceSpec; look: CustomerLook }) {
  const { cx, cy, noseY: ny, sy } = g;
  const sh = look.skinShade;
  const top = cy + 20 * sy;
  switch (face.nose) {
    case 'button':
      return (
        <g>
          <ellipse cx={cx} cy={ny - 2} rx={8} ry={6} fill={sh} opacity={0.35} />
          <circle cx={cx - 4} cy={ny + 1} r={1.8} fill={sh} />
          <circle cx={cx + 4} cy={ny + 1} r={1.8} fill={sh} />
        </g>
      );
    case 'big':
      return (
        <g>
          <path d={`M${f1(cx - 4)},${f1(top)} Q${f1(cx - 6)},${f1(ny - 14)} ${f1(cx - 9)},${f1(ny - 10)}`} fill="none" stroke={sh} strokeWidth={3} strokeLinecap="round" />
          <ellipse cx={cx} cy={ny - 2} rx={15} ry={12} fill={look.skin} stroke={sh} strokeWidth={3.2} />
          <ellipse cx={cx - 4} cy={ny - 6} rx={4} ry={2.5} fill="#fff" opacity={0.45} />
          <path d={`M${f1(cx - 9)},${f1(ny + 6)} q4,3 6,0 M${f1(cx + 3)},${f1(ny + 6)} q4,3 6,0`} fill="none" stroke={sh} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case 'long':
      return <path d={`M${f1(cx - 1)},${f1(g.by + 4)} L${f1(cx - 6)},${f1(ny + 2)} Q${f1(cx - 2)},${f1(ny + 8)} ${f1(cx + 7)},${f1(ny + 2)}`} fill="none" stroke={sh} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />;
    case 'wide':
      return (
        <g fill="none" stroke={sh} strokeWidth={3.4} strokeLinecap="round">
          <path d={`M${f1(cx - 3)},${f1(top + 2)} L${f1(cx - 5)},${f1(ny - 6)}`} />
          <path d={`M${f1(cx - 18)},${f1(ny)} Q${f1(cx - 14)},${f1(ny - 9)} ${f1(cx - 7)},${f1(ny - 4)} Q${f1(cx)},${f1(ny + 4)} ${f1(cx + 7)},${f1(ny - 4)} Q${f1(cx + 14)},${f1(ny - 9)} ${f1(cx + 18)},${f1(ny)}`} />
        </g>
      );
    case 'pointy':
      return <path d={`M${f1(cx)},${f1(top)} L${f1(cx - 11)},${f1(ny + 1)} L${f1(cx + 3)},${f1(ny + 1)}`} fill="none" stroke={sh} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />;
    case 'snub':
      return (
        <g>
          <path d={`M${f1(cx - 8)},${f1(ny - 4)} Q${f1(cx)},${f1(ny - 12)} ${f1(cx + 8)},${f1(ny - 4)}`} fill="none" stroke={sh} strokeWidth={3} strokeLinecap="round" />
          <ellipse cx={cx - 4} cy={ny} rx={2.6} ry={3.4} fill={sh} />
          <ellipse cx={cx + 4} cy={ny} rx={2.6} ry={3.4} fill={sh} />
        </g>
      );
    default:
      return <path d={`M${f1(cx - 3)},${f1(top)} Q${f1(cx - 10)},${f1(ny)} ${f1(cx - 2)},${f1(ny + 2)} Q${f1(cx + 8)},${f1(ny + 3)} ${f1(cx + 9)},${f1(ny - 2)}`} fill="none" stroke={sh} strokeWidth={3.5} strokeLinecap="round" />;
  }
}

/** Teeth shown in an open/grinning mouth. */
function Teeth({ g, face, w, y }: { g: G; face: FaceSpec; w: number; y: number }) {
  const { cx } = g;
  if (face.teeth === 'buck')
    return (
      <g fill="#fff" stroke={INK} strokeWidth={2}>
        <rect x={cx - 9} y={y - 2} width={9} height={13} rx={2} />
        <rect x={cx} y={y - 2} width={9} height={13} rx={2} />
      </g>
    );
  return (
    <g>
      <path d={`M${f1(cx - w * 0.8)},${f1(y)} H${f1(cx + w * 0.8)} V${f1(y + 7)} H${f1(cx - w * 0.8)}Z`} fill="#fff" />
      {face.teeth === 'gap' && <rect x={cx + 3} y={y - 0.5} width={8} height={8} fill={INK} />}
      {face.teeth === 'gold' && <rect x={cx - 11} y={y} width={8} height={7} fill="#f2c230" stroke="#a8740c" strokeWidth={1} />}
      {face.teeth === 'braces' && <path d={`M${f1(cx - w * 0.75)},${f1(y + 3.5)} H${f1(cx + w * 0.75)}`} stroke="#9aa3ad" strokeWidth={2.4} strokeDasharray="2 4" />}
    </g>
  );
}

function RestMouth({ g, face, t }: { g: G; face: FaceSpec; t: number }) {
  const { cx, my } = g;
  const w = 14 * (face.mouthW ?? 1) * Math.max(0.85, g.sx);
  const lip = face.lips;
  const stroke = lip ?? INK;
  const sw = lip ? 6 : 4;
  switch (face.rest) {
    case 'flat':
      return <path d={`M${f1(cx - w)},${f1(my + 3)} H${f1(cx + w)}`} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
    case 'tight':
      return <path d={`M${f1(cx - w * 0.7)},${f1(my + 3)} H${f1(cx + w * 0.7)} M${f1(cx - w * 0.7)},${f1(my + 3)} l-3,-2 M${f1(cx + w * 0.7)},${f1(my + 3)} l3,-2`} fill="none" stroke={stroke} strokeWidth={sw - 0.5} strokeLinecap="round" />;
    case 'smirk':
      return <path d={`M${f1(cx - w)},${f1(my + 4)} Q${f1(cx)},${f1(my + 7)} ${f1(cx + w * 1.1)},${f1(my - 4)}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
    case 'frown':
      return <path d={`M${f1(cx - w)},${f1(my + 8)} Q${f1(cx)},${f1(my - 2)} ${f1(cx + w)},${f1(my + 8)}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
    case 'pout': {
      // Trembling lower lip.
      const q = Math.sin(t * 18) * 0.8;
      return (
        <g>
          <path d={`M${f1(cx - w * 0.8)},${f1(my + 4)} Q${f1(cx)},${f1(my - 3)} ${f1(cx + w * 0.8)},${f1(my + 4)}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d={`M${f1(cx - w * 0.55)},${f1(my + 7 + q)} Q${f1(cx)},${f1(my + 14 + q)} ${f1(cx + w * 0.55)},${f1(my + 7 + q)}`} fill={lip ?? '#c96a6a'} stroke={INK} strokeWidth={2} />
        </g>
      );
    }
    case 'grin':
      return (
        <g>
          <path d={`M${f1(cx - w * 1.5)},${f1(my - 4)} Q${f1(cx)},${f1(my + 22)} ${f1(cx + w * 1.5)},${f1(my - 4)}Z`} fill="#6a1c1c" stroke={lip ?? INK} strokeWidth={3.2} strokeLinejoin="round" />
          <Teeth g={g} face={face} w={w * 1.4} y={my - 3} />
        </g>
      );
    case 'open': {
      const o = 5 + Math.abs(Math.sin(t * 7)) * 5;
      return (
        <g>
          <path d={`M${f1(cx - w * 1.1)},${f1(my)} Q${f1(cx)},${f1(my + o * 2.2)} ${f1(cx + w * 1.1)},${f1(my)} Q${f1(cx)},${f1(my - 3)} ${f1(cx - w * 1.1)},${f1(my)}Z`} fill="#7a1f1f" stroke={lip ?? INK} strokeWidth={lip ? 4 : 3} />
          <path d={`M${f1(cx - 7)},${f1(my + o)} Q${f1(cx)},${f1(my + o - 4)} ${f1(cx + 7)},${f1(my + o)}`} fill="#ff7a8a" />
        </g>
      );
    }
    default:
      return <path d={`M${f1(cx - w)},${f1(my + 2)} Q${f1(cx)},${f1(my + 9)} ${f1(cx + w)},${f1(my + 2)}`} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />;
  }
}

function MoodMouth({ g, mood, face }: { g: G; mood: Mood; face: FaceSpec }) {
  const { cx, my } = g;
  const k = (face.mouthW ?? 1) * Math.max(0.85, g.sx);
  const lip = face.lips;
  const s = (n: number) => f1(n * k);
  switch (mood) {
    case 'happy':
      return (
        <g>
          <path d={`M${f1(cx - 22 * k)},${f1(my - 4)} Q${f1(cx)},${f1(my + 20)} ${f1(cx + 22 * k)},${f1(my - 4)}Z`} fill="#7a1f1f" stroke={lip ?? INK} strokeWidth={lip ? 4.5 : 3.5} strokeLinejoin="round" />
          <Teeth g={g} face={face} w={18 * k} y={my - 3} />
        </g>
      );
    case 'ecstatic':
      return (
        <g>
          <path d={`M${f1(cx - 30 * k)},${f1(my - 8)} Q${f1(cx)},${f1(my + 40)} ${f1(cx + 30 * k)},${f1(my - 8)} Z`} fill="#7a1f1f" stroke={lip ?? INK} strokeWidth={lip ? 4.5 : 3.5} strokeLinejoin="round" />
          <Teeth g={g} face={face} w={26 * k} y={my - 6} />
          <path d={`M${f1(cx - 14)},${f1(my + 16)} Q${f1(cx)},${f1(my + 6)} ${f1(cx + 14)},${f1(my + 16)} Q${f1(cx)},${f1(my + 26)} ${f1(cx - 14)},${f1(my + 16)}`} fill="#ff7a8a" />
        </g>
      );
    case 'suspicious':
      return <path d={`M${f1(cx - 16 * k)},${f1(my + 4)} L${f1(cx + 18 * k)},${f1(my - 2)}`} fill="none" stroke={lip ?? INK} strokeWidth={lip ? 6 : 4} strokeLinecap="round" />;
    case 'shocked':
      return <ellipse cx={cx} cy={my + 6} rx={13 * k} ry={18} fill="#5a1414" stroke={lip ?? INK} strokeWidth={3.5} />;
    case 'crying':
      return <path d={`M${f1(cx - 24 * k)},${f1(my + 12)} Q${f1(cx - 12 * k)},${f1(my - 6)} ${f1(cx)},${f1(my + 4)} Q${f1(cx + 12 * k)},${f1(my - 6)} ${f1(cx + 24 * k)},${f1(my + 12)} Q${f1(cx)},${f1(my + 24)} ${f1(cx - 24 * k)},${f1(my + 12)}Z`} fill="#5a1414" stroke={lip ?? INK} strokeWidth={3} />;
    case 'angry':
      return (
        <g>
          <rect x={cx - 24 * k} y={my - 6} width={48 * k} height={18} rx={5} fill="#fff" stroke={lip ?? INK} strokeWidth={3.5} />
          <path d={`M${f1(cx - 24 * k)},${f1(my + 3)} H${f1(cx + 24 * k)} M${f1(cx - 12 * k)},${f1(my - 6)} V${f1(my + 12)} M${f1(cx)},${f1(my - 6)} V${f1(my + 12)} M${f1(cx + 12 * k)},${f1(my - 6)} V${f1(my + 12)}`} stroke={INK} strokeWidth={2} />
          {face.teeth === 'gold' && <rect x={cx - 11 * k} y={my - 5} width={10 * k} height={7.5} fill="#f2c230" />}
          {face.teeth === 'gap' && <rect x={cx + 1} y={my - 5} width={10 * k} height={7.5} fill={INK} />}
        </g>
      );
    case 'worried':
      return <path d={`M${f1(cx - 20 * k)},${f1(my + 4)} q${s(5)},-7 ${s(10)},0 q${s(5)},7 ${s(10)},0 q${s(5)},-7 ${s(10)},0 q${s(5)},7 ${s(10)},0`} fill="none" stroke={lip ?? INK} strokeWidth={3.5} strokeLinecap="round" />;
    case 'sleepy':
      return <ellipse cx={cx} cy={my + 4} rx={7} ry={9} fill="#5a1414" stroke={INK} strokeWidth={3} />;
    case 'flinch':
      return <path d={`M${f1(cx - 18)},${f1(my + 4)} l6,-6 l6,6 l6,-6 l6,6 l6,-6`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />;
    case 'sneeze':
      return <ellipse cx={cx} cy={my + 4} rx={20} ry={12} fill="#5a1414" stroke={INK} strokeWidth={3.5} />;
    default:
      return null;
  }
}

function Mustache({ g, face, look }: { g: G; face: FaceSpec; look: CustomerLook }) {
  const style = face.mustache ?? (look.mustache ? 'walrus' : null);
  if (!style) return null;
  const { cx, my } = g;
  const col = face.facialHair ?? '#d9d4cf';
  const edge = '#00000055';
  switch (style) {
    case 'pencil':
      return <path d={`M${f1(cx - 20)},${f1(my - 7)} Q${f1(cx)},${f1(my - 13)} ${f1(cx + 20)},${f1(my - 7)}`} fill="none" stroke={col} strokeWidth={3.4} strokeLinecap="round" />;
    case 'handlebar':
      return (
        <path
          d={`M${f1(cx)},${f1(my - 11)} q-12,-6 -24,0 q-8,4 -16,-4 q-2,8 8,12 q12,2 20,-2 q8,-2 12,-2 q4,0 12,2 q8,4 20,2 q10,-4 8,-12 q-8,8 -16,4 q-12,-6 -24,0z`}
          fill={col}
          stroke={edge}
          strokeWidth={1.5}
        />
      );
    case 'long':
      return (
        <g fill="none" stroke={col} strokeWidth={5} strokeLinecap="round">
          <path d={`M${f1(cx - 4)},${f1(my - 10)} Q${f1(cx - 22)},${f1(my - 10)} ${f1(cx - 26)},${f1(my + 8)} Q${f1(cx - 28)},${f1(my + 30)} ${f1(cx - 22)},${f1(my + 46)}`} />
          <path d={`M${f1(cx + 4)},${f1(my - 10)} Q${f1(cx + 22)},${f1(my - 10)} ${f1(cx + 26)},${f1(my + 8)} Q${f1(cx + 28)},${f1(my + 30)} ${f1(cx + 22)},${f1(my + 46)}`} />
        </g>
      );
    default:
      return (
        <path
          d={`M${f1(cx)},${f1(my - 10)} q-14,-10 -30,-4 q-10,4 -12,14 q10,-6 22,-4 q12,2 20,-6 q8,8 20,6 q12,-2 22,4 q-2,-10 -12,-14 q-16,-6 -30,4z`}
          fill={col}
          stroke="#8f8a86"
          strokeWidth={2}
        />
      );
  }
}

function Beard({ g, face, look }: { g: G; face: FaceSpec; look: CustomerLook }) {
  const style = face.beard ?? (look.beard ? 'full' : null);
  if (!style) return null;
  const { cx, cy, my, chinY } = g;
  const col = face.facialHair ?? '#e6e3dc';
  const jaw = face.jaw ?? 'oval';
  const hw = faceHalfWidth(g, jaw, my - 4);
  switch (style) {
    case 'goatee':
      return <path d={`M${f1(cx - 14)},${f1(my + 16)} Q${f1(cx)},${f1(my + 12)} ${f1(cx + 14)},${f1(my + 16)} L${f1(cx + 6)},${f1(chinY + 14)} L${f1(cx)},${f1(chinY + 22)} L${f1(cx - 6)},${f1(chinY + 14)}Z`} fill={col} stroke="#00000040" strokeWidth={1.5} />;
    case 'long':
      return (
        <g>
          <path d={`M${f1(cx - hw * 0.62)},${f1(my - 2)} Q${f1(cx - hw * 0.5)},${f1(chinY + 8)} ${f1(cx - 14)},${f1(chinY + 40)} L${f1(cx)},${f1(chinY + 78)} L${f1(cx + 14)},${f1(chinY + 40)} Q${f1(cx + hw * 0.5)},${f1(chinY + 8)} ${f1(cx + hw * 0.62)},${f1(my - 2)} Q${f1(cx)},${f1(my + 22)} ${f1(cx - hw * 0.62)},${f1(my - 2)}Z`} fill={col} stroke="#9c968b" strokeWidth={2} />
          <path d={`M${f1(cx - 6)},${f1(chinY + 6)} l2,40 M${f1(cx + 6)},${f1(chinY + 6)} l-2,40`} stroke="#b8b2a6" strokeWidth={1.6} />
        </g>
      );
    case 'stubble':
      return (
        <g fill={look.hairShade} opacity={0.4}>
          {Array.from({ length: 34 }, (_, i) => {
            const a = Math.PI * (0.1 + (0.8 * (i % 17)) / 16);
            const r = i < 17 ? 1 : 0.86;
            const x = cx - Math.cos(a) * hw * 0.9 * r;
            const y = cy + (my - cy) * 0.8 + Math.sin(a) * (chinY - my + 12) * r;
            return <circle key={i} cx={x} cy={y} r={1.5} />;
          })}
        </g>
      );
    default:
      return <path d={`M${f1(cx - hw * 0.7)},${f1(my - 4)} Q${f1(cx - hw * 0.55)},${f1(chinY + 26)} ${f1(cx)},${f1(chinY + 30)} Q${f1(cx + hw * 0.55)},${f1(chinY + 26)} ${f1(cx + hw * 0.7)},${f1(my - 4)} Q${f1(cx)},${f1(my + 36)} ${f1(cx - hw * 0.7)},${f1(my - 4)}Z`} fill={col} stroke="#9c968b" strokeWidth={2} opacity={0.95} />;
  }
}

function Glasses({ g, look }: { g: G; look: CustomerLook }) {
  if (!look.glasses) return null;
  const { cx, ey, ex } = g;
  const jaw = look.face?.jaw ?? 'oval';
  const hw = faceHalfWidth(g, jaw, ey - 8);
  if (look.glasses === 'round')
    return (
      <g fill="#ffffff" fillOpacity={0.15} stroke="#8a6a2a" strokeWidth={2.6}>
        <circle cx={cx - ex} cy={ey} r={15} />
        <circle cx={cx + ex} cy={ey} r={15} />
        <path d={`M${f1(cx - ex + 15)},${f1(ey - 2)} Q${f1(cx)},${f1(ey - 8)} ${f1(cx + ex - 15)},${f1(ey - 2)} M${f1(cx - ex - 15)},${f1(ey - 3)} L${f1(cx - hw + 2)},${f1(ey - 8)} M${f1(cx + ex + 15)},${f1(ey - 3)} L${f1(cx + hw - 2)},${f1(ey - 8)}`} fill="none" />
      </g>
    );
  const thick = look.glasses === 'thick';
  return (
    <g fill="none" stroke="#1d1d1d" strokeWidth={thick ? 6 : 3.5}>
      <rect x={cx - ex - 19} y={ey - (thick ? 13 : 15)} width={38} height={thick ? 26 : 30} rx={thick ? 4 : 9} fill="#bfe3ff" fillOpacity={0.18} />
      <rect x={cx + ex - 19} y={ey - (thick ? 13 : 15)} width={38} height={thick ? 26 : 30} rx={thick ? 4 : 9} fill="#bfe3ff" fillOpacity={0.18} />
      <path d={`M${f1(cx - ex + 19)},${f1(ey - 4)} Q${f1(cx)},${f1(ey - 10)} ${f1(cx + ex - 19)},${f1(ey - 4)}`} />
      <path d={`M${f1(cx - ex - 19)},${f1(ey - 6)} L${f1(cx - hw + 2)},${f1(ey - 10)} M${f1(cx + ex + 19)},${f1(ey - 6)} L${f1(cx + hw - 2)},${f1(ey - 10)}`} />
    </g>
  );
}

function Sunglasses({ g, look }: { g: G; look: CustomerLook }) {
  const sg = look.sunglasses;
  if (!sg || sg === 'onHead') return null;
  const { cx, ey, ex } = g;
  if (sg === 'small')
    return (
      <g>
        <rect x={cx - ex - 16} y={ey - 7} width={30} height={13} rx={3} fill="#111" />
        <rect x={cx + ex - 14} y={ey - 7} width={30} height={13} rx={3} fill="#111" />
        <path d={`M${f1(cx - ex + 14)},${f1(ey - 3)} H${f1(cx + ex - 14)}`} stroke="#111" strokeWidth={3} />
        <path d={`M${f1(cx - ex - 12)},${f1(ey - 4)} l8,0`} stroke="#fff" strokeWidth={2} opacity={0.7} />
      </g>
    );
  return (
    <g>
      <rect x={cx - ex - 22} y={ey - 14} width={44} height={26} rx={10} fill="#1b1b2a" stroke="#d4af37" strokeWidth={3} />
      <rect x={cx + ex - 22} y={ey - 14} width={44} height={26} rx={10} fill="#1b1b2a" stroke="#d4af37" strokeWidth={3} />
      <path d={`M${f1(cx - 10)},${f1(ey - 4)} h20`} stroke="#d4af37" strokeWidth={3} />
      <path d={`M${f1(cx - ex - 12)},${f1(ey - 8)} l10,-4 M${f1(cx + ex - 12)},${f1(ey - 8)} l10,-4`} stroke="#fff" strokeWidth={3} opacity={0.6} />
    </g>
  );
}

/** Marks that make a face recognisable at a glance. */
function Marks({ g, face, look }: { g: G; face: FaceSpec; look: CustomerLook }) {
  const { cx, cy, ey, ex, my, sx, sy } = g;
  const sh = look.skinShade;
  const jaw = face.jaw ?? 'oval';
  const cheekY = cy + 34 * sy;
  const cheekX = Math.min(52 * sx, faceHalfWidth(g, jaw, cheekY) - 18);
  return (
    <g>
      {face.cheeks === 'chubby' && (
        <g fill="none" stroke={sh} strokeWidth={2.4} strokeLinecap="round" opacity={0.7}>
          <path d={`M${f1(cx - cheekX - 14)},${f1(cheekY - 4)} q-2,18 14,22 M${f1(cx + cheekX + 14)},${f1(cheekY - 4)} q2,18 -14,22`} />
        </g>
      )}
      {face.cheeks === 'hollow' && (
        <g fill="none" stroke={sh} strokeWidth={2.4} strokeLinecap="round" opacity={0.75}>
          <path d={`M${f1(cx - cheekX)},${f1(cheekY - 6)} q4,14 2,26 M${f1(cx + cheekX)},${f1(cheekY - 6)} q-4,14 -2,26`} />
        </g>
      )}
      {face.cheeks === 'dimples' && (
        <g fill="none" stroke={sh} strokeWidth={2.4} strokeLinecap="round">
          <path d={`M${f1(cx - 26 * sx)},${f1(my - 2)} q-3,4 0,8 M${f1(cx + 26 * sx)},${f1(my - 2)} q3,4 0,8`} />
        </g>
      )}
      {face.eyeBags && (
        <g fill="none" stroke="#8a6a8a" strokeWidth={2.4} strokeLinecap="round" opacity={0.6}>
          <path d={`M${f1(cx - ex - 9)},${f1(ey + 12)} q9,6 18,0 M${f1(cx + ex - 9)},${f1(ey + 12)} q9,6 18,0`} />
        </g>
      )}
      {face.foreheadLines && (
        <g fill="none" stroke={sh} strokeWidth={2.2} strokeLinecap="round" opacity={0.8}>
          <path d={`M${f1(cx - 26)},${f1(g.by - 18)} q26,-6 52,0 M${f1(cx - 20)},${f1(g.by - 27)} q20,-5 40,0`} />
        </g>
      )}
      {face.mole && <circle cx={cx + 24 * sx} cy={my - 12} r={3} fill="#3a2015" />}
      {face.scar && (
        <g stroke="#a0524a" strokeWidth={3} strokeLinecap="round">
          <path d={`M${f1(cx + ex - 6)},${f1(g.by - 14)} L${f1(cx + ex + 10)},${f1(ey + 14)}`} />
          <path d={`M${f1(cx + ex - 4)},${f1(g.by - 4)} l8,-3 M${f1(cx + ex + 2)},${f1(ey + 2)} l8,-3`} strokeWidth={2} />
        </g>
      )}
      {face.bandaid && (
        <g transform={`translate(${f1(cx + 2)},${f1(g.noseY - 12)}) rotate(-20)`}>
          <rect x={-15} y={-5} width={30} height={10} rx={4} fill="#f5c58c" stroke="#c48a4c" strokeWidth={1.5} />
          <rect x={-5} y={-5} width={10} height={10} fill="#e9ad6c" />
        </g>
      )}
      {face.sticker && (
        <g transform={`translate(${f1(cx + cheekX + 2)},${f1(cheekY + 4)})`}>
          {face.sticker === 'heart' ? (
            <path d="M0,6 C-12,-2 -8,-12 0,-6 C8,-12 12,-2 0,6Z" fill="#ff4f8b" stroke="#fff" strokeWidth={1.5} />
          ) : (
            <path d="M0,-9 L2.6,-3 L9,-2.8 L4,1.4 L5.6,8 L0,4.4 L-5.6,8 L-4,1.4 L-9,-2.8 L-2.6,-3Z" fill="#ffd23f" stroke="#fff" strokeWidth={1.5} />
          )}
        </g>
      )}
    </g>
  );
}

export interface FaceProps {
  g: G;
  mood: Mood;
  look: CustomerLook;
  t: number;
  /** Animation running (stage); the share card passes false and gets no blinking. */
  live: boolean;
  phase: number;
}

export function Face({ g, mood, look, t, live, phase }: FaceProps) {
  const face = look.face ?? {};
  const { cx, cy, rx, sx, sy, ey, ex } = g;
  const style = face.eyes ?? 'bean';
  const k = EYE_SCALE[style];
  const blink = live && (t + phase) % 3.7 < 0.13;
  const jaw = face.jaw ?? 'oval';
  const cheekY = cy + 38 * sy;
  const cheekX = Math.min(52 * sx, faceHalfWidth(g, jaw, cheekY) - 16);
  const blush = face.cheeks === 'blush' || mood === 'happy' || mood === 'ecstatic' || mood === 'angry';
  return (
    <g>
      {blush && (
        <g fill={mood === 'angry' ? '#ff5a4a' : '#ff8c8c'} opacity={face.cheeks === 'blush' ? 0.55 : 0.45}>
          <ellipse cx={cx - cheekX} cy={cheekY} rx={14} ry={8} />
          <ellipse cx={cx + cheekX} cy={cheekY} rx={14} ry={8} />
        </g>
      )}
      {face.shadow && (
        <g fill={face.shadow} opacity={0.55}>
          <ellipse cx={cx - ex} cy={ey - 9} rx={15} ry={7} />
          <ellipse cx={cx + ex} cy={ey - 9} rx={15} ry={7} />
        </g>
      )}
      {mood === 'neutral' ? <RestEyes g={g} face={face} look={look} blink={blink} /> : <MoodEyes g={g} mood={mood} k={k} />}
      {style === 'lashes' && <Lashes g={g} mood={mood} />}
      <Glasses g={g} look={look} />
      <Nose g={g} face={face} look={look} />
      {look.wrinkles && (
        <g fill="none" stroke={look.skinShade} strokeWidth={2} strokeLinecap="round" opacity={0.8}>
          <path d={`M${f1(cx - 30 * sx)},${f1(g.my - 10)} q-6,10 -2,18 M${f1(cx + 30 * sx)},${f1(g.my - 10)} q6,10 2,18`} />
          <path d={`M${f1(cx - ex - 20)},${f1(ey + 2)} l-6,-3 M${f1(cx - ex - 20)},${f1(ey + 7)} l-6,2 M${f1(cx + ex + 20)},${f1(ey + 2)} l6,-3 M${f1(cx + ex + 20)},${f1(ey + 7)} l6,2`} />
        </g>
      )}
      <Marks g={g} face={face} look={look} />
      <Beard g={g} face={face} look={look} />
      {mood === 'neutral' ? <RestMouth g={g} face={face} t={live ? t : 0} /> : <MoodMouth g={g} mood={mood} face={face} />}
      <Mustache g={g} face={face} look={look} />
      {face.toothpick && mood !== 'shocked' && mood !== 'ecstatic' && <path d={`M${f1(cx + 10)},${f1(g.my + 3)} l30,-8`} stroke="#c8a165" strokeWidth={3} strokeLinecap="round" />}
      <Brows g={g} mood={mood} face={face} look={look} />
      {(face.sweat || mood === 'worried' || mood === 'shocked' || mood === 'flinch') && (
        <path d={`M${f1(cx + rx - 10)},${f1(cy - 30)} q-9,14 0,20 q9,-6 0,-20z`} fill="#8fd3ff" stroke="#3a8fd0" strokeWidth={2} />
      )}
      {mood === 'angry' && (
        <g stroke="#e0201a" strokeWidth={4} strokeLinecap="round" fill="none" transform={`translate(${f1(cx + 46 * sx)},${f1(cy - 38 * sy)})`}>
          <path d="M-8,-3 q5,0 5,-6 M3,-9 q0,5 6,5 M9,3 q-5,0 -5,6 M-3,9 q0,-5 -6,-5" />
        </g>
      )}
      {look.freckles && (
        <g fill="#b9784f" opacity={0.7}>
          {[-14, -6, 0, 0, 6, 14].map((dx, i) => (
            <circle key={i} cx={cx + (i < 3 ? -cheekX : cheekX) + dx} cy={cheekY - 8 + (i % 2) * 6} r={2.2} />
          ))}
        </g>
      )}
      <Sunglasses g={g} look={look} />
      {face.chinMask && (
        <g>
          <path d={`M${f1(cx - 34 * sx)},${f1(g.chinY - 10)} Q${f1(cx)},${f1(g.chinY - 2)} ${f1(cx + 34 * sx)},${f1(g.chinY - 10)} L${f1(cx + 26 * sx)},${f1(g.chinY + 14)} Q${f1(cx)},${f1(g.chinY + 22)} ${f1(cx - 26 * sx)},${f1(g.chinY + 14)}Z`} fill={face.chinMask} stroke="#5b8fb0" strokeWidth={2} />
          <path d={`M${f1(cx - 34 * sx)},${f1(g.chinY - 8)} L${f1(cx - rx + 8)},${f1(cy + 16)} M${f1(cx + 34 * sx)},${f1(g.chinY - 8)} L${f1(cx + rx - 8)},${f1(cy + 16)}`} stroke="#eef5fa" strokeWidth={2.5} />
        </g>
      )}
    </g>
  );
}

/** Cậu Vàng's face: snout, nose, tongue. */
export function DogFace({ g, mood }: { g: G; mood: Mood }) {
  const { cx, cy } = g;
  const ey = cy + 4;
  const happy = mood === 'happy' || mood === 'ecstatic';
  const scared = mood === 'worried' || mood === 'flinch' || mood === 'shocked' || mood === 'crying';
  const eyeR = scared ? 11 : 9;
  return (
    <g>
      <ellipse cx={cx} cy={cy + 48} rx={46} ry={36} fill="#f6e2b8" stroke="#c79c5c" strokeWidth={3} />
      {happy ? (
        <g fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round">
          <path d={`M${cx - 42},${ey + 4} Q${cx - 32},${ey - 8} ${cx - 22},${ey + 4}`} />
          <path d={`M${cx + 22},${ey + 4} Q${cx + 32},${ey - 8} ${cx + 42},${ey + 4}`} />
        </g>
      ) : mood === 'sleepy' ? (
        <g stroke={INK} strokeWidth={4} strokeLinecap="round">
          <path d={`M${cx - 42},${ey} h20 M${cx + 22},${ey} h20`} />
        </g>
      ) : (
        <g>
          <circle cx={cx - 32} cy={ey} r={eyeR} fill={INK} />
          <circle cx={cx + 32} cy={ey} r={eyeR} fill={INK} />
          <circle cx={cx - 29} cy={ey - 3} r={3} fill="#fff" />
          <circle cx={cx + 35} cy={ey - 3} r={3} fill="#fff" />
        </g>
      )}
      {scared && <path d={`M${cx - 46},${ey - 20} L${cx - 22},${ey - 14} M${cx + 46},${ey - 20} L${cx + 22},${ey - 14}`} fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />}
      {mood === 'angry' && <path d={`M${cx - 46},${ey - 22} L${cx - 22},${ey - 12} M${cx + 46},${ey - 22} L${cx + 22},${ey - 12}`} fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />}
      <path d={`M${cx - 15},${cy + 30} Q${cx},${cy + 22} ${cx + 15},${cy + 30} Q${cx + 12},${cy + 44} ${cx},${cy + 46} Q${cx - 12},${cy + 44} ${cx - 15},${cy + 30}Z`} fill={INK} />
      <ellipse cx={cx - 5} cy={cy + 30} rx={4} ry={2.5} fill="#fff" opacity={0.6} />
      <path d={`M${cx},${cy + 46} v8 M${cx - 20},${cy + 58} Q${cx - 10},${cy + 66} ${cx},${cy + 54} Q${cx + 10},${cy + 66} ${cx + 20},${cy + 58}`} fill="none" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
      {(happy || mood === 'neutral') && <path d={`M${cx - 9},${cy + 60} Q${cx - 10},${cy + 86} ${cx},${cy + 88} Q${cx + 10},${cy + 86} ${cx + 9},${cy + 60}Z`} fill="#ff7a8a" stroke="#c9485a" strokeWidth={2} />}
      {mood === 'angry' && <path d={`M${cx - 18},${cy + 60} l5,7 l5,-7 l5,7 l5,-7 l5,7 l5,-7`} fill="#fff" stroke={INK} strokeWidth={1.5} />}
      {mood === 'crying' && <path d={`M${cx - 34},${ey + 10} q-4,18 0,30 M${cx + 34},${ey + 10} q4,18 0,30`} stroke="#6ec6ff" strokeWidth={6} strokeLinecap="round" fill="none" />}
    </g>
  );
}
