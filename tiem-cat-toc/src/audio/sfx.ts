import type { Sfx, Tool } from '../game/session';

/** Tiny WebAudio synth: no audio files needed. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let loop: { tool: Tool; stop: () => void } | null = null;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : level;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

let level = 0.5;

/** Effects volume = master × sfx (0..1 each). */
export function setSfxVolume(masterVol: number, sfxVol: number) {
  level = 0.5 * masterVol * sfxVol;
  if (master) master.gain.value = muted ? 0 : level;
}

export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : level;
  if (m) stopLoop();
}

export function isMuted() {
  return muted;
}

/** Must be called from a user gesture once, so mobile browsers allow audio. */
export function unlockAudio() {
  ac();
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.3, slideTo?: number, delay = 0) {
  const c = ac();
  if (!c || muted || !master) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, freq: number, vol = 0.3, q = 1) {
  const c = ac();
  if (!c || muted || !master) return;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(f).connect(g).connect(master);
  src.start();
}

let lastSnip = 0;
export function playSfx(s: Sfx) {
  if (muted) return;
  switch (s) {
    case 'snip': {
      const now = performance.now();
      if (now - lastSnip < 70) return;
      lastSnip = now;
      noise(0.05, 5200, 0.35, 3);
      tone(2400, 0.03, 'square', 0.05);
      break;
    }
    case 'bald':
      tone(880, 0.12, 'sine', 0.25);
      tone(1320, 0.3, 'sine', 0.2, undefined, 0.08);
      break;
    case 'boing':
      tone(180, 0.45, 'sine', 0.35, 520);
      break;
    case 'gasp':
      noise(0.25, 1800, 0.3, 0.8);
      break;
    case 'sneeze':
      noise(0.45, 900, 0.5, 0.6);
      tone(300, 0.3, 'sawtooth', 0.12, 120);
      break;
    case 'ding':
      tone(988, 0.15, 'triangle', 0.3);
      tone(1319, 0.4, 'triangle', 0.3, undefined, 0.12);
      break;
    case 'fail':
      [392, 370, 349, 262].forEach((f, i) => tone(f, i === 3 ? 0.7 : 0.22, 'sawtooth', 0.12, i === 3 ? 230 : undefined, i * 0.22));
      break;
    case 'warn':
      tone(660, 0.08, 'square', 0.12);
      tone(660, 0.08, 'square', 0.12, undefined, 0.14);
      break;
    case 'flash':
      noise(0.2, 6000, 0.25, 0.5);
      break;
    case 'pop':
      tone(500, 0.08, 'sine', 0.2, 1200);
      break;
    case 'zap':
      tone(1800, 0.18, 'square', 0.12, 220);
      tone(900, 0.12, 'sawtooth', 0.08, 2400, 0.03);
      break;
    case 'sparkle':
      [1568, 2093, 2637].forEach((f, i) => tone(f, 0.12, 'sine', 0.1, undefined, i * 0.05));
      break;
    case 'whoosh':
      noise(0.7, 600, 0.45, 0.4);
      break;
    case 'gulp':
      tone(400, 0.35, 'sine', 0.35, 60);
      noise(0.3, 300, 0.3, 0.7);
      break;
    case 'steam':
      noise(1.2, 3500, 0.15, 0.3);
      break;
    case 'deny':
      tone(160, 0.15, 'square', 0.12);
      break;
    case 'overheat':
      tone(700, 0.4, 'sawtooth', 0.12, 120);
      break;
    case 'ring':
      [0, 0.18, 0.5, 0.68].forEach((d) => tone(1320, 0.12, 'square', 0.08, undefined, d));
      break;
    case 'chop':
      noise(0.12, 1200, 0.5, 1.2);
      tone(220, 0.15, 'square', 0.15, 90);
      break;
    case 'bark':
      // Two short "gâu"s: a falling tone with a noisy attack.
      [0, 0.22].forEach((d) => {
        tone(520, 0.13, 'sawtooth', 0.22, 260, d);
        tone(780, 0.06, 'square', 0.08, 400, d);
      });
      noise(0.1, 900, 0.25, 1);
      break;
    case 'whimper':
      tone(1100, 0.35, 'sine', 0.08, 1500);
      break;
    case 'cash':
      tone(1568, 0.08, 'square', 0.12);
      tone(2093, 0.3, 'triangle', 0.18, undefined, 0.08);
      break;
    case 'combo':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.25, undefined, i * 0.09));
      break;
  }
}

/** Continuous sound while a power tool is running. */
export function setToolLoop(tool: Tool | null) {
  if (loop && loop.tool === tool) return;
  stopLoop();
  // Only motor tools hum: clipper, dryer and the space vacuum.
  if (!tool || !['clipper', 'dryer', 'vacuum'].includes(tool) || muted) return;
  const c = ac();
  if (!c || !master) return;
  const g = c.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(tool === 'clipper' ? 0.09 : tool === 'vacuum' ? 0.12 : 0.16, c.currentTime + 0.05);
  g.connect(master);
  const nodes: AudioScheduledSourceNode[] = [];
  if (tool === 'clipper') {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 118;
    const lfo = c.createOscillator();
    lfo.frequency.value = 50;
    const lg = c.createGain();
    lg.gain.value = 20;
    lfo.connect(lg).connect(o.frequency);
    o.connect(g);
    nodes.push(o, lfo);
  } else {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 1);
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = tool === 'vacuum' ? 500 : 1400;
    if (tool === 'vacuum') {
      // A rising whine: the longer you hold, the hungrier it sounds.
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(220, c.currentTime);
      o.frequency.linearRampToValueAtTime(880, c.currentTime + 2.2);
      const og = c.createGain();
      og.gain.value = 0.25;
      o.connect(og).connect(g);
      nodes.push(o);
    }
    src.connect(f).connect(g);
    nodes.push(src);
  }
  nodes.forEach((n) => n.start());
  loop = {
    tool,
    stop: () => {
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.06);
      nodes.forEach((n) => n.stop(t + 0.08));
    },
  };
}

function stopLoop() {
  loop?.stop();
  loop = null;
}
