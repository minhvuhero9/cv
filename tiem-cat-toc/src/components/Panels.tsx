import { CUSTOMERS, CustomerDef } from '../game/customers';
import { EVENT_TITLES } from '../game/evaluate';
import { RoundState, CHAOS_TIER_LABEL, Tool, chaosTier, timeLeft } from '../game/session';

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

export function RequestCard({ s }: { s: RoundState }) {
  const c = s.customer;
  const tier = chaosTier(s.chaos);
  return (
    <div className="request-card" data-testid="request-card">
      <div className="request-who">
        <span className="request-name">{c.name}</span>
        <span className="request-title">{c.title}</span>
      </div>
      <p className="request-quote">
        “{c.request} <em>{c.catch}</em>”
      </p>
      <p className="request-hint">{c.hint}</p>
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

const TOOLS: { id: Tool; name: string; tip: string; key: string }[] = [
  { id: 'clipper', name: 'Tông đơ', tip: 'Rê qua tóc để cạo ngắn. Giữ yên = trọc!', key: '1' },
  { id: 'scissors', name: 'Kéo', tip: 'Kéo một đường để cắt đúng chỗ đó.', key: '2' },
  { id: 'dryer', name: 'Máy sấy', tip: 'Giữ để thổi: tóc bay, bung, keo thì dựng.', key: '3' },
];

function ToolIcon({ id }: { id: Tool }) {
  if (id === 'clipper')
    return (
      <svg viewBox="0 0 40 40" aria-hidden>
        <rect x={11} y={4} width={18} height={6} rx={1.5} fill="#d9dde2" stroke="#4a4f57" strokeWidth={1.5} />
        <rect x={12} y={10} width={16} height={27} rx={7} fill="#2f6fd6" stroke="#173c7a" strokeWidth={2} />
        <rect x={17.5} y={17} width={5} height={8} rx={2} fill="#c4d6f5" />
      </svg>
    );
  if (id === 'scissors')
    return (
      <svg viewBox="0 0 40 40" aria-hidden>
        <path d="M20,20 L8,3 L12,3Z M20,20 L32,3 L28,3Z" fill="#e8ecef" stroke="#59616b" strokeWidth={1.5} />
        <circle cx={12} cy={30} r={6} fill="none" stroke="#e23b3b" strokeWidth={3.5} />
        <circle cx={28} cy={30} r={6} fill="none" stroke="#e23b3b" strokeWidth={3.5} />
        <path d="M20,20 L14,26 M20,20 L26,26" stroke="#59616b" strokeWidth={2.5} />
      </svg>
    );
  return (
    <svg viewBox="0 0 40 40" aria-hidden>
      <rect x={2} y={10} width={8} height={10} rx={2} fill="#333" />
      <rect x={8} y={7} width={26} height={16} rx={8} fill="#ff6fa8" stroke="#a3305e" strokeWidth={2} />
      <rect x={22} y={20} width={8} height={17} rx={3} fill="#ff6fa8" stroke="#a3305e" strokeWidth={2} />
      <circle cx={21} cy={15} r={4} fill="#ffd1e4" />
    </svg>
  );
}

export function Toolbar({ s, onTool, onFinish }: { s: RoundState; onTool(t: Tool): void; onFinish(): void }) {
  const active = s.phase === 'cutting' && !s.walkout;
  const tip = TOOLS.find((t) => t.id === s.tool)!.tip;
  return (
    <nav className="toolbar" aria-label="Dụng cụ">
      <div className="tool-tip" data-testid="tool-tip">
        {tip}
      </div>
      <div className="tool-row">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${s.tool === t.id ? 'is-active' : ''}`}
            onClick={() => onTool(t.id)}
            disabled={!active}
            aria-pressed={s.tool === t.id}
            data-testid={`tool-${t.id}`}
            title={`${t.name} (phím ${t.key})`}
          >
            <ToolIcon id={t.id} />
            <span>{t.name}</span>
          </button>
        ))}
        <button className="finish-btn" onClick={onFinish} disabled={!active} data-testid="finish">
          <span className="finish-big">Xong!</span>
          <span className="finish-small">Soi gương</span>
        </button>
      </div>
    </nav>
  );
}

export function IntroCard({ s, onStart, onPick }: { s: RoundState; onStart(): void; onPick(c: CustomerDef): void }) {
  const c = s.customer;
  return (
    <div className="overlay intro" data-testid="intro">
      <div className="intro-card">
        <div className="intro-label">Khách mới vào tiệm</div>
        <h2>{c.name}</h2>
        <div className="intro-title">{c.title}</div>
        <p className="intro-trait">{c.trait}</p>
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
        <div className="queue">
          <span>Đổi khách:</span>
          {CUSTOMERS.map((o) => (
            <button key={o.id} className={`chip ${o.id === c.id ? 'is-active' : ''}`} onClick={() => onPick(o)} data-testid={`pick-${o.id}`}>
              {o.name}
            </button>
          ))}
        </div>
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
