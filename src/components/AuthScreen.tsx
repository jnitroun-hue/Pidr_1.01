'use client';

import type { ReactNode } from 'react';
import styles from '@/app/auth/page.module.css';

export default function AuthScreen({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.page} auth-screen`}>
      <div className={styles.layout}>
        <aside className={styles.hero}>
          <p className={styles.heroKicker}>The Must</p>
          <h2 className={styles.heroTitle}>Играйте в браузере своим аккаунтом</h2>
          <p className={styles.heroText}>
            Telegram, VK или логин с паролем. Рейтинг, друзья и карты остаются на том же профиле.
          </p>
          <ul className={styles.heroPoints}>
            <li>Telegram — кнопка виджета на этой странице</li>
            <li>VK — обычный вход через аккаунт ВКонтакте</li>
            <li>Свой логин — если регистрировались на сайте</li>
          </ul>
        </aside>
        <div className={styles.card}>{children}</div>
      </div>
    </div>
  );
}
