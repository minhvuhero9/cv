import type { RoundState } from '../game/session';

/**
 * Lồng tiếng: plays pre-generated Vietnamese voice files (see scripts/voice/) for the exact
 * line shown in the speech bubble. Never synthesises in the browser, never needs a network
 * service. If the manifest or a file is missing, the game simply stays silent for that line.
 */

export interface VoiceEntry {
  id: string;
  speaker: string;
  event: string;
  text: string;
  file: string;
  duration: number;
}

interface Manifest {
  engine: string;
  lines: VoiceEntry[];
}

interface Job {
  entry: VoiceEntry;
  priority: number;
  at: number;
}

/** Same clip is not repeated within this many ms. */
const REPEAT_COOLDOWN = 15000;
/** A queued line older than this is dropped (the moment has passed). */
const STALE_MS = 2500;

export const normalizeLine = (t: string) => t.replace(/\s+/g, ' ').trim();

class VoiceManager {
  private byText = new Map<string, VoiceEntry>();
  private byEvent = new Map<string, VoiceEntry[]>();
  private audio: HTMLAudioElement | null = null;
  private current: Job | null = null;
  private pending: Job | null = null;
  private lastPlayed = new Map<string, number>();
  private broken = new Set<string>();
  private lastBubble: unknown = null;
  private volume = 1;
  private muted = false;
  private unlocked = false;
  private base = '';
  /** Lines actually played (for tests and debugging). */
  played: string[] = [];
  loaded = false;
  engine = '';
  speaking = false;

  init(base: string = import.meta.env.BASE_URL ?? './') {
    if (this.loaded || typeof window === 'undefined') return;
    this.base = base.endsWith('/') ? base : `${base}/`;
    fetch(`${this.base}voice/manifest.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Manifest | null) => {
        if (!m || !Array.isArray(m.lines)) return;
        this.engine = m.engine;
        for (const e of m.lines) {
          this.byText.set(`${e.speaker}|${normalizeLine(e.text)}`, e);
          const k = `${e.speaker}|${e.event}`;
          this.byEvent.set(k, [...(this.byEvent.get(k) ?? []), e]);
        }
        this.loaded = true;
      })
      .catch(() => {
        /* no voice pack: silent game, nothing breaks */
      });
  }

  /** Browsers only allow audio after a user gesture: call from a click/tap handler. */
  unlock() {
    if (this.unlocked || typeof Audio === 'undefined') return;
    this.unlocked = true;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('error', () => {
      if (this.current) this.broken.add(this.current.entry.id);
      this.next();
    });
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.audio) this.audio.volume = this.volume;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.stop();
  }

  stop() {
    this.pending = null;
    this.current = null;
    this.speaking = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.removeAttribute('src');
    }
  }

  has(speaker: string, text: string) {
    return this.byText.has(`${speaker}|${normalizeLine(text)}`);
  }

  /** Narrator / system lines by event key (e.g. 'openDay'). */
  say(speaker: string, event: string, priority = 1) {
    const list = this.byEvent.get(`${speaker}|${event}`);
    if (!list?.length) return;
    this.enqueue(list[Math.floor(Math.random() * list.length)], priority);
  }

  /** Speak whatever the customer just said in the bubble, if we have that line recorded. */
  update(s: RoundState) {
    const b = s.bubble;
    if (b === this.lastBubble) return;
    this.lastBubble = b;
    if (!b) return;
    const entry = this.byText.get(`${s.customer.id}|${normalizeLine(b.text)}`);
    if (!entry) return;
    // Mirror verdicts matter most, then shouts, then chatter.
    const priority = s.phase === 'mirror' || s.phase === 'result' ? 3 : b.shout ? 2 : 1;
    this.enqueue(entry, priority);
  }

  private enqueue(entry: VoiceEntry, priority: number) {
    if (this.muted || !this.audio || this.broken.has(entry.id)) return;
    const now = performance.now();
    const last = this.lastPlayed.get(entry.id);
    if (last !== undefined && now - last < REPEAT_COOLDOWN) return;
    const job = { entry, priority, at: now };
    if (!this.current) return this.play(job);
    // Never overlap: a more important line interrupts, otherwise it waits (one slot only).
    if (priority > this.current.priority) return this.play(job);
    if (!this.pending || priority >= this.pending.priority) this.pending = job;
  }

  private play(job: Job) {
    if (!this.audio) return;
    this.current = job;
    this.speaking = true;
    this.lastPlayed.set(job.entry.id, performance.now());
    this.played.push(job.entry.id);
    this.audio.src = `${this.base}${job.entry.file}`;
    this.audio.volume = this.volume;
    this.audio.play().catch(() => {
      // Autoplay refused or file failed: skip silently.
      this.broken.add(job.entry.id);
      this.next();
    });
  }

  private next() {
    this.current = null;
    this.speaking = false;
    const p = this.pending;
    this.pending = null;
    if (p && performance.now() - p.at < STALE_MS) this.play(p);
  }
}

export const voice = new VoiceManager();
