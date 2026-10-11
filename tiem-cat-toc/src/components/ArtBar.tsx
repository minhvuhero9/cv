import { STENCILS } from '../game/art';
import type { RoundState } from '../game/session';

/** Colours / stencils for the Cọ Nhuộm and Khuôn Cạo Hình. Locked options say what to buy. */
export function ArtBar({ s }: { s: RoundState }) {
  const { art, kit } = s;
  if (s.tool !== 'brush' && s.tool !== 'stencil' && s.tool !== 'ray') return null;
  if (s.tool === 'ray' && !s.studio && !s.ctx.items.includes('paletteXL')) return null;
  const colors = (
    <div className="art-colors">
      {kit.colors.map((c, i) => (
        <button key={c} className={`swatch ${art.colorA === c ? 'on' : ''}`} style={{ background: c }} onClick={() => (art.colorA = c)} aria-label={`Màu ${c}`} data-testid={`art-color-${i}`} />
      ))}
      {kit.custom ? (
        <>
          <input type="color" value={art.colorA} onChange={(e) => (art.colorA = e.target.value)} aria-label="Màu tự chọn" data-testid="art-color-a" />
          <label className="art-blend">
            <input type="checkbox" checked={art.blend} onChange={(e) => (art.blend = e.target.checked)} data-testid="art-blend" /> Loang
          </label>
          {art.blend && <input type="color" value={art.colorB} onChange={(e) => (art.colorB = e.target.value)} aria-label="Màu thứ hai" data-testid="art-color-b" />}
        </>
      ) : (
        <span className="art-locked" title="Mua Bảng Màu Mở Rộng ở Cửa hàng">🔒 thêm màu, loang: Bảng Màu Mở Rộng</span>
      )}
    </div>
  );
  if (s.tool === 'brush' || s.tool === 'ray') return <div className="art-bar" data-testid="art-bar">{colors}</div>;
  return (
    <div className="art-bar" data-testid="art-bar">
      <div className="art-stencils">
        {STENCILS.map((x) => {
          const owned = kit.stencils.includes(x.id);
          return (
            <button
              key={x.id}
              className={`chip ${art.stencil === x.id ? 'is-active' : ''} ${owned ? '' : 'is-locked'}`}
              disabled={!owned}
              onClick={() => (art.stencil = x.id)}
              title={owned ? x.name : `${x.name}: cần Khuôn Cạo Cao Cấp`}
              data-testid={`art-stencil-${x.id}`}
            >
              {owned ? x.name : `🔒 ${x.name}`}
            </button>
          );
        })}
        {art.stencil === 'text' && (
          <input className="studio-text" value={art.text} maxLength={8} onChange={(e) => (art.text = e.target.value)} aria-label="Chữ để cạo" data-testid="art-text" />
        )}
        {kit.sizes && (
          <label className="art-size">
            Cỡ <input type="range" min={0.6} max={1.6} step={0.1} value={art.size} onChange={(e) => (art.size = Number(e.target.value))} data-testid="art-size" />
          </label>
        )}
      </div>
    </div>
  );
}
