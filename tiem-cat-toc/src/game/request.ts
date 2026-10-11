import { clamp } from './geometry';
import type { Zone } from './hair';
import type { HairMetrics } from './metrics';
import { personaById } from './mirror';
import type { RoundState } from './session';
import { STYLE_RULES } from './evaluate';
import { carvingLabel, carvingsMatched, colorMatch } from './design';

/**
 * Phiếu yêu cầu: what this customer actually checks, as a short live checklist.
 * Shape targets become per-zone lines; customers who judge by other things
 * (drama, colours, speed, covering a bald spot) get their own lines.
 * `check` returns null when it cannot be known before the mirror.
 */
export interface ReqItem {
  id: string;
  label: string;
  check(m: HairMetrics, s: RoundState): boolean | null;
}

export interface RequestSheet {
  /** Target coverage per zone, drawn as the mini reference picture and the green outline. */
  target: Record<Zone, number> | null;
  items: ReqItem[];
}

const ZONE_NAME: Record<Zone, string> = { left: 'Bên trái', right: 'Bên phải', top: 'Phía trên', fringe: 'Mái' };
const TOL = 0.16;

export function lengthWord(v: number): string {
  if (v < 0.3) return 'thật ngắn';
  if (v < 0.55) return 'ngắn';
  if (v < 0.78) return 'tỉa vừa';
  if (v < 0.95) return 'tỉa nhẹ';
  return 'giữ nguyên';
}

function zoneItems(target: Record<Zone, number>): ReqItem[] {
  const items: ReqItem[] = [];
  if (Math.abs(target.left - target.right) < 0.01) {
    items.push({
      id: 'sides',
      label: `Hai bên: ${lengthWord(target.left)}`,
      check: (m) => Math.abs(m.zone.left - target.left) <= TOL && Math.abs(m.zone.right - target.right) <= TOL,
    });
  } else {
    for (const z of ['left', 'right'] as Zone[]) items.push({ id: z, label: `${ZONE_NAME[z]}: ${lengthWord(target[z])}`, check: (m) => Math.abs(m.zone[z] - target[z]) <= TOL });
  }
  for (const z of ['top', 'fringe'] as Zone[]) items.push({ id: z, label: `${ZONE_NAME[z]}: ${lengthWord(target[z])}`, check: (m) => Math.abs(m.zone[z] - target[z]) <= TOL });
  return items;
}

const noBald: ReqItem = { id: 'noBald', label: 'Không để lộ da đầu', check: (m) => m.baldFrac < 0.03 };
const noNewBald: ReqItem = { id: 'noNewBald', label: 'Không hói thêm', check: (m, s) => m.baldFrac <= s.beforeMetrics.baldFrac + 0.005 };
const change = (m: HairMetrics, s: RoundState) => Math.abs(m.avg - s.beforeMetrics.avg) + m.tintedFrac + m.spikedFrac * 0.5;
const drama = (m: HairMetrics) =>
  clamp(m.spikedFrac * 1.7 + m.fluffAvg * 0.45 + Math.abs(m.leanAvg) * 0.8 + m.tintedFrac * 0.9 + m.longFrac * 0.6 + m.sculptedFrac * 1.2 + m.curlAvg * 0.4, 0, 1);

