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

const SPEED_WORD: Record<ReelSpeed, string> = {
  slow: 'медленно',
  mid: 'средне',
  fast: 'быстро',
};

const SPEED_MARK: Record<ReelSpeed, string> = {
  slow: 'медл',
  mid: 'сред',
  fast: 'быстр',
};

const SKIN: Record<string, string> = {
  'golden-must': styles.golden,
  'hex-vault': styles.vault,
  'oak-fortune': styles.oak,
  'neon-river': styles.neon,
  'limitless-city': styles.city,
  'green-arrow': styles.arrow,
  'fairy-glade': styles.fairy,
  'ash-dragon': styles.dragon,
  'frost-queen': styles.frost,
  'blade-ronin': styles.ronin,
};

export default function GameConsole(props: Props) {
  const skin = SKIN[props.gameId] ?? styles.golden;
  return (
    <footer className={`${styles.shell} ${skin}`}>
      <div className={styles.fit}>
        <Console {...props} />
      </div>
    </footer>
  );
}

function Console(props: Props) {
  switch (props.gameId) {
    case 'hex-vault':
      return <Vault {...props} />;
    case 'oak-fortune':
      return <Oak {...props} />;
    case 'neon-river':
      return <Neon {...props} />;
    case 'limitless-city':
      return <City {...props} />;
    case 'green-arrow':
      return <Arrow {...props} />;
    case 'fairy-glade':
      return <Fairy {...props} />;
    case 'ash-dragon':
      return <Dragon {...props} />;
    case 'frost-queen':
      return <Frost {...props} />;
    case 'blade-ronin':
      return <Ronin {...props} />;
    default:
      return <Golden {...props} />;
  }
}

function Golden(p: Props) {
  return (
    <>
      <div className={styles.goldenTop}>
        <button type="button" className={styles.buy} disabled={p.locked} onClick={p.onBuy}>
          <b>Купить</b>
          <small>бонус</small>
        </button>
        <Spin p={p} title="КРУТИТЬ" />
      </div>
      <div className={styles.goldenTools}>
        <Lines p={p} />
        <Ante p={p} />
        <Info p={p} />
        <Speed p={p} />
        <Auto p={p} />
        <Stake p={p} />
      </div>
      <Meter p={p} />
    </>
  );
}

function Vault(p: Props) {
  return (
    <>
      <div className={styles.vaultLcd}>
        <span>БАЛ {p.balanceLabel}</span>
        <span>СТАВ {p.stakeLabel}</span>
        <span className={p.winHot ? styles.hot : ''}>ВЫИГ {p.winLabel}</span>
      </div>
      <div className={styles.vaultPad}>
        <button type="button" className={styles.buy} disabled={p.locked} onClick={p.onBuy}>БОНУС</button>
        <Info p={p} />
        <Speed p={p} />
        <button type="button" className={styles.minus} disabled={p.locked} onClick={() => p.onBet(-1)} aria-label="Меньше">−</button>
        <Spin p={p} title="СЕЙФ" stake={false} />
        <button type="button" className={styles.plus} disabled={p.locked} onClick={() => p.onBet(1)} aria-label="Больше">+</button>
        <Lines p={p} />
        <Ante p={p} />
        <Auto p={p} />
      </div>
    </>
  );
}

function Oak(p: Props) {
  return (
    <div className={styles.oakSplit}>
      <div className={styles.oakLeft}>
        <Spin p={p} title="СТУК" />
        <button type="button" className={styles.buy} disabled={p.locked} onClick={p.onBuy}>Жёлудь бонуса</button>
      </div>
      <div className={styles.oakRight}>
        <p><span>баланс</span><b>{p.balanceLabel}</b></p>
        <p><span>ставка</span><b>{p.stakeLabel}</b></p>
        <p className={p.winHot ? styles.hot : ''}><span>выигрыш</span><b>{p.winLabel}</b></p>
        <div className={styles.oakRow}>
          <button type="button" className={styles.minus} disabled={p.locked} onClick={() => p.onBet(-1)} aria-label="Меньше">−</button>
          <button type="button" className={styles.plus} disabled={p.locked} onClick={() => p.onBet(1)} aria-label="Больше">+</button>
          <Ante p={p} />
          <Lines p={p} />
          <Auto p={p} />
          <Info p={p} />
          <Speed p={p} />
        </div>
      </div>
    </div>
  );
}

