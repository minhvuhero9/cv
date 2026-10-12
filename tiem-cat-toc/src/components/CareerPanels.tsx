import { DEFAULT_NAME } from '../game/shopStyle';
import { useState } from 'react';
import { ACHIEVEMENTS, CareerState, DaySummary, WeekReport, achievementStats, canBuy, repairCost, shopLevel, vnd } from '../game/career';
import { customerById } from '../game/customers';
import { CATEGORY_LABEL, MACHINES, SHOP, ShopCategory } from '../game/shop';
import { TOOLS } from '../game/tools';
import { ToolIcon } from './ToolIcons';
import type { Quest } from '../game/quests';
import { levelProgress, nextLevel } from '../game/level';

/** Cấp tiệm: where the shop is and what the next level brings. */
export function LevelCard({ c }: { c: CareerState }) {
  const cur = shopLevel(c);
  const nx = nextLevel(c.xp ?? 0);
  return (
    <div className="level-card" data-testid="level-card">
      <div className="level-head">
        <span className="level-num">{cur.level}</span>
        <div>
          <b>{cur.name}</b>
          <small>
            {nx ? `${c.xp ?? 0}/${nx.xp} kinh nghiệm — lên “${nx.name}”` : 'Cấp cao nhất!'}
          </small>
        </div>
      </div>
      <div className="level-track">
        <span style={{ width: `${Math.round(levelProgress(c.xp ?? 0) * 100)}%` }} />
      </div>
      {nx && <div className="level-next">Cấp sau mở: {nx.unlocks.join(' · ')}</div>}
    </div>
  );
}

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
      <span className="chip-stat level" title={`Cấp tiệm ${shopLevel(c).level}: ${shopLevel(c).name}`} data-testid="hud-level" data-value={shopLevel(c).level}>
        🏠 <b>Cấp {shopLevel(c).level}</b>
        <span className="level-bar">
          <span style={{ width: `${Math.round(levelProgress(c.xp ?? 0) * 100)}%` }} />
        </span>
      </span>
      <span className="chip-stat" data-testid="hud-day">
        Ngày <b>{c.day}</b>
        {c.today.weather === 'rain' ? ' 🌧️' : c.today.weather === 'heat' ? ' 🔥' : ''}
        {c.today.events.some((e) => e.id === 'festival') ? ' 🏮' : ''}
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

const REASON_LABEL = { walkin: 'Khách vãng lai', return: 'Quay lại đòi sửa', loyal: 'Khách quen', copycat: 'Fan kiểu tóc viral', vip: 'Khách VIP', boss: 'Khách trùm cuối tuần', design: 'Khách đặt theo cuốn mẫu', freestyle: 'Khách tùy thợ', story: 'Khách có câu chuyện', contest: 'Cuộc thi tóc của phường' } as const;

