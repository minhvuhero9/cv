import { ACCESSORIES, AccessoryId, accessoryById } from '../game/accessories';
import type { RoundState } from '../game/session';

/** Phụ kiện tóc: one button in the toolbar; the box opens above it. */
export function AccessoryButton({ s, open, onToggle }: { s: RoundState; open: boolean; onToggle(): void }) {
  if (!s.accessoriesReady || s.customer.look.species === 'dog') return null;
  const cur = accessoryById(s.accessory);
  return (
    <button className={`mirror-btn acc-btn ${open ? 'is-open' : ''}`} onClick={onToggle} disabled={s.phase !== 'cutting'} data-testid="accessories" title="Hộp phụ kiện tóc">
      <span className="acc-icon" aria-hidden>
        {cur?.icon ?? '🎀'}
      </span>
      <span className="mirror-btn-text">{cur ? cur.name : 'Phụ kiện'}</span>
    </button>
  );
}

export function AccessoryPicker({ s, onPick, onClose }: { s: RoundState; onPick(id: AccessoryId | null): void; onClose(): void }) {
  return (
    <div className="mirror-picker acc-picker" role="dialog" aria-label="Hộp phụ kiện tóc" data-testid="accessory-picker">
      <div className="mirror-picker-head">
        <span className="acc-icon big" aria-hidden>
          🎀
        </span>
        <div>
          <b>Hộp phụ kiện tóc</b>
          <small>Cài một món lên đầu khách. Hợp gu thì khách thích thêm, không hợp thì bị trừ điểm.</small>
        </div>
        <button className="mirror-close" onClick={onClose} data-testid="accessory-close" aria-label="Đóng">
          ✕
        </button>
      </div>
      <div className="acc-grid">
        {ACCESSORIES.map((a) => (
          <button key={a.id} className={`chip ${s.accessory === a.id ? 'is-active' : ''}`} onClick={() => onPick(a.id)} data-testid={`acc-${a.id}`}>
            {a.icon} {a.name}
          </button>
        ))}
        {s.accessory && (
          <button className="chip" onClick={() => onPick(null)} data-testid="acc-none">
            ✕ Gỡ ra
          </button>
        )}
      </div>
    </div>
  );
}
