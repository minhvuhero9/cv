import { HEAD } from '../../game/geometry';
import { HeadShape, hairlineY } from '../../game/hair';
import type { CustomerLook, JawStyle } from '../../game/look';

/** Shared geometry for one drawing: the skull the hair grows on plus where the face sits. */
export interface G {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Scale vs. the default head. */
  sx: number;
  sy: number;
  /** Lower half of the face (cheeks to chin). */
  ryLow: number;
  chinY: number;
  /** Eye line, brow line, nose tip, mouth line. */
  ey: number;
  by: number;
  noseY: number;
  my: number;
  /** Half distance between the eyes. */
  ex: number;
  /** Shoulder line (top of the cape). */
  S: number;
  shoulders: number;
  neck: number;
  head: HeadShape;
}

export const f1 = (n: number) => n.toFixed(1);

const JAW_LEN: Record<JawStyle, number> = { oval: 1, square: 0.94, round: 0.9, pointed: 1.06, heart: 1.02, wide: 0.9, long: 1.14 };

export function geo(head: HeadShape, look: CustomerLook): G {
  const face = look.face ?? {};
  const body = look.body ?? {};
  const sx = head.rx / HEAD.rx;
  const sy = head.ry / HEAD.ry;
  const ryLow = head.ry * JAW_LEN[face.jaw ?? 'oval'] * (face.chin ?? 1);
  const ey = head.cy + (12 + (face.eyeY ?? 0)) * sy;
  return {
    cx: head.cx,
    cy: head.cy,
    rx: head.rx,
    ry: head.ry,
    sx,
    sy,
    ryLow,
    chinY: head.cy + ryLow,
    ey,
    by: ey - 24 * sy,
    noseY: head.cy + ryLow * 0.4,
    my: head.cy + ryLow * 0.58,
    ex: (face.eyeGap ?? 32) * sx,
    S: HEAD.cy + 128 + (body.shoulderY ?? 0),
    shoulders: body.shoulders ?? 1,
    neck: body.neck ?? 1,
    head,
  };
}

/** Width profile of the lower face for each jaw: s = 0 at the cheekbones, 1 at the chin. */
function jawX(jaw: JawStyle, c: number, s: number): number {
  const sgn = Math.sign(c);
  const ac = Math.abs(c);
  switch (jaw) {
    case 'square':
      return sgn * Math.pow(ac, 2 / 3.4) * (1 - 0.06 * s);
    case 'round':
      return sgn * Math.pow(ac, 2 / 2.5) * (1 + 0.05 * Math.sqrt(s));
    case 'pointed':
      return c * (1 - 0.42 * Math.pow(s, 1.4));
    case 'heart':
      return c * (1 + 0.08 * s - 0.5 * s * s * s);
    case 'wide':
      return sgn * Math.pow(ac, 2 / 3) * (1 + 0.1 * Math.sqrt(s));
    case 'long':
      return c * (1 - 0.12 * s);
    default:
      return c;
  }
}

/** Skull + jaw outline: the top is the hair ellipse (so hair always lines up), the bottom follows the jaw. */
export function skullPath(g: G, jaw: JawStyle = 'oval'): string {
  const pts: string[] = [];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    if (sn >= 0) pts.push(`${f1(g.cx + g.rx * c)},${f1(g.cy - g.ry * sn)}`);
    else {
      const s = -sn;
      pts.push(`${f1(g.cx + g.rx * jawX(jaw, c, s))},${f1(g.cy + g.ryLow * s)}`);
    }
  }
  return `M${pts.join('L')}Z`;
}

/** Half-width of the face at height y (for placing ears, cheeks, glasses arms). */
export function faceHalfWidth(g: G, jaw: JawStyle, y: number): number {
  if (y <= g.cy) {
    const v = (g.cy - y) / g.ry;
    return g.rx * Math.sqrt(Math.max(0, 1 - v * v));
  }
  const s = Math.min(1, (y - g.cy) / g.ryLow);
  const c = Math.sqrt(Math.max(0, 1 - s * s));
  return g.rx * Math.abs(jawX(jaw, c, s));
}

/** Solid hair base under the tufts, following this skull and its hairline. */
export function capPath(g: G): string {
  const pts: string[] = [];
  const steps = 40;
  const phiMax = 186;
  const phiMin = -6;
  for (let i = 0; i <= steps; i++) {
    const phi = ((phiMin + (i / steps) * (phiMax - phiMin)) * Math.PI) / 180;
    pts.push(`${f1(g.cx + g.rx * 1.01 * Math.cos(phi))},${f1(g.cy - g.ry * 1.01 * Math.sin(phi))}`);
  }
  const left = g.cx + g.rx * 1.01 * Math.cos((phiMax * Math.PI) / 180);
  const right = g.cx + g.rx * 1.01 * Math.cos((phiMin * Math.PI) / 180);
  for (let i = 0; i <= 20; i++) {
    const x = left + (i / 20) * (right - left);
    const y = Math.min(hairlineY(x, g.head), g.cy + 14 * g.sy);
    pts.push(`${f1(x)},${f1(y)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Stable per-look number for animation phases (blink, sway). */
export function lookPhase(look: CustomerLook): number {
  let h = 0;
  for (const ch of look.shirt + look.skin + look.hairColor) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h / 97;
}
