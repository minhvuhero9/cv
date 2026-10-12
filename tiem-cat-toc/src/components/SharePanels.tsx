import { useMemo, useState } from 'react';
import { Creation, creationHair } from '../game/creation';
import { customerById } from '../game/customers';
import { measureHair } from '../game/metrics';
import { exportSave, importSave } from '../game/saveCode';
import { Reply } from '../game/shopStyle';
import { Character } from './Character';

/** Mã lưu tiệm (in Settings): copy a backup code, or paste one to bring a shop here. */
export function SaveCodeBox() {
  const [code, setCode] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="save-code" data-testid="save-code">
      <div className="intro-label">💾 Mã lưu tiệm</div>
      <p className="panel-note">Sao lưu cả tiệm (ngày, tiền, đồ nghề, cuốn mẫu, bộ sưu tập) thành một đoạn mã. Dán mã ở máy khác để chơi tiếp.</p>
      {code ? (
        <textarea readOnly value={code} rows={3} onFocus={(e) => e.target.select()} data-testid="save-code-out" />
      ) : (
        <button
          className="secondary-btn"
          onClick={() => {
            const c = exportSave();
            setCode(c);
            navigator.clipboard?.writeText(c).then(
              () => setMsg('Đã chép mã! Giữ nó ở chỗ an toàn.'),
              () => setMsg('Chép đoạn mã ở trên để lưu.'),
            );
          }}
          data-testid="save-code-make"
        >
          Tạo mã sao lưu
        </button>
      )}
      <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={2} placeholder="Dán mã TCTBO1:… vào đây" data-testid="save-code-in" />
      <button
        className="secondary-btn"
        disabled={!paste.trim()}
        onClick={() => {
          try {
            const r = importSave(paste);
            if (!r.ok) return setMsg(r.reason);
            setMsg(`Đã nhập tiệm${r.day ? ` (ngày ${r.day})` : ''}. Đang mở lại…`);
            setTimeout(() => location.reload(), 600);
          } catch {
            setMsg('Không ghi được vào trình duyệt này.');
          }
        }}
        data-testid="save-code-load"
      >
        Nhập mã
      </button>
      {msg && (
        <p className="photo-status" data-testid="save-code-msg">
          {msg}
        </p>
      )}
    </div>
  );
}

function Mini({ c, label }: { c: Creation; label: string }) {
  const hair = useMemo(() => creationHair(c), [c]);
  const d = customerById(c.customer);
  return (
    <figure className="reply-pic">
      <svg viewBox="40 40 320 330" width={150} height={155}>
        <Character look={d.look} hair={hair} metrics={measureHair(hair)} mood="happy" idPrefix={`rp-${label}`} />
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}

/** Opening a `?reply=` link: a friend's attempt next to your design. */
export function ReplyPanel({ r, onTry, onClose }: { r: Reply; onTry(): void; onClose(): void }) {
  return (
    <div className="overlay" data-testid="reply-panel">
      <div className="panel">
        <div className="intro-label">🔗 Kết quả thách đấu</div>
        <h2>
          {r.by} đạt <b>{r.score}%</b> với mẫu “{r.original.name}”
        </h2>
        <div className="reply-row">
          <Mini c={r.original} label="Mẫu gốc" />
          <Mini c={r.attempt} label={`Bài của ${r.by}`} />
        </div>
        <p className="panel-note">{r.score >= 90 ? 'Gần như y hệt! Đến lượt bạn giữ ngôi vương.' : r.score >= 70 ? 'Khá giống đấy. Bạn có làm tốt hơn không?' : 'Còn xa lắm. Thử cho bạn ấy xem làm thế nào nhé!'}</p>
        <div className="actions">
          <button className="primary-btn" onClick={onTry} data-testid="reply-try">
            Tự cắt mẫu này
          </button>
          <button className="secondary-btn" onClick={onClose} data-testid="reply-close">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
