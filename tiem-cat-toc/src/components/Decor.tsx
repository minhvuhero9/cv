import type { ReactNode } from 'react';
import { MirrorFrame } from './MirrorPicker';
import { useMemo } from 'react';
import { Creation, creationHair } from '../game/creation';
import { CUSTOMERS } from '../game/customers';
import { measureHair } from '../game/metrics';
import { applyLook, personaById } from '../game/mirror';
import { Character } from './Character';

function WorkFrame({ c }: { c: Creation }) {
  const hair = useMemo(() => creationHair(c), [c]);
  const d = CUSTOMERS.find((x) => x.id === c.customer) ?? CUSTOMERS[0];
  const p = personaById(c.persona);
  return (
    <svg viewBox="20 20 360 340" className="work-frame">
      <rect x={20} y={20} width={360} height={340} fill="#e8f6fb" stroke="#b8862b" strokeWidth={22} />
      <Character look={p ? applyLook(d.look, p.look) : d.look} hair={hair} metrics={measureHair(hair)} mood={c.photo.mood} idPrefix={`wall-${c.id}`} />
    </svg>
  );
}

export function TrophyShelf({ trophies }: { trophies: { rank: number; theme: string }[] }) {
  const cups = trophies.slice(-5);
  const color = (r: number) => (r === 1 ? '#ffd23f' : r === 2 ? '#d7dde4' : '#d08a4a');
  return (
    <svg viewBox="0 0 80 64">
      <rect x={2} y={52} width={76} height={6} rx={2} fill="#8a5a33" />
      {cups.map((t, i) => {
        const x = 10 + i * 15;
        return (
          <g key={i} transform={`translate(${x},0)`}>
            <path d="M-6,26 h12 v6 c0,6 -4,9 -6,9 c-2,0 -6,-3 -6,-9z" fill={color(t.rank)} stroke="#7a5a12" strokeWidth={1.2} />
            <path d="M-6,28 c-4,0 -4,6 0,6 M6,28 c4,0 4,6 0,6" fill="none" stroke="#7a5a12" strokeWidth={1.2} />
            <rect x={-2} y={41} width={4} height={6} fill="#7a5a12" />
            <rect x={-5} y={47} width={10} height={5} rx={1} fill="#5a3a20" />
          </g>
        );
      })}
    </svg>
  );
}

/** Things bought in the shop, hung on the wall / placed on the floor (career mode), in the player's order. */
export function WallDecor({ owned, works = [], trophies = [], order }: { owned: string[]; works?: Creation[]; trophies?: { rank: number; theme: string }[]; order?: string[] }) {
  const has = (id: string) => owned.includes(id);
  const items: { id: string; group: string; label: string; art: ReactNode }[] = [];
  // Tường tác phẩm: the newest pages of the catalog, framed.
  for (const w of works) items.push({ id: `work-${w.id}`, group: 'works', label: w.name, art: <WorkFrame c={w} /> });
  if (trophies.length) items.push({ id: 'trophies', group: 'trophies', label: `Cúp (${trophies.length})`, art: <TrophyShelf trophies={trophies} /> });
  if (has('award'))
    items.push({
      id: 'award',
      group: 'award',
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
      group: 'mirror',
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
      group: 'petSign',
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
      group: 'plant',
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
      group: 'bench',
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
      group: 'generator',
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
  const shown = order ? order.flatMap((g) => items.filter((i) => i.group === g)) : items;
  if (!shown.length) return null;
  return (
    <div className="wall-decor" data-testid="wall-decor">
      {shown.map((i) => (
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

/** Cấp tiệm on the wall: a plaque that grows with the shop. */
export function LevelPlaque({ level, name }: { level: number; name: string }) {
  return (
    <div className={`level-plaque lv-${level}`} data-testid="level-plaque" data-level={level}>
      <small>Cấp {level}</small>
      <b>{name}</b>
      <span aria-hidden>{'★'.repeat(level)}</span>
    </div>
  );
}

/** Level 5: a chandelier over the mirror. */
export function Chandelier() {
  return (
    <svg className="chandelier" viewBox="0 0 120 60" aria-hidden data-decor="chandelier">
      <path d="M60,0 v12" stroke="#b8862b" strokeWidth={3} />
      <path d="M20,22 Q60,46 100,22" fill="none" stroke="#c9952b" strokeWidth={4} />
      {[20, 40, 60, 80, 100].map((x, i) => (
        <g key={x}>
          <path d={`M${x},${i === 2 ? 34 : i % 2 ? 30 : 22} v8`} stroke="#c9952b" strokeWidth={2} />
          <path d={`M${x - 4},${i === 2 ? 42 : i % 2 ? 38 : 30} l4,10 l4,-10z`} fill="#bfefff" stroke="#7fb3d5" strokeWidth={1} />
          <circle cx={x} cy={i === 2 ? 30 : i % 2 ? 26 : 18} r={4} fill="#fff3b0" />
        </g>
      ))}
    </svg>
  );
}
