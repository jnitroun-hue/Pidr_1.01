export const PREMIUM_FLAME_STORAGE_KEY = 'pidr_premium_flame';
export const PREMIUM_FLAME_CHANGED_EVENT = 'pidr-flame-changed';

export const PREMIUM_FLAME_COLORS = [
  { id: 'red', labelRu: 'Красный', labelEn: 'Red', hot: '#fff7ed', mid: '#fb923c', core: '#ef4444', base: '#7f1d1d' },
  { id: 'orange', labelRu: 'Оранжевый', labelEn: 'Orange', hot: '#fffbeb', mid: '#fb923c', core: '#ea580c', base: '#7c2d12' },
  { id: 'gold', labelRu: 'Золотой', labelEn: 'Gold', hot: '#fffbeb', mid: '#fbbf24', core: '#d97706', base: '#78350f' },
  { id: 'yellow', labelRu: 'Жёлтый', labelEn: 'Yellow', hot: '#fefce8', mid: '#facc15', core: '#eab308', base: '#713f12' },
  { id: 'green', labelRu: 'Зелёный', labelEn: 'Green', hot: '#ecfdf5', mid: '#4ade80', core: '#16a34a', base: '#14532d' },
  { id: 'blue', labelRu: 'Синий', labelEn: 'Blue', hot: '#eff6ff', mid: '#38bdf8', core: '#2563eb', base: '#1e3a8a' },
  { id: 'cyan', labelRu: 'Голубой', labelEn: 'Cyan', hot: '#ecfeff', mid: '#22d3ee', core: '#0891b2', base: '#164e63' },
  { id: 'purple', labelRu: 'Фиолетовый', labelEn: 'Purple', hot: '#faf5ff', mid: '#c084fc', core: '#7c3aed', base: '#4c1d95' },
  { id: 'pink', labelRu: 'Розовый', labelEn: 'Pink', hot: '#fdf2f8', mid: '#f472b6', core: '#db2777', base: '#831843' },
  { id: 'white', labelRu: 'Белый', labelEn: 'White', hot: '#ffffff', mid: '#e2e8f0', core: '#94a3b8', base: '#334155' },
] as const;

export type PremiumFlameColorId = (typeof PREMIUM_FLAME_COLORS)[number]['id'];

export const DEFAULT_PREMIUM_FLAME: PremiumFlameColorId = 'gold';

export function isPremiumFlameColorId(value: unknown): value is PremiumFlameColorId {
  return typeof value === 'string' && PREMIUM_FLAME_COLORS.some((c) => c.id === value);
}

export function resolvePremiumFlame(value: unknown): PremiumFlameColorId {
  return isPremiumFlameColorId(value) ? value : DEFAULT_PREMIUM_FLAME;
}

export function getFlamePalette(id: PremiumFlameColorId | string | null | undefined) {
  const resolved = resolvePremiumFlame(id);
  return PREMIUM_FLAME_COLORS.find((c) => c.id === resolved)!;
}

export function readStoredFlameColor(): PremiumFlameColorId {
  if (typeof window === 'undefined') return DEFAULT_PREMIUM_FLAME;
  try {
    return resolvePremiumFlame(localStorage.getItem(PREMIUM_FLAME_STORAGE_KEY));
  } catch {
    return DEFAULT_PREMIUM_FLAME;
  }
}

export function storeFlameColor(id: PremiumFlameColorId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREMIUM_FLAME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(PREMIUM_FLAME_CHANGED_EVENT, { detail: { color: id } }));
}