function Neon(p: Props) {
  return (
    <div className={styles.neonSplit}>
      <Spin p={p} title="ПУСК" />
      <div className={styles.neonTerm}>
        <p>BAL {p.balanceLabel}</p>
        <p className={p.winHot ? styles.hot : ''}>WIN {p.winLabel}</p>
        <p>BET {p.stakeLabel}</p>
        <div className={styles.neonCmds}>
          <button type="button" className={styles.minus} disabled={p.locked} onClick={() => p.onBet(-1)}>BET−</button>
          <button type="button" className={styles.plus} disabled={p.locked} onClick={() => p.onBet(1)}>BET+</button>
          <button type="button" className={styles.buy} disabled={p.locked} onClick={p.onBuy}>BUY</button>
          <Ante p={p} />
          <Lines p={p} />
          <Auto p={p} />
          <Info p={p} />
          <Speed p={p} />
        </div>
      </div>
    </div>
  );
}

function City(p: Props) {
  return (
    <>
      <button type="button" className={styles.buy} disabled={p.locked} onClick={p.onBuy}>ЖЕТОН · КУПИТЬ БОНУС</button>
      <div className={styles.cityPlay}>
        <button type="button" className={styles.minus} disabled={p.locked} onClick={() => p.onBet(-1)} aria-label="Меньше">−</button>
        <Spin p={p} title="ИГРА" />
        <button type="button" className={styles.plus} disabled={p.locked} onClick={() => p.onBet(1)} aria-label="Больше">+</button>
      </div>
      <div className={styles.cityLed}>{p.balanceLabel} · {p.stakeLabel} · {p.winLabel}</div>
      <div className={styles.cityTools}>
        <Ante p={p} />
        <Lines p={p} />
        <Auto p={p} />
        <Info p={p} />
        <Speed p={p} />
      </div>
    </>
  );
}

function Arrow(p: Props) {
  return (
    <div className={styles.arrowSplit}>
      <div className={styles.arrowLog}>
        <p>Баланс <b>{p.balanceLabel}</b></p>
        <p>Ставка <b>{p.stakeLabel}</b></p>
        <p className={p.winHot ? styles.hot : ''}>Выигрыш <b>{p.winLabel}</b></p>
        <button type="button" className={styles.buy} disabled={p.locked} onClick={p.onBuy}>Купить бонус</button>
        <div className={styles.arrowRow}>
          <button type="button" className={styles.minus} disabled={p.locked} onClick={() => p.onBet(-1)} aria-label="Меньше">−</button>
          <button type="button" className={styles.plus} disabled={p.locked} onClick={() => p.onBet(1)} aria-label="Больше">+</button>
          <Ante p={p} />
          <Lines p={p} />
          <Auto p={p} />
          <Info p={p} />
          <Speed p={p} />
        </div>
      </div>
      <Spin p={p} title="ЗАЛП" stake={false} />
    </div>
  );
}

function Fairy(p: Props) {
  return (
    <>
      <div className={styles.fairyWords}>
        <span>баланс {p.balanceLabel}</span>
        <span className={p.winHot ? styles.hot : ''}>выигрыш {p.winLabel}</span>
      </div>
      <div className={styles.fairyOrbs}>
        <button type="button" className={styles.buy} disabled={p.locked} onClick={p.onBuy}>Бонус</button>
        <Info p={p} />
        <Ante p={p} />
        <button type="button" className={styles.minus} disabled={p.locked} onClick={() => p.onBet(-1)} aria-label="Меньше">−</button>
        <Spin p={p} title="ТАНЕЦ" />
        <button type="button" className={styles.plus} disabled={p.locked} onClick={() => p.onBet(1)} aria-label="Больше">+</button>
        <Lines p={p} />
        <Auto p={p} />
        <Speed p={p} />
      </div>
      <div className={styles.fairyStake}>ставка {p.stakeLabel}</div>
    </>
  );
}

function Dragon(p: Props) {
  return (
    <>
      <Spin p={p} title="ОГОНЬ" />
      <div className={styles.dragonTiles}>
        <button type="button" className={styles.buy} disabled={p.locked} onClick={p.onBuy}>Бонус</button>
        <Ante p={p} />
        <Lines p={p} />
        <Auto p={p} />
        <Info p={p} />
        <Speed p={p} />
      </div>
      <div className={styles.dragonBet}>
        <button type="button" className={styles.minus} disabled={p.locked} onClick={() => p.onBet(-1)} aria-label="Меньше">−</button>
        <b>{p.stakeLabel}</b>
        <button type="button" className={styles.plus} disabled={p.locked} onClick={() => p.onBet(1)} aria-label="Больше">+</button>
      </div>
      <div className={styles.dragonMeter}>
        <span>{p.balanceLabel}</span>
        <span className={p.winHot ? styles.hot : ''}>{p.winLabel}</span>
      </div>
    </>
  );
}

