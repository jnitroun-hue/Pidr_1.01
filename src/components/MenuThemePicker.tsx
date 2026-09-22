'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Loader2, Palette, Sparkles, Check } from 'lucide-react';
import { getApiHeaders } from '@/lib/api-headers';
import { parseJsonResponse } from '@/lib/api/parse-json-response';
import { appAlert } from '@/lib/app-notice';
import { useLanguage } from '@/components/LanguageSwitcher';
import CustomThemeStudio from '@/components/CustomThemeStudio';
import { applyMenuThemeToDocument } from '@/lib/ui/menu-theme-client';
import {
  buildCustomMenuTheme,
  parseCustomMenuTheme,
  type CustomMenuColors,
} from '@/lib/ui/menuThemes';

interface ThemeOption {
  id: string;
  labelRu: string;
  labelEn: string;
  premium: boolean;
  locked: boolean;
  vars: Record<string, string>;
}

interface MenuThemePickerProps {
  compact?: boolean;
  onThemeApplied?: (themeId: string) => void;
}

const CUSTOM_THEME_STORAGE_KEY = 'pidr_menu_theme_custom';
const DEFAULT_CUSTOM_COLORS: CustomMenuColors = {
  background: '#0f172a',
  button: '#312e81',
  outline: '#818cf8',
  buttonFinish: 'gradient',
  outlineMotion: 'snake',
};

