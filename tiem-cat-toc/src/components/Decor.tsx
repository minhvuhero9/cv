import type { ReactNode } from 'react';
import { MirrorFrame } from './MirrorPicker';

/** Things bought in the shop, hung on the wall / placed on the floor (career mode). */
export function WallDecor({ owned }: { owned: string[] }) {
  const has = (id: string) => owned.includes(id);
  const items: { id: string; label: string; art: ReactNode }[] = [];
  if (has('award'))
    items.push({
      id: 'award',
      label: 'Bằng khen',
      art: (
        <svg viewBox="0 0 80 64">
          <rect x={4} y={4} width={72} height={56} rx={3} fill="#b8862b" />
          <rect x={10} y={10} width={60} height={44} fill="#fffaf0" />
          <text x={40} y={26} textAnchor="middle" fontSize={8} fontWeight={900} fill="#d6332f">
            BẰNG KHEN
          </text>
          <path d="M20,34 h40 M24,40 h32" stroke="#9aa3ad" strokeWidth={2} />
          <circle cx={58} cy={46} r={6} fill="#d6332f" />
        </svg>
      ),
    });
  if (has('mirror'))
    items.push({
      id: 'mirror',
      label: 'Gương Thần',
      art: (
        <span className="decor-mirror">
          <MirrorFrame size={46} />
        </span>
      ),
    });
  if (has('petSign'))
    items.push({
      id: 'petSign',
      label: 'Cho phép thú cưng',
      art: (
        <svg viewBox="0 0 80 64">
          <path d="M40,2 L40,10" stroke="#6b4a22" strokeWidth={3} />
          <rect x={6} y={10} width={68} height={44} rx={8} fill="#2fa84f" stroke="#145c2a" strokeWidth={3} />
          <g fill="#fff">
            <ellipse cx={40} cy={36} rx={9} ry={7} />
            <circle cx={30} cy={25} r={4} />
            <circle cx={37} cy={21} r={4} />
            <circle cx={44} cy={21} r={4} />
            <circle cx={51} cy={25} r={4} />
          </g>
        </svg>
      ),
    });
  if (has('plant'))
    items.push({
      id: 'plant',
      label: 'Cây phong thủy',
      art: (
        <svg viewBox="0 0 80 64">
          <path d="M40,40 C30,20 14,22 10,10 C26,12 36,20 40,36 C42,18 52,6 66,6 C60,18 48,24 42,40Z" fill="#2fa84f" stroke="#145c2a" strokeWidth={2} />
          <path d="M26,40 h28 l-4,22 h-20z" fill="#c4683a" stroke="#7a3a1a" strokeWidth={2} />
        </svg>
      ),
    });
  if (has('bench'))
    items.push({
      id: 'bench',
      label: 'Ghế chờ',
      art: (
        <svg viewBox="0 0 80 64">
          <rect x={6} y={24} width={68} height={12} rx={3} fill="#8a5a33" />
          <rect x={6} y={10} width={68} height={10} rx={3} fill="#a46a3d" />
          <path d="M12,36 v20 M68,36 v20" stroke="#5a3a20" strokeWidth={5} />
        </svg>
      ),
    });
  if (has('generator'))
    items.push({
      id: 'generator',
      label: 'Máy phát',
      art: (
        <svg viewBox="0 0 80 64">
          <rect x={8} y={18} width={64} height={40} rx={6} fill="#e5322d" stroke="#7a1512" strokeWidth={3} />
          <circle cx={28} cy={38} r={10} fill="#333" />
          <path d="M50,28 h14 M50,36 h14 M50,44 h14" stroke="#fff" strokeWidth={3} />
          <path d="M60,18 v-10 h6" stroke="#333" strokeWidth={3} fill="none" />
        </svg>
      ),
    });
  if (!items.length) return null;
  return (
    <div className="wall-decor" data-testid="wall-decor">
      {items.map((i) => (
        <div key={i.id} className="decor-item" data-decor={i.id} title={i.label}>
          {i.art}
          <small>{i.label}</small>
        </div>
      ))}
    </div>
  );
}

export function AirCon() {
  return (
    <div className="aircon" data-decor="aircon" title="Điều hòa cũ">
      <svg viewBox="0 0 120 50">
        <rect x={2} y={2} width={116} height={36} rx={8} fill="#f4f6f8" stroke="#9aa3ad" strokeWidth={3} />
        <path d="M14,30 h92" stroke="#c9ced6" strokeWidth={4} />
        <circle cx={104} cy={12} r={3} fill="#3aff9a" />
        <g stroke="#9fd8ff" strokeWidth={2.5} strokeLinecap="round" className="aircon-wind">
          <path d="M30,42 q4,4 0,8 M60,42 q4,4 0,8 M90,42 q4,4 0,8" fill="none" />
        </g>
      </svg>
    </div>
  );
}

/** Neon sign over the mirror and the selfie ring light: drawn on the stage frame. */
export function StageDecor({ owned }: { owned: string[] }) {
  return (
    <>
      {owned.includes('neon') && (
        <div className="neon-sign" data-decor="neon">
          CẮT TÓC <span>BẤT ỔN</span>
        </div>
      )}
      {owned.includes('ringLight') && <div className="ring-light" data-decor="ringLight" aria-hidden />}
    </>
  );
}
