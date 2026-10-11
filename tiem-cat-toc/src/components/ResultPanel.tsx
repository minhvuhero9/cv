import { useEffect, useState } from 'react';
import { cardFileName, downloadBlob, shareText } from '../game/share';
import { EVENT_TITLES, STYLE_RULES } from '../game/evaluate';
import { RoundState } from '../game/session';
import { ToolId, toolDef } from '../game/tools';
import { Served, vnd } from '../game/career';
import { ToolIcon } from './ToolIcons';
import { lengthWord, requestSheet } from '../game/request';
import { SheetChecklist } from './RequestSheet';
import { ReplayPlayer } from './ReplayPlayer';
import { LEVELS } from '../game/level';
import type { Zone } from '../game/hair';

const ZONES: [Zone, string][] = [
  ['left', 'Trái'],
  ['top', 'Đỉnh'],
  ['right', 'Phải'],
  ['fringe', 'Mái'],
];

/** Why the score is what it is: the request sheet ticked off, and each zone vs. the target. */
function ZoneReport({ s }: { s: RoundState }) {
  const sheet = requestSheet(s);
  const t = sheet.target;
  return (
    <div className="zone-report" data-testid="zone-report">
      <SheetChecklist s={s} sheet={sheet} final />
      {t && (
        <div className="zone-bars">
          {ZONES.map(([z, name]) => {
            const v = s.metrics.zone[z];
            const off = v - t[z];
            const good = Math.abs(off) <= 0.16;
            return (
              <div key={z} className={`zone-bar ${good ? 'good' : 'off'}`} data-testid={`zone-${z}`} title={`Muốn: ${lengthWord(t[z])}`}>
                <span className="zone-name">{name}</span>
                <span className="zone-track">
                  <span className="zone-fill" style={{ width: `${Math.min(100, (v / 1.5) * 100)}%` }} />
                  <span className="zone-target" style={{ left: `${Math.min(100, (t[z] / 1.5) * 100)}%` }} />
                </span>
                <span className="zone-verdict">{good ? 'Chuẩn' : off > 0 ? 'Dài quá' : 'Ngắn quá'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  s: RoundState;
  unlocked: string[];
  /** Tools unlocked by finishing this round. */
  newTools: ToolId[];
  onReplay(): void;
  /** Open the photo mode with this result (and keep it in the book). */
  onPhoto?(): void;
  onNext(): void;
  /** Career mode: what this customer did to the shop, and the next step's label. */
  career?: { served: Served; nextLabel: string } | null;
  /** Daily challenge: this run's score and today's local leaderboard. */
  daily?: { date: string; score: number; rank: number | null; board: { score: number; sat: number; style: string }[]; streak: number } | null;
}

const TIER_LABEL = { love: 'Mê tít', ok: 'Tạm hài lòng', meh: 'Lấn cấn', bad: 'Bực mình', disaster: 'Thảm họa' } as const;

export function ResultPanel({ s, unlocked, newTools, onReplay, onNext, career, daily, onPhoto }: Props) {
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
          <ReplayPlayer s={s} />
        </div>
        <div className="result-info">
          {career && (
            <div className="career-deltas" data-testid="career-deltas">
              <span className="up">💰 +{vnd(career.served.paid + career.served.tip)}</span>
              <span className={career.served.repDelta >= 0 ? 'up' : 'down'}>
                ⭐ Uy tín {career.served.repDelta >= 0 ? '+' : ''}
                {career.served.repDelta}
              </span>
              <span className="up">🔥 Viral +{career.served.viralDelta}</span>
            </div>
          )}
          {career?.served.levelUp && (
            <div className="level-up" data-testid="level-up">
              🎉 Tiệm lên <b>cấp {career.served.levelUp}: {LEVELS[career.served.levelUp - 1].name}</b>!
              <small>Mở khóa: {LEVELS[career.served.levelUp - 1].unlocks.join(' · ')}</small>
            </div>
          )}
          {career && (career.served.xp ?? 0) > 0 && (
            <div className="xp-gain" data-testid="xp-gain">
              +{career.served.xp} kinh nghiệm cho tiệm
            </div>
          )}
          {career?.served.quests?.map((q) => (
            <div key={q} className="quest-done" data-testid="quest-done">
              🎯 Hoàn thành nhiệm vụ: <b>{q}</b>
            </div>
          ))}
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
          {daily && (
            <div className="daily-result" data-testid="daily-result">
              <div>
                🗓 Thử thách {daily.date.split('-').reverse().join('/')}: <b data-testid="daily-score">{daily.score}</b> điểm
                {daily.rank ? ` · hạng ${daily.rank} trên máy này` : ''} · chuỗi {daily.streak} ngày
              </div>
              <ol>
                {daily.board.map((x, i) => (
                  <li key={i} className={x.score === daily.score && i + 1 === daily.rank ? 'me' : ''}>
                    <b>{x.score}</b> — {x.style} ({x.sat}%)
                  </li>
                ))}
              </ol>
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
          <ZoneReport s={s} />
          <p className="result-caption" data-testid="caption">
            {r.caption}
          </p>
          <dl className="result-stats">
            <div>
              <dt>Yêu cầu</dt>
              <dd>
                “{s.requestText} {s.customer.catch}”
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
              {career ? career.nextLabel : 'Khách tiếp theo →'}
            </button>
            {!career && (
              <button className="secondary-btn" onClick={onReplay} data-testid="replay">
                ↻ Cắt lại khách này
              </button>
            )}
          </div>
          <div className="actions share">
            <button className="secondary-btn" onClick={download} disabled={!card} data-testid="download">
              ⬇ Tải ảnh
            </button>
            {onPhoto && !r.walkedOut && (
              <button className="secondary-btn" onClick={onPhoto} data-testid="result-photo" title="Chụp ảnh tác phẩm và lưu vào Sổ kiểu tóc (thành mẫu trong cuốn mẫu)">
                📷 Chụp ảnh &amp; lưu mẫu
              </button>
            )}
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
