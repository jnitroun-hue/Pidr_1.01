/** Kenney Casino Audio (CC0) — cardShuffle / cardSlide1. Тумблер: pidr_sound_enabled. */

export const SOUND_ENABLED_KEY = 'pidr_sound_enabled';
export const SOUND_CHANGED_EVENT = 'pidr-sound-changed';

const DEAL_SRC_OGG = '/sounds/card-shuffle.ogg';
const DEAL_SRC_WAV = '/sounds/card-shuffle.wav';
const TAKE_SRC_OGG = '/sounds/card-take.ogg';
const TAKE_SRC_WAV = '/sounds/card-take.wav';

function pickSrc(ogg: string, wav: string): string {
  if (typeof Audio === 'undefined') return wav;
  try {
    const probe = document.createElement('audio');
    const oggOk = probe.canPlayType('audio/ogg; codecs="vorbis"');
    if (oggOk === 'probably' || oggOk === 'maybe') return ogg;
  } catch {
    /* ignore */
  }
  return wav;
}

let dealAudio: HTMLAudioElement | null = null;
let takePool: HTMLAudioElement[] = [];
let unlocked = false;
let lastTakeAt = 0;
/** Звуки только пока открыта партия на столе — не на лоадере и не после выхода. */
let tableSfxLive = false;

function readFlag(fallback = true): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(SOUND_ENABLED_KEY);
    if (raw == null) return fallback;
    return raw === '1' || raw === 'true';
  } catch {
    return fallback;
  }
}

export function isSoundEnabled(): boolean {
  return readFlag(true);
}

export function persistSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(SOUND_CHANGED_EVENT, { detail: { enabled } }));
}

function makeAudio(src: string, volume: number): HTMLAudioElement | null {
  if (typeof Audio === 'undefined') return null;
  const el = new Audio(src);
  el.preload = 'auto';
  el.volume = volume;
  return el;
}

function ensureDeal(): HTMLAudioElement | null {
  if (!dealAudio) dealAudio = makeAudio(pickSrc(DEAL_SRC_OGG, DEAL_SRC_WAV), 0.62);
  return dealAudio;
}

function nextTake(): HTMLAudioElement | null {
  const idle = takePool.find((a) => a.paused || a.ended);
  if (idle) return idle;
  if (takePool.length >= 4) return takePool[0];
  const created = makeAudio(pickSrc(TAKE_SRC_OGG, TAKE_SRC_WAV), 0.5);
  if (created) takePool.push(created);
  return created;
}

/** iOS / Telegram WebView: первый жест разблокирует Audio. */
export function unlockGameAudio(): void {
  if (unlocked || typeof window === 'undefined') return;
  unlocked = true;
  const deal = ensureDeal();
  const take = nextTake();
  const tryUnlock = (el: HTMLAudioElement | null) => {
    if (!el) return;
    el.muted = true;
    const p = el.play();
    if (p) {
      void p
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.muted = false;
        })
        .catch(() => {
          el.muted = false;
        });
    }
  };
  tryUnlock(deal);
  tryUnlock(take);
}

function playEl(el: HTMLAudioElement | null, force = false): void {
  if (!el || (!force && !tableSfxLive)) return;
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p) void p.catch(() => {});
  } catch {
    /* ignore */
  }
}

export function stopAllGameSfx(): void {
  const halt = (el: HTMLAudioElement | null) => {
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
  };
  halt(dealAudio);
  takePool.forEach(halt);
}

export function enableTableSfx(): void {
  tableSfxLive = true;
}

export function disableTableSfx(): void {
  tableSfxLive = false;
  stopAllGameSfx();
}

export function playDealSfx(): void {
  if (typeof window === 'undefined' || !isSoundEnabled() || !tableSfxLive) return;
  playEl(ensureDeal());
}

export function playTakeSfx(opts?: { preview?: boolean }): void {
  if (typeof window === 'undefined' || !isSoundEnabled()) return;
  const preview = opts?.preview === true;
  if (!preview && !tableSfxLive) return;
  const now = Date.now();
  if (!preview && now - lastTakeAt < 80) return;
  lastTakeAt = now;
  playEl(nextTake(), preview);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => unlockGameAudio(), { once: true, passive: true });
}
