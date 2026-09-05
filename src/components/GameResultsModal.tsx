'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  Crown,
  Home,
  Medal,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserRound,
} from 'lucide-react';
import { useLanguage } from './LanguageSwitcher';
import { translateGameText } from '@/lib/i18n/gameRuntimeTranslations';
import { PidrCoinAmount } from '@/components/PidrCoinIcon';
import styles from './GameResultsModal.module.css';

interface PlayerResult {
  place: number;
  name: string;
  avatar?: string;
  coinsEarned: number;
  ratingChange?: number;
  isUser: boolean;
}

interface GameResultsModalProps {
  results: PlayerResult[];
  isRanked: boolean;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

const podiumIcon = {
  1: Crown,
  2: Medal,
  3: Award,
} as const;

export default function GameResultsModal({
  results,
  isRanked,
  onPlayAgain,
  onMainMenu,
}: GameResultsModalProps) {
  const { language } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsVisible(true), 100);
    return () => window.clearTimeout(timer);
  }, []);

  const userResult = results.find((player) => player.isUser);
  const topThree = results.filter((player) => player.place <= 3);
  const remainingResults = results.filter((player) => player.place > 3);

  const getPodiumClass = (place: number) => {
    if (place === 1) return styles.firstPlace;
    if (place === 2) return styles.secondPlace;
    return styles.thirdPlace;
  };

  return (
    <div
      className={`${styles.overlay} ${isVisible ? styles.visible : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-results-title"
    >
      <section className={styles.modal}>
        <header className={styles.header}>
          <div className={styles.titleIcon} aria-hidden="true">
            <Trophy size={22} strokeWidth={2.2} />
          </div>
          <div className={styles.heading}>
            <h2 id="game-results-title" className={styles.title}>
              {translateGameText('Результаты игры', language)}
            </h2>
            {isRanked && (
              <div className={styles.mode}>
                <TrendingUp size={14} aria-hidden="true" />
                {translateGameText('Рейтинговая игра', language)}
              </div>
            )}
          </div>
        </header>

        <div className={styles.scrollArea}>
          {userResult && (
            <section className={styles.userSummary}>
              <div className={styles.userIdentity}>
                <div className={styles.avatarLarge}>
                  {userResult.avatar ? (
                    <img src={userResult.avatar} alt="" />
                  ) : (
                    <UserRound size={28} aria-hidden="true" />
                  )}
                </div>
                <div className={styles.userName}>
                  <span className={styles.youBadge}>{translateGameText('ВЫ', language)}</span>
                  <strong>{userResult.name}</strong>
                </div>
              </div>
              <div className={styles.summaryStats}>
                <div className={styles.summaryStat}>
                  <span>{translateGameText('Место', language)}</span>
                  <strong>#{userResult.place}</strong>
                </div>
                <div className={styles.summaryStat}>
                  <span>{translateGameText('Награда', language)}</span>
                  <strong className={userResult.coinsEarned < 0 ? styles.negative : styles.positive}>
                    <PidrCoinAmount
                      value={`${userResult.coinsEarned > 0 ? '+' : ''}${userResult.coinsEarned}`}
                      size={19}
                    />
                  </strong>
                </div>
                {isRanked && userResult.ratingChange !== undefined && (
                  <div className={styles.summaryStat}>
                    <span>{translateGameText('Рейтинг', language)}</span>
                    <strong className={userResult.ratingChange < 0 ? styles.negative : styles.positive}>
                      {userResult.ratingChange < 0 ? (
                        <TrendingDown size={17} aria-hidden="true" />
                      ) : (
                        <TrendingUp size={17} aria-hidden="true" />
                      )}
                      {userResult.ratingChange > 0 ? '+' : ''}
                      {userResult.ratingChange}
                    </strong>
                  </div>
                )}
              </div>
            </section>
          )}

          {topThree.length > 0 && (
            <section className={styles.podium} aria-label={translateGameText('Результаты игры', language)}>
              {topThree.map((player, index) => {
                const PlaceIcon = podiumIcon[player.place as keyof typeof podiumIcon] ?? Medal;
                return (
                  <article
                    key={index}
                    className={`${styles.podiumCard} ${getPodiumClass(player.place)} ${
                      player.isUser ? styles.currentUser : ''
                    }`}
                  >
                    <div className={styles.podiumRank}>
                      <PlaceIcon size={18} aria-hidden="true" />
                      <span>#{player.place}</span>
                    </div>
                    <div className={styles.avatar}>
                      {player.avatar ? (
                        <img src={player.avatar} alt="" />
                      ) : (
                        <UserRound size={22} aria-hidden="true" />
                      )}
                    </div>
                    <div className={styles.playerInfo}>
                      <strong>{player.name}</strong>
                      <span>
                        {translateGameText(
                          player.place === results.length ? 'Проигравший' : `${player.place}-е место`,
                          language,
                        )}
                      </span>
                    </div>
                    <div className={`${styles.reward} ${player.coinsEarned < 0 ? styles.negative : ''}`}>
                      <PidrCoinAmount
                        value={`${player.coinsEarned > 0 ? '+' : ''}${player.coinsEarned}`}
                        size={16}
                      />
                    </div>
                    {isRanked && player.ratingChange !== undefined && (
                      <div className={`${styles.rating} ${player.ratingChange < 0 ? styles.negative : ''}`}>
                        {player.ratingChange < 0 ? (
                          <TrendingDown size={14} aria-hidden="true" />
                        ) : (
                          <TrendingUp size={14} aria-hidden="true" />
                        )}
                        {player.ratingChange > 0 ? '+' : ''}
                        {player.ratingChange}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}

          {remainingResults.length > 0 && (
            <section className={styles.remainingList}>
              <div className={styles.listHeader}>
                <span>{translateGameText('Место', language)}</span>
                <span>{translateGameText('Награда', language)}</span>
              </div>
              {remainingResults.map((player, index) => (
                <article
                  key={index}
                  className={`${styles.resultRow} ${player.isUser ? styles.currentUser : ''}`}
                >
                  <span className={styles.rowPlace}>{player.place}</span>
                  <div className={styles.avatarSmall}>
                    {player.avatar ? (
                      <img src={player.avatar} alt="" />
                    ) : (
                      <UserRound size={17} aria-hidden="true" />
                    )}
                  </div>
                  <div className={styles.rowName}>
                    <strong>{player.name}</strong>
                    {player.isUser && <span>{translateGameText('ВЫ', language)}</span>}
                  </div>
                  <div className={`${styles.reward} ${player.coinsEarned < 0 ? styles.negative : ''}`}>
                    <PidrCoinAmount
                      value={`${player.coinsEarned > 0 ? '+' : ''}${player.coinsEarned}`}
                      size={15}
                    />
                  </div>
                  {isRanked && player.ratingChange !== undefined && (
                    <div className={`${styles.rating} ${player.ratingChange < 0 ? styles.negative : ''}`}>
                      {player.ratingChange > 0 ? '+' : ''}
                      {player.ratingChange}
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}
        </div>

        <footer className={styles.actions}>
          <button
            onClick={onPlayAgain}
            className={`${styles.actionButton} ${styles.primaryAction}`}
            type="button"
          >
            <RotateCcw size={18} strokeWidth={2.3} aria-hidden="true" />
            {translateGameText('Заново', language)}
          </button>
          <button
            onClick={onMainMenu}
            className={`${styles.actionButton} ${styles.secondaryAction}`}
            type="button"
          >
            <Home size={18} strokeWidth={2.3} aria-hidden="true" />
            {translateGameText('В меню', language)}
          </button>
        </footer>
      </section>
    </div>
  );
}

