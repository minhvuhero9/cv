import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx, setMuted, setToolLoop, unlockAudio, isMuted } from './audio/sfx';
import { IncidentLog, IntroCard, RequestCard, Toolbar, Clock } from './components/Panels';
import { ResultPanel } from './components/ResultPanel';
import { Stage } from './components/Stage';
import { CUSTOMERS, CustomerId } from './game/customers';
import {
  RoundState,
  Tool,
  beg,
  createRound,
  finish,
  pointerDown,
  pointerLeave,
  pointerMove,
  pointerUp,
  setTool,
  skipMirror,
  startCutting,
  tick,
} from './game/session';
import { loadProgress, recordRound, saveProgress } from './game/progress';
import { Progress, TOOLS, ToolId, unlockedTools } from './game/tools';

/** `?unlock=all` opens the whole Bộ Đồ Nghề without earning it (for trying things out). */
function unlockAllFromUrl(): boolean {
  return new URLSearchParams(location.search).get('unlock') === 'all';
}

function toolsFor(p: Progress): ToolId[] {
  return unlockedTools(p, unlockAllFromUrl());
}

function seedFromUrl(): number | undefined {
  const v = new URLSearchParams(location.search).get('seed');
  return v ? Number(v) || undefined : undefined;
}

declare global {
  interface Window {
    __tctbo?: { state: () => RoundState };
  }
}

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [newTools, setNewTools] = useState<ToolId[]>([]);
  const [roundRef] = useState<{ current: RoundState }>(() => ({
    current: createRound('tuan', seedFromUrl(), { unlocked: toolsFor(progressRef.current) }),
  }));
  const [, setFrame] = useState(0);
  const [now, setNow] = useState(0);
  const [muted, setMutedState] = useState(isMuted());
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 520px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 520px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const recorded = useRef<RoundState | null>(null);
  const s = roundRef.current;

  useEffect(() => {
    window.__tctbo = { state: () => roundRef.current };
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const st = roundRef.current;
      tick(st, (t - last) / 1000);
      last = t;
      if (st.sfx.length) {
        for (const fx of st.sfx) playSfx(fx);
        st.sfx.length = 0;
      }
      setToolLoop(st.phase === 'cutting' && st.pointer.down ? st.tool : null);
      setNow(t);
      setFrame((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Record the finished round once: collection, rounds played, events seen -> tool unlocks.
  useEffect(() => {
    if (s.result && recorded.current !== s) {
      recorded.current = s;
      const before = unlockedTools(progressRef.current);
      const next = recordRound(progressRef.current, s.result.style.id, Object.keys(s.events));
      saveProgress(next);
      progressRef.current = next;
      setProgress(next);
      setNewTools(unlockedTools(next).filter((t) => !before.includes(t)));
    }
  });

  const newRound = useCallback((id: CustomerId, start = false) => {
    setToolLoop(null);
    const r = createRound(id, seedFromUrl(), { unlocked: toolsFor(progressRef.current) });
    setNewTools([]);
    if (start) startCutting(r);
    roundRef.current = r;
    setFrame((f) => f + 1);
  }, []);

  const onTool = useCallback((t: Tool) => setTool(roundRef.current, t), []);
  const onFinish = useCallback(() => finish(roundRef.current, 'done'), []);
  const nextCustomer = () => {
    const i = CUSTOMERS.findIndex((c) => c.id === s.customer.id);
    newRound(CUSTOMERS[(i + 1) % CUSTOMERS.length].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = roundRef.current;
      if (st.phase !== 'cutting') return;
      const t = TOOLS.find((d) => d.hotkey === e.key);
      if (t) setTool(st, t.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const bubble = s.bubble;

  return (
    <div className={`app customer-${s.customer.id} phase-${s.phase}`}>
      <header className="sign">
        <div className="sign-board">
          <span className="sign-pole" aria-hidden />
          <h1>TIỆM CẮT TÓC BẤT ỔN</h1>
          <span className="sign-pole" aria-hidden />
        </div>
        <div className="sign-sub">Cắt tóc nam · Gội đầu · Ráy tai · Không bảo hành</div>
        <button
          className="mute-btn"
          onClick={() => {
            setMuted(!muted);
            setMutedState(!muted);
          }}
          aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </header>

      <main className="shop">
        <aside className="side side-left">
          <RequestCard s={s} />
          <IncidentLog s={s} />
        </aside>

        <section className="stage-box">
          <div className="mirror-frame">
            <Stage
              s={s}
              narrow={narrow}
              now={now}
              onDown={(p) => {
                unlockAudio();
                pointerDown(roundRef.current, p);
              }}
              onMove={(p) => pointerMove(roundRef.current, p)}
              onUp={() => pointerUp(roundRef.current)}
              onLeave={() => pointerLeave(roundRef.current)}
            />
          </div>
          {bubble && (
            <div className={`bubble ${bubble.shout ? 'is-shout' : ''}`} data-testid="bubble">
              {bubble.text}
            </div>
          )}
          <div className="toasts">
            {s.toasts.map((t) => (
              <div key={t.id} className="toast" data-testid="toast">
                <small>SỰ CỐ</small> {t.title}
              </div>
            ))}
          </div>
          {s.phase === 'cutting' && <Clock s={s} />}
          {s.walkout && (
            <div className="walkout" data-testid="walkout">
              <div>Khách đang cởi khăn choàng…</div>
              {s.walkout.canBeg ? (
                <button className="primary-btn" onClick={() => beg(roundRef.current)} data-testid="beg">
                  🙏 Năn nỉ ở lại
                </button>
              ) : (
                <div className="walkout-final">Lần này năn nỉ cũng không được nữa!</div>
              )}
            </div>
          )}
          {s.phase === 'mirror' && (
            <button className="mirror-label" onClick={() => skipMirror(roundRef.current)} data-testid="mirror">
              {s.endReason === 'walkout' ? 'Khách bỏ về…' : s.revealed ? 'Tấm Gương Phán Xét' : 'Khách nhìn vào gương…'}
              <small>chạm để xem kết quả</small>
            </button>
          )}
        </section>

        <aside className="side side-right" aria-hidden>
          <div className="price-board">
            <div className="price-title">BẢNG GIÁ</div>
            <div>Cắt tóc ........ 60k</div>
            <div>Gội đầu ....... 30k</div>
            <div>Ráy tai ........ 20k</div>
            <div className="price-strike">Cắt giống ảnh .. ??k</div>
            <div className="price-note">Cắt hỏng không hoàn tiền!!</div>
          </div>
          <div className="fan">
            <svg viewBox="0 0 100 120">
              <circle cx={50} cy={45} r={38} fill="none" stroke="#4a5568" strokeWidth={4} />
              <g className="fan-blades">
                <ellipse cx={50} cy={25} rx={10} ry={18} fill="#7fb3d5" />
                <ellipse cx={50} cy={65} rx={10} ry={18} fill="#7fb3d5" />
                <ellipse cx={30} cy={45} rx={18} ry={10} fill="#7fb3d5" />
                <ellipse cx={70} cy={45} rx={18} ry={10} fill="#7fb3d5" />
              </g>
              <circle cx={50} cy={45} r={7} fill="#2d3748" />
              <path d="M50,83 L50,108 M30,112 L70,112" stroke="#4a5568" strokeWidth={6} strokeLinecap="round" />
            </svg>
          </div>
        </aside>
      </main>

      <Toolbar s={s} onTool={onTool} onFinish={onFinish} />

      {s.phase === 'intro' && (
        <IntroCard
          s={s}
          onStart={() => {
            unlockAudio();
            startCutting(roundRef.current);
          }}
          onPick={(c) => newRound(c.id)}
        />
      )}
      {s.phase === 'result' && s.result && (
        <ResultPanel s={s} unlocked={progress.styles} newTools={newTools} onReplay={() => newRound(s.customer.id, true)} onNext={nextCustomer} />
      )}
    </div>
  );
}