/** Morning: what happens today (with causes) and who is coming. */
export function MorningPanel({ c, onOpen, onShop, onFree, onLook, onBook, onAchievements, onPromo }: { c: CareerState; onOpen(): void; onShop(): void; onFree(): void; onLook?(): void; onBook?(): void; onAchievements?(): void; onPromo?(): void }) {
  return (
    <div className="overlay" data-testid="morning">
      <div className="panel">
        <div className="intro-label">Sáng sớm</div>
        <h2>Ngày {c.day} — {c.look?.name && c.look.name !== DEFAULT_NAME ? c.look.name : 'Tiệm Cắt Tóc Bất Ổn'} mở cửa</h2>
        {c.day === 1 && (
          <p className="panel-note">
            Mỗi ngày có vài khách. Cắt khéo thì được tiền và <b>Uy tín</b>; cắt thảm họa có khi lại được <b>Viral</b>. Cuối ngày trả tiền thuê, tiền điện. Dành tiền mua đồ ở <b>Cửa hàng</b>.
          </p>
        )}
        {TIPS[c.day] && (
          <div className="tips-box" data-testid="day-tips">
            <div className="intro-label">💡 Mẹo hôm nay</div>
            <ul>
              {TIPS[c.day].map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
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
        <LevelCard c={c} />
        {(c.today.quests?.length ?? 0) > 0 && (
          <div className="quest-box">
            <div className="intro-label">Nhiệm vụ hôm nay</div>
            <QuestList quests={c.today.quests!} />
          </div>
        )}
        {!c.owned.includes('brush') && !c.owned.includes('stencil') ? (
          <p className="panel-note" data-testid="catalog-tip">
            💡 Chưa có khách đặt theo <b>cuốn mẫu</b>. Mua <b>Cọ Nhuộm</b> (từ cấp 2) hoặc <b>Khuôn Cạo Hình</b> (từ cấp 3) ở Cửa hàng: từ hôm sau khách sẽ cầm cuốn mẫu đến đặt kiểu.
          </p>
        ) : (
          <p className="panel-note" data-testid="catalog-tip">
            💡 Cắt xong một kiểu ưng ý, ở màn kết quả bấm “📷 Chụp ảnh &amp; lưu mẫu”: các ngày chẵn sẽ có khách chọn mẫu <b>của bạn</b>.
          </p>
        )}
        {onPromo && (
          <div className="promo-box">
            {c.today.promo ? (
              <span data-testid="promo-on">📣 Đang khuyến mãi hôm nay: giảm 20%, thêm khách ghé.</span>
            ) : (
              <button className="secondary-btn" onClick={onPromo} data-testid="promo">
                📣 Chạy khuyến mãi hôm nay (giảm 20% giá, +2 khách)
              </button>
            )}
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
          {onLook && (
            <button className="secondary-btn" onClick={onLook} data-testid="morning-look">
              🎨 Trang trí tiệm
            </button>
          )}
          {onBook && (
            <button className="secondary-btn" onClick={onBook} data-testid="morning-book">
              📒 Cuốn mẫu
            </button>
          )}
          {onAchievements && (
            <button className="secondary-btn" onClick={onAchievements} data-testid="morning-achievements">
              🏅 Thành tựu ({c.achievements?.length ?? 0}/{ACHIEVEMENTS.length})
            </button>
          )}
        </div>
        <button className="link-btn" onClick={onFree} data-testid="to-free">
          Chơi chế độ cắt tự do (không tính tiền)
        </button>
      </div>
    </div>
  );
}

/** Thành tựu & danh hiệu: progress on every goal; pick the title shown under the sign. */
export function AchievementsPanel({ c, onTitle, onClose }: { c: CareerState; onTitle(id: string | null): void; onClose(): void }) {
  const st = achievementStats(c);
  const have = c.achievements ?? [];
  return (
    <div className="overlay" data-testid="achievements-panel">
      <div className="panel">
        <div className="shop-head">
          <h2>🏅 Thành tựu &amp; danh hiệu</h2>
          <button className="secondary-btn" onClick={onClose} data-testid="achievements-close">
            Đóng
          </button>
        </div>
        <p className="panel-note">Mỗi thành tựu cho +10 kinh nghiệm và một danh hiệu. Chọn danh hiệu để treo dưới biển hiệu tiệm.</p>
        <ul className="ach-list">
          {ACHIEVEMENTS.map((a) => {
            const done = have.includes(a.id);
            const [n, of] = a.progress(st);
            return (
              <li key={a.id} className={done ? 'is-done' : ''} data-testid={`ach-${a.id}`} data-done={done}>
                <span className="ach-mark">{done ? '🏅' : '○'}</span>
                <span className="ach-body">
                  <b>{a.name}</b>
                  <small>
                    {a.goal} · {done ? `Danh hiệu “${a.title}”` : `${n.toLocaleString('vi-VN')}/${of.toLocaleString('vi-VN')}`}
                  </small>
                </span>
                {done && (
                  <button className={`chip ${c.title === a.id ? 'is-active' : ''}`} onClick={() => onTitle(c.title === a.id ? null : a.id)} data-testid={`title-${a.id}`}>
                    {c.title === a.id ? 'Đang treo' : 'Treo'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Gentle help for the first days (days 1–3 are also easier in the chair). */
const TIPS: Record<number, string[]> = {
  1: [
    'Ngày đầu khách dễ tính hơn: kiên nhẫn lâu hơn, ít quay đầu, có thêm 15 giây.',
    'Bật “Đường viền xanh” và cắt theo nó; phiếu yêu cầu bên trái tích ✓ khi đúng.',
    'Kéo một đường qua tóc để cắt. Tông đơ đứng yên một chỗ là trọc!',
  ],
  2: [
    'Hôm nay khách vẫn dễ hơn một chút. Từ ngày 3 là thật sự rồi đấy.',
    'Khách “tùy thợ” không có mẫu: xem gu Thích/Ghét trên phiếu và tự sáng tạo. Hợp gu từ 75% là kiểu đó vào cuốn mẫu.',
  ],
  3: [
    'Khách có câu chuyện bắt đầu ghé: làm tốt chương này họ quay lại chương sau, cuối truyện có thưởng lớn.',
    'Ngày 4 có Cuộc thi tóc của phường. Bấm “🎨 Trang trí tiệm” để đặt tên và sơn tiệm theo ý bạn.',
  ],
};

function WeekBox({ w }: { w: WeekReport }) {
  return (
    <div className="week-box" data-testid="week-report">
      <div className="intro-label">📊 Báo cáo tuần (ngày {w.from}–{w.to})</div>
      <ul>
        <li>
          Phục vụ <b>{w.customers}</b> khách, hài lòng trung bình <b>{w.avgSat}%</b>, lãi cả tuần{' '}
          <b className={w.net >= 0 ? 'up' : 'down'}>
            {w.net >= 0 ? '+' : ''}
            {vnd(w.net)}
          </b>
        </li>
        {w.best && (
          <li>
            Khách ưng nhất: <b>{w.best.name}</b> với kiểu “{w.best.styleName}” ({w.best.sat}%)
          </li>
        )}
        {w.topStyle && (
          <li>
            Kiểu làm nhiều nhất: <b>“{w.topStyle.name}”</b> ({w.topStyle.count} lần)
          </li>
        )}
        {w.regulars.length > 0 && <li>Khách quen: {w.regulars.map((r) => `${r.name} (${r.visits} lần)`).join(', ')}</li>}
        <li>
          Đặt theo cuốn mẫu: {w.catalogOrders} · Khách tùy thợ: {w.freestyle}
        </li>
        {w.trophies.length > 0 && <li>Cúp: {w.trophies.join(', ')}</li>}
        {w.stories.length > 0 && <li>Câu chuyện trọn vẹn: {w.stories.join(', ')}</li>}
      </ul>
    </div>
  );
}

/** Evening: what came in, what went out, what tomorrow looks like. */
export function SummaryPanel({ c, sum, onShop, onNext, onBook }: { c: CareerState; sum: DaySummary; onShop(): void; onNext(): void; onBook?(): void }) {
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
        {sum.week && <WeekBox w={sum.week} />}
        {sum.rival && (
          <div className="quest-done rival-result" data-testid="rival-result">
            🏪 {sum.rival}
          </div>
        )}
        {sum.achievements?.map((a) => (
          <div key={a} className="quest-done achievement-done" data-testid="achievement-done">
            🏅 Thành tựu mới: <b>{a}</b>
          </div>
        ))}
        {sum.served.some((x) => x.story || x.contest) && (
          <ul className="story-log" data-testid="story-log">
            {sum.served.map((x, i) =>
              x.contest ? (
                <li key={`c${i}`}>🏆 Cuộc thi “{x.contest.theme}”: <b>{x.contest.label}</b>{x.contest.money > 0 ? ` (+${vnd(x.contest.money)})` : ''}</li>
              ) : x.story ? (
                <li key={`s${i}`} className={x.story.passed ? 'up' : 'down'}>📖 {x.story.title}: {x.story.text}</li>
              ) : null,
            )}
          </ul>
        )}
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
          {(sum.bonusMoney ?? 0) > 0 && (
            <div>
              <dt>Giải thưởng &amp; câu chuyện</dt>
              <dd className="up">+{vnd(sum.bonusMoney!)}</dd>
            </div>
          )}
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
          {onBook && (
            <button className="secondary-btn" onClick={onBook} data-testid="summary-book">
              📒 Cuốn mẫu
            </button>
          )}
          <button className="primary-btn" onClick={onNext} data-testid="next-day" autoFocus>
            Sang ngày {sum.day + 1} →
          </button>
        </div>
      </div>
    </div>
  );
}

const CATS: ShopCategory[] = ['tool', 'machine', 'chaos', 'upgrade', 'decor', 'special', 'room', 'staff'];

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
