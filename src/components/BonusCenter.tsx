'use client';

import { useEffect, useState } from 'react';
import PidrCoinIcon from '@/components/PidrCoinIcon';
import styles from './BonusCenter.module.css';

export interface ProfileBonus {
  id: string;
  name: string;
  description: string;
  reward: string;
  icon: string;
  available: boolean;
  completed?: boolean;
  configured?: boolean;
  cooldownUntil?: string | Date | null;
  referrals?: number;
  nextRank?: string;
  link?: string | null;
  note?: string;
}

interface Props {
  bonuses: ProfileBonus[];
  claimingId?: string | null;
  onAction: (bonusId: string) => void | Promise<void>;
}

function cooldownLabel(value?: string | Date | null) {
  if (!value) return 'Награда временно недоступна';
  const remaining = new Date(value).getTime() - Date.now();
  if (remaining <= 0) return 'Можно получить после обновления';
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.ceil((remaining % 3_600_000) / 60_000);
  return `Следующая награда через ${hours} ч. ${minutes} мин.`;
}

function Cooldown({ until }: { until?: string | Date | null }) {
  const [, refresh] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => refresh((value) => value + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return <>{cooldownLabel(until)}</>;
}

export default function BonusCenter({ bonuses, claimingId, onAction }: Props) {
  return (
    <section className={styles.wrap} aria-label="Центр бонусов">
      <header className={styles.hero}>
        <div className={styles.eyebrow}>НАГРАДЫ И АКТИВНОСТИ</div>
        <h3 className={styles.title}>Центр бонусов</h3>
        <p className={styles.subtitle}>
          Получайте ежедневные награды, приглашайте друзей и подтверждайте подписки.
          Все начисления проверяются сервером и сохраняются в истории.
        </p>
      </header>

      <div className={styles.grid}>
        {bonuses.map((bonus) => {
          const isReferral = bonus.id === 'referral';
          const isSocial = bonus.id === 'telegram_subscribe' || bonus.id === 'vk_subscribe';
          const isConfigured = bonus.configured !== false;
          const isLoading = claimingId === bonus.id;
          const cardClass = [
            styles.card,
            bonus.available ? styles.cardAvailable : '',
            bonus.completed ? styles.cardCompleted : '',
          ].filter(Boolean).join(' ');

          return (
            <article key={bonus.id} className={cardClass}>
              <div className={styles.top}>
                <div className={styles.icon}>{bonus.icon}</div>
                <div>
                  <h4 className={styles.name}>{bonus.name}</h4>
                  <p className={styles.description}>{bonus.description}</p>
                </div>
              </div>

              <div className={styles.reward}>
                <PidrCoinIcon size={18} alt="" />
                {bonus.reward}
              </div>

              <div className={styles.meta}>
                {bonus.id === 'daily' && !bonus.available ? (
                  <Cooldown until={bonus.cooldownUntil} />
                ) : bonus.id === 'referral' ? (
                  <>Приглашено друзей: {bonus.referrals || 0}. {bonus.note}</>
                ) : (
                  bonus.note
                )}
              </div>

              {bonus.completed ? (
                <div className={`${styles.status} ${styles.done}`}>✓ Бонус уже получен</div>
              ) : !isConfigured ? (
                <div className={styles.status}>Настраивается администратором</div>
              ) : isReferral || bonus.available ? (
                <button
                  type="button"
                  className={`${styles.action} ${isReferral ? styles.actionReferral : ''}`}
                  disabled={Boolean(claimingId)}
                  onClick={() => void onAction(bonus.id)}
                >
                  {isLoading
                    ? 'Проверяем…'
                    : isReferral
                      ? 'Пригласить друга'
                      : isSocial
                        ? 'Открыть и проверить подписку'
                        : bonus.id === 'daily'
                          ? 'Получить награду'
                          : 'Получить'}
                </button>
              ) : (
                <div className={styles.status}>
                  {bonus.id === 'rank_up' ? 'Начисляется автоматически' : 'Сейчас недоступно'}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
