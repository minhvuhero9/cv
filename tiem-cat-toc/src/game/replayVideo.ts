import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Character } from '../components/Character';
import { measureHair } from './metrics';
import { REPLAY_FPS, replayShots, shotLook } from './replay';
import type { RoundState } from './session';

const W = 540;
const H = 720;
const FONT = '"Baloo 2", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

function frameSvg(s: RoundState, i: number, shots: ReturnType<typeof replayShots>): string {
  const f = shots[i];
  return renderToStaticMarkup(
    createElement(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', viewBox: '30 45 340 425', width: W, height: Math.round((W * 425) / 340) },
      createElement(Character, { look: shotLook(s, f), hair: f.hair, metrics: measureHair(f.hair), mood: f.mood, headOffset: f.off, idPrefix: `rp${i}` }),
    ),
  );
}

function load(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không vẽ được khung hình'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export function replayVideoSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function';
}

function pickMime(): string {
  for (const m of ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm', 'video/mp4']) if (MediaRecorder.isTypeSupported?.(m)) return m;
  return 'video/webm';
}

/** Draws the replay into a canvas and records it with MediaRecorder (real time, ~5 s). */
export async function renderReplayVideo(s: RoundState, onProgress?: (p: number) => void): Promise<{ blob: Blob; ext: string }> {
  const shots = replayShots(s);
  const imgs: HTMLImageElement[] = [];
  for (let i = 0; i < shots.length; i++) {
    imgs.push(await load(frameSvg(s, i, shots)));
    onProgress?.((i / shots.length) * 0.5);
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const draw = (i: number) => {
    const f = shots[i];
    ctx.fillStyle = '#cde6ee';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(imgs[i], 0, 40);
    ctx.fillStyle = '#d6332f';
    ctx.fillRect(0, 0, W, 54);
    ctx.fillStyle = '#ffd23f';
    ctx.font = `900 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('TIỆM CẮT TÓC BẤT ỔN', W / 2, 38);
    ctx.fillStyle = 'rgba(43,26,18,0.85)';
    ctx.fillRect(0, H - 70, W, 70);
    ctx.fillStyle = '#fff8e8';
    ctx.font = `800 24px ${FONT}`;
    const label = f.final && s.result ? s.result.style.name : `${s.customer.name} · ${Math.round(f.at * s.time)}s`;
    ctx.fillText(label.length > 38 ? `${label.slice(0, 36)}…` : label, W / 2, H - 28);
    // progress bar
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(0, H - 6, W * ((i + 1) / shots.length), 6);
  };
  draw(0);
  const mime = pickMime();
  const stream = canvas.captureStream(REPLAY_FPS);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r()));
  rec.start();
  // Pace frames against the clock (timers drift), so the clip lasts shots / fps seconds.
  const t0 = performance.now();
  for (let i = 0; i < shots.length; i++) {
    draw(i);
    onProgress?.(0.5 + (i / shots.length) * 0.5);
    const wait = t0 + ((i + 1) * 1000) / REPLAY_FPS - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  rec.stop();
  await done;
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.includes('mp4') ? 'mp4' : 'webm' };
}
