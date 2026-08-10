/**
 * Генерация 3D-style персонажей на базе DiceBear (MIT).
 * Adventurer / Avataaars / Lorelei — open-source стили, рендер offline через @dicebear/*.
 */

import { createAvatar, type Style } from '@dicebear/core';
import * as adventurer from '@dicebear/adventurer';
import * as avataaars from '@dicebear/avataaars';
import * as lorelei from '@dicebear/lorelei';

export type CharacterAvatarStyle = 'adventurer' | 'avataaars' | 'lorelei';

export interface CharacterAvatarOption {
  id: string;
  style: CharacterAvatarStyle;
  seed: string;
  /** data:image/svg+xml;utf8,... — можно сразу сохранить через /api/user/avatar */
  dataUrl: string;
  /** Стабильный публичный путь-алиас (для отображения после сохранения seed в URL) */
  previewPath: string;
}

const STYLES: CharacterAvatarStyle[] = ['adventurer', 'avataaars', 'lorelei'];

function styleModule(style: CharacterAvatarStyle): Style<object> {
  switch (style) {
    case 'adventurer':
      return adventurer as Style<object>;
    case 'avataaars':
      return avataaars as Style<object>;
    case 'lorelei':
      return lorelei as Style<object>;
    default:
      return adventurer as Style<object>;
  }
}

function randomSeed(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 12; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${Date.now().toString(36)}-${out}`;
}

export function isCharacterAvatarStyle(value: unknown): value is CharacterAvatarStyle {
  return typeof value === 'string' && STYLES.includes(value as CharacterAvatarStyle);
}

export function buildCharacterAvatarDataUrl(style: CharacterAvatarStyle, seed: string): string {
  const svg = createAvatar(styleModule(style), {
    seed,
    size: 256,
  }).toString();

  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');

  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

export function buildCharacterAvatarId(style: CharacterAvatarStyle, seed: string): string {
  return `${style}:${seed}`;
}

export function parseCharacterAvatarId(id: string): { style: CharacterAvatarStyle; seed: string } | null {
  const [style, ...rest] = id.split(':');
  const seed = rest.join(':');
  if (!isCharacterAvatarStyle(style) || !seed) return null;
  return { style, seed };
}

/** Путь вида /avatars/characters/{style}/{seed}.svg — обслуживается API-роутом. */
export function characterAvatarPublicPath(style: CharacterAvatarStyle, seed: string): string {
  return `/avatars/characters/${style}/${encodeURIComponent(seed)}.svg`;
}

export function generateRandomCharacterAvatars(count = 6): CharacterAvatarOption[] {
  const options: CharacterAvatarOption[] = [];
  const used = new Set<string>();

  while (options.length < count) {
    const style = STYLES[Math.floor(Math.random() * STYLES.length)];
    const seed = randomSeed();
    const id = buildCharacterAvatarId(style, seed);
    if (used.has(id)) continue;
    used.add(id);
    options.push({
      id,
      style,
      seed,
      dataUrl: buildCharacterAvatarDataUrl(style, seed),
      previewPath: characterAvatarPublicPath(style, seed),
    });
  }

  return options;
}

/** Распознать наш сгенерированный аватар (чтобы не перезаписывать фото из TG/VK). */
export function isGeneratedCharacterAvatar(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.includes('/avatars/characters/')) return true;
  if (trimmed.startsWith('data:image/svg+xml') && trimmed.includes('xmlns')) return true;
  return false;
}
