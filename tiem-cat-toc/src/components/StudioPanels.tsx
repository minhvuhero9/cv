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
} from '../game/studio';
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
export const STUDIO_MODELS = CUSTOMERS.filter((c) => c.id !== 'copycat');

/** Left panel of the Xưởng: model, mode, colours, stencils, undo. */
export function StudioPanel({
  s,
  onModel,
  models,
  onUndo,
  onRedo,
  onReset,
  onPhoto,
  onBook,
}: {
  s: RoundState;
  onModel(id: string): void;
  /** Models to choose from (career: customers already met). */
  models: { id: string; name: string }[];
  onUndo(): void;
  onRedo(): void;
  onReset(): void;
  onPhoto(): void;
  onBook(): void;
}) {
  const st = s.studio!;
  return (
    <div className="studio-panel" data-testid="studio-panel">
      <div className="studio-title">🎨 Xưởng Tạo Kiểu</div>
      <p className="studio-note">
        {st.from === 'career' ? 'Sáng tạo mẫu cho cuốn mẫu của tiệm bằng đồ nghề bạn đã mua. Khách sẽ đặt kiểu theo mẫu bạn lưu.' : 'Không chấm điểm, không tính giờ. Khách ngồi yên cho bạn sáng tạo.'}
      </p>
      <label className="studio-row">
        <span>Người mẫu</span>
        <select value={s.baseCustomer.id} onChange={(e) => onModel(e.target.value)} data-testid="studio-model">
          {models.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <p className="studio-hint">Dùng mọi dụng cụ ở thanh dưới. Chọn 🖌 Cọ Nhuộm hoặc ⚡ Khuôn Cạo Hình để tô màu, cạo hình.</p>
      <div className="studio-actions">
        <button className="secondary-btn" onClick={onUndo} disabled={!st.undo.length} data-testid="studio-undo" title="Hoàn tác (Ctrl+Z)">
          ↶ Hoàn tác
        </button>
        <button className="secondary-btn" onClick={onRedo} disabled={!st.redo.length} data-testid="studio-redo" title="Làm lại (Ctrl+Y)">
          ↷ Làm lại
        </button>
        <button className="secondary-btn" onClick={onReset} data-testid="studio-reset">
          ⟲ Tóc gốc
        </button>
      </div>
      <div className="studio-actions">
        <button className="primary-btn" onClick={onPhoto} data-testid="studio-photo" title="Chụp ảnh và lưu vào cuốn mẫu">
          📷 Chụp ảnh
        </button>
        <button className="secondary-btn" onClick={onBook} data-testid="studio-book">
          📒 Sổ kiểu tóc
        </button>
      </div>
    </div>
  );
}

/** Photo mode: name it, pose it, decorate it, export it, keep it. */
export function PhotoPanel({
  s,
  editing,
  onClose,
  onSaved,
}: {
  s: RoundState;
  /** The creation being edited (keeps its id and photo settings). */
  editing: Creation | null;
  onClose(): void;
  onSaved(c: Creation): boolean;
}) {
  const suggested = useMemo(() => {
    const m = measureHair(s.hair);
    return nameHairstyle({ customer: s.customer, metrics: m, before: s.beforeMetrics, chaos: s.chaos, events: s.events, fixCount: 0, maxZoneStrokes: 0, walkedOut: false, timedOut: false }, 80).name;
  }, [s]);
  const [name, setName] = useState(editing?.name ?? suggested);
  const [caption, setCaption] = useState(editing?.caption ?? `Tác phẩm trên đầu ${s.baseCustomer.name}`);
  const [photo, setPhoto] = useState<PhotoSettings>(editing?.photo ?? { mood: s.result && !s.result.walkedOut ? s.result.mood : 'happy', bg: 'salon', frame: 'polaroid', stickers: [] });
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
      downloadBlob(blob, `xuong-tao-kieu-${s.baseCustomer.id}.png`);
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
      downloadBlob(blob, `xuong-tao-kieu-${s.baseCustomer.id}.${ext}`);
      setStatus(`Đã tải video quá trình tạo kiểu (${ext.toUpperCase()}).`);
    } catch (e) {
      setStatus(`Không quay được video: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };
  const save = () => {
    const ok = onSaved(snapCreation(s, name, caption, photo, editing?.id));
    setStatus(ok ? 'Đã lưu vào Sổ kiểu tóc.' : 'Bộ nhớ trình duyệt đầy, chưa lưu được.');
  };

  return (
    <div className="overlay" data-testid="photo-panel">
      <div className="panel photo-panel">
        <div className="shop-head">
          <h2>📷 Chụp ảnh tác phẩm</h2>
          <button className="secondary-btn" onClick={onClose} data-testid="photo-close">
            Quay lại Xưởng
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
                💾 {editing ? 'Lưu đè vào sổ' : 'Lưu vào sổ'}
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
export function BookPanel({ book, onOpen, onDelete, onClose }: { book: Creation[]; onOpen(c: Creation): void; onDelete(id: string): void; onClose(): void }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <div className="overlay" data-testid="book-panel">
      <div className="panel book-panel">
        <div className="shop-head">
          <h2>📒 Sổ kiểu tóc của tôi</h2>
          <button className="secondary-btn" onClick={onClose} data-testid="book-close">
            Đóng
          </button>
        </div>
        <p className="panel-note">
          {book.length}/{BOOK_MAX} tác phẩm, lưu trong trình duyệt này. Đây cũng là <b>cuốn mẫu của tiệm</b>: từ ngày 2 ở chế độ Mở Tiệm, mỗi ngày có khách chọn một mẫu để đặt cắt.
        </p>
        {book.length === 0 && <p className="panel-note">Chưa có tác phẩm nào. Tạo kiểu xong, bấm “📷 Chụp ảnh” → “Lưu vào sổ”.</p>}
        <div className="book-grid">
          {book.map((c) => (
            <BookItem key={c.id} c={c} confirm={confirm === c.id} onOpen={() => onOpen(c)} onAsk={() => setConfirm(c.id)} onDelete={() => onDelete(c.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BookItem({ c, confirm, onOpen, onAsk, onDelete }: { c: Creation; confirm: boolean; onOpen(): void; onAsk(): void; onDelete(): void }) {
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
        <button className="secondary-btn" onClick={onOpen} data-testid="book-open">
          Mở
        </button>
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
