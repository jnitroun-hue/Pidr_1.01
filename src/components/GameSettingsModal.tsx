'use client';

import { useEffect, useState } from 'react';
import { Bell, Palette, Settings, Volume2, X } from 'lucide-react';
import MenuThemePicker from '@/components/MenuThemePicker';
import PremiumFlamePicker from '@/components/PremiumFlamePicker';
import {
  persistSoundEnabled,
  playTakeSfx,
  SOUND_ENABLED_KEY,
} from '@/lib/audio/game-sfx';
import type { PremiumFlameColorId } from '@/lib/premium/flame';
import styles from './GameSettingsModal.module.css';

const NOTIFICATIONS_KEY = 'pidr_notifications_enabled';

function readFlag(key: string, fallback = true) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : raw === '1' || raw === 'true';
  } catch {
    return fallback;
  }
}

type Props = {
  isOpen: boolean;
  isPremium: boolean;
  onClose: () => void;
  onFlameChanged?: (color: PremiumFlameColorId) => void;
};

export default function GameSettingsModal({
  isOpen,
  isPremium,
  onClose,
  onFlameChanged,
}: Props) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setSoundEnabled(readFlag(SOUND_ENABLED_KEY));
    setNotificationsEnabled(readFlag(NOTIFICATIONS_KEY));
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    persistSoundEnabled(next);
    if (next) playTakeSfx({ preview: true });
  };

  const toggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, next ? '1' : '0');
    } catch {
      // Storage can be unavailable in restricted webviews.
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Настройки игры"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <span className={styles.titleIcon}><Settings size={19} /></span>
            <div>
              <h2>Настройки игры</h2>
              <p>Изменения применяются сразу, партия не прерывается</p>
            </div>
          </div>
          <button className={styles.close} type="button" onClick={onClose} aria-label="Закрыть">
            <X size={19} />
          </button>
        </header>

        <div className={styles.content}>
          <div className={styles.section}>
            <div className={styles.sectionLabel}><Palette size={15} /> Оформление</div>
            <MenuThemePicker compact />
          </div>

          <div className={styles.section}>
            <PremiumFlamePicker
              isPremium={isPremium}
              compact
              onChanged={onFlameChanged}
            />
          </div>

          <div className={styles.section}>
            <div className={styles.settingRow}>
              <div className={styles.settingCopy}>
                <Volume2 size={18} />
                <span><strong>Звуки</strong><small>Эффекты карт и раздачи</small></span>
              </div>
              <Switch checked={soundEnabled} onClick={toggleSound} label="Звуки" />
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingCopy}>
                <Bell size={18} />
                <span><strong>Уведомления</strong><small>Ходы, приглашения и платежи</small></span>
              </div>
              <Switch checked={notificationsEnabled} onClick={toggleNotifications} label="Уведомления" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Switch({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
      onClick={onClick}
    >
      <span />
    </button>
  );
}