/** Extra lines for customers who are not judged by shape alone. */
const OWN: Record<string, ReqItem[]> = {
  khoa: [
    { id: 'drama', label: 'Thật kịch tính: dựng, phồng, nhuộm…', check: (m) => drama(m) >= 0.45 },
    { id: 'keep', label: 'Vẫn còn tóc (đừng cắt trụi)', check: (m) => m.avg >= 0.6 },
    noBald,
  ],
  na: [
    { id: 'colors', label: 'Nhiều màu (Súng Tóc 3000)', check: (m) => m.colorCount >= 2 || m.tintedFrac >= 0.3 },
    { id: 'volume', label: 'Phồng hoặc dựng cho lên hình', check: (m) => m.fluffAvg >= 0.3 || m.spikedFrac >= 0.25 || m.sculptedFrac >= 0.2 },
    noBald,
  ],
  shipper: [
    { id: 'fast', label: 'Xong trong 25 giây', check: (_m, s) => (s.phase === 'cutting' ? (s.time <= 25 ? null : false) : s.time <= 25) },
    { id: 'plain', label: 'Không nhuộm, không nối dài', check: (m) => m.tintedFrac < 0.05 && m.longFrac < 0.05 },
    noBald,
  ],
  phuc: [
    { id: 'cover', label: 'Che chỗ hói (sấy/chải lệch sang)', check: (m) => Math.abs(m.leanAvg) * 2.2 + m.fluffAvg * 0.4 >= 0.5 },
    noNewBald,
    { id: 'noDye', label: 'Không nhuộm màu', check: (m) => m.tintedFrac < 0.05 },
  ],
  teo: [
    { id: 'change', label: 'Khác hẳn để bố không nhận ra', check: (m, s) => change(m, s) >= 0.35 },
    { id: 'noBaldTeo', label: 'Tuyệt đối không trọc', check: (m) => m.baldFrac < 0.01 },
  ],
  cutu: [noNewBald],
  vang: [{ id: 'calm', label: 'Đừng để Cậu Vàng sợ quá', check: (_m, s) => s.nerves < 70 }],
};

/** Builds the sheet for the round as it is now (it changes after the Gương Thần). */
export function requestSheet(s: RoundState): RequestSheet {
  const c = s.customer;
  const persona = personaById(s.persona);
  if (persona) {
    const items = zoneItems(persona.target);
    const b = persona.wants.bonuses ?? {};
    if (b.spikedFrac) items.push({ id: 'p-spike', label: 'Giữ tóc dựng', check: (m) => m.spikedFrac >= 0.25 });
    if (b.curlAvg) items.push({ id: 'p-curl', label: 'Giữ độ xoăn', check: (m) => m.curlAvg >= 0.15 });
    items.push(noBald);
    if (s.wantPersona) items.unshift({ id: 'p-right', label: `Đúng phong cách: ${personaById(s.wantPersona)?.name}`, check: () => s.persona === s.wantPersona });
    return { target: persona.target, items };
  }
  if (s.wantPersona) {
    return {
      target: null,
      items: [{ id: 'mirror', label: `Soi Gương Thần: ${personaById(s.wantPersona)?.name}`, check: () => (s.persona ? s.persona === s.wantPersona : null) }],
    };
  }
  if (s.wantStyle) {
    const name = STYLE_RULES.find((r) => r.id === s.wantStyle)?.name ?? s.wantStyle;
    return { target: null, items: [{ id: 'copy', label: `Y hệt kiểu “${name}”`, check: (_m, st) => (st.result ? st.result.style.id === st.wantStyle : null) }] };
  }
  if (s.design) {
    const o = s.design;
    const items = zoneItems(o.target);
    if (o.tinted) items.push({ id: 'd-color', label: 'Màu giống mẫu', check: (_m, rs) => colorMatch(rs.hair, o.hair) >= 0.8 });
    (o.hair.carvings ?? []).forEach((cv, i) =>
      items.push({ id: `d-carve${i}`, label: `Cạo hình ${carvingLabel(cv.kind, cv.text)}`, check: (_m, rs) => carvingsMatched(rs.hair, o.hair).matched[i] }),
    );
    items.push(noBald);
    return { target: o.target, items };
  }
  if (c.stages?.length) {
    const st = c.stages;
    return {
      target: null,
      items: [
        ...st.map((x, i) => ({
          id: `stage${i}`,
          label: i <= s.stage ? `Bước ${i + 1}: ${x.label}` : `Bước ${i + 1}: ???`,
          check: (m: HairMetrics, rs: RoundState) => (i < rs.stage ? true : i === rs.stage ? x.check(m, rs) : null),
        })),
        noBald,
      ],
    };
  }
  const own = OWN[c.id];
  const target = c.target;
  const items = [...(target ? zoneItems(target) : []), ...(own ?? [noBald])];
  return { target, items };
}

export function checkSheet(sheet: RequestSheet, s: RoundState, m: HairMetrics = s.metrics) {
  return sheet.items.map((it) => ({ id: it.id, label: it.label, ok: it.check(m, s) }));
}
