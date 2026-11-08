/** Звуки слотов: ус — быстрый мажор, яблочко — светлый луп. Свои записи, не писк осциллятора. */

const KEY = 'must_sound_enabled';

type Clip = 'bed' | 'spin' | 'stop' | 'hit' | 'win' | 'land' | 'nice' | 'mega' | 'epic' | 'epicMusic' | 'wheel' | 'curtain';
export type SoundKit = 'must' | 'arrow';

const BEDS: Record<SoundKit, string> = {
  must: '/sfx/must/bed-zap.wav',
  arrow: '/sfx/arrow/bed-sun.wav',
};

const URLS: Record<Exclude<Clip, 'bed'>, string> = {
  spin: '/sfx/must/spin-silk.wav',
  stop: '/sfx/must/land-silk.wav',
  hit: '/sfx/must/hit-silk.wav',
  win: '/sfx/must/win-silk.wav',
  land: '/sfx/must/land-silk.wav',
  nice: '/sfx/must/big-cheer.wav',
  mega: '/sfx/must/mega-cheer.wav',
  epic: '/sfx/must/epic-hit.wav',
  epicMusic: '/sfx/must/epic-cheer.wav',
  wheel: '/sfx/must/wheel-spin.wav',
  curtain: '/sfx/must/curtain-gold.wav',
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let bedSource: AudioBufferSourceNode | null = null;
let spinSource: AudioBufferSourceNode | null = null;
let spinGain: GainNode | null = null;
let epicSource: AudioBufferSourceNode | null = null;
let epicGain: GainNode | null = null;
let enabled = true;
let kit: SoundKit | null = null;
const cache = new Map<string, Promise<AudioBuffer | null>>();
const live = new Set<AudioBufferSourceNode>();

function readEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw == null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

enabled = readEnabled();

export function isMustSoundOn(): boolean {
  return enabled;
}

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.9 : 0;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function setSlotSoundKit(next: SoundKit | null): void {
  if (next === kit) return;
  kit = next;
  stopNode(bedSource);
  bedSource = null;
  musicGain = null;
}

function clipUrl(clip: Clip): string | null {
  if (clip === 'bed') return kit ? BEDS[kit] : null;
  return URLS[clip];
}

function load(clip: Clip): Promise<AudioBuffer | null> {
  const audio = context();
  const url = clipUrl(clip);
  if (!audio || !url) return Promise.resolve(null);
  const key = clip === 'bed' ? url : clip;
  const cached = cache.get(key);
  if (cached) return cached;
  const pending = fetch(url)
    .then((response) => (response.ok ? response.arrayBuffer() : null))
    .then((bytes) => (bytes ? audio.decodeAudioData(bytes.slice(0)) : null))
    .catch(() => null);
  cache.set(key, pending);
  return pending;
}

function start(buffer: AudioBuffer, when: number, volume: number, loop = false, rate = 1): AudioBufferSourceNode | null {
  const audio = context();
  if (!audio || !master || !enabled) return null;
  const source = audio.createBufferSource();
  const gain = audio.createGain();
  source.buffer = buffer;
  source.loop = loop;
  source.playbackRate.value = rate;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(master);
  source.start(when);
  if (!loop) {
    live.add(source);
    source.onended = () => live.delete(source);
  }
  return source;
}

export function unlockMustSound(): Promise<void> {
  const audio = context();
  if (!audio) return Promise.resolve();
  const ready = audio.state === 'suspended' ? audio.resume().then(() => undefined) : Promise.resolve();
  return ready.then(() => {
    playMustMusic();
  });
}

export function playMustMusic(): void {
  if (!enabled || !kit || bedSource) return;
  const wanted = kit;
  void load('bed').then((buffer) => {
    const audio = context();
    if (!buffer || !enabled || kit !== wanted || bedSource || !audio || !master) return;
    musicGain = audio.createGain();
    musicGain.gain.value = 0.34;
    musicGain.connect(master);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(musicGain);
    source.start();
    bedSource = source;
  });
}

function stopNode(source: AudioBufferSourceNode | null) {
  if (!source) return;
  try { source.stop(); } catch { /* already stopped */ }
  live.delete(source);
}

export function stopMustAudio(): void {
  stopNode(spinSource);
  spinSource = null;
  spinGain = null;
  stopNode(bedSource);
  bedSource = null;
  musicGain = null;
  for (const source of live) stopNode(source);
  live.clear();
}

export function setMustSoundOn(next: boolean): void {
  enabled = next;
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(KEY, next ? '1' : '0'); } catch { /* ignore */ }
  }
  if (master && ctx) master.gain.setValueAtTime(next ? 0.9 : 0, ctx.currentTime);
  if (!next) stopMustAudio();
}

