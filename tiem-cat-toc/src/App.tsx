import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx, setMuted, setMusicState, setMusicVolume, setSfxVolume, setToolLoop, unlockAudio } from './audio/sfx';
import { AudioSettings, CareerHud, MorningPanel, SettingsPanel, ShopPanel, SummaryPanel } from './components/CareerPanels';
import { MirrorButton, MirrorPicker } from './components/MirrorPicker';
import { Coach } from './components/Coach';
import { AirCon, StageDecor, WallDecor } from './components/Decor';
import { AlbumPanel } from './components/AlbumPanel';
import { loadAlbum, recordAlbum, saveAlbum } from './game/album';
import { Creation, brush, carve, deleteFromBook, loadBook, openCreation, pushUndo, redo, resetHair, saveToBook, studioRound, undo } from './game/studio';
import { BookPanel, PhotoPanel, StudioPanel } from './components/StudioPanels';
import type { Vec } from './game/geometry';
import { DailyChallenge, dailyFor, dailyOptions, dailyScore, loadBoard, recordDaily, streak, todayKey } from './game/daily';
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
  transform,
  finish,
  pointerDown,
  pointerLeave,
  pointerMove,
  pointerUp,
  setTool,
  skipMirror,
  startCutting,
  tick,
  toLocal,
} from './game/session';
import { loadProgress, recordRound, saveProgress } from './game/progress';
import { Progress, TOOLS, ToolId, unlockedTools } from './game/tools';

type Mode = 'career' | 'free' | 'studio';
type Overlay = 'shop' | 'settings' | 'album' | 'photo' | 'book' | null;

const params = new URLSearchParams(location.search);
/** `?unlock=all` opens the whole Bộ Đồ Nghề without earning it (for trying things out). */
const unlockAll = params.get('unlock') === 'all';
const seedParam = params.get('seed') ? Number(params.get('seed')) || undefined : undefined;
/** `?daily=1` (today) or `?daily=YYYY-MM-DD` opens the daily challenge. */
const dailyParam = params.get('daily');
const dailyDate = () => (dailyParam && /^\d{4}-\d{2}-\d{2}$/.test(dailyParam) ? dailyParam : todayKey());

