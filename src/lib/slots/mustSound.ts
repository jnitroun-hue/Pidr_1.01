/** Оригинальные звуки только для «Козырного уса». Синтез, без чужих семплов. */

const KEY = 'must_sound_enabled';

type Stoppable = { stop: () => void };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = true;
let spinTimer = 0;
let spinGain: GainNode | null = null;
let spinSource: AudioBufferSourceNode | null = null;
const live = new Set<Stoppable>();

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
    master.gain.value = enabled ? 0.8 : 0;
    master.connect(ctx.destination);
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    noise = buffer;
  }
  return ctx;
}

export function unlockMustSound(): Promise<void> {
  const audio = context();
  if (!audio) return Promise.resolve();
  if (audio.state === 'suspended') return audio.resume().then(() => undefined);
  return Promise.resolve();
}

function drop(item: Stoppable) {
  live.delete(item);
}

function tone(freq: number, when: number, duration: number, type: OscillatorType, volume: number, slide = freq) {
  const audio = context();
  if (!audio || !master || !enabled) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), when + duration);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(when);
  osc.stop(when + duration + 0.02);
  const item = { stop: () => { try { osc.stop(); } catch { /* already stopped */ } } };
  live.add(item);
  osc.onended = () => drop(item);
}

function burst(when: number, duration: number, volume: number, freq: number) {
  const audio = context();
  if (!audio || !master || !noise || !enabled) return;
  const source = audio.createBufferSource();
  source.buffer = noise;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.7;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, when);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start(when);
  source.stop(when + duration);
  const item = { stop: () => { try { source.stop(); } catch { /* already stopped */ } } };
  live.add(item);
  source.onended = () => drop(item);
}

export function stopMustAudio(): void {
  if (spinTimer) {
    window.clearInterval(spinTimer);
    spinTimer = 0;
  }
  try { spinSource?.stop(); } catch { /* already stopped */ }
  spinSource = null;
  spinGain = null;
  for (const item of live) item.stop();
  live.clear();
}

export function setMustSoundOn(next: boolean): void {
  enabled = next;
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(KEY, next ? '1' : '0'); } catch { /* ignore */ }
  }
  if (master && ctx) master.gain.setValueAtTime(next ? 0.8 : 0, ctx.currentTime);
  if (!next) stopMustAudio();
}

export function playMustSpin(): void {
  const audio = context();
  if (!audio || !master || !noise || !enabled) return;
  stopMustAudio();
  unlockMustSound();
  const source = audio.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 280;
  filter.Q.value = 0.6;
  const gain = audio.createGain();
  gain.gain.value = 0.045;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  source.start();
  spinSource = source;
  spinGain = gain;
  spinTimer = window.setInterval(() => {
    if (!enabled || !ctx) return;
    burst(ctx.currentTime, 0.035, 0.05, 900 + Math.random() * 500);
  }, 95);
}

export function stopMustSpin(): void {
  if (!spinSource && !spinTimer) return;
  if (spinTimer) {
    window.clearInterval(spinTimer);
    spinTimer = 0;
  }
  const audio = ctx;
  if (audio && spinGain) {
    const now = audio.currentTime;
    spinGain.gain.cancelScheduledValues(now);
    spinGain.gain.setValueAtTime(spinGain.gain.value, now);
    spinGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  }
  const source = spinSource;
  spinSource = null;
  window.setTimeout(() => {
    try { source?.stop(); } catch { /* already stopped */ }
  }, 100);
  if (enabled && audio) burst(audio.currentTime, 0.07, 0.12, 180);
}

/** Короткая сыгровка линий: по ноте на линию, не больше четырёх. */
export function playMustHit(lines: number): number {
  const audio = context();
  if (!audio || !enabled) return 0;
  const count = Math.max(1, Math.min(4, lines));
  const scale = [523, 659, 784, 1046];
  const now = audio.currentTime + 0.02;
  for (let i = 0; i < count; i += 1) tone(scale[i], now + i * 0.09, 0.16, 'triangle', 0.16);
  return count * 0.09;
}

/** Колокол обычного выигрыша. `delay` — после сыгровки, чтобы не слиплись. */
export function playMustWin(delay = 0): void {
  const audio = context();
  if (!audio || !enabled) return;
  const now = audio.currentTime + delay;
  tone(880, now, 0.34, 'sine', 0.2, 660);
  tone(1320, now, 0.22, 'triangle', 0.08);
  burst(now, 0.12, 0.06, 2400);
}

export function playMustBig(tier: 'nice' | 'mega' | 'epic'): void {
  const audio = context();
  if (!audio || !enabled) return;
  const now = audio.currentTime + 0.02;
  const nice = [523, 659, 784, 1046];
  const mega = [392, 523, 659, 784, 1046, 1318];
  const epic = [349, 440, 523, 698, 880, 1046, 1397, 1760];
  const notes = tier === 'epic' ? epic : tier === 'mega' ? mega : nice;
  const step = tier === 'epic' ? 0.11 : tier === 'mega' ? 0.1 : 0.09;
  notes.forEach((freq, index) => {
    tone(freq, now + index * step, 0.28, 'triangle', tier === 'nice' ? 0.16 : 0.18);
    tone(freq * 2, now + index * step, 0.18, 'sine', 0.05);
  });
  const end = now + notes.length * step;
  tone(tier === 'epic' ? 196 : 262, now, end - now, 'sawtooth', tier === 'epic' ? 0.05 : 0.03);
  burst(end, 0.4, tier === 'epic' ? 0.1 : 0.06, 1400);
}
