import { CUSTOMERS, CustomerDef } from './customers';
import {
  DOG,
  DOG_LINES,
  NEUTRAL,
  DEMAND_AGAIN,
  DEMAND_FIRST,
  DEMAND_IGNORED,
  DEMAND_MET,
  EVENT_LINES,
  GENERIC,
  MAGIC_LINES,
  PHOTO_LINES,
  TIER_LINES,
  ZONE_LABEL,
} from './dialogue';
import { CLASSIC_SPECIAL, DEFECT_LINES, TIER_REACTIONS } from './evaluate';

/**
 * Lồng tiếng — the list of every line that can be voiced, per speaker, with the gameplay
 * event that triggers it. scripts/voice/export-lines.ts writes this to voice/lines.json and
 * the batch generator turns it into audio files + manifest.
 */

export interface VoiceProfile {
  espeak: string;
  variant: string;
  pitch: number;
  speed: number;
}

export interface VoiceLine {
  speaker: string;
  event: string;
  text: string;
  voice: VoiceProfile;
}

/** The shop's announcer (system events: open, close, tips, viral, returns). */
export const NARRATOR_VOICE: VoiceProfile = { espeak: 'vi', variant: 'announcer', pitch: 46, speed: 165 };

export const NARRATOR_LINES: Record<string, string[]> = {
  openDay: ['Tiệm Cắt Tóc Bất Ổn, mở cửa! Mời khách vào!', 'Một ngày mới, một mái tóc mới, một thảm họa mới!'],
  endDay: ['Hết giờ rồi! Đóng cửa, đếm tiền nào.', 'Đóng cửa! Hôm nay sống sót thêm một ngày.'],
  tip: ['Ting ting! Khách boa thêm!', 'Có tiền boa! Tay nghề lên rồi!'],
  walkout: ['Khách bỏ về rồi! Mất tiền, mất cả khăn choàng.'],
  viralClip: ['Clip của tiệm đang lên xu hướng!', 'Cả mạng đang bàn tán về tiệm mình!'],
  returnCustomer: ['Ơ kìa, khách hôm qua quay lại rồi!'],
  combo: ['Combo! Tiệm hôm nay quá đỉnh!'],
  powerCut: ['Mất điện rồi! Hôm nay cắt bằng tay thôi!'],
  purchase: ['Đồ mới về tiệm!'],
};

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

/** Every line a given customer can say, tagged with the event that triggers it. */
export function linesFor(c: CustomerDef): { event: string; text: string }[] {
  const out: { event: string; text: string }[] = [];
  const add = (event: string, texts: string[] | undefined) => {
    for (const t of texts ?? []) if (t && t !== '…') out.push({ event, text: t });
  };
  const p = c.personality;
  const fb = c.fallback ?? 'neutral';
  /** The same fallback the game uses (session.line). */
  const fallback = (key: string): string[] | undefined => {
    if (fb === 'personality') return EVENT_LINES[key as keyof typeof EVENT_LINES]?.[p] ?? MAGIC_LINES[key as keyof typeof MAGIC_LINES]?.[p] ?? GENERIC[key];
    if (fb === 'dog') return DOG_LINES[key] ?? (key.startsWith('first_') ? ['Gâu?'] : DOG);
    return NEUTRAL[key] ?? GENERIC[key];
  };
  add('enter', [c.request, c.catch]);
  // Event lines: the customer's own version if any, else their fallback set.
  for (const key of [...Object.keys(EVENT_LINES), ...Object.keys(MAGIC_LINES)]) add(key, c.lines?.[key] ?? fallback(key));
  for (const key of Object.keys(GENERIC)) {
    if (c.lines?.[key]) add(key, c.lines[key]);
  }
  // Behaviour-only keys a customer may override without a generic version.
  for (const [key, texts] of Object.entries(c.lines ?? {})) if (!EVENT_LINES[key as keyof typeof EVENT_LINES] && !GENERIC[key]) add(key, texts);
  // Lines from behaviours that use generic text when the customer has none.
  const generic: Record<string, string> = { sleepy: 'sleepy', flex: 'flexWarn', rush: 'phone', duck: 'duckWarn', reflex: 'chop', deadline: 'deadline', livestream: 'boring' };
  for (const b of c.behaviors) {
    const key = generic[b];
    if (key && !c.lines?.[key]) add(key, GENERIC[key]);
    if (b === 'sleepy' && !c.lines?.startle) add('startle', GENERIC.startle);
    if (b === 'dog') for (const k of ['dogFearWarn', 'dogShake', 'dogSniff', 'dogHappy']) if (!c.lines?.[k]) add(k, GENERIC[k]);
  }
  for (const k of ['growRace', 'concreteSpikes', 'autoMisread', 'malfunction']) add(k, c.lines?.[k] ?? fallback(k));
  if (fb === 'personality') add('chaosTier', TIER_LINES[p].flat());
  else for (const k of ['tier1', 'tier2', 'tier3']) add('chaosTier', c.lines?.[k] ?? fallback(k));
  for (const r of Object.values(c.toolReactions)) add('toolReaction', r?.lines);
  // Behaviour-specific dialogue of the classic customers.
  if (c.behaviors.includes('photoCheck')) add('photoCheck', Object.values(PHOTO_LINES).flat());
  if (c.behaviors.includes('demands')) {
    for (const z of Object.values(ZONE_LABEL)) add('demand', [...DEMAND_FIRST, ...DEMAND_AGAIN].map((t) => t.replace('{z}', z)));
    add('demandIgnored', DEMAND_IGNORED);
    add('demandMet', DEMAND_MET);
  }
  // Mirror verdicts.
  if (c.mirror) for (const [tier, texts] of Object.entries(c.mirror)) add(`mirror.${tier}`, texts);
  else if (fb === 'personality') {
    for (const [tier, texts] of Object.entries(TIER_REACTIONS[p])) add(`mirror.${tier}`, texts);
    for (const texts of Object.values(DEFECT_LINES[p])) add('mirror.defect', texts);
  }
  if (c.specialLine) add('mirror.special', [c.specialLine.line]);
  const classic = Object.entries(CLASSIC_SPECIAL).filter(([k]) => k.startsWith(c.id)).map(([, v]) => v);
  add('mirror.special', classic);
  // De-duplicate by text, keeping the first event.
  const seen = new Set<string>();
  return out.filter((l) => (seen.has(l.text) ? false : (seen.add(l.text), true)));
}

export function allVoiceLines(): VoiceLine[] {
  const out: VoiceLine[] = [];
  for (const c of CUSTOMERS) for (const l of linesFor(c)) out.push({ speaker: c.id, event: l.event, text: l.text, voice: c.voice });
  for (const [event, texts] of Object.entries(NARRATOR_LINES)) for (const text of uniq(texts)) out.push({ speaker: 'narrator', event, text, voice: NARRATOR_VOICE });
  return out;
}

/**
 * Text as it should be read aloud: drop stage directions in brackets' punctuation, make
 * ellipses into pauses. The displayed text is unchanged; this only feeds the TTS engine.
 */
export function speakable(text: string): string {
  return text
    .replace(/[“”"]/g, '')
    .replace(/[()]/g, ', ')
    .replace(/…/g, ', ')
    .replace(/!{2,}/g, '!')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/^[,\s]+/, '')
    .trim();
}
