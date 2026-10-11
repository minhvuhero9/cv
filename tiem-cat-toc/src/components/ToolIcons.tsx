import type { ToolId } from '../game/tools';

/** Tool artwork in a 40×40 box. Used by the toolbar buttons and the magic-tool cursors. */
export function ToolArt({ id }: { id: ToolId }) {
  switch (id) {
    case 'brush':
      return (
        <g>
          <path d="M26,4 L34,12 L18,28 L12,22Z" fill="#c99a5b" stroke="#6b4a22" strokeWidth={1.8} />
          <path d="M12,22 L18,28 L14,32 Q8,38 3,37 Q4,32 8,26Z" fill="#ff3fa4" stroke="#a3305e" strokeWidth={1.8} />
          <circle cx={8} cy={33} r={2} fill="#18c8ff" />
        </g>
      );
    case 'stencil':
      return (
        <g>
          <rect x={4} y={4} width={32} height={32} rx={5} fill="#d9dde2" stroke="#4a4f57" strokeWidth={2} />
          <path d="M18,8 L26,8 L21,18 L28,18 L15,33 L19,21 L12,21Z" fill="#fff8e8" stroke="#4a4f57" strokeWidth={1.5} />
        </g>
      );
    case 'clipper':
      return (
        <g>
          <rect x={11} y={4} width={18} height={6} rx={1.5} fill="#d9dde2" stroke="#4a4f57" strokeWidth={1.5} />
          <rect x={12} y={10} width={16} height={27} rx={7} fill="#2f6fd6" stroke="#173c7a" strokeWidth={2} />
          <rect x={17.5} y={17} width={5} height={8} rx={2} fill="#c4d6f5" />
        </g>
      );
    case 'scissors':
      return (
        <g>
          <path d="M20,20 L8,3 L12,3Z M20,20 L32,3 L28,3Z" fill="#e8ecef" stroke="#59616b" strokeWidth={1.5} />
          <circle cx={12} cy={30} r={6} fill="none" stroke="#e23b3b" strokeWidth={3.5} />
          <circle cx={28} cy={30} r={6} fill="none" stroke="#e23b3b" strokeWidth={3.5} />
          <path d="M20,20 L14,26 M20,20 L26,26" stroke="#59616b" strokeWidth={2.5} />
        </g>
      );
    case 'dryer':
      return (
        <g>
          <rect x={2} y={10} width={8} height={10} rx={2} fill="#333" />
          <rect x={8} y={7} width={26} height={16} rx={8} fill="#ff6fa8" stroke="#a3305e" strokeWidth={2} />
          <rect x={22} y={20} width={8} height={17} rx={3} fill="#ff6fa8" stroke="#a3305e" strokeWidth={2} />
          <circle cx={21} cy={15} r={4} fill="#ffd1e4" />
        </g>
      );
    case 'wand':
      // Gậy Như Ý: red staff with golden bands, tip at the top-left.
      return (
        <g transform="rotate(-45 20 20)">
          <rect x={17} y={1} width={6} height={38} rx={3} fill="#d6332f" stroke="#7a1512" strokeWidth={1.5} />
          <rect x={16} y={1} width={8} height={7} rx={2} fill="#ffd23f" stroke="#a8740c" strokeWidth={1.5} />
          <rect x={16} y={32} width={8} height={7} rx={2} fill="#ffd23f" stroke="#a8740c" strokeWidth={1.5} />
          <path d="M20,13 l1.5,3 3,0.5 -2.2,2 0.6,3 -2.9,-1.5 -2.9,1.5 0.6,-3 -2.2,-2 3,-0.5z" fill="#fff6b0" />
        </g>
      );
    case 'ray':
      return (
        <g>
          <path d="M6,14 h18 l8,-4 v14 l-8,-4 h-6 l-3,14 h-6 l2,-14 h-5z" fill="#ff6fd0" stroke="#7a1f63" strokeWidth={1.8} strokeLinejoin="round" />
          <circle cx={13} cy={17} r={3.5} fill="#7dff9a" stroke="#1d7a3a" strokeWidth={1.2} />
          <path d="M33,11 l5,-3 M34,17 h6 M33,23 l5,3" stroke="#ffd23f" strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    case 'storm':
      return (
        <g>
          <rect x={2} y={9} width={9} height={12} rx={2} fill="#2d2d5a" />
          <rect x={8} y={6} width={22} height={18} rx={9} fill="#7a5cff" stroke="#35208f" strokeWidth={2} />
          <rect x={14} y={21} width={8} height={16} rx={3} fill="#7a5cff" stroke="#35208f" strokeWidth={2} />
          <path d="M30,9 q8,2 7,6 q-1,4 -7,3 M30,15 q6,1 6,5 q-1,4 -6,2" fill="none" stroke="#7fd6ff" strokeWidth={2.2} strokeLinecap="round" />
          <path d="M16,11 l3,4 -3,0 3,5" fill="none" stroke="#ffd23f" strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    case 'vacuum':
      return (
        <g>
          <ellipse cx={14} cy={27} rx={11} ry={9} fill="#3a4a6b" stroke="#1b2438" strokeWidth={2} />
          <ellipse cx={14} cy={23} rx={8} ry={4} fill="#9fe6ff" stroke="#1b2438" strokeWidth={1.5} />
          <circle cx={9} cy={29} r={1.3} fill="#fff" />
          <circle cx={18} cy={31} r={1} fill="#fff" />
          <path d="M22,23 q8,-4 9,-14" fill="none" stroke="#1b2438" strokeWidth={4} strokeLinecap="round" />
          <path d="M26,4 h11 l-3,7 h-5z" fill="#c8d2e6" stroke="#1b2438" strokeWidth={1.8} strokeLinejoin="round" />
        </g>
      );
    case 'comb':
      return (
        <g>
          <rect x={4} y={12} width={26} height={7} rx={2} fill="#ffcc33" stroke="#9a6a08" strokeWidth={1.5} />
          <path d="M6,19 v13 M10,19 v13 M14,19 v13 M18,19 v13 M22,19 v13 M26,19 v13" stroke="#9a6a08" strokeWidth={2} strokeLinecap="round" />
          <path d="M29,12 q4,-9 9,-6 q-2,2 -1,4 q3,1 1,4 q-4,0 -6,4z" fill="#2fbf71" stroke="#126b3d" strokeWidth={1.5} strokeLinejoin="round" />
          <circle cx={34} cy={8} r={1.2} fill="#d6332f" />
        </g>
      );
    case 'cooker':
      return (
        <g>
          <path d="M6,18 h28 v12 q0,6 -6,6 h-16 q-6,0 -6,-6z" fill="#f4f4f0" stroke="#6b6b66" strokeWidth={1.8} />
          <path d="M5,18 q15,-14 30,0z" fill="#e6e6e0" stroke="#6b6b66" strokeWidth={1.8} />
          <rect x={17} y={7} width={6} height={4} rx={2} fill="#6b6b66" />
          <circle cx={20} cy={27} r={3.5} fill="#ff7aa8" />
          <path d="M12,6 q-2,-3 0,-5 M28,6 q2,-3 0,-5" stroke="#bbb" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'stamp':
      return (
        <g>
          <rect x={14} y={3} width={12} height={14} rx={6} fill="#8b4a2b" />
          <rect x={7} y={17} width={26} height={8} rx={2} fill="#5a2e1a" />
          <rect x={5} y={25} width={30} height={8} rx={2} fill="#d6332f" />
        </g>
      );
    case 'fireworks':
      return (
        <g>
          <path d="M18,12 h6 v20 h-6z" fill="#d6332f" stroke="#7a1512" strokeWidth={1.5} />
          <path d="M18,12 l3,-8 3,8z" fill="#ffd23f" />
          <path d="M21,32 v6" stroke="#555" strokeWidth={2} />
          <path d="M8,8 l4,4 M34,8 l-4,4 M6,20 h5 M35,20 h-5" stroke="#ffd23f" strokeWidth={2} strokeLinecap="round" />
        </g>
      );
  }
}

export function ToolIcon({ id }: { id: ToolId }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden>
      <ToolArt id={id} />
    </svg>
  );
}
