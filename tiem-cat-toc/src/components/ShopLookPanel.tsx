import { useState } from 'react';
import { NAME_MAX, SIGNS, ShopLook, WALLS, arrange, cleanName, moveDecor, toggleDecor } from '../game/shopStyle';

const LABEL: Record<string, string> = {
  works: 'Tường tác phẩm',
  trophies: 'Kệ cúp',
  award: 'Bằng khen',
  mirror: 'Gương Thần',
  petSign: 'Biển thú cưng',
  plant: 'Cây phong thủy',
  bench: 'Ghế chờ',
  generator: 'Máy phát',
};

/** Tiệm của riêng bạn: name, paint, sign, and the wall arranged by drag & drop (or tap, tap). */
export function ShopLookPanel({ look, ids, onChange, onClose }: { look: ShopLook; ids: string[]; onChange(l: ShopLook): void; onClose(): void }) {
  const [name, setName] = useState(look.name);
  const [picked, setPicked] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const wall = arrange(ids, look);
  const hidden = ids.filter((x) => look.hidden.includes(x));
  const place = (id: string, to: number) => {
    onChange(moveDecor(ids, { ...look, hidden: look.hidden.filter((x) => x !== id) }, id, to));
    setPicked(null);
  };
  return (
    <div className="overlay" data-testid="look-panel">
      <div className="panel look-panel">
        <div className="shop-head">
          <h2>🎨 Trang trí tiệm</h2>
          <button className="secondary-btn" onClick={onClose} data-testid="look-close">
            Xong
          </button>
        </div>

        <label className="look-row">
          <span>Tên tiệm</span>
          <input
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => onChange({ ...look, name: cleanName(name) })}
            onKeyDown={(e) => e.key === 'Enter' && onChange({ ...look, name: cleanName(name) })}
            data-testid="look-name"
          />
          <button className="secondary-btn" onClick={() => onChange({ ...look, name: cleanName(name) })} data-testid="look-name-save">
            Treo biển
          </button>
        </label>

        <div className="look-row">
          <span>Màu tường</span>
          <div className="swatches">
            {WALLS.map((w) => (
              <button key={w.id} className={`swatch ${look.wall === w.id ? 'is-active' : ''}`} style={{ background: w.a }} title={w.name} aria-label={w.name} onClick={() => onChange({ ...look, wall: w.id })} data-testid={`look-wall-${w.id}`} />
            ))}
          </div>
        </div>
        <div className="look-row">
          <span>Màu biển hiệu</span>
          <div className="swatches">
            {SIGNS.map((g) => (
              <button key={g.id} className={`swatch ${look.sign === g.id ? 'is-active' : ''}`} style={{ background: g.bg, color: g.text }} title={g.name} aria-label={g.name} onClick={() => onChange({ ...look, sign: g.id })} data-testid={`look-sign-${g.id}`}>
                A
              </button>
            ))}
          </div>
        </div>

        <div className="intro-label">Tường tiệm (kéo thả, hoặc chạm một món rồi chạm chỗ mới)</div>
        {ids.length === 0 && <p className="panel-note">Chưa có đồ trang trí. Mua ở Cửa hàng, lưu mẫu vào cuốn mẫu, hoặc thắng cúp ở Cuộc thi tóc.</p>}
        <ol className="look-wall" data-testid="look-wall">
          {wall.map((id, i) => (
            <li
              key={id}
              className={`look-slot ${picked === id ? 'is-picked' : ''} ${dragging === id ? 'is-dragging' : ''}`}
              draggable
              onDragStart={() => setDragging(id)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging) place(dragging, i);
                setDragging(null);
              }}
              onClick={() => (picked && picked !== id ? place(picked, i) : setPicked(picked === id ? null : id))}
              data-testid={`look-slot-${id}`}
            >
              <span className="look-num">{i + 1}</span>
              {LABEL[id] ?? id}
              <button
                className="link-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(toggleDecor(look, id));
                }}
                data-testid={`look-hide-${id}`}
              >
                Cất đi
              </button>
            </li>
          ))}
        </ol>
        {hidden.length > 0 && (
          <>
            <div className="intro-label">Đã cất</div>
            <ul className="look-hidden">
              {hidden.map((id) => (
                <li key={id}>
                  {LABEL[id] ?? id}
                  <button className="link-btn" onClick={() => onChange(toggleDecor(look, id))} data-testid={`look-show-${id}`}>
                    Treo lên
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
