import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx, setMuted, setSfxVolume, setToolLoop, unlockAudio } from './audio/sfx';
import { voice } from './audio/voice';
import { AudioSettings, CareerHud, MorningPanel, SettingsPanel, ShopPanel, SummaryPanel } from './components/CareerPanels';
import { IncidentLog, IntroCard, RequestCard, Toolbar, Clock } from './components/Panels';
import { ResultPanel } from './components/ResultPanel';
import { Stage } from './components/Stage';
import {
  CareerState,
  Served,
  applyRound,
  buy,
  careerTools,
  endDay,
  loadCareer,
  newCareer,
  nextDay,
  repair,
  resetCareer,
  roundContext,
  saveCareer,
} from './game/career';
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

type Mode = 'career' | 'free';
type Overlay = 'shop' | 'settings' | null;

const params = new URLSearchParams(location.search);
/** `?unlock=all` opens the whole Bộ Đồ Nghề without earning it (for trying things out). */
const unlockAll = params.get('unlock') === 'all';
const seedParam = params.get('seed') ? Number(params.get('seed')) || undefined : undefined;

function initialMode(): Mode {
  const m = params.get('mode');
  if (m === 'free' || m === 'career') return m;
  try {
    const saved = localStorage.getItem('tctbo-mode');
    if (saved === 'free' || saved === 'career') return saved;
  } catch {
    /* ignore */
  }
  return 'career';
}

function loadAudio(): AudioSettings {
  try {
    const v = JSON.parse(localStorage.getItem('tctbo-audio') ?? 'null');
    if (v && typeof v.master === 'number') return v;
  } catch {
    /* ignore */
  }
  return { master: 1, voice: 1, sfx: 0.8, muted: false };
}

function freeTools(p: Progress): ToolId[] {
  return unlockedTools(p, unlockAll);
}

declare global {
  interface Window {
    __tctbo?: { state: () => RoundState; career: () => CareerState; voice: typeof voice };
  }
}

function careerRound(c: CareerState): RoundState {
  const q = c.today.queue[Math.min(c.today.index, c.today.queue.length - 1)];
  const unlocked = unlockAll ? [...new Set([...careerTools(c), ...unlockedTools({ rounds: 0, styles: [], events: [] }, true)])] : careerTools(c);
  return createRound(q?.customer ?? 'tuan', seedParam ?? (c.day * 1000 + c.today.index), { unlocked, ctx: roundContext(c) });
}