function readSavedCustomColors(): CustomMenuColors | null {
  if (typeof window === 'undefined') return null;
  try {
    return parseCustomMenuTheme(localStorage.getItem(CUSTOM_THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

function rememberCustomTheme(themeId: string) {
  const colors = parseCustomMenuTheme(themeId);
  if (!colors || typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_THEME_STORAGE_KEY, themeId);
  } catch {
    /* ignore */
  }
}

export default function MenuThemePicker({ compact = false, onThemeApplied }: MenuThemePickerProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themeId, setThemeId] = useState('slate');
  const [isPremium, setIsPremium] = useState(false);
  const [options, setOptions] = useState<ThemeOption[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<CustomMenuColors>(DEFAULT_CUSTOM_COLORS);
  const [savedCustom, setSavedCustom] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/menu-theme', {
        credentials: 'include',
        headers: getApiHeaders(),
        cache: 'no-store',
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        themeId?: string;
        isPremium?: boolean;
        available?: ThemeOption[];
        message?: string;
      }>(res);

      if (parsed.data?.success) {
        const nextId = parsed.data.themeId || 'slate';
        setThemeId(nextId);
        setIsPremium(Boolean(parsed.data.isPremium));
        setOptions(parsed.data.available || []);
        if (parseCustomMenuTheme(nextId)) {
          setSavedCustom(nextId);
          setDraft(parseCustomMenuTheme(nextId) || DEFAULT_CUSTOM_COLORS);
          rememberCustomTheme(nextId);
        } else {
          const remembered = readSavedCustomColors();
          setSavedCustom(remembered ? localStorage.getItem(CUSTOM_THEME_STORAGE_KEY) : null);
        }
      }
    } catch (error) {
      console.error('menu theme load:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applySavedTheme = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/menu-theme', {
        method: 'POST',
        credentials: 'include',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        themeId?: string;
        requiresPremium?: boolean;
        message?: string;
      }>(res);

      if (!parsed.data?.success) {
        if (parsed.data?.requiresPremium) {
          await appAlert(language === 'en'
            ? 'This theme requires Premium'
            : 'Эта тема доступна только с Premium');
        } else {
          await appAlert(parsed.data?.message || (language === 'en' ? 'Failed to save theme' : 'Не удалось сохранить тему'));
        }
        return;
      }

      const applied = parsed.data.themeId || 'slate';
      setThemeId(applied);
      if (parseCustomMenuTheme(applied)) {
        setSavedCustom(applied);
        setDraft(parseCustomMenuTheme(applied) || DEFAULT_CUSTOM_COLORS);
        rememberCustomTheme(applied);
      }
      applyMenuThemeToDocument(applied);
      onThemeApplied?.(applied);
      setEditorOpen(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pidr-menu-theme', { detail: { themeId: applied } }));
      }
    } catch (error) {
      console.error('menu theme save:', error);
      await appAlert(language === 'en' ? 'Network error' : 'Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  const customColors = parseCustomMenuTheme(savedCustom);
  const customTheme = customColors ? buildCustomMenuTheme(customColors) : null;
  const themeChoices: ThemeOption[] = [
    ...(customTheme && savedCustom && isPremium
      ? [{
          id: savedCustom,
          labelRu: customTheme.labelRu,
          labelEn: customTheme.labelEn,
          premium: true,
          locked: false,
          vars: customTheme.vars as ThemeOption['vars'],
        }]
      : []),
    ...options.filter((option) => option.id !== savedCustom),
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24, color: '#94a3b8' }}>
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: compact ? 0 : 20,
        padding: compact ? 0 : 18,
        background: compact ? 'transparent' : 'var(--menu-card-bg)',
        border: compact ? 'none' : '1px solid var(--menu-card-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!compact && (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--menu-accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Palette size={20} color="var(--menu-accent)" />
            </div>
          )}
          <div>
            <div style={{ color: 'var(--menu-text)', fontWeight: 800, fontSize: compact ? 15 : 17 }}>
              {language === 'en' ? 'App theme' : 'Тема оформления'}
            </div>
            <div style={{ color: 'var(--menu-text-muted)', fontSize: 12, marginTop: 2 }}>
              {isPremium
                ? (language === 'en' ? 'Applies to every screen, including the burger menu' : 'Действует на всех экранах, включая бургер-меню')
                : (language === 'en' ? 'Free themes everywhere · Premium unlocks Gold and more' : 'Бесплатные темы везде · Premium открывает золото и другие')}
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={saving}
          onClick={() => {
            if (!isPremium) {
              void appAlert(language === 'en'
                ? 'Custom themes are available with Premium'
                : 'Своя тема доступна только с Premium');
              return;
            }
            setDraft(parseCustomMenuTheme(themeId) || parseCustomMenuTheme(savedCustom) || DEFAULT_CUSTOM_COLORS);
            setEditorOpen(true);
          }}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '10px 14px',
            cursor: saving ? 'wait' : 'pointer',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {language === 'en' ? 'Generate' : 'Сгенерировать'}
        </motion.button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {themeChoices.map((opt) => {
          const selected = opt.id === themeId;
          const label = language === 'en' ? opt.labelEn : opt.labelRu;
          return (
            <motion.button
              key={opt.id}
              whileHover={{ scale: opt.locked ? 1 : 1.02 }}
              whileTap={{ scale: opt.locked ? 1 : 0.98 }}
              disabled={saving || opt.locked}
              onClick={() => void applySavedTheme({ themeId: opt.id })}
              style={{
                textAlign: 'left',
                borderRadius: 14,
                padding: 10,
                cursor: opt.locked ? 'not-allowed' : 'pointer',
                border: selected
                  ? `2px solid ${opt.vars['--menu-accent'] || '#6366f1'}`
                  : '1px solid rgba(148,163,184,0.2)',
                background: opt.vars['--menu-bg'] || '#0f172a',
                opacity: opt.locked ? 0.55 : 1,
                position: 'relative',
                minHeight: 88,
                boxShadow: selected ? '0 0 0 1px rgba(255,255,255,0.08)' : undefined,
              }}
            >
              <div
                style={{
                  height: 28,
                  borderRadius: 8,
                  marginBottom: 8,
                  background: opt.vars['--menu-button-bg'] || opt.vars['--menu-card-bg'],
                  border: `2px solid ${opt.vars['--menu-button-border'] || opt.vars['--menu-card-border']}`,
                }}
              />
              <div style={{ color: opt.vars['--menu-text'], fontWeight: 800, fontSize: 13 }}>{label}</div>
              <div style={{ color: opt.vars['--menu-text-muted'], fontSize: 11, marginTop: 2 }}>
                {opt.premium ? 'Premium' : (language === 'en' ? 'Free' : 'Бесплатно')}
              </div>
              {selected && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: opt.vars['--menu-accent'],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={14} color="#0f172a" />
                </div>
              )}
              {opt.locked && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: '#fde68a',
                  }}
                >
                  <Crown size={16} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {editorOpen && (
        <CustomThemeStudio
          language={language}
          draft={draft}
          saving={saving}
          onChange={setDraft}
          onClose={() => {
            if (!saving) setEditorOpen(false);
          }}
          onApply={() => void applySavedTheme({
            action: 'custom',
            background: draft.background,
            button: draft.button,
            outline: draft.outline,
            buttonFinish: draft.buttonFinish,
            outlineMotion: draft.outlineMotion,
          })}
        />
      )}
    </div>
  );
}
