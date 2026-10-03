'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getApiHeaders } from '@/lib/api-headers';
import {
  COIN_BETS,
  DEMO_START_CHIPS,
  GRAM_UNIT_BETS,
  getSlotGame,
} from '@/lib/slots/games';
import { formatGramUnits, spinSlot, type BonusPlay, type SpinResult } from '@/lib/slots/engine';
import SlotGlyph from '@/components/slots/SlotGlyph';
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
  const [showPay, setShowPay] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [feature, setFeature] = useState<BonusPlay | null>(null);
  const [featureStep, setFeatureStep] = useState(-1);

  const bets = mode === 'gram' ? GRAM_UNIT_BETS : COIN_BETS;
  const bet = bets[Math.min(betIndex, bets.length - 1)];
  const balance = mode === 'demo' ? demoChips : mode === 'coins' ? coins : gramUnits;

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

  async function spin() {
    if (spinning) return;
    setError('');
    setSpinning(true);
    try {
      if (mode === 'demo') {
        if (demoChips < bet) throw new Error('Демо-фишки закончились. Обновите страницу.');
        await wait(700);
        const next = spinSlot(game, bet);
        setDemoChips((value) => value - bet + next.totalWin);
        setResult(next);
        if (next.bonus) await revealBonus(next.bonus);
        return;
      }
      await ensureBalance();
      const response = await fetch('/api/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({
          gameId: game.id,
          mode,
          bet,
          spinId: crypto.randomUUID(),
        }),
      });
      const data = await response.json();
      await wait(700);
      if (!data.success) throw new Error(data.error || 'Спин не прошёл');
      if (mode === 'coins') setCoins(Number(data.balance));
      else setGramUnits(Number(data.balance));
      const next: SpinResult & { bonus: BonusPlay | null } = {
        grid: data.grid,
        wins: data.wins,
        multiplier: data.multiplier,
        totalWin: data.totalWin,
        capped: data.capped,
        scatterCount: data.scatterCount ?? 0,
        bonus: data.bonus ?? null,
      };
      setResult(next);
      if (next.bonus) await revealBonus(next.bonus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка спина');
    } finally {
      setSpinning(false);
    }
  }

  async function revealBonus(bonus: BonusPlay) {
    setFeature(bonus);
    setFeatureStep(-1);
    await wait(1100);
    for (let index = 0; index < bonus.spins.length; index += 1) {
      setFeatureStep(index);
      setResult((current) => current ? { ...current, grid: bonus.spins[index].grid, wins: bonus.spins[index].wins, multiplier: bonus.spins[index].multiplier } : current);
      await wait(700);
    }
    setFeatureStep(bonus.spins.length);
  }

  const money = (value: number) => mode === 'gram' ? `${formatGramUnits(value)} GRAM` : String(value);

  const balanceLabel = mode === 'gram'
    ? `${formatGramUnits(balance || 0)} GRAM`
    : `${balance ?? '…'} ${mode === 'demo' ? 'демо' : 'монет'}`;

  return (
    <main className={styles.page}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={() => router.push('/slots')}>← Слоты</button>
        <div className={styles.balance}>{balanceLabel}</div>
      </div>
      <div className={styles.machine}>
        <div className={styles.marquee}>ДО x{game.maxWinMultiplier}</div>
        <div className={`${styles.cabinet} ${styles[game.id] || ''}`} style={{ borderColor: game.accent }}>
          <div className={styles.window}>
            <div
              className={`${styles.reels} ${spinning ? styles.spinning : ''}`}
              style={{ gridTemplateColumns: `repeat(${game.reels}, max-content)` }}
            >
              {grid.map((reel, reelIndex) => (
                <div key={reelIndex} className={styles.reel}>
                  {reel.map((symbolId, rowIndex) => (
                    <div key={`${reelIndex}-${rowIndex}`} className={styles.cell} title={game.symbols.find((item) => item.id === symbolId)?.name}>
                      {symbolId === 'scatter' ? (
                        <img src="/img/slots/scatter-bonus.jpg" alt="" className={styles.scatterArt} />
                      ) : (
                        <SlotGlyph id={symbolId} className={styles.glyph} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.dock}>
          <div className={styles.modes}>
            {(['demo', 'coins', 'gram'] as Mode[]).map((item) => (
              <button
                key={item}
                type="button"
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
          <button type="button" className={styles.spin} disabled={spinning} onClick={() => void spin()}>
            {spinning ? '…' : 'SPIN'}
          </button>
          <div className={styles.bets}>
            <button type="button" className={styles.bet} onClick={() => setBetIndex((value) => Math.max(0, value - 1))}>−</button>
            <span className={styles.stake}>{mode === 'gram' ? formatGramUnits(bet) : bet}</span>
            <button type="button" className={styles.bet} onClick={() => setBetIndex((value) => Math.min(bets.length - 1, value + 1))}>+</button>
          </div>
        </div>

        {result && !feature && (
          <div className={styles.win}>
            {result.totalWin > 0
              ? `Выигрыш ${mode === 'gram' ? formatGramUnits(result.totalWin) + ' GRAM' : result.totalWin}${result.multiplier > 1 ? ` · множитель x${result.multiplier}` : ''}`
              : 'Пустой спин'}
          </div>
        )}
        {feature && featureStep >= 0 && featureStep < feature.spins.length && (
          <div className={styles.win}>
            {feature.title} · спин {featureStep + 1} из {feature.spins.length}
            {feature.spins[featureStep].multiplier > 1 ? ` · x${feature.spins[featureStep].multiplier}` : ''}
            {` · ${money(feature.spins[featureStep].totalWin)}`}
          </div>
        )}
        {feature && featureStep >= feature.spins.length && (
          <div className={styles.bonusDone}>
            <img src="/img/slots/scatter-bonus.jpg" alt="" />
            <div>
              <strong>{feature.title} завершён</strong>
              <span>Бонус принёс {money(feature.totalWin)}{result?.capped ? ' · сработал потолок' : ''}</span>
            </div>
            <button type="button" className={styles.pay} onClick={() => setFeature(null)}>Закрыть</button>
          </div>
        )}
        {feature && featureStep < 0 && (
          <div className={styles.bonusSplash}>
            <img src="/img/slots/scatter-bonus.jpg" alt="" />
            <strong>{feature.scatterCount} скаттера</strong>
            <b>{feature.title}</b>
            <p>{feature.rule}</p>
            <span>10 бесплатных спинов</span>
          </div>
        )}
        {error && <p className={styles.error}>{error}</p>}

        {mode === 'gram' && (
          <div className={styles.row} style={{ marginTop: 12 }}>
            <button type="button" className={styles.pay} onClick={() => void exchange('to-gram', 1000)}>1000 монет → 1 GRAM</button>
            <button type="button" className={styles.pay} onClick={() => void exchange('to-coins', 1000)}>1 GRAM → 1000 монет</button>
          </div>
        )}
        {mode === 'gram' && !gramReady && (
          <p className={styles.error}>Для GRAM нужно один раз применить scripts/sql/slots-wallet.sql</p>
        )}

        <button type="button" className={styles.pay} style={{ marginTop: 12 }} onClick={() => setShowPay((value) => !value)}>
          {showPay ? 'Скрыть таблицу' : 'Таблица выплат'}
        </button>
        {showPay && (
          <div className={styles.paytable}>
            {game.symbols.map((symbol) => (
              <div key={symbol.id} className={styles.payRow}>
                <span className={styles.paySymbol}>
                  {symbol.scatter ? <img src="/img/slots/scatter-bonus.jpg" alt="" /> : <SlotGlyph id={symbol.id} />}
                  {symbol.name}{symbol.wild ? ' · заменяет' : ''}{symbol.scatter ? ' · 3–5 запускают бонус' : ''}
                </span>
                <span>x{symbol.pays[0]} / x{symbol.pays[1]} / x{symbol.pays[2]}</span>
              </div>
            ))}
            <div className={styles.payRow}>
              <span>Потолок выигрыша</span>
              <span>x{game.maxWinMultiplier} ставки</span>
            </div>
          </div>
        )}
      </div>
    </main>
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
