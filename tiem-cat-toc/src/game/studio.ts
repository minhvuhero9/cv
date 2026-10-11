import { ArtKit, brushHair, carveHair, fullKit } from './art';
import { CUSTOMERS } from './customers';
import type { Vec } from './geometry';
import { Carving, HairState, cloneHair } from './hair';
import { BOOK_KEY, BOOK_MAX, Creation, creationHair } from './creation';
import { personaById, transformCustomer } from './mirror';
import { templateById } from './templates';
import { templateOrder } from './design';
import { createRound, refreshMetrics, RoundState, startCutting } from './session';
import { ToolId, TOOLS } from './tools';

/**
 * Xưởng Tạo Kiểu: a sandbox with no judge and no clock. Every tool, a colour brush,
 * shaved-in art from stencils, undo/redo, a photo mode and a book of saved creations.
 */
export interface StudioState {
  undo: HairState[];
  redo: HairState[];
  /** Opened from the shop after closing (career kit and models met), or free. */
  from: 'free' | 'career';
  /** Vẽ theo mẫu: the followed template reached 90 %. */
  traceDone?: boolean;
}

/** Vẽ theo mẫu: follow a built-in template on the current model (null = stop). */
export function setTrace(s: RoundState, templateId: string | null) {
  const t = templateById(templateId);
  s.design = t ? templateOrder(t, s.baseCustomer.id) : null;
  if (s.studio) s.studio.traceDone = false;
}

const MASTER_KEY = 'tctbo-mastered';
export function loadMastered(store: Storage | undefined = globalThis.localStorage): string[] {
  try {
    const v = JSON.parse(store?.getItem(MASTER_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function addMastered(id: string, store: Storage | undefined = globalThis.localStorage) {
  const all = loadMastered(store);
  if (all.includes(id)) return;
  try {
    store?.setItem(MASTER_KEY, JSON.stringify([...all, id]));
  } catch {
    /* ignore */
  }
}

const UNDO_MAX = 40;
export const ALL_TOOLS: ToolId[] = TOOLS.filter((t) => t.unlock.kind !== 'soon').map((t) => t.id);

export interface StudioOptions {
  tools?: ToolId[];
  kit?: ArtKit;
  from?: 'free' | 'career';
  /** Gương Thần available (career: only when bought). */
  mirror?: boolean;
}

/** A studio round: no clock, nobody judging. Free studio has everything; the career one, what you bought. */
export function studioRound(customer: string, seed = 7, opts: StudioOptions = {}): RoundState {
  const s = createRound(customer, seed, { onlyTools: opts.tools ?? ALL_TOOLS, mirror: opts.mirror ?? true, kit: opts.kit ?? fullKit(), ctx: { stock: { potion: 99, gel: 99 } } });
  s.studio = { undo: [], redo: [], from: opts.from ?? 'free' };
  s.timeLimit = Infinity;
  s.bubble = { text: 'Không chấm điểm. Cứ sáng tạo thoải mái!', until: 3, shout: false };
  s.pending = [];
  startCutting(s);
  return s;
}

/* ------------------------------------------------------------------ undo / redo */

export function pushUndo(s: RoundState) {
  const st = s.studio;
  if (!st) return;
  st.undo.push(cloneHair(s.hair));
  if (st.undo.length > UNDO_MAX) st.undo.shift();
  st.redo = [];
}

export function undo(s: RoundState): boolean {
  const st = s.studio;
  if (!st?.undo.length) return false;
  st.redo.push(cloneHair(s.hair));
  s.hair = st.undo.pop()!;
  refreshMetrics(s);
  return true;
}

export function redo(s: RoundState): boolean {
  const st = s.studio;
  if (!st?.redo.length) return false;
  st.undo.push(cloneHair(s.hair));
  s.hair = st.redo.pop()!;
  refreshMetrics(s);
  return true;
}

/** Start over with the model's own hair (undoable). */
export function resetHair(s: RoundState) {
  pushUndo(s);
  s.hair = cloneHair(s.before);
  refreshMetrics(s);
}

/** Brush / carve on a round (tests and tools share these). */
export function brush(s: RoundState, p: Vec): number {
  const n = brushHair(s.hair, s.art, p);
  if (n) refreshMetrics(s);
  return n;
}

export function carve(s: RoundState, p: Vec): Carving | null {
  const c = carveHair(s.hair, s.art, p);
  if (c) refreshMetrics(s);
  return c;
}

/* ------------------------------------------------------------------ the book */

export * from './creation';

/** Opens a saved creation in the studio to keep working on it. */
export function openCreation(c: Creation, opts: StudioOptions = {}): RoundState {
  const s = studioRound(CUSTOMERS.some((x) => x.id === c.customer) ? c.customer : 'tuan', 7, opts);
  const p = personaById(c.persona);
  if (p) {
    s.persona = p.id;
    s.customer = transformCustomer(s.baseCustomer, p, null);
  }
  s.hair = creationHair(c);
  refreshMetrics(s);
  s.bubble = null;
  return s;
}

export function loadBook(store: Storage | undefined = globalThis.localStorage): Creation[] {
  try {
    const v = JSON.parse(store?.getItem(BOOK_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((c) => c && Array.isArray(c.tufts)) : [];
  } catch {
    return [];
  }
}

/** Saves (or replaces by id); keeps the newest BOOK_MAX. Returns false when storage is full. */
export function saveToBook(c: Creation, store: Storage | undefined = globalThis.localStorage): boolean {
  const book = [c, ...loadBook(store).filter((x) => x.id !== c.id)].slice(0, BOOK_MAX);
  try {
    store?.setItem(BOOK_KEY, JSON.stringify(book));
    return true;
  } catch {
    return false;
  }
}

export function deleteFromBook(id: string, store: Storage | undefined = globalThis.localStorage) {
  try {
    store?.setItem(BOOK_KEY, JSON.stringify(loadBook(store).filter((x) => x.id !== id)));
  } catch {
    /* ignore */
  }
}
