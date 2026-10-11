import { useMemo, useRef, useState } from 'react';
import { CUSTOMERS } from '../game/customers';
import type { Mood } from '../game/evaluate';
import { nameHairstyle } from '../game/evaluate';
import { measureHair } from '../game/metrics';
import type { RoundState } from '../game/session';
import { downloadBlob } from '../game/share';
import {
  BOOK_MAX,
  Creation,
  PhotoBg,
  PhotoFrame,
  PhotoSettings,
  creationHair,
  snapCreation,
} from '../game/creation';
import { Character } from './Character';
import { applyLook, personaById } from '../game/mirror';
import { BG_LABEL, FRAME_LABEL, PHOTO_H, PHOTO_W, PhotoComposition, STICKERS, StickerArt } from './PhotoComposition';

const MOODS: [Mood, string][] = [
  ['neutral', 'Bình thường'],
  ['happy', 'Vui'],
  ['ecstatic', 'Phấn khích'],
  ['suspicious', 'Nghi ngờ'],
  ['shocked', 'Sốc'],
  ['crying', 'Khóc'],
  ['angry', 'Tức'],
  ['sleepy', 'Buồn ngủ'],
];

/** Photo mode: name it, pose it, decorate it, export it, keep it. */
export function PhotoPanel({ s, onClose, onSaved }: { s: RoundState; onClose(): void; onSaved(c: Creation): boolean }) {
  const suggested = useMemo(() => {
    const m = measureHair(s.hair);
    return nameHairstyle({ customer: s.customer, metrics: m, before: s.beforeMetrics, chaos: s.chaos, events: s.events, fixCount: 0, maxZoneStrokes: 0, walkedOut: false, timedOut: false }, 80).name;
  }, [s]);
  const [name, setName] = useState(suggested);
  const [caption, setCaption] = useState(`Tác phẩm trên đầu ${s.baseCustomer.name}`);
  const [photo, setPhoto] = useState<PhotoSettings>({ mood: s.result && !s.result.walkedOut ? s.result.mood : 'happy', bg: 'salon', frame: 'polaroid', stickers: [] });
  const [sticker, setSticker] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const props = { look: s.customer.look, hair: s.hair, photo, name, caption };

  const place = (e: React.PointerEvent) => {
    if (!sticker || !svgRef.current) return;
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svgRef.current.getScreenCTM();
    if (!m) return;
    const p = pt.matrixTransform(m.inverse());
    setPhoto({ ...photo, stickers: [...photo.stickers, { id: sticker, x: Math.round(p.x), y: Math.round(p.y) }].slice(-20) });
  };
  const png = async () => {
    setBusy('png');
    try {
      const { renderPhotoPng } = await import('../game/photoExport');
      const blob = await renderPhotoPng({ ...props, idPrefix: 'export' });
      downloadBlob(blob, `tiem-cat-toc-${s.baseCustomer.id}.png`);
      setStatus('Đã tải ảnh PNG.');
    } catch (e) {
      setStatus(`Không xuất được ảnh: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };
  const video = async () => {
    setBusy('video');
    try {
      const { renderReplayVideo, replayVideoSupported } = await import('../game/replayVideo');
      if (!replayVideoSupported()) throw new Error('trình duyệt không hỗ trợ quay video');
      const { blob, ext } = await renderReplayVideo(s, undefined, { title: name, finalMood: photo.mood });
      downloadBlob(blob, `tiem-cat-toc-${s.baseCustomer.id}.${ext}`);
      setStatus(`Đã tải video quá trình tạo kiểu (${ext.toUpperCase()}).`);
    } catch (e) {
      setStatus(`Không quay được video: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };
  const save = () => {
    const ok = onSaved(snapCreation(s, name, caption, photo));
    setStatus(ok ? 'Đã lưu vào cuốn mẫu của tiệm.' : 'Bộ nhớ trình duyệt đầy, chưa lưu được.');
  };

  return (
    <div className="overlay" data-testid="photo-panel">
      <div className="panel photo-panel">
        <div className="shop-head">
          <h2>📷 Chụp ảnh tác phẩm</h2>
          <button className="secondary-btn" onClick={onClose} data-testid="photo-close">
            Đóng
          </button>
        </div>
        <div className="photo-layout">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${PHOTO_W} ${PHOTO_H}`}
            className={`photo-preview ${sticker ? 'placing' : ''}`}
            onPointerDown={place}
            data-testid="photo-preview"
            aria-label="Ảnh xem trước"
          >
            <PhotoComposition {...props} idPrefix="photo" />
          </svg>
          <div className="photo-controls">
            <label className="studio-row col">
              <span>Tên kiểu tóc</span>
              <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} data-testid="photo-name" />
            </label>
            <label className="studio-row col">
              <span>Lời chú thích</span>
              <input value={caption} maxLength={120} onChange={(e) => setCaption(e.target.value)} data-testid="photo-caption" />
            </label>
            <div className="studio-sub">Biểu cảm</div>
            <div className="chips">
              {MOODS.map(([m, label]) => (
                <button key={m} className={`chip ${photo.mood === m ? 'is-active' : ''}`} onClick={() => setPhoto({ ...photo, mood: m })} data-testid={`photo-mood-${m}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="studio-sub">Phông nền</div>
            <div className="chips">
              {(Object.keys(BG_LABEL) as PhotoBg[]).map((b) => (
                <button key={b} className={`chip ${photo.bg === b ? 'is-active' : ''}`} onClick={() => setPhoto({ ...photo, bg: b })} data-testid={`photo-bg-${b}`}>
                  {BG_LABEL[b]}
                </button>
              ))}
            </div>
            <div className="studio-sub">Khung</div>
            <div className="chips">
              {(Object.keys(FRAME_LABEL) as PhotoFrame[]).map((f) => (
                <button key={f} className={`chip ${photo.frame === f ? 'is-active' : ''}`} onClick={() => setPhoto({ ...photo, frame: f })} data-testid={`photo-frame-${f}`}>
                  {FRAME_LABEL[f]}
                </button>
              ))}
            </div>
            <div className="studio-sub">Sticker {sticker ? '— chạm vào ảnh để dán' : ''}</div>
            <div className="chips">
              {STICKERS.map((x) => (
                <button key={x.id} className={`chip sticker-chip ${sticker === x.id ? 'is-active' : ''}`} onClick={() => setSticker(sticker === x.id ? null : x.id)} data-testid={`photo-sticker-${x.id}`} aria-label={x.label}>
                  <svg viewBox="-30 -30 60 60" width={26} height={26}>
                    <StickerArt id={x.id} />
                  </svg>
                </button>
              ))}
              <button className="chip" onClick={() => setPhoto({ ...photo, stickers: [] })} disabled={!photo.stickers.length} data-testid="photo-clear-stickers">
                Gỡ hết
              </button>
            </div>
            <div className="studio-actions">
              <button className="primary-btn" onClick={png} disabled={!!busy} data-testid="photo-png">
                {busy === 'png' ? 'Đang in…' : '⬇ Tải ảnh PNG'}
              </button>
              <button className="secondary-btn" onClick={video} disabled={!!busy} data-testid="photo-video">
                {busy === 'video' ? 'Đang quay…' : '🎬 Tải video'}
              </button>
              <button className="secondary-btn" onClick={save} data-testid="photo-save">
                💾 Lưu vào cuốn mẫu
              </button>
            </div>
            {status && (
              <p className="photo-status" data-testid="photo-status">
                {status}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Sổ kiểu tóc: saved creations, drawn live from their data. */
export function BookPanel({ book, onDelete, onClose }: { book: Creation[]; onDelete(id: string): void; onClose(): void }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <div className="overlay" data-testid="book-panel">
      <div className="panel book-panel">
        <div className="shop-head">
          <h2>📒 Cuốn mẫu của tiệm</h2>
          <button className="secondary-btn" onClick={onClose} data-testid="book-close">
            Đóng
          </button>
        </div>
        <p className="panel-note">
          {book.length}/{BOOK_MAX} mẫu do bạn tạo, lưu trong trình duyệt này. Ở chế độ Mở Tiệm, các ngày chẵn có khách chọn một mẫu trong cuốn này để đặt cắt.
        </p>
        {book.length === 0 && <p className="panel-note">Chưa có mẫu nào. Cắt xong một kiểu ưng ý, ở màn kết quả bấm “📷 Chụp ảnh &amp; lưu mẫu” → “Lưu vào sổ”.</p>}
        <div className="book-grid">
          {book.map((c) => (
            <BookItem key={c.id} c={c} confirm={confirm === c.id} onAsk={() => setConfirm(c.id)} onDelete={() => onDelete(c.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BookItem({ c, confirm, onAsk, onDelete }: { c: Creation; confirm: boolean; onAsk(): void; onDelete(): void }) {
  const hair = useMemo(() => creationHair(c), [c]);
  const d = CUSTOMERS.find((x) => x.id === c.customer) ?? CUSTOMERS[0];
  const persona = personaById(c.persona);
  const look = persona ? applyLook(d.look, persona.look) : d.look;
  return (
    <div className="book-item" data-testid="book-item">
      <svg viewBox="40 40 320 330" className="book-thumb">
        <Character look={look} hair={hair} metrics={measureHair(hair)} mood={c.photo.mood} idPrefix={`bk-${c.id}`} />
      </svg>
      <b>{c.name}</b>
      <small>
        {d.name} · {new Date(c.at).toLocaleDateString('vi-VN')}
        {c.orders ? ` · được đặt ${c.orders} lần` : ''}
      </small>
      <div className="book-actions">
        {confirm ? (
          <button className="secondary-btn danger" onClick={onDelete} data-testid="book-delete-confirm">
            Xóa thật?
          </button>
        ) : (
          <button className="secondary-btn" onClick={onAsk} data-testid="book-delete">
            Xóa
          </button>
        )}
      </div>
    </div>
  );
}
