'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getApiHeaders } from '@/lib/api-headers';
import {
  COIN_BETS,
  DEMO_START_CHIPS,
  GRAM_UNIT_BETS,
  getSlotGame,
} from '@/lib/slots/games';
import { buyBonus, formatGramUnits, spinSlot, type BonusPlay, type SpinResult } from '@/lib/slots/engine';
import type { SlotEvent } from '@/lib/slots/characters';
import { anteCharge, reelSpinMs, type ReelSpeed } from '@/lib/slots/speed';
import SlotReel from '@/components/slots/SlotReel';
import BigWin from '@/components/slots/BigWin';
import CharacterCast from '@/components/slots/CharacterCast';
import SlotInfo from '@/components/slots/SlotInfo';
import { slotArt, slotBackdrop } from '@/lib/slots/art';
import styles from '../Slots.module.css';

type Mode = 'demo' | 'coins' | 'gram';

function PlayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const game = getSlotGame(params.get('game') || '') ?? getSlotGame('golden-must')!;
  const [mode, setMode] = useState<Mode>('demo');
  const [betIndex, setBetIndex] = useState(2);
  const [demoChips, setDemoChips] = useState(DEMO_START_CHIPS);
  const [coins, setCoins] = useState<number | null>(null);
  const [gramUnits, setGramUnits] = useState<number | null>(null);
  const [gramReady, setGramReady] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [feature, setFeature] = useState<BonusPlay | null>(null);
  const [featureStep, setFeatureStep] = useState(-1);
  const [rolling, setRolling] = useState(false);
  const [landed, setLanded] = useState<string[][] | null>(null);
  const [cast, setCast] = useState<SlotEvent | null>(null);
  const [bigMultiple, setBigMultiple] = useState<number | null>(null);
  const [speed, setSpeed] = useState<ReelSpeed>('slow');
  const [ante, setAnte] = useState(false);
  const [buyAsk, setBuyAsk] = useState<null | 'regular' | 'top'>(null);
  const [autoLeft, setAutoLeft] = useState(0);
  const [autoOpen, setAutoOpen] = useState(false);
  const stopAuto = useRef(false);
  const spinningRef = useRef(false);
  const bigClose = useRef<(() => void) | null>(null);
  const featureClose = useRef<(() => void) | null>(null);
  const spinRef = useRef<() => Promise<boolean>>(async () => false);

  const bets = mode === 'gram' ? GRAM_UNIT_BETS : COIN_BETS;
  const bet = bets[Math.min(betIndex, bets.length - 1)];
  const charge = ante ? anteCharge(bet) : bet;
  const balance = mode === 'demo' ? demoChips : mode === 'coins' ? coins : gramUnits;
  const live = useRef({ bet, charge, ante, mode, speed, game, demoChips });
  live.current = { bet, charge, ante, mode, speed, game, demoChips };

  const emptyGrid = useMemo(
    () => Array.from({ length: game.reels }, (_, reel) =>
      Array.from({ length: game.rows }, (_, row) => game.symbols[(reel * 3 + row * 2) % game.symbols.length].id)
    ),
    [game]
  );
  const grid = result?.grid ?? emptyGrid;

  async function loadBalance() {
    const response = await fetch('/api/slots/balance', { headers: getApiHeaders(), cache: 'no-store' });
    const data = await response.json();
    if (!data.success) return;
    setCoins(Number(data.coins));
    setGramUnits(data.gramUnits == null ? null : Number(data.gramUnits));
    setGramReady(Boolean(data.gramReady));
    setLoaded(true);
  }

  async function ensureBalance() {
    if (!loaded) await loadBalance();
  }

  async function exchange(direction: 'to-gram' | 'to-coins', amount: number) {
    setError('');
    const response = await fetch('/api/slots/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
      body: JSON.stringify({ direction, coins: amount }),
    });
    const data = await response.json();
    if (!data.success) {
      setError(data.error || 'Обмен не прошёл');
      return;
    }
    setCoins(Number(data.coins));
    setGramUnits(Number(data.gramUnits));
  }

  async function spin(): Promise<boolean> {
    if (spinningRef.current) return false;
    const snap = live.current;
    spinningRef.current = true;
    setError('');
    setFeature(null);
    setSpinning(true);
    const motion = reelSpinMs(snap.speed, snap.game.reels);
    try {
      if (snap.mode === 'demo') {
        if (snap.demoChips < snap.charge) throw new Error('Не хватает демо-фишек');
        const next = spinSlot(snap.game, snap.bet, snap.ante);
        setLanded(next.grid);
        setRolling(true);
        await wait(motion);
        setRolling(false);
        setDemoChips((value) => value - snap.charge + next.totalWin);
        setResult(next);
        await present(next, motion, snap.bet);
        return true;
      }
      await ensureBalance();
      const response = await fetch('/api/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({
          gameId: snap.game.id,
          mode: snap.mode,
          bet: snap.bet,
          ante: snap.ante,
          spinId: crypto.randomUUID(),
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Спин не прошёл');
      if (snap.mode === 'coins') setCoins(Number(data.balance));
      else setGramUnits(Number(data.balance));
      const next: SpinResult & { bonus: BonusPlay | null } = {
        grid: data.grid,
        wins: data.wins,
        multiplier: data.multiplier,
        totalWin: data.totalWin,
        capped: data.capped,
        scatterCount: data.scatterCount ?? 0,
        events: data.events ?? [],
        bonus: data.bonus ?? null,
      };
      setLanded(next.grid);
      setRolling(true);
      await wait(motion);
      setRolling(false);
      setResult(next);
      await present(next, motion, snap.bet);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка спина');
      return false;
    } finally {
      spinningRef.current = false;
      setSpinning(false);
    }
  }

  async function buy(tier: 'regular' | 'top') {
    if (spinningRef.current) return;
    spinningRef.current = true;
    const cost = bet * (tier === 'top' ? 500 : 100);
    setError('');
    setFeature(null);
    setSpinning(true);
    const motion = reelSpinMs(speed, game.reels);
    try {
      if (mode === 'demo') {
        if (demoChips < cost) throw new Error('Не хватает демо-фишек на покупку бонуса');
        const next = buyBonus(game, bet, tier);
        setLanded(next.grid);
        setRolling(true);
        await wait(motion);
        setRolling(false);
        setDemoChips((value) => value - cost + next.totalWin);
        setResult(next);
        await present(next, motion, bet);
        return;
      }
      await ensureBalance();
      const response = await fetch('/api/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ gameId: game.id, mode, bet, buy: tier, spinId: crypto.randomUUID() }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Покупка не прошла');
      if (mode === 'coins') setCoins(Number(data.balance));
      else setGramUnits(Number(data.balance));
      const next: SpinResult & { bonus: BonusPlay | null } = {
        grid: data.grid,
        wins: data.wins ?? [],
        multiplier: data.multiplier,
        totalWin: data.totalWin,
        capped: data.capped,
        scatterCount: data.scatterCount ?? 0,
        events: data.events ?? [],
        bonus: data.bonus ?? null,
      };
      setLanded(next.grid);
      setRolling(true);
      await wait(motion);
      setRolling(false);
      setResult(next);
      await present(next, motion, bet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка покупки');
    } finally {
      spinningRef.current = false;
      setSpinning(false);
    }
  }

  async function present(next: SpinResult & { bonus: BonusPlay | null }, motion: number, baseBet: number) {
    const event = next.events?.[0];
    if (event) {
      setCast(event);
      await wait(1100);
      setCast(null);
    }
    if (next.bonus) await revealBonus(next.bonus, motion);
    const ratio = baseBet > 0 ? next.totalWin / baseBet : 0;
    if (ratio >= 15) {
      setBigMultiple(ratio);
      await new Promise<void>((resolve) => { bigClose.current = resolve; });
    }
    if (next.bonus) {
      await new Promise<void>((resolve) => { featureClose.current = resolve; });
    }
  }

  async function runAuto(count: number) {
    setAutoOpen(false);
    stopAuto.current = false;
    for (let left = count; left > 0; left -= 1) {
      if (stopAuto.current) break;
      setAutoLeft(left);
      const ok = await spinRef.current();
      if (!ok || stopAuto.current) break;
    }
    setAutoLeft(0);
  }

  async function revealBonus(bonus: BonusPlay, motion: number) {
    setFeature(bonus);
    setFeatureStep(-1);
    await wait(1100);
    for (let index = 0; index < bonus.spins.length; index += 1) {
      setFeatureStep(index);
      setLanded(bonus.spins[index].grid);
      setRolling(true);
      await wait(motion);
      setRolling(false);
      setResult((current) => current ? { ...current, grid: bonus.spins[index].grid, wins: bonus.spins[index].wins, multiplier: bonus.spins[index].multiplier } : current);
      await wait(speed === 'fast' ? 180 : 320);
    }
    setFeatureStep(bonus.spins.length);
  }

  const money = (value: number) => mode === 'gram' ? `${formatGramUnits(value)} GRAM` : String(value);
  const stakeLabel = mode === 'gram' ? formatGramUnits(charge) : String(charge);
  const balanceLabel = mode === 'gram'
    ? `${formatGramUnits(balance || 0)} GRAM`
    : `${balance ?? '…'}`;
  const unit = mode === 'gram' ? 'GRAM' : mode === 'coins' ? 'монет' : 'демо';

  function cycleSpeed() {
    setSpeed((value) => (value === 'slow' ? 'mid' : value === 'mid' ? 'fast' : 'slow'));
  }

  function finishFeature() {
    setFeature(null);
    featureClose.current?.();
    featureClose.current = null;
  }

  spinRef.current = spin;
  const locked = spinning || autoLeft > 0;

  return (
    <main
      className={styles.stage}
      style={{ backgroundImage: `url(${slotBackdrop(game.id)})` }}
    >
      <div className={styles.vignette} />
      <header className={styles.hud}>
        <button type="button" className={styles.hudBack} onClick={() => router.push('/slots')}>
          ←
        </button>
        <div className={styles.hudTitle}>
          <strong>{game.title}</strong>
          <span>до x{game.maxWinMultiplier}</span>
        </div>
        <div className={styles.modes} role="tablist" aria-label="На что играть">
          {(['demo', 'coins', 'gram'] as Mode[]).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              className={`${styles.mode} ${mode === item ? styles.active : ''}`}
              onClick={() => {
                setMode(item);
                setResult(null);
                setError('');
                if (item !== 'demo') void loadBalance();
              }}
            >
              {item === 'demo' ? 'Демо' : item === 'coins' ? 'Монеты' : 'GRAM'}
            </button>
          ))}
        </div>
        <div className={styles.balance}>
          <span>{unit}</span>
          <strong>{balanceLabel}</strong>
        </div>
      </header>

      {mode === 'gram' && (
        <div className={styles.exchange}>
          <button type="button" onClick={() => void exchange('to-gram', 1000)}>1000 монет → 1 GRAM</button>
          <button type="button" onClick={() => void exchange('to-coins', 1000)}>1 GRAM → 1000 монет</button>
        </div>
      )}

      <section className={styles.board}>
        <div
          className={styles.frame}
          style={{ ['--reels' as string]: String(game.reels), ['--rows' as string]: String(game.rows) }}
        >
          <div className={styles.reels}>
            {(landed ?? grid).map((reel, reelIndex) => (
              <SlotReel
                key={`${game.id}-${reelIndex}`}
                gameId={game.id}
                reelIndex={reelIndex}
                rows={game.rows}
                symbolIds={game.symbols.map((symbol) => symbol.id)}
                landed={reel}
                rolling={rolling}
                speed={speed}
              />
            ))}
          </div>
          {cast ? <CharacterCast event={cast} /> : null}
        </div>
        {result && !feature && (
          <div className={styles.ticker}>
            {result.totalWin > 0
              ? `Выигрыш ${money(result.totalWin)}${result.multiplier > 1 ? ` · x${result.multiplier}` : ''}`
              : 'Пустой спин'}
          </div>
        )}
        {feature && featureStep >= 0 && featureStep < feature.spins.length && (
          <div className={styles.ticker}>{featureStep + 1}/10 бесплатных спинов</div>
        )}
      </section>

      <footer className={styles.dock}>
        <div className={`${styles.dockSide} ${styles.dockLeft}`}>
          <button type="button" className={styles.tumbler} disabled={locked} onClick={() => setAnte((value) => !value)} aria-pressed={ante}>
            <span>
              <b>ANTE</b>
              <small>+16.77%</small>
            </span>
            <span className={`${styles.track} ${ante ? styles.trackOn : styles.trackOff}`}>
              <i className={styles.knob} />
              <em>{ante ? 'ON' : 'OFF'}</em>
            </span>
          </button>
          <div className={styles.stakeGroup}>
            <button type="button" className={styles.nudge} aria-label="Меньше" disabled={locked} onClick={() => setBetIndex((value) => Math.max(0, value - 1))}>−</button>
            <div className={styles.coin} aria-label={`Ставка ${stakeLabel}`}>
              <span>{stakeLabel}</span>
              <small>{ante ? 'анте' : 'ставка'}</small>
            </div>
            <button type="button" className={styles.nudge} aria-label="Больше" disabled={locked} onClick={() => setBetIndex((value) => Math.min(bets.length - 1, value + 1))}>+</button>
          </div>
          <button type="button" className={styles.buy} disabled={locked} onClick={() => setBuyAsk('regular')}>
            Бонус
            <small>×100</small>
          </button>
        </div>
        <button type="button" className={styles.spin} disabled={spinning} onClick={() => void spin()}>
          <span>{spinning ? '…' : 'SPIN'}</span>
          <small>{stakeLabel}</small>
        </button>
        <div className={`${styles.dockSide} ${styles.dockRight}`}>
          <button type="button" className={styles.infoBtn} onClick={() => setShowInfo(true)} aria-label="Информация">i</button>
          <button
            type="button"
            className={`${styles.bolt} ${speed === 'slow' ? styles.boltSlow : speed === 'mid' ? styles.boltMid : styles.boltFast}`}
            onClick={cycleSpeed}
            aria-label={speed === 'slow' ? 'Медленно' : speed === 'mid' ? 'Средне' : 'Быстро'}
          >
            <Bolt />
          </button>
          <button
            type="button"
            className={`${styles.autoBtn} ${autoLeft ? styles.autoOn : ''}`}
            onClick={() => {
              if (autoLeft) {
                stopAuto.current = true;
                setAutoLeft(0);
                return;
              }
              if (!spinning) setAutoOpen(true);
            }}
          >
            {autoLeft ? 'СТОП' : 'АВТО'}
            <small>{autoLeft ? String(autoLeft) : '10–100'}</small>
          </button>
          <button type="button" className={`${styles.buy} ${styles.buyTop}`} disabled={locked} onClick={() => setBuyAsk('top')}>
            Топ
            <small>×500</small>
          </button>
        </div>
      </footer>

      {error && <p className={styles.toast}>{error}</p>}
      {mode === 'gram' && !gramReady && (
        <p className={styles.toast}>Для GRAM нужно один раз применить scripts/sql/slots-wallet.sql</p>
      )}

      {feature && featureStep < 0 && (
        <div className={styles.overlay}>
          <div className={styles.sheet}>
            <img src={slotArt(game.id, 'scatter')} alt="" />
            <p>{feature.title}</p>
            <strong>10</strong>
            <span>бесплатных спинов</span>
          </div>
        </div>
      )}
      {feature && featureStep >= feature.spins.length && bigMultiple == null && (
        <div className={styles.overlay}>
          <div className={styles.sheet}>
            <img src={slotArt(game.id, 'scatter')} alt="" />
            <p>{feature.title}</p>
            <strong>{money(feature.totalWin)}</strong>
            <span>{result?.capped ? 'Сработал потолок выигрыша' : 'Бонус завершён'}</span>
            <button type="button" className={styles.sheetGo} onClick={finishFeature}>Забрать</button>
          </div>
        </div>
      )}
      {buyAsk && (
        <div className={styles.overlay}>
          <div className={styles.sheet}>
            <img src={buyAsk === 'top' ? '/img/slots/bonus-top.jpg' : '/img/slots/bonus-gold.jpg'} alt="" />
            <p>{buyAsk === 'top' ? 'Топ-бонус' : 'Бонус'}</p>
            <strong>{money(bet * (buyAsk === 'top' ? 500 : 100))}</strong>
            <span>Списать эту сумму и сразу открыть 10 бесплатных спинов?</span>
            <div className={styles.sheetActions}>
              <button type="button" onClick={() => setBuyAsk(null)}>Отмена</button>
              <button type="button" className={styles.sheetGo} onClick={() => { const tier = buyAsk; setBuyAsk(null); void buy(tier); }}>Играть</button>
            </div>
          </div>
        </div>
      )}
      {autoOpen && (
        <div className={styles.overlay}>
          <div className={styles.sheet}>
            <p>Автоспины</p>
            <span>Сколько вращений запустить подряд</span>
            <div className={styles.autoList}>
              {[10, 20, 50, 100].map((count) => (
                <button key={count} type="button" onClick={() => void runAuto(count)}>{count}</button>
              ))}
            </div>
            <button type="button" onClick={() => setAutoOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      {showInfo && <SlotInfo game={game} onClose={() => setShowInfo(false)} />}
      {bigMultiple != null && result && (
        <BigWin
          multiple={bigMultiple}
          amountLabel={money(result.totalWin)}
          onClose={() => {
            setBigMultiple(null);
            bigClose.current?.();
            bigClose.current = null;
          }}
        />
      )}
    </main>
  );
}

function Bolt() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.2 1.5 3.4 13.2h6.2l-1.1 9.3 10.1-12.4h-6.4l1-8.6z" />
    </svg>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function SlotPlayPage() {
  return (
    <Suspense fallback={null}>
      <PlayInner />
    </Suspense>
  );
}
