import type { CustomerLook } from '../../game/look';
import { G, f1, faceHalfWidth } from './geo';

export function Ears({ g, look }: { g: G; look: CustomerLook }) {
  const { cx, cy, sy } = g;
  const face = look.face ?? {};
  const y = cy + 14 * sy;
  const hw = faceHalfWidth(g, face.jaw ?? 'oval', y);
  if (look.species === 'dog') {
    const { rx } = g;
    return (
      <g fill={look.hairShade} stroke="#6b4a12" strokeWidth={3}>
        <path d={`M${cx - rx + 10},${cy - 70} Q${cx - rx - 46},${cy - 40} ${cx - rx - 30},${cy + 50} Q${cx - rx - 8},${cy + 60} ${cx - rx + 14},${cy - 10}Z`} />
        <path d={`M${cx + rx - 10},${cy - 70} Q${cx + rx + 46},${cy - 40} ${cx + rx + 30},${cy + 50} Q${cx + rx + 8},${cy + 60} ${cx + rx - 14},${cy - 10}Z`} />
      </g>
    );
  }
  const k = (face.ears ?? 1) * (face.earShape === 'small' ? 0.75 : 1);
  const jug = face.earShape === 'jug';
  const erx = (jug ? 19 : 15) * k;
  const ery = (jug ? 25 : 21) * k;
  const out = jug ? 10 * k : 0;
  const earring = look.earring;
  return (
    <g>
      {[-1, 1].map((d) => {
        const x = cx + d * (hw - 2 + out);
        return (
          <g key={d} transform={jug ? `rotate(${d * 18} ${f1(x)} ${f1(y)})` : undefined}>
            <ellipse cx={x} cy={y} rx={erx} ry={ery} fill={look.skin} stroke={look.skinShade} strokeWidth={3} />
            <path d={`M${f1(x + d * erx * 0.35)},${f1(y - ery * 0.5)} Q${f1(x - d * erx * 0.3)},${f1(y)} ${f1(x + d * erx * 0.3)},${f1(y + ery * 0.5)}`} fill="none" stroke={look.skinShade} strokeWidth={2.4} />
            {(earring === 'both' || earring === 'hoop' || (earring && d === 1)) &&
              (earring === 'hoop' ? (
                <circle cx={x + d * 2} cy={y + ery + 10} r={11} fill="none" stroke="#f2c230" strokeWidth={3.5} />
              ) : (
                <circle cx={x + d * 2} cy={y + ery - 1} r={5} fill="none" stroke="#f2c230" strokeWidth={3} />
              ))}
          </g>
        );
      })}
      {look.bluetooth && (
        <g>
          <rect x={cx + hw - 4} y={y - 10} width={12} height={20} rx={5} fill="#1d1d1d" />
          <path d={`M${f1(cx + hw + 2)},${f1(y + 8)} L${f1(cx + hw - 12)},${f1(y + 34)}`} stroke="#1d1d1d" strokeWidth={4} strokeLinecap="round" />
          <circle cx={cx + hw + 2} cy={y - 2} r={2.5} fill="#3ad0ff" />
        </g>
      )}
      {look.pen && (
        <g transform={`rotate(-35 ${f1(cx - hw)} ${f1(y - 8)})`}>
          <rect x={cx - hw - 26} y={y - 12} width={44} height={7} rx={2} fill="#1f4fb5" />
          <path d={`M${f1(cx - hw - 26)},${f1(y - 12)} l-8,3.5 l8,3.5z`} fill="#f2d48a" />
        </g>
      )}
    </g>
  );
}