export function playMustSpin(): void {
  if (!enabled) return;
  stopMustSpin();
  void load('spin').then((buffer) => {
    const audio = context();
    if (!buffer || !enabled || !audio || !master) return;
    spinGain = audio.createGain();
    spinGain.gain.value = 0.22;
    spinGain.connect(master);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(spinGain);
    source.start();
    spinSource = source;
  });
}

export function stopMustSpin(): void {
  const audio = ctx;
  const gain = spinGain;
  const source = spinSource;
  spinSource = null;
  spinGain = null;
  if (audio && gain) {
    const now = audio.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  }
  window.setTimeout(() => stopNode(source), 180);
}

export function playMustLand(tone = 2): void {
  const rate = [0.9, 1, 1.12, 1.26, 1.4][Math.max(0, Math.min(4, tone))] ?? 1;
  void load('land').then((buffer) => {
    if (buffer && ctx && enabled) start(buffer, ctx.currentTime, 0.22, false, rate);
  });
}

export function playMustHit(lines: number): number {
  const count = Math.max(1, Math.min(3, lines));
  void load('hit').then((buffer) => {
    if (!buffer || !ctx || !enabled) return;
    const now = ctx.currentTime + 0.02;
    for (let index = 0; index < count; index += 1) {
      start(buffer, now + index * 0.18, 0.32 - index * 0.06, false, 1);
    }
  });
  return 0.22;
}

export function playMustWin(delay = 0): void {
  void load('win').then((buffer) => {
    if (buffer && ctx && enabled) start(buffer, ctx.currentTime + delay, 0.38);
  });
}

export function playMustBig(tier: 'nice' | 'mega' | 'epic'): void {
  if (tier === 'epic') {
    playMustEpic();
    return;
  }
  const clip: Clip = tier === 'mega' ? 'mega' : 'nice';
  if (musicGain && ctx) {
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(0.08, now + 0.15);
    musicGain.gain.linearRampToValueAtTime(0.34, now + 3.2);
  }
  void load(clip).then((buffer) => {
    if (buffer && ctx && enabled) start(buffer, ctx.currentTime + 0.02, tier === 'nice' ? 0.75 : 0.85);
  });
}

export function playMustEpic(): void {
  if (!enabled) return;
  const audio = context();
  if (!audio || !master) return;
  void load('epic').then((buffer) => {
    if (buffer && ctx && enabled) start(buffer, ctx.currentTime, 0.85);
  });
  if (musicGain) {
    const now = audio.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), now);
    musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
  }
  void load('epicMusic').then((buffer) => {
    if (!buffer || !ctx || !master || !enabled || epicSource) return;
    epicGain = ctx.createGain();
    epicGain.gain.value = 0.0001;
    epicGain.connect(master);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(epicGain);
    const now = ctx.currentTime;
    epicGain.gain.linearRampToValueAtTime(0.8, now + 0.35);
    source.start(now);
    epicSource = source;
    source.onended = () => {
      if (epicSource === source) {
        epicSource = null;
        epicGain = null;
      }
    };
  });
}

export function stopMustEpic(): void {
  const audio = ctx;
  const gain = epicGain;
  const source = epicSource;
  epicSource = null;
  epicGain = null;
  if (audio && gain) {
    const now = audio.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
  }
  window.setTimeout(() => stopNode(source), 400);
  if (musicGain && audio && enabled) {
    const now = audio.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(Math.max(0.0001, musicGain.gain.value), now);
    musicGain.gain.linearRampToValueAtTime(0.34, now + 0.6);
  }
}

export function playMustWheel(): void {
  void load('wheel').then((buffer) => {
    if (buffer && ctx && enabled) start(buffer, ctx.currentTime, 0.55);
  });
}

export function playMustCurtain(): void {
  void load('curtain').then((buffer) => {
    if (buffer && ctx && enabled) start(buffer, ctx.currentTime, 0.74);
  });
}
