import { makeRng } from './rng';
import { seasonClock, seasonFor } from './templates';

/**
 * Thế giới quanh tiệm: weather, a rival shop across the street, and the street festival.
 * All deterministic per shop seed and day, all shown in the morning with their cause.
 */
export type Weather = 'fair' | 'rain' | 'heat';

export function weatherFor(seed: number, day: number): Weather {
  if (day <= 2) return 'fair';
  const r = makeRng(seed * 31 + day * 977 + 5)();
  return r < 0.2 ? 'rain' : r < 0.38 ? 'heat' : 'fair';
}

export const WEATHER_TEXT: Record<Exclude<Weather, 'fair'>, { title: string; cause: string; effect: string }> = {
  rain: {
    title: 'Mưa rả rích cả ngày',
    cause: 'Dự báo thời tiết: áp thấp, mưa từ sáng đến tối.',
    effect: 'Bớt 1 khách. Ai đã vào thì ngồi thong thả chờ tạnh (kiên nhẫn giảm chậm hơn).',
  },
  heat: {
    title: 'Nắng nóng 38 độ',
    cause: 'Dự báo thời tiết: nắng gắt, không một gợn mây.',
    effect: 'Khách thích cắt ngắn cho mát (thêm điểm khi tóc ngắn, bớt điểm khi để dài) và nóng ruột hơn — trừ khi tiệm có điều hòa.',
  },
};

/** Lễ hội Phố Tóc: two days every two weeks (days 12–13, 26–27, …). */
export const isFestival = (day: number) => day % 14 === 12 || day % 14 === 13;

export function festivalName(): string {
  const s = seasonFor(seasonClock.now());
  return s ? `Lễ hội Phố Tóc mùa ${s.name}` : 'Lễ hội Phố Tóc';
}

/** Tiệm đối thủ: opens across the street on day 9 for a few days. */
export interface Rival {
  name: string;
  from: number;
  until: number;
  /** Your customers' verdicts while it is open. */
  sats: number[];
  extended: number;
  state: 'open' | 'beaten' | 'left';
}

export const RIVAL_DAY = 9;
export const RIVAL_TARGET = 70;

export function newRival(day: number): Rival {
  return { name: 'Salon Sang Chảnh Đối Diện', from: day, until: day + 3, sats: [], extended: 0, state: 'open' };
}

export const rivalOpen = (r: Rival | undefined, day: number) => !!r && r.state === 'open' && day >= r.from && day <= r.until;

/** The rival's last day: beaten (your average verdict ≥ 70), still there (+4 days, once), or gone anyway. */
export function settleRival(r: Rival): 'beaten' | 'extended' | 'left' {
  const avg = r.sats.length ? r.sats.reduce((a, b) => a + b, 0) / r.sats.length : 0;
  if (avg >= RIVAL_TARGET) {
    r.state = 'beaten';
    return 'beaten';
  }
  if (r.extended < 1) {
    r.extended++;
    r.until += 4;
    r.sats = [];
    return 'extended';
  }
  r.state = 'left';
  return 'left';
}

export const PROMO_DISCOUNT = 0.8;
export const PROMO_CUSTOMERS = 2;
