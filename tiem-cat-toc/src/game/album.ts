import { CUSTOMERS } from './customers';
import { PERSONAS, affinity } from './mirror';
import type { RoundState } from './session';

/** Album Gương Thần: which customer has been turned into which persona (kept in this browser). */
export interface AlbumEntry {
  sat: number;
  styleName: string;
}
export type Album = Record<string, AlbumEntry>;

const KEY = 'tctbo-album';
export const albumKey = (customer: string, persona: string) => `${customer}:${persona}`;

/** Customers that can be transformed (humans who walk in). */
export const ALBUM_CUSTOMERS = CUSTOMERS.filter((c) => c.look.species !== 'dog' && c.id !== 'copycat');
export const ALBUM_SIZE = ALBUM_CUSTOMERS.length * PERSONAS.length;

export function loadAlbum(store: Storage | undefined = globalThis.localStorage): Album {
  try {
    const v = JSON.parse(store?.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function saveAlbum(a: Album, store: Storage | undefined = globalThis.localStorage) {
  try {
    store?.setItem(KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

/** Adds the finished round if a persona was used; keeps the best result. Returns true if it is a new page. */
export function recordAlbum(a: Album, s: RoundState): boolean {
  if (!s.persona || !s.result || s.result.walkedOut) return false;
  const k = albumKey(s.baseCustomer.id, s.persona);
  const old = a[k];
  if (!old || s.result.sat > old.sat) a[k] = { sat: s.result.sat, styleName: s.result.style.name };
  return !old;
}

/** "Hợp gu" pages: a fan of the persona. */
export const isPerfectMatch = (customer: string, persona: string) => affinity(PERSONAS.find((p) => p.id === persona)!, customer) === 'fan';
