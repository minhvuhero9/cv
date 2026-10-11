import type { HairState } from '../game/hair';
import type { CustomerLook } from '../game/look';
import { measureHair } from '../game/metrics';
import type { PhotoBg, PhotoFrame, PhotoSettings, Sticker } from '../game/creation';
import { Character } from './Character';

/** Photo-mode picture. Pure SVG (presentation attributes only) so the PNG export matches the preview. */
export const PHOTO_W = 400;
export const PHOTO_H = 500;

export const BG_LABEL: Record<PhotoBg, string> = { salon: 'Tiệm', pastel: 'Pastel', neon: 'Phố đêm', tet: 'Tết', plain: 'Trơn' };
export const FRAME_LABEL: Record<PhotoFrame, string> = { none: 'Không', polaroid: 'Polaroid', gold: 'Khung vàng', film: 'Phim' };
export const STICKERS: { id: string; label: string }[] = [
  { id: 'heart', label: 'Tim' },
  { id: 'star', label: 'Sao' },
  { id: 'fire', label: 'Lửa' },
  { id: 'sparkle', label: 'Lấp lánh' },
  { id: 'wow', label: 'WOW' },
  { id: 'haha', label: 'HAHA' },
];

function Background({ bg }: { bg: PhotoBg }) {
  switch (bg) {
    case 'pastel':
      return (
        <g>
          <rect width={PHOTO_W} height={PHOTO_H} fill="#ffe3f1" />
          <circle cx={60} cy={80} r={70} fill="#d7ecff" />
          <circle cx={350} cy={140} r={90} fill="#fff3c4" />
          <circle cx={320} cy={430} r={70} fill="#e2ffe0" />
          {Array.from({ length: 24 }, (_, i) => (
            <circle key={i} cx={(i * 53) % 400} cy={(i * 97) % 500} r={3} fill="#ffffff" opacity={0.8} />
          ))}
        </g>
      );
    case 'neon':
      return (
        <g>
          <rect width={PHOTO_W} height={PHOTO_H} fill="#1b0f33" />
          {[60, 140, 220, 300].map((y, i) => (
            <path key={y} d={`M0,${y} L400,${y - 40}`} stroke={['#ff3fd8', '#18c8ff', '#ffd400', '#2ee86a'][i]} strokeWidth={4} opacity={0.6} />
          ))}
          <rect x={250} y={40} width={120} height={40} rx={8} fill="none" stroke="#ff3fd8" strokeWidth={4} />
          <text x={310} y={68} textAnchor="middle" fontSize={20} fontWeight={900} fill="#ffd9f6">
            BẤT ỔN
          </text>
        </g>
      );
    case 'tet':
      return (
        <g>
          <rect width={PHOTO_W} height={PHOTO_H} fill="#c8171e" />
          {Array.from({ length: 10 }, (_, i) => (
            <g key={i} transform={`translate(${(i * 83) % 400},${40 + ((i * 131) % 300)})`} fill="#ffd34d" opacity={0.85}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} rx={5} ry={11} transform={`rotate(${a}) translate(0,-9)`} />
              ))}
              <circle r={4} fill="#ff8c00" />
            </g>
          ))}
          <rect x={14} y={60} width={34} height={200} fill="#e8b04a" stroke="#7a1512" strokeWidth={3} />
          <rect x={352} y={60} width={34} height={200} fill="#e8b04a" stroke="#7a1512" strokeWidth={3} />
          <text x={31} y={90} textAnchor="middle" fontSize={20} fontWeight={900} fill="#9e1f1c">
            <tspan x={31} dy={0}>
              TÓC
            </tspan>
            <tspan x={31} dy={34}>
              MỚI
            </tspan>
          </text>
          <text x={369} y={90} textAnchor="middle" fontSize={20} fontWeight={900} fill="#9e1f1c">
            <tspan x={369} dy={0}>
              NĂM
            </tspan>
            <tspan x={369} dy={34}>
              MỚI
            </tspan>
          </text>
        </g>
      );
    case 'plain':
      return <rect width={PHOTO_W} height={PHOTO_H} fill="#f4efe6" />;
    default:
      return (
        <g>
          <rect width={PHOTO_W} height={PHOTO_H} fill="#bfe3d6" />
          {Array.from({ length: 9 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => ((r + c) % 2 ? <rect key={`${r}-${c}`} x={c * 50} y={r * 50} width={50} height={50} fill="#a9d6c6" /> : null)),
          )}
          <rect x={40} y={50} width={320} height={430} rx={26} fill="#e8f6fb" stroke="#b8862b" strokeWidth={10} />
        </g>
      );
  }
}

