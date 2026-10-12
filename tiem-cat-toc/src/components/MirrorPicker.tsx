import { PERSONAS, PersonaId, affinity, personaById } from '../game/mirror';
import { RoundState, canTransform } from '../game/session';

/** Carved wooden mirror frame in the red/gold/green of Vietnamese folk prints, lotus on top. */
export function MirrorFrame({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} aria-hidden>
      <path d="M50,4 C62,4 70,14 64,22 C76,18 84,28 76,36 L76,98 Q76,112 50,114 Q24,112 24,98 L24,36 C16,28 24,18 36,22 C30,14 38,4 50,4Z" fill="#b5462a" stroke="#5a1b0e" strokeWidth={3} />
      <path d="M50,8 C44,14 44,20 50,24 C56,20 56,14 50,8Z M50,24 C40,16 34,20 36,26 C42,26 46,26 50,24Z M50,24 C60,16 66,20 64,26 C58,26 54,26 50,24Z" fill="#ff8fb0" stroke="#5a1b0e" strokeWidth={1.5} />
      <ellipse cx={50} cy={68} rx={20} ry={36} fill="#f2c230" stroke="#5a1b0e" strokeWidth={2.5} />
      <ellipse cx={50} cy={68} rx={15} ry={30} fill="#bfe8f2" stroke="#2f6e5a" strokeWidth={2} />
      <path d="M41,52 q6,-8 12,-2 M44,62 l10,-10" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
      <g fill="#2f6e5a">
        <circle cx={30} cy={44} r={3} />
        <circle cx={70} cy={44} r={3} />
        <circle cx={30} cy={92} r={3} />
        <circle cx={70} cy={92} r={3} />
      </g>
      <path d="M38,114 L32,118 L68,118 L62,114" fill="#5a1b0e" />
    </svg>
  );
}

export function MirrorButton({ s, open, onToggle, onSpin }: { s: RoundState; open: boolean; onToggle(): void; onSpin?(): void }) {
  if (!s.mirrorReady) return null;
  const used = !!s.persona;
  const can = canTransform(s);
  // Ở tiệm: the mirror picks at random — one tap, no picker.
  const random = s.mirrorRandom && onSpin;
  const mood = s.personaMood === 'fan' ? ' 😍' : s.personaMood === 'hater' ? ' 😠' : '';
  return (
    <button
      className={`mirror-btn ${open ? 'is-open' : ''} ${used ? 'is-used' : ''}`}
      onClick={random ? onSpin : onToggle}
      disabled={!can && !open}
      data-testid="guong-than"
      data-spins={s.mirrorSpins}
      aria-label={used ? `Gương Thần: đã biến hình thành ${personaById(s.persona)?.name}` : random ? 'Gương Thần: soi ra phong cách ngẫu nhiên' : 'Gương Thần Biến Hình'}
      title={random ? `Gương Thần: soi ra phong cách ngẫu nhiên (còn ${s.mirrorSpins} lần)` : 'Gương Thần Biến Hình (1 lần mỗi khách)'}
    >
      <MirrorFrame size={30} />
      <span className="mirror-btn-text">
        {used ? `${personaById(s.persona)?.tag}${mood}` : random ? 'Soi ngẫu nhiên' : 'Gương Thần'}
        {random && s.mirrorSpins > 0 && used ? ` · còn ${s.mirrorSpins}` : ''}
      </span>
    </button>
  );
}

export function MirrorPicker({ s, onPick, onClose }: { s: RoundState; onPick(id: PersonaId): void; onClose(): void }) {
  const want = personaById(s.wantPersona);
  return (
    <div className="mirror-picker" role="dialog" aria-label="Gương Thần Biến Hình" data-testid="mirror-picker">
      <div className="mirror-picker-head">
        <MirrorFrame size={44} />
        <div>
          <b>Gương Thần Biến Hình</b>
          <small>{want ? `Khách xin: ${want.name}` : `Soi một lần, hóa thân cả buổi. Khách có thể mê… hoặc nổi điên.`}</small>
        </div>
        <button className="mirror-close" onClick={onClose} data-testid="mirror-close" aria-label="Đóng">
          ✕
        </button>
      </div>
      <div className="mirror-grid">
        {PERSONAS.map((p) => {
          const aff = affinity(p, s.baseCustomer.id);
          return (
            <button key={p.id} className="persona-card" style={{ borderColor: p.color }} onClick={() => onPick(p.id)} data-testid={`persona-${p.id}`}>
              <span className="persona-name" style={{ background: p.color }}>
                {p.name}
              </span>
              <span className="persona-blurb">{p.blurb}</span>
              {want?.id === p.id && <span className="persona-tag want">Khách xin cái này!</span>}
              {!want && aff === 'fan' && <span className="persona-tag fan">Hợp gu khách</span>}
              {!want && aff === 'hater' && <span className="persona-tag hater">Khách ghét</span>}
            </button>
          );
        })}
      </div>
      <p className="mirror-note">Nhân vật hư cấu. Sau khi biến hình, cắt theo đường viền xanh để hợp phong cách.</p>
    </div>
  );
}