function initialMode(): Mode {
  const m = params.get('mode');
  if (m === 'free' || m === 'career' || m === 'studio') return m;
  try {
    const saved = localStorage.getItem('tctbo-mode');
    if (saved === 'free' || saved === 'career' || saved === 'studio') return saved;
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
  return { master: 1, sfx: 0.8, music: 0.5, muted: false };
}

function freeTools(p: Progress): ToolId[] {
  return unlockedTools(p, unlockAll);
}

declare global {
  interface Window {
    __tctbo?: { state: () => RoundState; career: () => CareerState };
  }
}

function careerRound(c: CareerState): RoundState {
  const q = c.today.queue[Math.min(c.today.index, c.today.queue.length - 1)];
  const unlocked = unlockAll ? [...new Set([...careerTools(c), ...unlockedTools({ rounds: 0, styles: [], events: [] }, true)])] : careerTools(c);
  return createRound(q?.customer ?? 'tuan', seedParam ?? (c.day * 1000 + c.today.index), { unlocked, mirror: unlockAll, ctx: roundContext(c) });
}

function dailyRound(d: DailyChallenge, p: Progress): RoundState {
  return createRound(d.customer, d.seed, dailyOptions(d, freeTools(p)));
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
  const [mirrorOpen, setMirrorOpen] = useState(false);
  const [newAlbum, setNewAlbum] = useState(false);
  const [daily, setDaily] = useState<DailyChallenge | null>(() => (dailyParam && initialMode() === 'free' ? dailyFor(dailyDate()) : null));
  const dailyRef = useRef(daily);
  dailyRef.current = daily;
  const [dailyResult, setDailyResult] = useState<{ score: number; rank: number | null; board: { score: number; sat: number; style: string }[]; streak: number } | null>(null);
  const [ghostOn, setGhostOn] = useState(() => {
    try {
      return localStorage.getItem('tctbo-ghost') !== '0';
    } catch {
      return true;
    }
  });
  const toggleGhost = () =>
    setGhostOn((g) => {
      try {
        localStorage.setItem('tctbo-ghost', g ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !g;
    });
  const [audio, setAudio] = useState<AudioSettings>(loadAudio);
  const [roundRef] = useState<{ current: RoundState }>(() => ({
    current:
      mode === 'career'
        ? careerRound(careerRef.current)
        : mode === 'studio'
          ? studioRound('tuan')
        : dailyParam
          ? dailyRound(dailyFor(dailyDate()), progressRef.current)
          : createRound('tuan', seedParam, { unlocked: freeTools(progressRef.current), mirror: true, ctx: { stock: unlockAll ? { potion: 99, gel: 99 } : {} } }),
  }));
  const [, setFrame] = useState(0);
  const [now, setNow] = useState(0);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 520px)').matches);
  const recorded = useRef<RoundState | null>(null);
  const s = roundRef.current;
  const c = careerRef.current;
  const rerender = () => setFrame((f) => f + 1);

  // Overlays sit below the sign so its buttons (settings, shop, sound) stay usable.
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--hdr', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 520px)');
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // Audio settings apply to the sound effects, and persist.
  useEffect(() => {
    setSfxVolume(audio.master, audio.sfx);
    setMusicVolume(audio.master, audio.music ?? 0.5);
    setMuted(audio.muted);
    try {
      localStorage.setItem('tctbo-audio', JSON.stringify(audio));
    } catch {
      /* ignore */
    }
  }, [audio]);

  useEffect(() => {
    window.__tctbo = { state: () => roundRef.current, career: () => careerRef.current };
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const st = roundRef.current;
      const dt = Math.min(0.1, (t - last) / 1000);
      // Slow motion for the disaster moment (presentation only: the simulation just gets a smaller dt).
      tick(st, st.time < st.slowUntil ? dt * 0.25 : dt);
      last = t;
      if (st.sfx.length) {
        for (const fx of st.sfx) playSfx(fx);
        st.sfx.length = 0;
      }
      setToolLoop(st.phase === 'cutting' && st.pointer.down ? st.tool : null);
      setMusicState(st.chaos, st.phase === 'cutting');
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
    const album = loadAlbum();
    if (recordAlbum(album, s)) setNewAlbum(true);
    saveAlbum(album);
    progressRef.current = next;
    setProgress(next);
    if (mode === 'career') {
      setServed(applyRound(c, s));
      setNewTools([]);
      saveCareer(c);
      playSfx('cash');
    } else {
      setNewTools(unlockedTools(next).filter((t) => !before.includes(t)));
      const d = dailyRef.current;
      if (d && s.customer.id === d.customer && s.seed === d.seed) {
        const board = loadBoard();
        const score = dailyScore(d, s);
        const rank = recordDaily(board, d.date, { score, sat: s.result.sat, style: s.result.style.name, at: Date.now() });
        setDailyResult({ score, rank, board: board.days[d.date] ?? [], streak: streak(board, d.date) });
      }
    }
  });

  const replaceRound = useCallback((r: RoundState, start = false) => {
    setToolLoop(null);
    setDailyResult(null);
    if (start) startCutting(r);
    roundRef.current = r;
    setMirrorOpen(false);
    setServed(null);
    setNewTools([]);
    rerender();
  }, []);

  const startDaily = (start = false) => {
    const d = dailyFor(dailyDate());
    setDaily(d);
    replaceRound(dailyRound(d, progressRef.current), start);
  };
  const newFreeRound = (id: CustomerId, start = false) => {
    setDaily(null);
    return replaceRound(createRound(id, seedParam, { unlocked: freeTools(progressRef.current), mirror: true, ctx: { stock: unlockAll ? { potion: 99, gel: 99 } : {} } }), start);
  };

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
    else if (m === 'studio') {
      setEditing(null);
      replaceRound(studioRound('tuan'));
    } else newFreeRound('tuan');
  };

  /* Xưởng Tạo Kiểu */
  const [editing, setEditing] = useState<Creation | null>(null);
  const studio = mode === 'studio' && !!s.studio;
  const studioDown = (p: Vec): boolean => {
    const st = roundRef.current;
    if (!st.studio || st.studio.mode === 'tool') return false;
    pushUndo(st);
    const local = toLocal(st, p);
    if (st.studio.mode === 'brush') {
      if (!brush(st, local)) st.studio.undo.pop();
      brushing.current = true;
      return true;
    }
    if (st.studio.mode === 'stencil') {
      if (carve(st, local)) playSfx('bald');
      else st.studio.undo.pop();
      rerender();
      return true;
    }
    return false;
  };
  const brushing = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = roundRef.current;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
      if (st.studio && (e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y' || e.key === 'Z')) {
        e.preventDefault();
        if (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) redo(st);
        else undo(st);
        return;
      }
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
      <header className="sign" ref={headerRef}>
        <div className="sign-board">
          <span className="sign-pole" aria-hidden />
          <h1>TIỆM CẮT TÓC BẤT ỔN</h1>
          <span className="sign-pole" aria-hidden />
        </div>
        {career ? (
          <CareerHud c={c} onSettings={() => setOverlay('settings')} onShop={() => setOverlay('shop')} />
        ) : mode === 'studio' ? (
          <div className="sign-sub">
            Xưởng Tạo Kiểu ·{' '}
            <button className="link-btn light" onClick={() => switchMode('free')} data-testid="studio-exit">
              Về cắt tự do
            </button>
          </div>
        ) : (
          <div className="sign-sub">
            Chế độ cắt tự do ·{' '}
            <button className="link-btn light" onClick={() => switchMode('studio')} data-testid="to-studio">
              🎨 Xưởng Tạo Kiểu
            </button>{' '}
            ·{' '}
            <button className="link-btn light" onClick={() => switchMode('career')} data-testid="to-career">
              Mở tiệm thật
            </button>
          </div>
        )}
        <button className={`album-btn ${newAlbum ? 'has-new' : ''}`} onClick={() => { setNewAlbum(false); setOverlay(overlay === 'album' ? null : 'album'); }} data-testid="open-album" aria-label="Album Gương Thần" title="Album Gương Thần">
          📖
        </button>
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
          {studio ? (
            <StudioPanel
              s={s}
              onModel={(id) => {
                setEditing(null);
                replaceRound(studioRound(id));
              }}
              onChange={rerender}
              onUndo={() => undo(roundRef.current)}
              onRedo={() => redo(roundRef.current)}
              onReset={() => resetHair(roundRef.current)}
              onPhoto={() => setOverlay('photo')}
              onBook={() => setOverlay('book')}
            />
          ) : (
            <>
              <RequestCard s={s} ghost={ghostOn} onGhost={toggleGhost} />
              <IncidentLog s={s} />
            </>
          )}
        </aside>

        <section className="stage-box">
          <div className="mirror-frame">
            {career && <StageDecor owned={c.owned} />}
            <Stage
              s={s}
              chair={career && c.owned.includes('chair') ? 'massage' : 'basic'}
              ghostOn={ghostOn}
              narrow={narrow}
              now={now}
              onDown={(p) => {
                unlockAudio();
                if (studioDown(p)) return;
                if (roundRef.current.studio) pushUndo(roundRef.current);
                pointerDown(roundRef.current, p);
              }}
              onMove={(p) => {
                const st = roundRef.current;
                if (st.studio && brushing.current) {
                  st.pointer.stage = p;
                  brush(st, toLocal(st, p));
                  return;
                }
                pointerMove(st, p);
              }}
              onUp={() => {
                brushing.current = false;
                pointerUp(roundRef.current);
              }}
              onLeave={() => {
                brushing.current = false;
                pointerLeave(roundRef.current);
              }}
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
          {s.phase === 'cutting' && !studio && <Clock s={s} />}
          {s.customer.behaviors.includes('livestream') && s.phase === 'cutting' && !studio && (
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
          {career && <WallDecor owned={c.owned} />}
          {career && c.owned.includes('aircon') ? (
            <AirCon />
          ) : (
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
          )}
        </aside>
      </main>

      <Toolbar s={s} onTool={onTool} onFinish={studio ? () => setOverlay('photo') : onFinish} finishLabel={studio ? ['Chụp!', 'Ảnh & lưu'] : undefined} extra={<MirrorButton s={s} open={mirrorOpen && s.phase === 'cutting'} onToggle={() => setMirrorOpen((o) => !o)} />} />
      {!overlay && !mirrorOpen && !studio && <Coach s={s} />}
      {overlay === 'photo' && studio && (
        <PhotoPanel
          s={s}
          editing={editing}
          onClose={() => setOverlay(null)}
          onSaved={(cr) => {
            const ok = saveToBook(cr);
            if (ok) setEditing(cr);
            return ok;
          }}
        />
      )}
      {overlay === 'book' && (
        <BookPanel
          book={loadBook()}
          onClose={() => setOverlay(null)}
          onOpen={(cr) => {
            if (mode !== 'studio') {
              setMode('studio');
              try {
                localStorage.setItem('tctbo-mode', 'studio');
              } catch {
                /* ignore */
              }
            }
            setEditing(cr);
            replaceRound(openCreation(cr));
            setOverlay(null);
          }}
          onDelete={(id) => {
            deleteFromBook(id);
            if (editing?.id === id) setEditing(null);
            rerender();
          }}
        />
      )}
      {mirrorOpen && s.phase === 'cutting' && !s.persona && (
        <MirrorPicker
          s={s}
          onClose={() => setMirrorOpen(false)}
          onPick={(id) => {
            transform(roundRef.current, id);
            setMirrorOpen(false);
          }}
        />
      )}

      {s.phase === 'intro' && !showMorning && !showSummary && !overlay && (
        <IntroCard
          s={s}
          note={introNote}
          onStart={() => {
            unlockAudio();
            startCutting(roundRef.current);
            if (career && c.today.phase === 'morning') c.today.phase = 'open';
          }}
          onPick={career ? undefined : (o) => newFreeRound(o.id)}
          daily={career ? undefined : daily}
          onDaily={career ? undefined : () => startDaily()}
          onStudio={career ? undefined : () => switchMode('studio')}
        />
      )}
      {s.phase === 'result' && s.result && !showSummary && !overlay && (
        <ResultPanel
          s={s}
          unlocked={career ? c.styles : progress.styles}
          newTools={newTools}
          onReplay={() => (daily ? startDaily(true) : newFreeRound(s.customer.id, true))}
          daily={daily && dailyResult ? { ...dailyResult, date: daily.date } : null}
          onNext={career ? nextCareer : nextFree}
          career={career && served ? { served, nextLabel: c.today.phase === 'closed' ? 'Đóng cửa, tổng kết ngày →' : `Khách tiếp theo (${c.today.index + 1}/${c.today.queue.length}) →` } : null}
        />
      )}
      {showMorning && (
        <MorningPanel
          c={c}
          onOpen={() => {
            unlockAudio();
            c.today.phase = 'open';
            saveCareer(c);
            replaceRound(careerRound(c));
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
      {overlay === 'album' && <AlbumPanel album={loadAlbum()} onClose={() => setOverlay(null)} />}
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
