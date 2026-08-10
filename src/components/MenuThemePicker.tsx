'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Loader2, Palette, Sparkles, Check } from 'lucide-react';
import { getApiHeaders } from '@/lib/api-headers';
import { parseJsonResponse } from '@/lib/api/parse-json-response';
import { appAlert } from '@/lib/app-notice';
import { useLanguage } from '@/components/LanguageSwitcher';
import type { MenuThemeId } from '@/lib/ui/menuThemes';

interface ThemeOption {
  id: MenuThemeId;
  labelRu: string;
  labelEn: string;
  premium: boolean;
  locked: boolean;
  vars: Record<string, string>;
}

interface MenuThemePickerProps {
  compact?: boolean;
  onThemeApplied?: (themeId: MenuThemeId) => void;
}

export default function MenuThemePicker({ compact = false, onThemeApplied }: MenuThemePickerProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [themeId, setThemeId] = useState<MenuThemeId>('slate');
  const [isPremium, setIsPremium] = useState(false);
  const [options, setOptions] = useState<ThemeOption[]>([]);

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
        themeId?: MenuThemeId;
        isPremium?: boolean;
        available?: ThemeOption[];
        message?: string;
      }>(res);

      if (parsed.data?.success) {
        setThemeId(parsed.data.themeId || 'slate');
        setIsPremium(Boolean(parsed.data.isPremium));
        setOptions(parsed.data.available || []);
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

  const applyTheme = async (nextId: MenuThemeId | null, action: 'set' | 'generate') => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/menu-theme', {
        method: 'POST',
        credentials: 'include',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'generate' ? { action: 'generate' } : { themeId: nextId }),
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        themeId?: MenuThemeId;
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
      onThemeApplied?.(applied);
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
        borderRadius: compact ? 16 : 20,
        padding: compact ? 14 : 18,
        background: 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,41,59,0.88))',
        border: '1px solid rgba(148,163,184,0.22)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Palette size={20} color="#fff" />
          </div>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 800, fontSize: compact ? 15 : 17 }}>
              {language === 'en' ? 'Main menu themes' : 'Темы главного меню'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
              {isPremium
                ? (language === 'en' ? 'Premium: all themes + random' : 'Premium: все темы + генерация')
                : (language === 'en' ? 'Free themes available · Premium unlocks more' : 'Бесплатные темы · Premium открывает больше')}
            </div>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={saving}
          onClick={() => void applyTheme(null, 'generate')}
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
        {options.map((opt) => {
          const selected = opt.id === themeId;
          const label = language === 'en' ? opt.labelEn : opt.labelRu;
          return (
            <motion.button
              key={opt.id}
              whileHover={{ scale: opt.locked ? 1 : 1.02 }}
              whileTap={{ scale: opt.locked ? 1 : 0.98 }}
              disabled={saving || opt.locked}
              onClick={() => void applyTheme(opt.id, 'set')}
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
                  background: opt.vars['--menu-card-bg'],
                  border: `1px solid ${opt.vars['--menu-card-border']}`,
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
    </div>
  );
}
