'use client';

import type { CSSProperties } from 'react';
import { X, Palette } from 'lucide-react';
import {
  CUSTOM_THEME_SWATCHES,
  buildCustomMenuTheme,
  type ButtonFinish,
  type CustomMenuColors,
  type OutlineMotion,
} from '@/lib/ui/menuThemes';
import styles from './CustomThemeStudio.module.css';

const BUTTON_FINISHES: Array<{ id: ButtonFinish; ru: string; en: string }> = [
  { id: 'solid', ru: 'Ровная', en: 'Flat' },
  { id: 'gradient', ru: 'Перелив', en: 'Gradient' },
  { id: 'shimmer', ru: 'Мерцание', en: 'Shimmer' },
  { id: 'both', ru: 'Оба', en: 'Both' },
];

const OUTLINE_MOTIONS: Array<{ id: OutlineMotion; ru: string; en: string }> = [
  { id: 'still', ru: 'Ровный', en: 'Still' },
  { id: 'snake', ru: 'Змейка', en: 'Snake' },
  { id: 'orbit', ru: 'По кругу', en: 'Orbit' },
];

export default function CustomThemeStudio({
  language,
  draft,
  saving,
  onChange,
  onClose,
  onApply,
}: {
  language: string;
  draft: CustomMenuColors;
  saving: boolean;
  onChange: (next: CustomMenuColors) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const en = language === 'en';
  const preview = buildCustomMenuTheme(draft);
  const finish = draft.buttonFinish || 'gradient';
  const motion = draft.outlineMotion || 'still';

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={en ? 'Custom theme' : 'Своя тема'}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <div className={styles.titleIcon}>
              <Palette size={18} />
            </div>
            <div>
              <h2>{en ? 'Custom theme' : 'Своя тема'}</h2>
              <p>
                {en
                  ? 'Background, buttons, and a living outline. Applied everywhere, like the built-in themes.'
                  : 'Фон, кнопки и живой контур. Тема применяется везде, как и готовые.'}
              </p>
            </div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label={en ? 'Close' : 'Закрыть'}>
            <X size={16} />
          </button>
        </header>

        <div className={styles.body}>
          {preview && (
            <div
              className={styles.stage}
              style={preview.vars as CSSProperties}
              data-menu-button-finish={finish}
              data-menu-outline-motion={motion}
            >
              <p className={styles.stageLabel}>{en ? 'Preview' : 'Предпросмотр'}</p>
              {(en ? ['Play', 'Profile'] : ['Играть', 'Профиль']).map((label) => (
                <div key={label} className={`menuThemeButton ${styles.previewButton}`}>
                  <span className="menuThemeFlow" aria-hidden />
                  <span className="menuThemeSheen" aria-hidden />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          )}

          <SwatchSection
            title={en ? 'Background' : 'Фон'}
            selected={draft.background}
            onPick={(background) => onChange({ ...draft, background })}
          />
          <SwatchSection
            title={en ? 'Buttons' : 'Кнопки'}
            selected={draft.button}
            onPick={(button) => onChange({ ...draft, button })}
          />
          <div className={styles.section}>
            <h3>{en ? 'Button surface' : 'Заливка кнопок'}</h3>
            <div className={styles.choices}>
              {BUTTON_FINISHES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.choice} ${finish === item.id ? styles.choiceOn : ''}`}
                  onClick={() => onChange({ ...draft, buttonFinish: item.id })}
                >
                  {en ? item.en : item.ru}
                </button>
              ))}
            </div>
          </div>
          <SwatchSection
            title={en ? 'Outline' : 'Контур кнопок'}
            selected={draft.outline}
            tone="sheen"
            onPick={(outline) => onChange({ ...draft, outline })}
          />
          <div className={styles.section}>
            <h3>{en ? 'Outline motion' : 'Движение контура'}</h3>
            <div className={styles.choices}>
              {OUTLINE_MOTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.choice} ${motion === item.id ? styles.choiceOn : ''}`}
                  onClick={() => onChange({ ...draft, outlineMotion: item.id })}
                >
                  {en ? item.en : item.ru}
                </button>
              ))}
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onClose} disabled={saving}>
            {en ? 'Cancel' : 'Отмена'}
          </button>
          <button type="button" className={styles.apply} onClick={onApply} disabled={saving || !preview}>
            {saving ? (en ? 'Saving…' : 'Сохраняем…') : (en ? 'Apply theme' : 'Применить тему')}
          </button>
        </footer>
      </div>
    </div>
  );
}

function SwatchSection({
  title,
  selected,
  tone = 'base',
  onPick,
}: {
  title: string;
  selected: string;
  tone?: 'base' | 'sheen';
  onPick: (hex: string) => void;
}) {
  return (
    <section className={styles.section}>
      <h3>{title}</h3>
      <div className={styles.swatches}>
        {CUSTOM_THEME_SWATCHES.map((swatch) => {
          const value = tone === 'sheen' ? swatch.sheen : swatch.base;
          const active = selected.toLowerCase() === value;
          return (
            <button
              key={swatch.id}
              type="button"
              className={`${styles.swatch} ${active ? styles.swatchSelected : ''}`}
              style={{ ['--swatch-base' as string]: swatch.base, ['--swatch-sheen' as string]: swatch.sheen }}
              aria-label={swatch.label}
              aria-pressed={active}
              onClick={() => onPick(value)}
            />
          );
        })}
      </div>
    </section>
  );
}
