'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import { getApiHeaders } from '@/lib/api-headers';
import { parseJsonResponse } from '@/lib/api/parse-json-response';
import { appAlert } from '@/lib/app-notice';
import { useLanguage } from '@/components/LanguageSwitcher';

interface AvatarOption {
  id: string;
  style: string;
  seed: string;
  dataUrl: string;
  previewPath: string;
}

interface AvatarGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onSelected: (avatarUrl: string) => void;
}

export default function AvatarGeneratorModal({ open, onClose, onSelected }: AvatarGeneratorModalProps) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState<AvatarOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setSelectedId(null);
    try {
      const res = await fetch('/api/user/avatar/random?count=6', {
        credentials: 'include',
        headers: getApiHeaders(),
        cache: 'no-store',
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        options?: AvatarOption[];
        message?: string;
      }>(res);

      if (!parsed.data?.success || !parsed.data.options?.length) {
        await appAlert(parsed.data?.message || (language === 'en' ? 'Failed to generate' : 'Не удалось сгенерировать'));
        return;
      }
      setOptions(parsed.data.options);
    } catch (error) {
      console.error('avatar generate:', error);
      await appAlert(language === 'en' ? 'Network error' : 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (open) {
      void generate();
    }
  }, [open, generate]);

  const confirm = async () => {
    const opt = options.find((o) => o.id === selectedId);
    if (!opt) return;
    setSaving(true);
    try {
      // Сохраняем стабильный публичный путь SVG (offline) + fallback dataUrl через API
      const avatarUrl = opt.previewPath;
      const res = await fetch('/api/user/avatar', {
        method: 'POST',
        credentials: 'include',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });
      const parsed = await parseJsonResponse<{
        success?: boolean;
        data?: { avatar_url?: string };
        message?: string;
      }>(res);

      if (!parsed.data?.success) {
        await appAlert(parsed.data?.message || (language === 'en' ? 'Failed to save avatar' : 'Не удалось сохранить аватар'));
        return;
      }

      const saved = parsed.data.data?.avatar_url || avatarUrl;
      onSelected(saved);
      onClose();
    } catch (error) {
      console.error('avatar save:', error);
      await appAlert(language === 'en' ? 'Network error' : 'Ошибка сети');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 12000,
            background: 'rgba(2, 6, 23, 0.72)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 12,
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              background: 'linear-gradient(165deg, #0f172a 0%, #1e293b 100%)',
              border: '1px solid rgba(148,163,184,0.25)',
              padding: 18,
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ color: '#f8fafc', fontWeight: 900, fontSize: 18, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#38bdf8" />
                  {language === 'en' ? '3D character' : '3D-персонаж'}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                  {language === 'en'
                    ? 'Pick a random DiceBear character (offline SVG)'
                    : 'Выберите случайного персонажа DiceBear (SVG офлайн)'}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  border: 'none',
                  background: 'rgba(148,163,184,0.15)',
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  cursor: 'pointer',
                  color: '#e2e8f0',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40, color: '#94a3b8' }}>
                <Loader2 size={28} className="animate-spin" />
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {options.map((opt) => {
                  const selected = selectedId === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedId(opt.id)}
                      style={{
                        borderRadius: 16,
                        padding: 8,
                        border: selected ? '2px solid #38bdf8' : '1px solid rgba(148,163,184,0.25)',
                        background: selected ? 'rgba(56,189,248,0.12)' : 'rgba(15,23,42,0.8)',
                        cursor: 'pointer',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={opt.dataUrl}
                        alt={opt.id}
                        style={{
                          width: '100%',
                          aspectRatio: '1',
                          borderRadius: 12,
                          background: '#0b1220',
                          display: 'block',
                        }}
                      />
                      <div style={{ color: '#64748b', fontSize: 10, marginTop: 6, textTransform: 'capitalize' }}>
                        {opt.style}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading || saving}
                onClick={() => void generate()}
                style={{
                  flex: 1,
                  minWidth: 120,
                  border: '1px solid rgba(148,163,184,0.3)',
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: 'rgba(30,41,59,0.9)',
                  color: '#e2e8f0',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <RefreshCw size={16} />
                {language === 'en' ? 'Again' : 'Ещё'}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: selectedId ? 1.02 : 1 }}
                whileTap={{ scale: selectedId ? 0.98 : 1 }}
                disabled={!selectedId || saving || loading}
                onClick={() => void confirm()}
                style={{
                  flex: 1.4,
                  minWidth: 140,
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 14px',
                  background: selectedId
                    ? 'linear-gradient(135deg, #0ea5e9, #6366f1)'
                    : 'rgba(71,85,105,0.7)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: selectedId ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {language === 'en' ? 'Use avatar' : 'Выбрать'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
