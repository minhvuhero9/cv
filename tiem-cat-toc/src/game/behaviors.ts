import { clamp, dist } from './geometry';
import { gearCancel } from './gear';
import type { Mood } from './evaluate';
import { between } from './rng';
import {
  MotionKind,
  RoundState,
  Rule,
  Tool,
  has,
  incident,
  line,
  say,
  startMotion,
  timeLeft,
} from './session';

/**
 * Reusable customer behaviours. A customer lists the ones they have in `behaviors`
 * (customers.ts); each module is a set of rules with a visible cause and a warning.
 */

/** Tools that make a loud noise or bang (wake sleepers, scare dogs, trigger reflexes). */
export const LOUD_TOOLS: Tool[] = ['clipper', 'dryer', 'storm', 'vacuum', 'ray', 'cooker'];

function schedule(s: RoundState, min: number, max: number) {
  s.nextBehaviorAt = s.time + between(s.rng, min, max);
}

const idle = (s: RoundState) => !s.motion && !s.walkout;

export const BEHAVIOR_RULES: Rule[] = [
  {
    id: 'deadline',
    check: (s) => has(s, 'deadline') && !s.deadlineSaid && timeLeft(s) <= 20,
    fire: (s) => {
      s.deadlineSaid = true;
      say(s, line(s, 'deadline'), 'worried', { shout: true });
      s.sfx.push('warn');
    },
  },
  {
    id: 'sleepy',
    check: (s) => has(s, 'sleepy') && idle(s) && s.drowsy >= 1,
    fire: (s) => startMotion(s, 'nod'),
  },
  {
    id: 'flex',
    check: (s) => has(s, 'flex') && idle(s) && s.time >= s.nextBehaviorAt,
    fire: (s) => {
      schedule(s, 7, 10);
      startMotion(s, 'pose');
    },
  },
  {
    id: 'rush',
    check: (s) => has(s, 'rush') && idle(s) && s.time >= s.nextBehaviorAt,
    fire: (s) => {
      schedule(s, 6, 9);
      startMotion(s, 'phone');
    },
  },
  {
    id: 'duck',
    check: (s) => has(s, 'duck') && idle(s) && s.time >= s.nextBehaviorAt,
    fire: (s) => {
      schedule(s, 8, 12);
      startMotion(s, 'duck');
    },
  },
  {
    id: 'livestream-bored',
    check: (s) => has(s, 'livestream') && s.viewers < 60 && s.time - s.boredAt > 10,
    fire: (s) => {
      s.boredAt = s.time;
      s.patience = clamp(s.patience - 10, 0, 100);
      say(s, line(s, 'boring'), 'suspicious');
    },
  },
  {
    // Cậu Vàng: too much fear and he shakes everything off — fur flies all over the shop.
    id: 'dog-shake',
    check: (s) => has(s, 'dog') && idle(s) && s.nerves >= 80,
    fire: (s) => startMotion(s, 'dogShake'),
  },
  {
    // Cậu Vàng smells food (only when there is food: today's event, or sausages in the shop).
    id: 'dog-sniff',
    check: (s) =>
      has(s, 'dog') && idle(s) && s.time >= s.nextBehaviorAt && s.ctx.dayEvents.includes('foodStall') && !s.ctx.items.includes('sausage'),
    fire: (s) => {
      schedule(s, 7, 11);
      startMotion(s, 'sniff');
    },
  },
];