export default function App() {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [careerRef] = useState<{ current: CareerState }>(() => {
    const c = params.get('fresh') === '1' ? null : loadCareer();
    return { current: c ?? newCareer() };
  });
  const [newTools, setNewTools] = useState<ToolId[]>([]);
  const [served, setServed] = useState<Served | null>(null);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [audio, setAudio] = useState<AudioSettings>(loadAudio);
  const [roundRef] = useState<{ current: RoundState }>(() => ({
    current: mode === 'career' ? careerRound(careerRef.current) : createRound('tuan', seedParam, { unlocked: freeTools(progressRef.current), ctx: { stock: unlockAll ? { potion: 99, gel: 99 } : {} } }),
  }));
  const [, setFrame] = useState(0);
  const [now, setNow] = useState(0);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 520px)').matches);
  const recorded = useRef<RoundState | null>(null);
  const s = roundRef.current;
  const c = careerRef.current;
  const rerender = () => setFrame((f) => f + 1);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 520px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Audio settings apply to effects and voice, and persist.
  useEffect(() => {
    setSfxVolume(audio.master, audio.sfx);
    setMuted(audio.muted);
    voice.setVolume(audio.master * audio.voice);
    voice.setMuted(audio.muted);
    try {
      localStorage.setItem('tctbo-audio', JSON.stringify(audio));
    } catch {
      /* ignore */
    }
  }, [audio]);

  useEffect(() => {
    window.__tctbo = { state: () => roundRef.current, career: () => careerRef.current, voice };
    voice.init();
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
      voice.update(st);
      setToolLoop(st.phase === 'cutting' && st.pointer.down ? st.tool : null);
      setNow(t);
      setFrame((f) => (f + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // A round just ended: record it once (collection, unlocks; in career also money/rep/viral).
  useEffect(() => {
    if (!s.result || recorded.current === s) return;
    recorded.current = s;
    const before = unlockedTools(progressRef.current);
    const next = recordRound(progressRef.current, s.result.style.id, Object.keys(s.events));
    saveProgress(next);
    progressRef.current = next;
    setProgress(next);
    if (mode === 'career') {
      setServed(applyRound(c, s));
      setNewTools([]);
      saveCareer(c);
      playSfx('cash');
    } else {
      setNewTools(unlockedTools(next).filter((t) => !before.includes(t)));
    }
  });

  const replaceRound = useCallback((r: RoundState, start = false) => {
    setToolLoop(null);
    voice.stop();
    if (start) startCutting(r);
    roundRef.current = r;
    setServed(null);
    setNewTools([]);
    rerender();
  }, []);

  const newFreeRound = (id: CustomerId, start = false) =>
    replaceRound(createRound(id, seedParam, { unlocked: freeTools(progressRef.current), ctx: { stock: unlockAll ? { potion: 99, gel: 99 } : {} } }), start);

  const onTool = useCallback((t: Tool) => setTool(roundRef.current, t), []);
  const onFinish = useCallback(() => finish(roundRef.current, 'done'), []);

  const nextFree = () => {
    const list = CUSTOMERS.filter((x) => x.appear.weight > 0);
    const i = list.findIndex((x) => x.id === s.customer.id);
    newFreeRound(list[(i + 1) % list.length].id);
  };

  const nextCareer = () => {
    if (c.today.phase === 'closed') {
      endDay(c);
      saveCareer(c);
      voice.say('narrator', 'endDay');
    } else {
      replaceRound(careerRound(c));
    }
    rerender();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem('tctbo-mode', m);
    } catch {
      /* ignore */
    }
    setOverlay(null);
    if (m === 'career') replaceRound(careerRound(c));
    else newFreeRound('tuan');
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
  const career = mode === 'career';
  const showMorning = career && c.today.phase === 'morning' && !overlay;
  const showSummary = career && c.today.phase === 'closed' && c.lastSummary?.day === c.day && !overlay;
  const q = c.today.queue[c.today.index];
  const introNote = career && q ? `Khách ${c.today.index + 1}/${c.today.queue.length} · ${q.reason === 'walkin' ? 'Khách vãng lai' : q.note}` : undefined;

  return (
    <div className={`app customer-${s.customer.id} phase-${s.phase} mode-${mode}`}>
      <header className="sign">
        <div className="sign-board">
          <span className="sign-pole" aria-hidden />
          <h1>TIỆM CẮT TÓC BẤT ỔN</h1>
          <span className="sign-pole" aria-hidden />
        </div>
        {career ? (
          <CareerHud c={c} onSettings={() => setOverlay('settings')} onShop={() => setOverlay('shop')} />
        ) : (
          <div className="sign-sub">
            Chế độ cắt tự do ·{' '}
            <button className="link-btn light" onClick={() => switchMode('career')} data-testid="to-career">
              Mở tiệm thật
            </button>
          </div>
        )}
        <button
          className="mute-btn"
          onClick={() => (career ? setOverlay('settings') : setAudio({ ...audio, muted: !audio.muted }))}
          aria-label={audio.muted ? 'Bật âm thanh' : 'Âm thanh'}
          data-testid="mute-btn"
        >
          {audio.muted ? '🔇' : '🔊'}
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
                voice.unlock();
                pointerDown(roundRef.current, p);
              }}
              onMove={(p) => pointerMove(roundRef.current, p)}
              onUp={() => pointerUp(roundRef.current)}
              onLeave={() => pointerLeave(roundRef.current)}
            />
          </div>
          {bubble && (
            <div className={`bubble ${bubble.shout ? 'is-shout' : ''} ${voice.speaking ? 'is-speaking' : ''}`} data-testid="bubble">
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
          {s.customer.behaviors.includes('livestream') && s.phase === 'cutting' && (
            <div className="viewers" data-testid="viewers">
              🔴 LIVE · {Math.round(s.viewers).toLocaleString('vi-VN')} người xem
            </div>
          )}
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

      {s.phase === 'intro' && !showMorning && !showSummary && !overlay && (
        <IntroCard
          s={s}
          note={introNote}
          onStart={() => {
            unlockAudio();
            voice.unlock();
            startCutting(roundRef.current);
            if (career && c.today.phase === 'morning') c.today.phase = 'open';
          }}
          onPick={career ? undefined : (o) => newFreeRound(o.id)}
        />
      )}
      {s.phase === 'result' && s.result && !showSummary && !overlay && (
        <ResultPanel
          s={s}
          unlocked={career ? c.styles : progress.styles}
          newTools={newTools}
          onReplay={() => newFreeRound(s.customer.id, true)}
          onNext={career ? nextCareer : nextFree}
          career={career && served ? { served, nextLabel: c.today.phase === 'closed' ? 'Đóng cửa, tổng kết ngày →' : `Khách tiếp theo (${c.today.index + 1}/${c.today.queue.length}) →` } : null}
        />
      )}
      {showMorning && (
        <MorningPanel
          c={c}
          onOpen={() => {
            unlockAudio();
            voice.unlock();
            c.today.phase = 'open';
            saveCareer(c);
            replaceRound(careerRound(c));
            voice.say('narrator', 'openDay');
          }}
          onShop={() => setOverlay('shop')}
          onFree={() => switchMode('free')}
        />
      )}
      {showSummary && c.lastSummary && (
        <SummaryPanel
          c={c}
          sum={c.lastSummary}
          onShop={() => setOverlay('shop')}
          onNext={() => {
            nextDay(c);
            saveCareer(c);
            replaceRound(careerRound(c));
          }}
        />
      )}
      {overlay === 'shop' && (
        <ShopPanel
          c={c}
          onBuy={(id) => {
            const r = buy(c, id);
            if (r.ok) {
              saveCareer(c);
              playSfx('cash');
              // New tools are usable from the next customer on.
              if (s.phase === 'intro') replaceRound(careerRound(c));
              rerender();
              return 'Đã mua! Món mới dùng được từ khách tiếp theo.';
            }
            return r.reason;
          }}
          onRepair={() => {
            const r = repair(c);
            if (r.ok) {
              saveCareer(c);
              rerender();
              return 'Máy móc đã được bảo dưỡng.';
            }
            return r.reason;
          }}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay === 'settings' && (
        <SettingsPanel
          audio={audio}
          onAudio={setAudio}
          mode={mode}
          onMode={switchMode}
          onClose={() => setOverlay(null)}
          onReset={() => {
            resetCareer();
            careerRef.current = newCareer();
            saveCareer(careerRef.current);
            setOverlay(null);
            if (mode === 'career') replaceRound(careerRound(careerRef.current));
            rerender();
          }}
        />
      )}
    </div>
  );
}
