import { useEffect, useState } from 'react';
import { cardFileName, downloadBlob, shareText } from '../game/share';
import { EVENT_TITLES, STYLE_RULES } from '../game/evaluate';
import { RoundState } from '../game/session';
import { ToolId, toolDef } from '../game/tools';
import { ToolIcon } from './ToolIcons';

interface Props {
  s: RoundState;
  unlocked: string[];
  /** Tools unlocked by finishing this round. */
  newTools: ToolId[];
  onReplay(): void;
  onNext(): void;
}

const TIER_LABEL = { love: 'Mê tít', ok: 'Tạm hài lòng', meh: 'Lấn cấn', bad: 'Bực mình', disaster: 'Thảm họa' } as const;

export function ResultPanel({ s, unlocked, newTools, onReplay, onNext }: Props) {
  const r = s.result!;
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    // The card renderer pulls in react-dom/server, so it is loaded only when needed.
    import('../game/card')
      .then(({ renderCard, canvasToBlob }) => renderCard(s).then(canvasToBlob))
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setCard({ url, blob });
        try {
          const file = new File([blob], cardFileName(s), { type: 'image/png' });
          setCanShareFiles(typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }));
        } catch {
          setCanShareFiles(false);
        }
      })
      .catch((e: Error) => alive && setCardError(e.message));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [s]);

  const download = () => {
    if (!card) return;
    downloadBlob(card.blob, cardFileName(s));
    setStatus('Đã tải ảnh về máy.');
  };
  const share = async () => {
    if (!card) return;
    const file = new File([card.blob], cardFileName(s), { type: 'image/png' });
    try {
      await navigator.share({ files: [file], title: 'Tiệm Cắt Tóc Bất Ổn', text: shareText(s) });
      setStatus('Đã chia sẻ!');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setStatus('Không chia sẻ được, hãy dùng nút Tải ảnh.');
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText(s)} ${location.href}`);
      setStatus('Đã chép lời thách đấu. Dán cùng ảnh vừa tải nhé!');
    } catch {
      setStatus('Trình duyệt chặn sao chép.');
    }
  };
  const hasClipboard = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;

  return (
    <div className="overlay result" data-testid="result">
      <div className="result-panel">
        <div className="result-card-img">
          {card ? (
            <img src={card.url} alt={`Thẻ kết quả: ${r.style.name}`} data-testid="card-img" />
          ) : cardError ? (
            <div className="card-loading">{cardError}</div>
          ) : (
            <div className="card-loading">Đang in ảnh…</div>
          )}
        </div>
        <div className="result-info">
          {newTools.length > 0 && (
            <div className="new-tools" data-testid="new-tools">
              {newTools.map((id) => (
                <div key={id} className="new-tool">
                  <ToolIcon id={id} />
                  <span>
                    <small>Mở khóa đồ nghề mới!</small>
                    <b>{toolDef(id).name}</b>
                  </span>
                </div>
              ))}
            </div>
          )}
          {r.walkedOut && <div className="walked-out">KHÁCH ĐÃ BỎ VỀ GIỮA CHỪNG</div>}
          <div className="result-label">Kiểu tóc</div>
          <h2 className="result-style" data-testid="style-name" data-style-id={r.style.id}>
            {r.style.name}
          </h2>
          <p className="result-why">{r.style.why}</p>
          <blockquote className="result-quote" data-testid="reaction">
            “{r.line}”
          </blockquote>
          <p className="result-caption" data-testid="caption">
            {r.caption}
          </p>
          <dl className="result-stats">
            <div>
              <dt>Yêu cầu</dt>
              <dd>
                “{s.customer.request} {s.customer.catch}”
              </dd>
            </div>
            <div>
              <dt>Đáp ứng</dt>
              <dd data-testid="sat" data-value={r.sat}>
                {r.sat}% · {TIER_LABEL[r.tier]}
              </dd>
            </div>
            <div>
              <dt>Chaos</dt>
              <dd data-testid="final-chaos" data-value={r.chaos}>
                {r.chaos}/100
              </dd>
            </div>
            <div>
              <dt>Thu nhập</dt>
              <dd>{r.pay}</dd>
            </div>
          </dl>
          {r.incidents.length > 0 && (
            <div className="result-incidents" data-testid="incidents">
              {r.incidents.map((id) => (
                <span key={id} className="tag" data-event={id}>
                  {EVENT_TITLES[id]}
                </span>
              ))}
            </div>
          )}
          <div className="score-row" data-testid="score" data-total={r.total}>
            <span>
              Tay nghề <b>{r.skillScore}</b>
            </span>
            <span>
              Drama <b>{r.dramaScore}</b>
            </span>
            <span className="score-total">
              Tổng <b>{r.total}</b>
            </span>
          </div>
          <div className="actions">
            <button className="primary-btn" onClick={onNext} data-testid="next" autoFocus>
              Khách tiếp theo →
            </button>
            <button className="secondary-btn" onClick={onReplay} data-testid="replay">
              ↻ Cắt lại khách này
            </button>
          </div>
          <div className="actions share">
            <button className="secondary-btn" onClick={download} disabled={!card} data-testid="download">
              ⬇ Tải ảnh
            </button>
            {canShareFiles && (
              <button className="secondary-btn" onClick={share} data-testid="share">
                Chia sẻ
              </button>
            )}
            {!canShareFiles && hasClipboard && (
              <button className="secondary-btn" onClick={copy} data-testid="copy">
                Chép lời thách đấu
              </button>
            )}
          </div>
          {status && <div className="status">{status}</div>}
          <div className="collection" data-testid="collection">
            Bộ sưu tập kiểu tóc: <b>{unlocked.length}</b>/{STYLE_RULES.length}
            <div className="collection-list">
              {STYLE_RULES.map((rule) => (
                <span key={rule.id} className={`tag ${unlocked.includes(rule.id) ? 'is-on' : 'is-off'}`} title={unlocked.includes(rule.id) ? rule.why : 'Chưa mở khóa'}>
                  {unlocked.includes(rule.id) ? rule.name : '???'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