/** Per-frame behaviour state (called from tick while cutting). */
export function behaviorTick(s: RoundState, dt: number, local: { x: number; y: number } | null) {
  const using = local ? s.tool : null;

  if (has(s, 'sleepy')) {
    if (s.motion?.kind === 'nod' && s.motion.stage === 'act' && using && LOUD_TOOLS.includes(using)) {
      // Woken by a running machine: a jerk, right under the tool.
      s.motion = null;
      startMotion(s, 'startle');
      say(s, line(s, 'startle'), 'shocked', { shout: true });
      incident(s, 'startle', 6);
      s.drowsy = 0;
    } else if (!s.motion) {
      // A quiet shop makes him doze off faster; machines keep him awake.
      s.drowsy += dt * (using && LOUD_TOOLS.includes(using) ? -0.2 : 0.11);
      s.drowsy = clamp(s.drowsy, 0, 1.2);
    }
  }

  if (has(s, 'livestream')) {
    if (s.time - s.lastIncidentAt > 6) s.viewers = Math.max(10, s.viewers * (1 - 0.06 * dt));
  }

  if (has(s, 'deadline') && timeLeft(s) < 20) {
    s.patience = clamp(s.patience - s.customer.patienceDecay * 0.5 * dt, 0, 100);
  }

  if (has(s, 'dog')) {
    // The clipper buzzing near him is scary even before it touches him.
    if (using === 'clipper' && local && dist(local, { x: 200, y: 230 }) < 160) s.nerves = clamp(s.nerves + 22 * dt, 0, 100);
    if (using === 'vacuum') s.nerves = clamp(s.nerves + 16 * dt, 0, 100);
    if (s.ctx.items.includes('sausage')) s.nerves = clamp(s.nerves - 6 * dt, 0, 100);
    if (using === 'dryer' && !s.moodOverride && s.rng() < dt * 0.5) say(s, line(s, 'dogHappy'), 'happy', { dur: 1.6 });
    if (s.rng() < dt * 0.4 && using === 'clipper') s.sfx.push('whimper');
  }

  if (s.jam && s.time >= s.jam.until) s.jam = null;
}

/** Called by the motion system when a head movement finishes. */
export function onMotionEnd(s: RoundState, kind: MotionKind, strayed: boolean) {
  if (kind === 'pose' && !strayed) s.patience = clamp(s.patience + 2, 0, 100);
  if (kind === 'dogShake') {
    // Fur and clippings everywhere: the shop gets messy (cleaning costs / inspections later).
    s.mess += 25;
    s.nerves = 30;
    for (const t of s.hair.tufts) t.fluff = clamp(t.fluff + 0.35, 0, 1);
    for (let i = 0; i < 30; i++) {
      s.particles.push({
        x: 200 + between(s.rng, -90, 90),
        y: 200 + between(s.rng, -80, 60),
        vx: between(s.rng, -380, 380),
        vy: between(s.rng, -320, -60),
        rot: between(s.rng, 0, 360),
        vr: 700,
        len: between(s.rng, 6, 12),
        life: 3,
        landed: false,
      });
    }
    incident(s, 'dogShake', 10);
    say(s, line(s, 'dogShake'), 'angry', { shout: true });
    s.sfx.push('bark');
  }
  if (kind === 'sniff') {
    incident(s, 'dogSniff', 3, !s.events.dogSniff);
    s.sfx.push('bark');
  }
}

/**
 * Something loud or sudden happened because of the player (storm gust, ray shot, vacuum
 * gulp, combo, pot). Reflex customers (võ sư) chop — the tool flies out of the barber's hand.
 */
export function startle(s: RoundState) {
  if (has(s, 'dog')) s.nerves = clamp(s.nerves + 20, 0, 100);
  if (!has(s, 'reflex') || s.time < s.reflexCooldown || s.phase !== 'cutting') return;
  s.reflexCooldown = s.time + 5;
  const tool = s.tool;
  s.jam = { tool, until: s.time + 4 };
  s.wear[tool] = (s.wear[tool] ?? 0) + 15;
  if (s.gear[tool] && tool !== 'clipper' && tool !== 'scissors' && tool !== 'dryer') {
    s.gear[tool].charge = 0;
    s.gear[tool].overheated = true;
  }
  gearCancel(s);
  s.pointer.down = false;
  s.motion = null;
  startMotion(s, 'chop');
  incident(s, 'karateChop', 8);
  say(s, line(s, 'chop'), 'angry' as Mood, { shout: true, dur: 1.8 });
  s.sfx.push('chop');
}
