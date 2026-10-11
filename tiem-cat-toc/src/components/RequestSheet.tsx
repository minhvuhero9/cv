import { memo, useMemo } from 'react';
import type { HairState } from '../game/hair';
import type { CustomerLook } from '../game/look';
import { cloneHair } from '../game/hair';
import { measureHair } from '../game/metrics';
import { RequestSheet as Sheet, checkSheet } from '../game/request';
import type { RoundState } from '../game/session';
import { Character } from './Character';

/** Small "ảnh mẫu": the customer with their hair cut to the target, as a reference. */
export function RefPicture({ s, target, size = 96 }: { s: RoundState; target: NonNullable<Sheet['target']>; size?: number }) {
  if (s.design) return <DesignPicture hair={s.design.hair} look={s.customer.look} size={size} />;
  return <RefPictureInner before={s.before} look={s.customer.look} target={target} size={size} />;
}

/** Cuốn mẫu: the page of the catalog the customer points at (colours and patterns included). */
const DesignPicture = memo(function DesignPicture({ hair, look, size }: { hair: HairState; look: CustomerLook; size: number }) {
  const metrics = useMemo(() => measureHair(hair), [hair]);
  const hd = hair.head;
  const vb = `${hd.cx - hd.rx - 34} ${hd.cy - hd.ry - 56} ${(hd.rx + 34) * 2} ${(hd.rx + 34) * 2 * 1.08}`;
  return (
    <svg viewBox={vb} width={size} height={size * 1.08} className="ref-pic design-pic" data-testid="ref-pic" aria-label="Mẫu khách chọn trong cuốn mẫu">
      <Character look={look} hair={hair} metrics={metrics} mood="happy" idPrefix="design" />
    </svg>
  );
});

// Memoised on stable inputs: the reference picture only changes with the customer or the persona.
const RefPictureInner = memo(function RefPictureInner({ before, look, target, size }: { before: HairState; look: CustomerLook; target: NonNullable<Sheet['target']>; size: number }) {
  const { hair, metrics } = useMemo(() => {
    const h = cloneHair(before);
    for (const t of h.tufts) if (!t.bald) t.len = t.origLen * Math.min(1, target[t.zone]);
    return { hair: h, metrics: measureHair(h) };
  }, [before, target]);
  const hd = before.head;
  const vb = `${hd.cx - hd.rx - 34} ${hd.cy - hd.ry - 56} ${(hd.rx + 34) * 2} ${(hd.rx + 34) * 2 * 1.08}`;
  return (
    <svg viewBox={vb} width={size} height={size * 1.08} className="ref-pic" data-testid="ref-pic" aria-label="Ảnh mẫu kiểu tóc khách muốn">
      <Character look={look} hair={hair} metrics={metrics} mood="happy" idPrefix="ref" />
    </svg>
  );
});

export function SheetChecklist({ s, sheet, final = false }: { s: RoundState; sheet: Sheet; final?: boolean }) {
  const rows = checkSheet(sheet, s);
  return (
    <ul className={`req-list ${final ? 'is-final' : ''}`} data-testid={final ? 'req-final' : 'req-list'}>
      {rows.map((r) => (
        <li key={r.id} className={r.ok === true ? 'ok' : r.ok === false ? (final ? 'bad' : 'todo') : 'unknown'} data-ok={String(r.ok)}>
          <span className="req-mark">{r.ok === true ? '✓' : r.ok === false ? (final ? '✗' : '○') : '?'}</span>
          {r.label}
        </li>
      ))}
    </ul>
  );
}
