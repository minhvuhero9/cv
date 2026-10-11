import { STENCIL_NAME, colorDistance } from './art';
import { Creation, creationHairOn } from './creation';
import { Template, templateHair } from './templates';
import type { CustomerDef } from './customers';
import { clamp, dist } from './geometry';
import type { HairState, Zone } from './hair';
import { measureHair } from './metrics';

/**
 * Cuốn mẫu của tiệm: a customer picks one of the player's saved creations and wants it
 * exactly — lengths per zone, colours and shaved-in patterns are all compared.
 */
export interface DesignOrder {
  /** Creation id, or `tpl:<id>` for a built-in template. */
  id: string;
  name: string;
  source: 'creation' | 'template';
  template: Template | null;
  hair: HairState;
  target: Record<Zone, number>;
  tinted: boolean;
}

function fromHair(id: string, name: string, source: DesignOrder['source'], hair: HairState, template: Template | null = null): DesignOrder {
  const m = measureHair(hair);
  return { id, name, source, template, hair, target: m.zone, tinted: m.tintedFrac > 0.05 };
}

/** A player's creation as it would look on this customer's head. */
export function designOrder(c: Creation, customerId = c.customer): DesignOrder {
  return fromHair(c.id, c.name, 'creation', creationHairOn(c, customerId));
}

/** A built-in template (mẫu có sẵn) on this customer's head. */
export function templateOrder(t: Template, customerId: string): DesignOrder {
  return fromHair(`tpl:${t.id}`, t.name, 'template', templateHair(t, customerId), t);
}

/** Share of tufts whose colour matches the design (undyed = undyed, dyed ≈ same colour). */
export function colorMatch(h: HairState, d: HairState): number {
  let ok = 0;
  let n = 0;
  h.tufts.forEach((t, i) => {
    const o = d.tufts[i];
    if (!o || t.bald || o.bald) return;
    n++;
    if (!t.tint && !o.tint) ok++;
    else if (t.tint && o.tint && colorDistance(t.tint, o.tint) < 110) ok++;
  });
  return n ? ok / n : 1;
}

/** Which of the design's shaved patterns are on the head (same shape, roughly the same place). */
export function carvingsMatched(h: HairState, d: HairState): { matched: boolean[]; extra: number } {
  const have = [...(h.carvings ?? [])];
  const matched = (d.carvings ?? []).map((c) => {
    const i = have.findIndex((x) => x.kind === c.kind && (c.kind !== 'text' || x.text === c.text) && dist(x, c) < 40);
    if (i < 0) return false;
    have.splice(i, 1);
    return true;
  });
  return { matched, extra: have.length };
}

/** 0..100: how close the head is to the design. */
export function designScore(o: DesignOrder, h: HairState): number {
  const m = measureHair(h);
  const zones = Object.keys(o.target) as Zone[];
  const zoneErr = zones.reduce((a, z) => a + Math.abs(m.zone[z] - o.target[z]), 0) / zones.length;
  const col = o.tinted || m.tintedFrac > 0.05 ? colorMatch(h, o.hair) : 1;
  const cv = carvingsMatched(h, o.hair);
  const missing = cv.matched.filter((x) => !x).length;
  const designBald = measureHair(o.hair).baldFrac;
  return clamp(100 - zoneErr * 170 - (1 - col) * 50 - missing * 20 - cv.extra * 8 - Math.max(0, m.baldFrac - designBald) * 220, 0, 100);
}

/** The customer, as they sit holding the catalog open at your design. */
export function designCustomer(base: CustomerDef, o: DesignOrder): CustomerDef {
  return {
    ...base,
    request: `Cắt cho em y như mẫu “${o.name}” trong cuốn mẫu của tiệm!`,
    catch: 'Màu, hình cạo, độ dài… giống hệt nhé.',
    hint: 'Khách đặt kiểu từ cuốn mẫu bạn tạo ở Xưởng: cắt theo đường viền, nhuộm đúng màu, cạo đúng hình.',
    target: o.target,
    // They picked the art themselves: no penalty for it.
    artTaste: 0,
    satisfaction: (_m, ctx) => (ctx?.hair ? designScore(o, ctx.hair) : 0),
    special: (_m, sat) => sat >= 92,
    specialLine: { line: 'Y chang trong cuốn mẫu! Tiệm này đỉnh thật!', mood: 'ecstatic' },
    pay: { base: Math.round(base.pay.base * 1.3), tip: Math.round(base.pay.tip * 1.5) },
  };
}

export function carvingLabel(kind: keyof typeof STENCIL_NAME, text?: string) {
  return kind === 'text' ? `chữ “${text}”` : STENCIL_NAME[kind].toLowerCase();
}
