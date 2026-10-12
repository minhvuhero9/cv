import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { accessoryById } from '../game/accessories';
import { WeekShot, unsnap } from '../game/career';
import { canvasToBlob } from '../game/card';
import { customerById } from '../game/customers';
import { measureHair } from '../game/metrics';
import { applyLook, personaById } from '../game/mirror';
import { Character } from './Character';

/** Tạp chí tiệm: the week's four best heads on one magazine cover (pure SVG → PNG). */
export const MAG_W = 800;
export const MAG_H = 1000;

function Cell({ shot, x, y, i }: { shot: WeekShot; x: number; y: number; i: number }) {
  const d = customerById(shot.customer);
  const hair = unsnap(shot.hair, shot.customer);
  const p = personaById(shot.persona);
  const acc = accessoryById(shot.accessory);
  let look = p ? applyLook(d.look, p.look) : d.look;
  if (acc) look = applyLook(look, acc.layer);
  return (
    <g>
      <rect x={x} y={y} width={360} height={380} rx={14} fill="#fffdf6" stroke="#2b1a12" strokeWidth={4} />
      <svg x={x + 10} y={y + 10} width={340} height={300} viewBox="30 40 340 300">
        <rect x={30} y={40} width={340} height={300} fill={['#ffe3f1', '#d7ecff', '#fff3c4', '#e2ffe0'][i % 4]} />
        <Character look={look} hair={hair} metrics={measureHair(hair)} mood="happy" idPrefix={`mag-${i}`} />
      </svg>
      <text x={x + 20} y={y + 338} fontSize={22} fontWeight={900} fill="#2b1a12" fontFamily="Arial, sans-serif">
        {d.name}
      </text>
      <text x={x + 20} y={y + 364} fontSize={15} fontStyle="italic" fill="#6b5a3a" fontFamily="Arial, sans-serif">
        “{shot.styleName.slice(0, 34)}” · {shot.sat}%
      </text>
      <circle cx={x + 330} cy={y + 34} r={24} fill="#d6332f" />
      <text x={x + 330} y={y + 42} textAnchor="middle" fontSize={22} fontWeight={900} fill="#fff" fontFamily="Arial, sans-serif">
        #{i + 1}
      </text>
    </g>
  );
}

export function MagazineCover({ shots, shop, week }: { shots: WeekShot[]; shop: string; week: number }) {
  return (
    <g>
      <rect width={MAG_W} height={MAG_H} fill="#f4efe6" />
      <rect width={MAG_W} height={150} fill="#d6332f" />
      <text x={MAG_W / 2} y={70} textAnchor="middle" fontSize={52} fontWeight={900} fill="#ffd23f" fontFamily="Arial, sans-serif">
        TẠP CHÍ TÓC
      </text>
      <text x={MAG_W / 2} y={118} textAnchor="middle" fontSize={26} fontWeight={800} fill="#fff8e8" fontFamily="Arial, sans-serif">
        {shop} · Tuần {week}
      </text>
      {shots.slice(0, 4).map((s, i) => (
        <Cell key={i} shot={s} i={i} x={30 + (i % 2) * 380} y={175 + Math.floor(i / 2) * 400} />
      ))}
      {shots.length === 0 && (
        <text x={MAG_W / 2} y={500} textAnchor="middle" fontSize={28} fill="#6b5a3a" fontFamily="Arial, sans-serif">
          Tuần này chưa có kiểu nào lên báo.
        </text>
      )}
      <text x={MAG_W / 2} y={MAG_H - 18} textAnchor="middle" fontSize={16} fontWeight={800} fill="#6b5a3a" fontFamily="Arial, sans-serif">
        Tiệm Cắt Tóc Bất Ổn · bốn cái đầu đẹp nhất tuần
      </text>
    </g>
  );
}

export async function renderMagazinePng(shots: WeekShot[], shop: string, week: number): Promise<Blob> {
  const svg = renderToStaticMarkup(createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${MAG_W} ${MAG_H}`, width: 1080, height: 1350 }, createElement(MagazineCover, { shots, shop, week })));
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Không vẽ được tạp chí'));
    i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  c.getContext('2d')!.drawImage(img, 0, 0, 1080, 1350);
  return canvasToBlob(c);
}
