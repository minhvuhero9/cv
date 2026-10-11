import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Character } from '../components/Character';
import type { RoundResult } from './evaluate';
import { measureHair } from './metrics';
import type { RoundState } from './session';

export const CARD_W = 1080;
export const CARD_H = 1350;
const FONT = '"Baloo 2", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

function characterSvg(s: RoundState, which: 'before' | 'after'): string {
  const hair = which === 'before' ? s.before : s.hair;
  const result = s.result!;
  // Render inside an <svg> root so React knows these are SVG elements.
  return renderToStaticMarkup(
    createElement(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', viewBox: '30 45 340 425', width: 640, height: 800 },
      createElement(Character, {
        look: which === 'before' ? s.baseCustomer.look : s.customer.look,
        hair,
        metrics: which === 'before' ? s.beforeMetrics : measureHair(hair),
        mood: which === 'before' ? 'neutral' : result.mood,
        idPrefix: `card-${which}`,
      }),
    ),
  );
}

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không vẽ được ảnh nhân vật'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the share card for a finished round. Every value comes from the round itself. */
export async function renderCard(s: RoundState): Promise<HTMLCanvasElement> {
  const r: RoundResult = s.result!;
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // Background: tiled barbershop wall.
  ctx.fillStyle = '#fff4dc';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = '#f6e3bb';
  for (let y = 0; y < CARD_H; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < CARD_W; x += 60) ctx.fillRect(x, y, 30, 30);

  // Sign.
  ctx.fillStyle = '#d6332f';
  ctx.fillRect(0, 0, CARD_W, 150);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(0, 150, CARD_W, 10);
  ctx.fillStyle = '#fff';
  ctx.font = `900 74px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TIỆM CẮT TÓC BẤT ỔN', CARD_W / 2, 80);

  const [before, after] = await Promise.all([loadSvg(characterSvg(s, 'before')), loadSvg(characterSvg(s, 'after'))]);

  // After (big) inside a mirror frame.
  const fx = 300;
  const fy = 200;
  const fw = 560;
  const fh = 650;
  ctx.fillStyle = '#b8862b';
  roundRect(ctx, fx - 22, fy - 22, fw + 44, fh + 44, 40);
  ctx.fill();
  ctx.fillStyle = '#dff1f5';
  roundRect(ctx, fx, fy, fw, fh, 26);
  ctx.fill();
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 26);
  ctx.clip();
  ctx.drawImage(after, fx + (fw - 520) / 2, fy + 10, 520, 650);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(fx + fw - 160, fy);
  ctx.lineTo(fx + fw - 90, fy);
  ctx.lineTo(fx + fw - 260, fy + fh);
  ctx.lineTo(fx + fw - 330, fy + fh);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#d6332f';
  roundRect(ctx, fx + fw / 2 - 70, fy + fh - 6, 140, 50, 14);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText('SAU', fx + fw / 2, fy + fh + 20);

  // Before (polaroid).
  ctx.save();
  ctx.translate(150, 420);
  ctx.rotate(-0.08);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 18;
  ctx.fillRect(-120, -150, 240, 310);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e8eef0';
  ctx.fillRect(-105, -135, 210, 240);
  ctx.drawImage(before, -96, -135, 192, 240);
  ctx.fillStyle = '#333';
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText('TRƯỚC', 0, 135);
  ctx.restore();

  // Chaos stamp.
  ctx.save();
  ctx.translate(165, 720);
  ctx.rotate(-0.12);
  ctx.strokeStyle = r.chaos >= 75 ? '#d6332f' : r.chaos >= 40 ? '#e08a00' : '#1f9d55';
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = 7;
  roundRect(ctx, -125, -62, 250, 124, 18);
  ctx.stroke();
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText('CHAOS', 0, -26);
  ctx.font = `900 58px ${FONT}`;
  ctx.fillText(`${r.chaos}/100`, 0, 24);
  ctx.restore();

  // Hairstyle name.
  let y = 930;
  ctx.fillStyle = '#7a5a3a';
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText('KIỂU TÓC:', CARD_W / 2, y);
  y += 62;
  ctx.fillStyle = '#2b1a12';
  let size = 72;
  ctx.font = `900 ${size}px ${FONT}`;
  while (ctx.measureText(r.style.name.toUpperCase()).width > CARD_W - 100 && size > 40) {
    size -= 4;
    ctx.font = `900 ${size}px ${FONT}`;
  }
  ctx.fillText(r.style.name.toUpperCase(), CARD_W / 2, y);

  // Customer quote.
  y += 70;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillStyle = '#d6332f';
  const quote = wrap(ctx, `${s.customer.name}: “${r.line}”`, CARD_W - 140);
  for (const l of quote.slice(0, 2)) {
    ctx.fillText(l, CARD_W / 2, y);
    y += 50;
  }

  // Original request + satisfaction.
  ctx.font = `600 30px ${FONT}`;
  ctx.fillStyle = '#5a4630';
  const req = wrap(ctx, `Yêu cầu: “${s.customer.request} ${s.customer.catch}” — Hài lòng ${r.sat}%`, CARD_W - 140);
  y += 6;
  for (const l of req.slice(0, 2)) {
    ctx.fillText(l, CARD_W / 2, y);
    y += 40;
  }

  // Footer CTA.
  ctx.fillStyle = '#2b1a12';
  ctx.fillRect(0, CARD_H - 110, CARD_W, 110);
  ctx.fillStyle = '#ffd23f';
  ctx.font = `800 42px ${FONT}`;
  ctx.fillText('Bạn có dám cắt đẹp hơn không?', CARD_W / 2, CARD_H - 55);
  return canvas;
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