export function StickerArt({ id }: { id: string }) {
  switch (id) {
    case 'heart':
      return <path d="M0,14 C-26,-4 -18,-24 0,-12 C18,-24 26,-4 0,14Z" fill="#ff4f8b" stroke="#fff" strokeWidth={3} />;
    case 'star':
      return <path d="M0,-20 L6,-6 L21,-6 L9,4 L13,19 L0,10 L-13,19 L-9,4 L-21,-6 L-6,-6Z" fill="#ffd23f" stroke="#fff" strokeWidth={3} />;
    case 'fire':
      return <path d="M0,22 C-18,20 -20,2 -10,-8 C-10,2 -4,4 -4,-2 C-4,-12 2,-18 4,-24 C8,-12 20,-4 16,10 C14,18 8,22 0,22Z" fill="#ff6a00" stroke="#ffd23f" strokeWidth={3} />;
    case 'sparkle':
      return <path d="M0,-22 L5,-5 L22,0 L5,5 L0,22 L-5,5 L-22,0 L-5,-5Z" fill="#ffffff" stroke="#18c8ff" strokeWidth={3} />;
    case 'wow':
    case 'haha':
      return (
        <g>
          <path d="M-34,-18 h68 a8,8 0 0 1 8,8 v20 a8,8 0 0 1 -8,8 h-46 l-12,12 l2,-12 h-12 a8,8 0 0 1 -8,-8 v-20 a8,8 0 0 1 8,-8Z" fill="#fff" stroke="#2b1a12" strokeWidth={3} />
          <text y={7} textAnchor="middle" fontSize={20} fontWeight={900} fill={id === 'wow' ? '#d6332f' : '#8a4dff'}>
            {id === 'wow' ? 'WOW!' : 'HAHA'}
          </text>
        </g>
      );
    default:
      return null;
  }
}

function Frame({ frame }: { frame: PhotoFrame }) {
  switch (frame) {
    case 'polaroid':
      return <path d={`M0,0 H${PHOTO_W} V${PHOTO_H} H0Z M18,18 V${PHOTO_H - 96} H${PHOTO_W - 18} V18Z`} fill="#fffdf6" fillRule="evenodd" />;
    case 'gold':
      return (
        <g>
          <rect x={6} y={6} width={PHOTO_W - 12} height={PHOTO_H - 12} rx={18} fill="none" stroke="#c9952b" strokeWidth={12} />
          <rect x={16} y={16} width={PHOTO_W - 32} height={PHOTO_H - 32} rx={12} fill="none" stroke="#ffe08a" strokeWidth={3} />
          {[
            [24, 24],
            [PHOTO_W - 24, 24],
            [24, PHOTO_H - 24],
            [PHOTO_W - 24, PHOTO_H - 24],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={10} fill="#ffd23f" stroke="#a8740c" strokeWidth={3} />
          ))}
        </g>
      );
    case 'film':
      return (
        <g>
          <rect x={0} y={0} width={30} height={PHOTO_H} fill="#111" />
          <rect x={PHOTO_W - 30} y={0} width={30} height={PHOTO_H} fill="#111" />
          {Array.from({ length: 12 }, (_, i) => (
            <g key={i} fill="#f4efe6">
              <rect x={9} y={12 + i * 41} width={12} height={20} rx={3} />
              <rect x={PHOTO_W - 21} y={12 + i * 41} width={12} height={20} rx={3} />
            </g>
          ))}
        </g>
      );
    default:
      return null;
  }
}

export interface PhotoProps {
  look: CustomerLook;
  hair: HairState;
  photo: PhotoSettings;
  name: string;
  caption: string;
  idPrefix: string;
}

export function PhotoComposition({ look, hair, photo, name, caption, idPrefix }: PhotoProps) {
  const polaroid = photo.frame === 'polaroid';
  const dark = photo.bg === 'neon' || photo.bg === 'tet';
  return (
    <g>
      <Background bg={photo.bg} />
      {/* The character scene is 400 wide; scale it a little so the head fills the photo. */}
      <g transform="translate(-40,-58) scale(1.2)">
        <Character look={look} hair={hair} metrics={measureHair(hair)} mood={photo.mood} idPrefix={idPrefix} />
      </g>
      {photo.stickers.map((st: Sticker, i) => (
        <g key={i} transform={`translate(${st.x},${st.y})`}>
          <StickerArt id={st.id} />
        </g>
      ))}
      <Frame frame={photo.frame} />
      {polaroid ? (
        <g>
          <text x={PHOTO_W / 2} y={PHOTO_H - 58} textAnchor="middle" fontSize={22} fontWeight={900} fill="#2b1a12" fontFamily="Arial, sans-serif">
            {name}
          </text>
          <text x={PHOTO_W / 2} y={PHOTO_H - 30} textAnchor="middle" fontSize={14} fontStyle="italic" fill="#6b5a3a" fontFamily="Arial, sans-serif">
            {caption}
          </text>
        </g>
      ) : (
        <g>
          <rect x={30} y={PHOTO_H - 92} width={PHOTO_W - 60} height={name || caption ? 62 : 0} rx={12} fill={dark ? 'rgba(255,255,255,0.88)' : 'rgba(43,26,18,0.85)'} />
          <text x={PHOTO_W / 2} y={PHOTO_H - 64} textAnchor="middle" fontSize={20} fontWeight={900} fill={dark ? '#9e1f1c' : '#ffd23f'} fontFamily="Arial, sans-serif">
            {name}
          </text>
          <text x={PHOTO_W / 2} y={PHOTO_H - 42} textAnchor="middle" fontSize={13} fontStyle="italic" fill={dark ? '#2b1a12' : '#fff8e8'} fontFamily="Arial, sans-serif">
            {caption}
          </text>
        </g>
      )}
      <text x={PHOTO_W - 14} y={polaroid ? PHOTO_H - 8 : 22} textAnchor="end" fontSize={10} fontWeight={800} fill={dark ? '#ffd9f6' : '#6b5a3a'} fontFamily="Arial, sans-serif" opacity={0.8}>
        Tiệm Cắt Tóc Bất Ổn
      </text>
    </g>
  );
}
