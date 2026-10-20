'use client';

import type { ReelSpeed } from '@/lib/slots/speed';
import styles from './GameConsole.module.css';

type Props = {
  gameId: string;
  locked: boolean;
  spinning: boolean;
  showLines: boolean;
  ante: boolean;
  autoLeft: number;
  speed: ReelSpeed;
  stakeLabel: string;
  balanceLabel: string;
  winLabel: string;
  winHot: boolean;
  onBuy: () => void;
  onToggleLines: () => void;
  onSpin: () => void;
  onAuto: () => void;
  onInfo: () => void;
  onSpeed: () => void;
  onAnte: () => void;
  onBet: (dir: -1 | 1) => void;
};

type Theme = {
  spin: string;
  bg: string;
  panel: string;
  accent: string;
  ink: string;
  text: string;
};

const THEME: Record<string, Theme> = {
  'golden-must': { spin: 'КРУТИТЬ', bg: '#140c08', panel: '#3a2412', accent: '#f5c518', ink: '#2a1608', text: '#fff6d8' },
  'hex-vault': { spin: 'ОТКРЫТЬ', bg: '#100c0a', panel: '#2c2118', accent: '#fb923c', ink: '#1c1008', text: '#ffedd5' },
  'oak-fortune': { spin: 'КРУТИТЬ', bg: '#0c140c', panel: '#1c3016', accent: '#a3e635', ink: '#14240c', text: '#ecfccb' },
  'neon-river': { spin: 'ПУСК', bg: '#041018', panel: '#0c3040', accent: '#22d3ee', ink: '#042028', text: '#cffafe' },
  'limitless-city': { spin: 'ИГРАТЬ', bg: '#12060c', panel: '#3a1020', accent: '#fb7185', ink: '#1a0610', text: '#ffe4e6' },
  'green-arrow': { spin: 'ЗАЛП', bg: '#0c140e', panel: '#16321c', accent: '#4ade80', ink: '#052e16', text: '#dcfce7' },
  'fairy-glade': { spin: 'КРУТИТЬ', bg: '#140816', panel: '#3a1844', accent: '#e879f9', ink: '#2a1030', text: '#fae8ff' },
  'ash-dragon': { spin: 'ОГОНЬ', bg: '#140806', panel: '#3a140c', accent: '#fdba74', ink: '#2a0c08', text: '#ffedd5' },
  'frost-queen': { spin: 'КРУТИТЬ', bg: '#071018', panel: '#123044', accent: '#7dd3fc', ink: '#082f49', text: '#e0f2fe' },
  'blade-ronin': { spin: 'УДАР', bg: '#10080a', panel: '#2a1216', accent: '#f87171', ink: '#1a0a0c', text: '#fee2e2' },
};

const SPEED: Record<ReelSpeed, string> = { slow: 'медленно', mid: 'средне', fast: 'быстро' };
const SPEED_MARK: Record<ReelSpeed, string> = { slow: 'x1', mid: 'x2', fast: 'x3' };

export default function GameConsole(props: Props) {
  const theme = THEME[props.gameId] ?? THEME['golden-must'];
  return (
    <footer
      className={styles.shell}
      style={{
        ['--bg' as string]: theme.bg,
        ['--panel' as string]: theme.panel,
        ['--accent' as string]: theme.accent,
        ['--ink' as string]: theme.ink,
        ['--text' as string]: theme.text,
      }}
    >
      <div className={styles.fit}>
        <div className={styles.meter}>
          <span>Баланс<b>{props.balanceLabel}</b></span>
          <span className={props.winHot ? styles.hot : ''}>Выигрыш<b>{props.winLabel}</b></span>
          <span>Ставка<b>{props.stakeLabel}</b></span>
        </div>
        <div className={styles.play}>
          <button type="button" className={styles.buy} data-skin={props.gameId} disabled={props.locked} onClick={props.onBuy}>
            <b>Купить</b>
            <small>бонус</small>
          </button>
          <button type="button" className={styles.spin} disabled={props.spinning} onClick={props.onSpin}>
            <b>{props.spinning ? '…' : theme.spin}</b>
            <small>{props.stakeLabel}</small>
          </button>
          <div className={styles.stake}>
            <button type="button" disabled={props.locked} onClick={() => props.onBet(1)} aria-label="Больше">+</button>
            <b>{props.stakeLabel}</b>
            <button type="button" disabled={props.locked} onClick={() => props.onBet(-1)} aria-label="Меньше">−</button>
          </div>
        </div>
        <div className={styles.tools}>
          <button type="button" className={props.ante ? styles.on : ''} disabled={props.locked} aria-pressed={props.ante} onClick={props.onAnte}>Анте</button>
          <button type="button" className={props.showLines ? styles.on : ''} aria-pressed={props.showLines} onClick={props.onToggleLines}>Линии</button>
          <button type="button" className={props.autoLeft ? styles.on : ''} onClick={props.onAuto} aria-label="Автоспины">{props.autoLeft || 'Авто'}</button>
          <button type="button" onClick={props.onInfo} aria-label="Информация">Инфо</button>
          <button type="button" onClick={props.onSpeed} aria-label={SPEED[props.speed]}>{SPEED_MARK[props.speed]}</button>
        </div>
      </div>
    </footer>
  );
}
