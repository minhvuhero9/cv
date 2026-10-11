import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PHOTO_H, PHOTO_W, PhotoComposition, PhotoProps } from '../components/PhotoComposition';
import { canvasToBlob } from './card';

/** Photo mode → 1080×1350 PNG (same SVG as the preview). */
export async function renderPhotoPng(p: PhotoProps): Promise<Blob> {
  const svg = renderToStaticMarkup(
    createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${PHOTO_W} ${PHOTO_H}`, width: 1080, height: 1350 }, createElement(PhotoComposition, p)),
  );
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Không vẽ được ảnh'));
    i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
  c.getContext('2d')!.drawImage(img, 0, 0, 1080, 1350);
  return canvasToBlob(c);
}
