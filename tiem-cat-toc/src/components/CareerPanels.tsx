import { useState } from 'react';
import { CareerState, DaySummary, canBuy, repairCost, vnd } from '../game/career';
import { customerById } from '../game/customers';
import { CATEGORY_LABEL, MACHINES, SHOP, ShopCategory } from '../game/shop';
import { TOOLS } from '../game/tools';
import { ToolIcon } from './ToolIcons';
import type { Quest } from '../game/quests';

/** Today's goals with progress and rewards. */
export function QuestList({ quests, compact = false }: { quests: Quest[]; compact?: boolean }) {
  if (!quests.length) return null;
  return (
    <ul className={`quest-list ${compact ? 'compact' : ''}`} data-testid="quests">
      {quests.map((q) => (
        <li key={q.id} className={q.done ? 'done' : q.failed ? 'failed' : ''} data-quest={q.id}>
          <span className="quest-mark">{q.done ? '✓' : q.failed ? '✗' : '○'}</span>
          <span className="quest-label">
            {q.label}
            {!compact && q.goal > 1 && !q.done && !q.failed && q.id !== 'earn' && (
              <small>
                {' '}
                ({q.progress}/{q.goal})
              </small>
            )}
          </span>
          {!compact && (
            <span className="quest-reward">
              +{vnd(q.reward.money)}
              {q.reward.rep ? ` ⭐+${q.reward.rep}` : ''}
              {q.reward.viral ? ` 🔥+${q.reward.viral}` : ''}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Day / money / reputation / viral chips under the sign. */
export function CareerHud({ c, onSettings, onShop }: { c: CareerState; onSettings(): void; onShop(): void }) {
  return (
    <div className="career-hud" data-testid="career-hud">
      <span className="chip-stat" data-testid="hud-day">
        Ngày <b>{c.day}</b>
      </span>
      <span className="chip-stat money" data-testid="hud-money" data-value={c.money}>
        💰 <b>{vnd(c.money)}</b>
      </span>
      <span className="chip-stat rep" title="Uy tín: chất lượng phục vụ" data-testid="hud-rep" data-value={Math.round(c.rep)}>
        ⭐ Uy tín <b>{Math.round(c.rep)}</b>
      </span>
      <span className="chip-stat viral" title="Viral: độ nổi tiếng trên mạng" data-testid="hud-viral" data-value={Math.round(c.viral)}>
        🔥 Viral <b>{Math.round(c.viral)}</b>
      </span>
      {(c.today.quests?.length ?? 0) > 0 && (
        <span className="chip-stat" title={(c.today.quests ?? []).map((q) => `${q.done ? '✓' : q.failed ? '✗' : '○'} ${q.label}`).join('\n')} data-testid="hud-quests">
          🎯 <b>{c.today.quests!.filter((q) => q.done).length}</b>/{c.today.quests!.length}
        </span>
      )}
      <span className="chip-stat queue">
        Khách {Math.min(c.today.index + 1, c.today.queue.length)}/{c.today.queue.length}
      </span>
      <button className="chip-btn" onClick={onShop} data-testid="open-shop" disabled={c.today.phase === 'open'} title={c.today.phase === 'open' ? 'Cửa hàng mở trước giờ mở tiệm và sau khi đóng cửa' : 'Cửa hàng'}>
        🛒
      </button>
      <button className="chip-btn" onClick={onSettings} data-testid="open-settings" aria-label="Cài đặt">
        ⚙️
      </button>
    </div>
  );
}

const REASON_LABEL = { walkin: 'Khách vãng lai', return: 'Quay lại đòi sửa', loyal: 'Khách quen', copycat: 'Fan kiểu tóc viral', vip: 'Khách VIP', boss: 'Khách trùm cuối tuần' } as const;

/** Morning: what happens today (with causes) and who is coming. */
export function MorningPanel({ c, onOpen, onShop, onFree }: { c: CareerState; onOpen(): void; onShop(): void; onFree(): void }) {
  return (
    <div className="overlay" data-testid="morning">
      <div className="panel">
        <div className="intro-label">Sáng sớm</div>
        <h2>Ngày {c.day} — Tiệm Cắt Tóc Bất Ổn mở cửa</h2>
        {c.day === 1 && (
          <p className="panel-note">
            Mỗi ngày có vài khách. Cắt khéo thì được tiền và <b>Uy tín</b>; cắt thảm họa có khi lại được <b>Viral</b>. Cuối ngày trả tiền thuê, tiền điện. Dành tiền mua đồ ở <b>Cửa hàng</b>.
          </p>
        )}
        {c.today.events.length > 0 && (
          <div className="events" data-testid="day-events">
            {c.today.events.map((e) => (
              <div key={e.id} className="event-card" data-event={e.id}>
                <b>{e.title}</b>
                <div className="event-cause">Vì: {e.cause}</div>
                <div className="event-effect">→ {e.effect}</div>
              </div>
            ))}
          </div>
        )}
        {(c.today.quests?.length ?? 0) > 0 && (
          <div className="quest-box">
            <div className="intro-label">Nhiệm vụ hôm nay</div>
            <QuestList quests={c.today.quests!} />
          </div>
        )}
        <div className="queue-list" data-testid="queue">
          <div className="intro-label">Khách hôm nay</div>
          {c.today.queue.map((q, i) => {
            const d = customerById(q.customer);
            return (
              <div key={i} className={`queue-row r-${q.reason}`}>
                <span className="queue-num">{i + 1}</span>
                <span className="queue-name">{d.name}</span>
                <span className="queue-title">{d.title}</span>
                <span className="queue-reason">{q.reason === 'walkin' ? REASON_LABEL.walkin : q.note || REASON_LABEL[q.reason]}</span>
              </div>
            );
          })}
        </div>
        <div className="actions">
          <button className="primary-btn" onClick={onOpen} data-testid="open-day" autoFocus>
            Mở cửa tiệm ✂
          </button>
          <button className="secondary-btn" onClick={onShop} data-testid="morning-shop">
            🛒 Cửa hàng
          </button>
        </div>
        <button className="link-btn" onClick={onFree} data-testid="to-free">
          Chơi chế độ cắt tự do (không tính tiền)
        </button>
      </div>
    </div>
  );
}

/** Evening: what came in, what went out, what tomorrow looks like. */
export function SummaryPanel({ c, sum, onShop, onNext }: { c: CareerState; sum: DaySummary; onShop(): void; onNext(): void }) {
  const totalCost = sum.costs.reduce((a, x) => a + x.amount, 0);
  return (
    <div className="overlay" data-testid="summary">
      <div className="panel">
        <div className="intro-label">Đóng cửa</div>
        <h2>Tổng kết ngày {sum.day}</h2>
        <table className="served-table">
          <tbody>
            {sum.served.map((x, i) => (
              <tr key={i} className={x.walkedOut ? 'walked' : ''}>
                <td>{x.name}</td>
                <td className="style-cell">{x.walkedOut ? 'Bỏ về giữa chừng' : x.styleName}</td>
                <td>{x.sat}%</td>
                <td className="money-cell">{vnd(x.paid + x.tip)}</td>
                <td className={x.repDelta >= 0 ? 'up' : 'down'}>⭐ {x.repDelta >= 0 ? '+' : ''}{x.repDelta}</td>
                <td className="up">🔥 +{x.viralDelta}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sum.quests && sum.quests.length > 0 && (
          <div className="quest-box">
            <div className="intro-label">Nhiệm vụ</div>
            <QuestList quests={sum.quests} />
          </div>
        )}
        <dl className="ledger" data-testid="ledger">
          <div>
            <dt>Tiền công</dt>
            <dd className="up">+{vnd(sum.revenue)}</dd>
          </div>
          <div>
            <dt>Tiền boa</dt>
            <dd className="up">+{vnd(sum.tips)}</dd>
          </div>
          {(sum.questMoney ?? 0) > 0 && (
            <div>
              <dt>Thưởng nhiệm vụ</dt>
              <dd className="up">+{vnd(sum.questMoney!)}</dd>
            </div>
          )}
          {sum.costs.map((x) => (
            <div key={x.label}>
              <dt>{x.label}</dt>
              <dd className="down">−{vnd(x.amount)}</dd>
            </div>
          ))}
          <div className="ledger-total">
            <dt>Lãi/lỗ hôm nay</dt>
            <dd className={sum.net >= 0 ? 'up' : 'down'} data-testid="net">
              {sum.net >= 0 ? '+' : ''}
              {vnd(sum.net)}
            </dd>
          </div>
          <div className="ledger-total">
            <dt>Tiền trong két</dt>
            <dd>{vnd(sum.moneyAfter)}</dd>
          </div>
        </dl>
        <div className="deltas">
          <span className={sum.repDelta >= 0 ? 'up' : 'down'}>
            Uy tín {sum.repDelta >= 0 ? '+' : ''}
            {sum.repDelta} → {Math.round(c.rep)}
          </span>
          <span>
            Viral {sum.viralDelta >= 0 ? '+' : ''}
            {sum.viralDelta} (nguội dần qua đêm) → {Math.round(c.viral)}
          </span>
          <span className="muted">Chi phí: {vnd(totalCost)}</span>
        </div>
        {sum.tomorrow.length > 0 && (
          <ul className="tomorrow" data-testid="tomorrow">
            {sum.tomorrow.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}
        {c.money < 0 && <div className="warn-box">Tiệm đang nợ. Cắt khéo để có tiền, Cửa hàng chỉ bán khi két còn tiền.</div>}
        <div className="actions">
          <button className="secondary-btn" onClick={onShop} data-testid="summary-shop">
            🛒 Cửa hàng
          </button>
          <button className="primary-btn" onClick={onNext} data-testid="next-day" autoFocus>
            Sang ngày {sum.day + 1} →
          </button>
        </div>
      </div>
    </div>
  );
}

const CATS: ShopCategory[] = ['tool', 'machine', 'chaos', 'upgrade', 'decor', 'special'];

/** The shop: every item shows price, unlock condition, real effect and owned/stock state. */
export function ShopPanel({ c, onBuy, onRepair, onClose }: { c: CareerState; onBuy(id: string): string | null; onRepair(): string | null; onClose(): void }) {
  const [cat, setCat] = useState<ShopCategory>('tool');
  const [msg, setMsg] = useState<string | null>(null);
  const cost = repairCost(c);
  const owned = MACHINES.filter((m) => m === 'clipper' || m === 'dryer' || c.owned.includes(m));
  return (
    <div className="overlay shop" data-testid="shop">
      <div className="panel shop-panel">
        <div className="shop-head">
          <h2>Cửa hàng đồ nghề</h2>
          <span className="chip-stat money">💰 {vnd(c.money)}</span>
          <button className="secondary-btn" onClick={onClose} data-testid="close-shop">
            Đóng
          </button>
        </div>
        <div className="shop-tabs" role="tablist">
          {CATS.map((k) => (
            <button key={k} role="tab" aria-selected={cat === k} className={`chip ${cat === k ? 'is-active' : ''}`} onClick={() => setCat(k)} data-testid={`shop-tab-${k}`}>
              {CATEGORY_LABEL[k]}
            </button>
          ))}
        </div>
        <div className="shop-grid">
          {SHOP.filter((i) => i.category === cat).map((item) => {
            const check = canBuy(c, item);
            const has = !item.pack && c.owned.includes(item.id);
            return (
              <div key={item.id} className={`shop-item ${has ? 'is-owned' : ''} ${!check.ok && !has ? 'is-locked' : ''}`} data-testid={`item-${item.id}`}>
                <div className="shop-item-head">
                  {item.tool && <ToolIcon id={item.tool} />}
                  <div>
                    <b>{item.name}</b>
                    <div className="price">{vnd(item.price)}{item.pack ? ` / ${item.pack} cái` : ''}</div>
                  </div>
                </div>
                <div className="shop-desc">{item.desc}</div>
                <div className="shop-effect">⚙ {item.effect}</div>
                {item.pack && <div className="stock">Đang có: {c.stock[item.id] ?? 0}</div>}
                <button
                  className={has ? 'secondary-btn' : 'primary-btn'}
                  disabled={!check.ok}
                  onClick={() => setMsg(onBuy(item.id))}
                  data-testid={`buy-${item.id}`}
                >
                  {has ? 'Đã có ✓' : check.ok ? `Mua ${vnd(item.price)}` : `🔒 ${check.reason}`}
                </button>
              </div>
            );
          })}
        </div>
        <div className="repair-row" data-testid="repair-row">
          <div>
            <b>Bảo dưỡng máy móc</b>
            <div className="conditions">
              {owned.map((m) => (
                <span key={m} className={(c.condition[m] ?? 100) < 25 ? 'down' : ''}>
                  {TOOLS.find((t) => t.id === m)?.name}: {Math.round(c.condition[m] ?? 100)}%
                </span>
              ))}
            </div>
            <div className="muted">Dưới 25%, máy bắt đầu trục trặc khi dùng.</div>
          </div>
          <button className="secondary-btn" disabled={cost <= 0 || c.money < cost} onClick={() => setMsg(onRepair())} data-testid="repair">
            {cost <= 0 ? 'Máy vẫn tốt' : `Sửa hết: ${vnd(cost)}`}
          </button>
        </div>
        {msg && <div className="status">{msg}</div>}
      </div>
    </div>
  );
}

export interface AudioSettings {
  master: number;
  sfx: number;
  /** Background music (older saves don't have it). */
  music?: number;
  muted: boolean;
}

/** Volume, mute, mode and reset (with confirmation). */
export function SettingsPanel({
  audio,
  onAudio,
  onReset,
  onClose,
  mode,
  onMode,
}: {
  audio: AudioSettings;
  onAudio(a: AudioSettings): void;
  onReset(): void;
  onClose(): void;
  mode: 'career' | 'free' | 'studio';
  onMode(m: 'career' | 'free' | 'studio'): void;
}) {
  const [confirm, setConfirm] = useState(false);
  const slider = (key: 'master' | 'sfx' | 'music', label: string) => (
    <label className="slider">
      <span>
        {label} <b>{Math.round((audio[key] ?? 0.5) * 100)}%</b>
      </span>
      <input type="range" min={0} max={1} step={0.05} value={audio[key] ?? 0.5} onChange={(e) => onAudio({ ...audio, [key]: Number(e.target.value) })} data-testid={`vol-${key}`} />
    </label>
  );
  return (
    <div className="overlay" data-testid="settings">
      <div className="panel settings-panel">
        <div className="shop-head">
          <h2>Cài đặt</h2>
          <button className="secondary-btn" onClick={onClose} data-testid="close-settings">
            Đóng
          </button>
        </div>
        {slider('master', 'Âm lượng tổng')}
        {slider('sfx', 'Hiệu ứng')}
        {slider('music', 'Nhạc nền')}
        <label className="check">
          <input type="checkbox" checked={audio.muted} onChange={(e) => onAudio({ ...audio, muted: e.target.checked })} data-testid="mute" /> Tắt toàn bộ âm thanh
        </label>
        <div className="mode-row">
          <span>Chế độ chơi:</span>
          <button className={`chip ${mode === 'career' ? 'is-active' : ''}`} onClick={() => onMode('career')} data-testid="mode-career">
            Mở tiệm (nhiều ngày)
          </button>
          <button className={`chip ${mode === 'free' ? 'is-active' : ''}`} onClick={() => onMode('free')} data-testid="mode-free">
            Cắt tự do
          </button>
        </div>
        <div className="danger-zone">
          {!confirm ? (
            <button className="secondary-btn" onClick={() => setConfirm(true)} data-testid="reset">
              Xóa tiến trình, chơi lại từ ngày 1
            </button>
          ) : (
            <div className="confirm">
              <span>Chắc chắn? Toàn bộ tiền, đồ nghề và ngày sẽ mất.</span>
              <button className="primary-btn" onClick={onReset} data-testid="reset-confirm">
                Xóa thật
              </button>
              <button className="secondary-btn" onClick={() => setConfirm(false)}>
                Thôi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