function Frost(p: Props) {
  return (
    <>
      <div className={styles.frostCorners}>
        <span>баланс<br /><b>{p.balanceLabel}</b></span>
        <span className={p.winHot ? styles.hot : ''}>выигрыш<br /><b>{p.winLabel}</b></span>
      </div>
      <div className={styles.frostMid}>
        <button type="button" className={styles.minus} disabled={p.locked} onClick={() => p.onBet(-1)} aria-label="Меньше">−</button>
        <Spin p={p} title="ЛЁД" />
        <button type="button" className={styles.plus} disabled={p.locked} onClick={() => p.onBet(1)} aria-label="Больше">+</button>
      </div>
      <div className={styles.frostStake}>ставка {p.stakeLabel}</div>
      <button type="button" className={styles.buy} disabled={p.locked} onClick={p.onBuy}>Купить ледяной бонус</button>
      <div className={styles.frostShelf}>
        <Ante p={p} />
        <Lines p={p} />
        <Auto p={p} />
        <Info p={p} />
        <Speed p={p} />
      </div>
    </>
  );
}

function Ronin(p: Props) {
  return (
    <>
      <div className={styles.roninTop}>
        <div className={styles.roninBanners}>
          <button type="button" className={styles.buy} disabled={p.locked} onClick={p.onBuy}>Купить бонус</button>
          <Ante p={p} />
          <Lines p={p} />
          <Auto p={p} />
          <div className={styles.roninBet}>
            <button type="button" className={styles.minus} disabled={p.locked} onClick={() => p.onBet(-1)} aria-label="Меньше">−</button>
            <b>{p.stakeLabel}</b>
            <button type="button" className={styles.plus} disabled={p.locked} onClick={() => p.onBet(1)} aria-label="Больше">+</button>
          </div>
        </div>
        <Spin p={p} title="УДАР" stake={false} />
      </div>
      <div className={styles.roninBrush}>
        <span>баланс {p.balanceLabel}</span>
        <span className={p.winHot ? styles.hot : ''}>выигрыш {p.winLabel}</span>
        <Info p={p} />
        <Speed p={p} />
      </div>
    </>
  );
}

function Spin({ p, title, stake = true }: { p: Props; title: string; stake?: boolean }) {
  return (
    <button type="button" className={styles.spin} disabled={p.spinning} onClick={p.onSpin}>
      <b>{p.spinning ? '…' : title}</b>
      {stake ? <small>{p.stakeLabel}</small> : null}
    </button>
  );
}

function Stake({ p }: { p: Props }) {
  return (
    <div className={styles.stake}>
      <button type="button" disabled={p.locked} onClick={() => p.onBet(-1)} aria-label="Меньше">−</button>
      <b>{p.stakeLabel}</b>
      <button type="button" disabled={p.locked} onClick={() => p.onBet(1)} aria-label="Больше">+</button>
    </div>
  );
}

function Meter({ p }: { p: Props }) {
  return (
    <div className={styles.meter}>
      <span>Баланс <b>{p.balanceLabel}</b></span>
      <span>Ставка <b>{p.stakeLabel}</b></span>
      <span className={p.winHot ? styles.hot : ''}>Выигрыш <b>{p.winLabel}</b></span>
    </div>
  );
}

function Lines({ p }: { p: Props }) {
  return (
    <button type="button" className={`${styles.lines} ${p.showLines ? styles.on : ''}`} aria-pressed={p.showLines} onClick={p.onToggleLines}>
      Линии
    </button>
  );
}

function Ante({ p }: { p: Props }) {
  return (
    <button type="button" className={`${styles.ante} ${p.ante ? styles.on : ''}`} disabled={p.locked} aria-pressed={p.ante} onClick={p.onAnte}>
      Анте
    </button>
  );
}

function Auto({ p }: { p: Props }) {
  return (
    <button type="button" className={`${styles.auto} ${p.autoLeft ? styles.on : ''}`} onClick={p.onAuto} aria-label="Автоспины">
      {p.autoLeft ? p.autoLeft : 'Авто'}
    </button>
  );
}

function Info({ p }: { p: Props }) {
  return (
    <button type="button" className={styles.info} onClick={p.onInfo} aria-label="Информация">
      Инфо
    </button>
  );
}

function Speed({ p }: { p: Props }) {
  return (
    <button type="button" className={styles.speed} onClick={p.onSpeed} aria-label={SPEED_WORD[p.speed]}>
      {SPEED_MARK[p.speed]}
    </button>
  );
}
