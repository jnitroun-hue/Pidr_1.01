'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Palette, Volume2, User, Check } from 'lucide-react';
import MenuThemePicker from '@/components/MenuThemePicker';
import { getApiHeaders } from '@/lib/api-headers';
import { appAlert } from '@/lib/app-notice';
import { themedPageShellStyle } from '@/lib/ui/menu-theme-client';

const SOUND_KEY = 'pidr_sound_enabled';
const NOTIFY_KEY = 'pidr_notifications_enabled';

function readFlag(key: string, fallback = true): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === '1' || raw === 'true';
  } catch {
    return fallback;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [username, setUsername] = useState('');
  const [draftName, setDraftName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    setSoundEnabled(readFlag(SOUND_KEY, true));
    setNotificationsEnabled(readFlag(NOTIFY_KEY, true));
    void fetch('/api/user/me', {
      credentials: 'include',
      headers: getApiHeaders(),
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((data) => {
        const name = data?.user?.username || data?.user?.first_name || '';
        if (name) {
          setUsername(name);
          setDraftName(name);
        }
      })
      .catch(() => {});
  }, []);

  const persistFlag = (key: string, value: boolean) => {
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const saveUsername = async () => {
    const next = draftName.trim();
    if (!next || next === username) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch('/api/user/username', {
        method: 'PATCH',
        credentials: 'include',
        headers: { ...getApiHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        await appAlert(data.message || 'Не удалось сохранить никнейм', { type: 'error' });
        return;
      }
      setUsername(next);
      setEditingName(false);
    } catch {
      await appAlert('Ошибка сети', { type: 'error' });
    } finally {
      setSavingName(false);
    }
  };

  const cardStyle = {
    width: '100%',
    background: 'var(--menu-card-bg)',
    border: '1px solid var(--menu-card-border)',
    borderRadius: 18,
    padding: 18,
    boxShadow: 'var(--menu-shadow)',
  } as const;

  const toggle = (on: boolean, onToggle: () => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{
        width: 48,
        height: 28,
        borderRadius: 999,
        border: 'none',
        background: on ? 'var(--menu-accent)' : 'rgba(148,163,184,0.35)',
        position: 'relative',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.18s ease',
        }}
      />
    </button>
  );

  return (
    <div className="main-menu-container" style={themedPageShellStyle({ overflow: 'auto' })}>
      <div className="main-menu-inner" style={{ maxWidth: 520, width: '100%' }}>
        <div className="menu-header">
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid var(--menu-card-border)',
              background: 'var(--menu-accent-soft)',
              color: 'var(--menu-text)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Назад
          </button>
          <span className="menu-title">НАСТРОЙКИ</span>
          <div className="w-6" />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...cardStyle, marginTop: 18 }}
        >
          <h3 style={{ color: 'var(--menu-accent)', fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette size={16} />
            ОФОРМЛЕНИЕ СТОЛА
          </h3>
          <p style={{ color: 'var(--menu-text-muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
            Тема применяется везде: главное меню, бургер, профиль, магазин и остальные экраны.
          </p>
          <MenuThemePicker compact />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ ...cardStyle, marginTop: 14 }}
        >
          <h3 style={{ color: 'var(--menu-accent)', fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Volume2 size={16} />
            ИГРА
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ color: 'var(--menu-text)', fontWeight: 700 }}>Звуки</div>
                <div style={{ color: 'var(--menu-text-muted)', fontSize: 12 }}>Эффекты за столом</div>
              </div>
              {toggle(soundEnabled, () => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                persistFlag(SOUND_KEY, next);
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ color: 'var(--menu-text)', fontWeight: 700 }}>Уведомления</div>
                <div style={{ color: 'var(--menu-text-muted)', fontSize: 12 }}>Ход, приглашения, платежи</div>
              </div>
              {toggle(notificationsEnabled, () => {
                const next = !notificationsEnabled;
                setNotificationsEnabled(next);
                persistFlag(NOTIFY_KEY, next);
              })}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ ...cardStyle, marginTop: 14, marginBottom: 28 }}
        >
          <h3 style={{ color: 'var(--menu-accent)', fontSize: 13, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} />
            ПРОФИЛЬ
          </h3>
          <div style={{ color: 'var(--menu-text)', fontWeight: 700, marginBottom: 6 }}>Никнейм за столом</div>
          {!editingName ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ color: 'var(--menu-text-muted)', fontSize: 14 }}>{username || 'Игрок'}</div>
              <button
                type="button"
                onClick={() => {
                  setDraftName(username);
                  setEditingName(true);
                }}
                style={{
                  border: '1px solid var(--menu-card-border)',
                  background: 'var(--menu-accent-soft)',
                  color: 'var(--menu-text)',
                  borderRadius: 12,
                  padding: '8px 14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Изменить
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value.slice(0, 20))}
                maxLength={20}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  border: '1px solid var(--menu-card-border)',
                  background: 'rgba(0,0,0,0.25)',
                  color: 'var(--menu-text)',
                  padding: '10px 12px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                disabled={savingName}
                onClick={() => void saveUsername()}
                style={{
                  border: 'none',
                  borderRadius: 12,
                  background: 'var(--menu-accent)',
                  color: '#0f172a',
                  padding: '10px 12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <Check size={16} />
              </button>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
