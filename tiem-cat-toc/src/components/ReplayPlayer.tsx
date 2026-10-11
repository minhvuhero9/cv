import { useEffect, useMemo, useState } from 'react';
import { measureHair } from '../game/metrics';
import { REPLAY_FPS, replayShots, shotLook } from '../game/replay';
import type { RoundState } from '../game/session';
import { downloadBlob } from '../game/share';
import { Character } from './Character';

/** "Xem lại 5 giây": the round squeezed into a short loop, with a video download when the browser can record. */
export function ReplayPlayer({ s }: { s: RoundState }) {
  const shots = useMemo(() => replayShots(s), [s]);
  const [playing, setPlaying] = useState(false);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [canRecord, setCanRecord] = useState(false);
  useEffect(() => {
    import('../game/replayVideo').then((m) => setCanRecord(m.replayVideoSupported())).catch(() => setCanRecord(false));
  }, []);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setI((k) => (k + 1 >= shots.length ? (setPlaying(false), shots.length - 1) : k + 1)), 1000 / REPLAY_FPS);
    return () => clearInterval(id);
  }, [playing, shots.length]);
  if (shots.length < 2) return null;
  const f = shots[Math.min(i, shots.length - 1)];
  const save = async () => {
    setBusy(0);
    setNote(null);
    try {
      const { renderReplayVideo } = await import('../game/replayVideo');
      const { blob, ext } = await renderReplayVideo(s, (p) => setBusy(p));
      downloadBlob(blob, `tiem-cat-toc-replay-${s.customer.id}.${ext}`);
      setNote(`Đã tải video (${ext.toUpperCase()}).`);
    } catch (e) {
      setNote(`Không quay được video: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="replay" data-testid="replay-box">
      <svg viewBox="30 45 340 425" className="replay-view" aria-label="Xem lại ván cắt">
        <Character look={shotLook(s, f)} hair={f.hair} metrics={measureHair(f.hair)} mood={f.mood} headOffset={f.off} idPrefix="replay" />
      </svg>
      <div className="replay-bar">
        <span className="replay-fill" style={{ width: `${((i + 1) / shots.length) * 100}%` }} />
      </div>
      <div className="replay-actions">
        <button
          className="secondary-btn"
          onClick={() => {
            setI(0);
            setPlaying(true);
          }}
          data-testid="replay-play"
        >
          ▶ Xem lại 5 giây
        </button>
        {canRecord && (
          <button className="secondary-btn" onClick={save} disabled={busy !== null} data-testid="replay-save">
            {busy !== null ? `Đang quay… ${Math.round(busy * 100)}%` : '⬇ Tải video'}
          </button>
        )}
      </div>
      {note && <p className="replay-note">{note}</p>}
    </div>
  );
}
