/**
 * Mã lưu tiệm: everything the game keeps in this browser (career, catalog, collection,
 * album, daily scores), packed into one text code — to back it up or move to another device.
 */
export const SAVE_KEYS = ['tctbo-career-v1', 'tctbo-studio-book', 'tctbo-progress-v1', 'tctbo-album', 'tctbo-daily', 'tctbo-challenges'] as const;
const PREFIX = 'TCTBO1:';

function toB64(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function fromB64(s: string) {
  const bin = atob(s);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function exportSave(store: Storage = localStorage): string {
  const data: Record<string, string> = {};
  for (const k of SAVE_KEYS) {
    const v = store.getItem(k);
    if (v) data[k] = v;
  }
  return PREFIX + toB64(JSON.stringify({ v: 1, at: Date.now(), data }));
}

export type ImportResult = { ok: true; day: number | null } | { ok: false; reason: string };

/** Checks the code and, if it holds a valid shop, writes it into this browser. */
export function importSave(code: string, store: Storage = localStorage): ImportResult {
  const raw = code.trim().replace(/\s+/g, '');
  if (!raw.startsWith(PREFIX)) return { ok: false, reason: 'Mã không đúng định dạng (phải bắt đầu bằng TCTBO1:).' };
  let parsed: { v: number; data: Record<string, string> };
  try {
    parsed = JSON.parse(fromB64(raw.slice(PREFIX.length)));
  } catch {
    return { ok: false, reason: 'Mã bị hỏng hoặc chép thiếu.' };
  }
  if (parsed?.v !== 1 || typeof parsed.data !== 'object') return { ok: false, reason: 'Mã từ phiên bản khác, không đọc được.' };
  let day: number | null = null;
  const career = parsed.data['tctbo-career-v1'];
  if (career) {
    try {
      const c = JSON.parse(career);
      if (!Number.isFinite(c?.day) || !Array.isArray(c?.owned)) return { ok: false, reason: 'Tiệm trong mã không hợp lệ.' };
      day = c.day;
    } catch {
      return { ok: false, reason: 'Tiệm trong mã không hợp lệ.' };
    }
  }
  // Every value must be JSON before anything is written (all or nothing).
  const keep = SAVE_KEYS.filter((k) => typeof parsed.data[k] === 'string');
  try {
    for (const k of keep) JSON.parse(parsed.data[k]);
  } catch {
    return { ok: false, reason: 'Mã bị sửa hoặc hỏng một phần.' };
  }
  for (const k of keep) store.setItem(k, parsed.data[k]);
  return { ok: true, day };
}