/** Worn over the hair: headbands, bows, curlers, headsets, sunglasses pushed up. */
export function HeadWear({ g, look, t }: { g: G; look: CustomerLook; t: number }) {
  const { cx, cy, rx, ry, sx, sy } = g;
  const top = cy - ry;
  return (
    <g>
      {look.headband && (
        <g>
          <path d={`M${f1(cx - rx + 4)},${f1(cy - 42 * sy)} Q${cx},${f1(cy - 66 * sy)} ${f1(cx + rx - 4)},${f1(cy - 42 * sy)} L${f1(cx + rx - 2)},${f1(cy - 30 * sy)} Q${cx},${f1(cy - 54 * sy)} ${f1(cx - rx + 2)},${f1(cy - 30 * sy)}Z`} fill={look.headband} stroke="#7a1512" strokeWidth={2} />
          <path d={`M${f1(cx + rx - 6)},${f1(cy - 36 * sy)} q24,6 30,26 M${f1(cx + rx - 6)},${f1(cy - 34 * sy)} q18,14 16,36`} fill="none" stroke={look.headband} strokeWidth={7} strokeLinecap="round" />
        </g>
      )}
      {look.hat === 'bow' && (
        <g transform={`translate(${f1(cx + 44 * sx)},${f1(top + 6)}) rotate(18)`}>
          <path d="M0,0 C-30,-34 -58,-6 -40,16 C-28,28 -10,10 0,0Z M0,0 C30,-34 58,-6 40,16 C28,28 10,10 0,0Z" fill="#ff5fa2" stroke="#b02a69" strokeWidth={3} />
          <circle r={10} fill="#ff86ba" stroke="#b02a69" strokeWidth={3} />
        </g>
      )}
      {look.hat === 'curlers' && (
        <g>
          {[-0.62, -0.31, 0, 0.31, 0.62].map((u, i) => {
            const x = cx + u * rx * 1.05;
            const y = top - 8 + u * u * ry * 0.9 + (i % 2) * 10;
            const col = ['#ff86ba', '#7cc7ff', '#ffd23f', '#9be37a', '#ff86ba'][i];
            return (
              <g key={i} transform={`rotate(${f1(u * 50)} ${f1(x)} ${f1(y)})`}>
                <rect x={x - 22} y={y - 11} width={44} height={22} rx={10} fill={col} stroke="#00000055" strokeWidth={2.5} />
                <path d={`M${f1(x - 14)},${f1(y - 11)} v22 M${f1(x)},${f1(y - 11)} v22 M${f1(x + 14)},${f1(y - 11)} v22`} stroke="#ffffff99" strokeWidth={2} />
              </g>
            );
          })}
        </g>
      )}
      {look.hat === 'catEars' && (
        <g>
          <path d={`M${f1(cx - rx * 0.92)},${f1(cy - ry * 0.45)} Q${cx},${f1(top - 34)} ${f1(cx + rx * 0.92)},${f1(cy - ry * 0.45)}`} fill="none" stroke="#ff86ba" strokeWidth={7} />
          {[-1, 1].map((d) => (
            <path key={d} d={`M${f1(cx + d * rx * 0.36)},${f1(top - 18)} L${f1(cx + d * rx * 0.62)},${f1(top - 66)} L${f1(cx + d * rx * 0.8)},${f1(top + 2)}Z`} fill="#ff86ba" stroke="#b02a69" strokeWidth={3} strokeLinejoin="round" />
          ))}
          {[-1, 1].map((d) => (
            <path key={`i${d}`} d={`M${f1(cx + d * rx * 0.45)},${f1(top - 18)} L${f1(cx + d * rx * 0.61)},${f1(top - 50)} L${f1(cx + d * rx * 0.72)},${f1(top - 8)}Z`} fill="#ffe0ee" />
          ))}
        </g>
      )}
      {look.hat === 'headset' && (
        <g>
          <path d={`M${f1(cx - rx - 6)},${f1(cy + 4)} Q${f1(cx - rx)},${f1(top - 36)} ${cx},${f1(top - 36)} Q${f1(cx + rx)},${f1(top - 36)} ${f1(cx + rx + 6)},${f1(cy + 4)}`} fill="none" stroke="#2b2b3a" strokeWidth={9} />
          <rect x={cx - rx - 22} y={cy - 18} width={26} height={40} rx={10} fill="#7a5cff" stroke="#2b2b3a" strokeWidth={3} />
          <rect x={cx + rx - 4} y={cy - 18} width={26} height={40} rx={10} fill="#7a5cff" stroke="#2b2b3a" strokeWidth={3} />
          <path d={`M${f1(cx - rx - 10)},${f1(cy + 18)} Q${f1(cx - rx + 10)},${f1(cy + 70 * sy)} ${f1(cx - 26)},${f1(g.my + 2)}`} fill="none" stroke="#2b2b3a" strokeWidth={4} />
          <circle cx={cx - 24} cy={g.my + 2} r={6} fill="#2b2b3a" />
          <circle cx={cx - rx - 9} cy={cy - 4} r={4} fill={Math.sin(t * 5) > 0 ? '#3aff9a' : '#1a7a4a'} />
        </g>
      )}
      {look.hat === 'crown' && (
        <path d={`M${f1(cx - 34)},${f1(top - 4)} l8,-30 l13,18 l13,-26 l13,26 l13,-18 l8,30z`} fill="#ffd23f" stroke="#a8740c" strokeWidth={3} strokeLinejoin="round" />
      )}
      {look.sunglasses === 'onHead' && (
        <g transform={`translate(0,${f1(top + 22 - cy)})`}>
          <rect x={cx - 58} y={cy - 12} width={48} height={26} rx={11} fill="#3b1b44" stroke="#f2c230" strokeWidth={3} />
          <rect x={cx + 10} y={cy - 12} width={48} height={26} rx={11} fill="#3b1b44" stroke="#f2c230" strokeWidth={3} />
          <path d={`M${f1(cx - 10)},${f1(cy - 2)} h20`} stroke="#f2c230" strokeWidth={3} />
          <path d={`M${f1(cx - 48)},${f1(cy - 6)} l10,-4 M${f1(cx + 20)},${f1(cy - 6)} l10,-4`} stroke="#fff" strokeWidth={3} opacity={0.7} />
        </g>
      )}
    </g>
  );
}
