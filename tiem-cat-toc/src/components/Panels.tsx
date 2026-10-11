import { personaById } from '../game/mirror';
import { CUSTOMERS, CustomerDef } from '../game/customers';
import { EVENT_TITLES, STYLE_RULES } from '../game/evaluate';
import { useState } from 'react';
import { GearStatus, gearStatus } from '../game/gear';
import { RoundState, CHAOS_TIER_LABEL, Tool, chaosTier, timeLeft } from '../game/session';
import { RARITY_LABEL, Rarity, TOOLS, ToolDef, ToolId, toolDef, unlockText } from '../game/tools';
import { ToolIcon } from './ToolIcons';
import { requestSheet } from '../game/request';
import { DailyChallenge, RULE_TEXT } from '../game/daily';
import { RefPicture, SheetChecklist } from './RequestSheet';

export function Meter({ label, value, kind, testId, note }: { label: string; value: number; kind: 'patience' | 'chaos' | 'nerves'; testId: string; note?: string }) {
  return (
    <div className={`meter meter-${kind}`} data-testid={testId} data-value={Math.round(value)}>
      <div className="meter-head">
        <span>{label}</span>
        <b>{note ?? Math.round(value)}</b>
      </div>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function RequestCard({ s, ghost, onGhost }: { s: RoundState; ghost: boolean; onGhost(): void }) {
  const c = s.customer;
  const tier = chaosTier(s.chaos);
  const sheet = requestSheet(s);
  return (
    <div className="request-card" data-testid="request-card">
      <div className="request-who">
        <span className="request-name">{c.name}</span>
        <span className="request-title">{c.title}</span>
      </div>
      <p className="request-quote">
        “{s.requestText} <em>{c.catch}</em>”
      </p>
      <p className="request-hint">{c.hint}</p>
      <div className="req-sheet">
        {sheet.target && <RefPicture s={s} target={sheet.target} />}
        <div className="req-body">
          <div className="req-title">Phiếu yêu cầu</div>
          <SheetChecklist s={s} sheet={sheet} />
          {sheet.target && (
            <button className={`ghost-toggle ${ghost ? 'on' : ''}`} onClick={onGhost} data-testid="ghost-toggle" aria-pressed={ghost}>
              {ghost ? '◉' : '○'} Đường viền xanh
            </button>
          )}
        </div>
      </div>
      <div className="meters">
        <Meter label="Kiên nhẫn" value={s.patience} kind="patience" testId="patience" />
        <Meter label={`Chaos · ${CHAOS_TIER_LABEL[tier]}`} value={s.chaos} kind="chaos" testId="chaos" />
        {c.id === 'khoa' && <Meter label="Độ hoảng" value={s.nerves} kind="nerves" testId="nerves" />}
      </div>
    </div>
  );
}

export function Clock({ s }: { s: RoundState }) {
  const t = Math.ceil(timeLeft(s));
  return (
    <div className={`clock ${t <= 10 ? 'clock-low' : ''}`} data-testid="clock">
      <span className="clock-face">⏱</span>
      {t}s
    </div>
  );
}

const RARITY_CLASS: Record<Rarity, string> = { thuong: 'r-common', hiem: 'r-rare', sutthi: 'r-epic', huyenthoai: 'r-legend' };

function statusText(st: GearStatus): string {
  if (st.state === 'overheated') return `Hết phép — đang nạp ${Math.round(st.charge * 100)}%`;
  if (st.state === 'cooldown') return `Hồi chiêu ${st.wait.toFixed(1)}s`;
  return 'Sẵn sàng';
}

/** Toolbar: basic tools, then the Bộ Đồ Nghề Bất Ổn (scrolls sideways on phones). */
export function Toolbar({ s, onTool, onFinish, extra, finishLabel }: { s: RoundState; onTool(t: Tool): void; onFinish(): void; extra?: React.ReactNode; finishLabel?: [string, string] }) {
  const [inspect, setInspect] = useState<ToolId | null>(null);
  const active = s.phase === 'cutting' && !s.walkout;
  const shown = toolDef(inspect ?? s.tool);
  const locked = !s.unlocked.includes(shown.id);
  const st = gearStatus(s, shown.id);
  const denied = s.time - s.deniedAt < 0.45;
  const basic = TOOLS.filter((t) => t.group === 'basic');
  const magic = TOOLS.filter((t) => t.group === 'magic');

  const button = (t: ToolDef) => {
    const isLocked = !s.unlocked.includes(t.id);
    const soon = t.unlock.kind === 'soon';
    const g = gearStatus(s, t.id);
    const cls = [
      'tool-btn',
      s.tool === t.id && !inspect ? 'is-active' : '',
      inspect === t.id ? 'is-inspect' : '',
      isLocked ? 'is-locked' : '',
      t.energy && !isLocked && g.state !== 'ready' ? 'is-cooling' : '',
      denied && s.tool === t.id ? 'is-denied' : '',
    ].join(' ');
    return (
      <button
        key={t.id}
        className={cls}
        onClick={() => {
          if (isLocked) {
            setInspect(inspect === t.id ? null : t.id);
            return;
          }
          setInspect(null);
          onTool(t.id);
        }}
        disabled={!active}
        aria-pressed={s.tool === t.id}
        aria-label={isLocked ? `${t.name}: ${soon ? 'sắp ra mắt' : 'chưa mở khóa, bấm để xem điều kiện'}` : t.name}
        data-testid={`tool-${t.id}`}
        data-locked={isLocked ? 'true' : 'false'}
        data-state={isLocked ? 'locked' : g.state}
        title={isLocked ? `${t.name} — ${soon ? 'sắp ra mắt' : 'chưa mở khóa'}` : `${t.name}${t.hotkey ? ` (phím ${t.hotkey})` : ''}`}
      >
        <span className="tool-art">
          <ToolIcon id={t.id} />
          {isLocked && <span className="lock">{soon ? '…' : '🔒'}</span>}
        </span>
        <span className="tool-name">{isLocked && soon ? 'Sắp có' : t.name}</span>
        {t.energy && !isLocked && (
          <span className="energy">
            <span className={`energy-fill ${g.state}`} style={{ width: `${Math.round(g.charge * 100)}%` }} />
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="toolbar" aria-label="Dụng cụ">
      <div className={`tool-info ${locked ? 'is-locked' : ''}`} data-testid="tool-info">
        <div className="tool-info-head">
          <b data-testid="tool-info-name">{shown.name}</b>
          <span className={`rarity ${RARITY_CLASS[shown.rarity]}`}>{RARITY_LABEL[shown.rarity]}</span>
          {!locked && shown.energy && (
            <span className={`tool-status st-${st.state}`} data-testid="tool-status">
              {statusText(st)}
            </span>
          )}
          {locked && (
            <span className="tool-status st-locked" data-testid="tool-status">
              {shown.unlock.kind === 'soon' ? 'Sắp ra mắt' : `🔒 Mở khóa: ${unlockText(shown)}`}
            </span>
          )}
        </div>
        <div className="tool-info-body" data-testid="tool-tip">
          <span className="tool-blurb">{shown.blurb}</span> <span className="tool-howto">{locked ? '' : shown.howTo}</span>
        </div>
      </div>
      <div className="tool-bar-row">
        <div className="tool-scroll">
          <div className="tool-group">{basic.map(button)}</div>
          <div className="tool-group tool-group-magic">
            <span className="group-label">Đồ nghề bất ổn</span>
            {magic.map(button)}
          </div>
        </div>
        {extra}
        <button className="finish-btn" onClick={onFinish} disabled={!active} data-testid="finish">
          <span className="finish-big">{finishLabel?.[0] ?? 'Xong!'}</span>
          <span className="finish-small">{finishLabel?.[1] ?? 'Soi gương'}</span>
        </button>
      </div>
    </nav>
  );
}

export function IntroCard({
  s,
  onStart,
  onPick,
  note,
  daily,
  onDaily,
  onStudio,
}: {
  s: RoundState;
  onStart(): void;
  onPick?(c: CustomerDef): void;
  note?: string;
  daily?: DailyChallenge | null;
  onDaily?(): void;
  onStudio?(): void;
}) {
  const c = s.customer;
  return (
    <div className="overlay intro" data-testid="intro">
      <div className="intro-card">
        {daily && (
          <div className="daily-banner" data-testid="daily-banner">
            🗓 <b>Thử thách ngày {daily.date.split('-').reverse().join('/')}</b> · {RULE_TEXT[daily.rule]}
          </div>
        )}
        <div className="intro-label">{note ?? 'Khách mới vào tiệm'}</div>
        <h2>{c.name}</h2>
        <div className="intro-title">{c.title}</div>
        <p className="intro-trait">{c.trait}</p>
        {c.likes.length > 0 && (
          <p className="intro-likes">
            <span className="up">Thích: {c.likes.join(', ')}</span> · <span className="down">Ghét: {c.dislikes.join(', ')}</span>
          </p>
        )}
        {s.wantPersona && <p className="intro-want">Muốn biến hình thành: <b>{personaById(s.wantPersona)?.name}</b> — dùng Gương Thần!</p>}
        {s.wantStyle && <p className="intro-want">Muốn kiểu: <b>{STYLE_RULES.find((r) => r.id === s.wantStyle)?.name ?? s.wantStyle}</b></p>}
        <ul className="howto">
          <li>
            <b>Kéo trên tóc</b> để cắt bằng dụng cụ đang cầm.
          </li>
          <li>
            Tông đơ <b>đứng yên một chỗ</b> = trọc. Khách có <b>dấu chấm than</b> = sắp quay đầu, nhấc tay lên!
          </li>
          <li>
            Bấm <b>Xong!</b> khi bạn nghĩ đã ổn (hoặc khi đã quá muộn).
          </li>
        </ul>
        <button className="primary-btn" onClick={onStart} data-testid="start" autoFocus>
          Mời ngồi — Bắt đầu cắt ✂
        </button>
        {onStudio && (
          <button className="daily-btn studio-btn" onClick={onStudio} data-testid="open-studio">
            🎨 Xưởng Tạo Kiểu — tự do sáng tạo, không chấm điểm
          </button>
        )}
        {onDaily && !daily && (
          <button className="daily-btn" onClick={onDaily} data-testid="daily">
            🗓 Thử thách hôm nay — cùng khách, cùng luật với mọi người
          </button>
        )}
        {onPick && (
          <div className="queue">
            <span>Đổi khách:</span>
            {CUSTOMERS.filter((o) => o.appear.weight > 0 || o.boss).map((o) => (
              <button key={o.id} className={`chip ${o.id === c.id ? 'is-active' : ''}`} onClick={() => onPick(o)} data-testid={`pick-${o.id}`}>
                {o.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function IncidentLog({ s }: { s: RoundState }) {
  const items = s.log.filter((l) => l.id !== 'walkoutThreat').slice(-4).reverse();
  if (!items.length) return null;
  return (
    <ul className="incident-log" data-testid="incident-log">
      {items.map((l, i) => (
        <li key={`${l.id}-${l.t}-${i}`}>
          <span>{Math.floor(l.t)}s</span> {EVENT_TITLES[l.id]}
        </li>
      ))}
    </ul>
  );
}
