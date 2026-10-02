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
import { formatGramUnits, spinSlot, type SpinResult } from '@/lib/slots/engine';
import { themedPageShellStyle } from '@/lib/ui/menu-theme-client';
import styles from '../Slots.module.css';

const SYMBOL_COLORS: Record<string, string> = {
  cherry: '#fb7185',
  lemon: '#fde047',
  grape: '#c084fc',
  bell: '#fbbf24',
  gem: '#34d399',
  crown: '#f5c518',
  wild: '#fff7ed',
  scatter: '#93c5fd',
  coin: '#fbbf24',
  dagger: '#fdba74',
  skull: '#e7e5e4',
  rune: '#fb923c',
  chest: '#f59e0b',
  leaf: '#86efac',
  acorn: '#d6d3d1',
  mushroom: '#fca5a5',
  owl: '#fde68a',
  oak: '#a3e635',
  drop: '#67e8f9',
  fish: '#7dd3fc',
  lantern: '#fde68a',
  pearl: '#e2e8f0',
  wave: '#22d3ee',
  ticket: '#fda4af',
  neon: '#f43f5e',
  car: '#fb7185',
  vault: '#fecdd3',
};

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

  const bets = mode === 'gram' ? GRAM_UNIT_BETS : COIN_BETS;
  const bet = bets[Math.min(betIndex, bets.length - 1)];
  const balance = mode === 'demo' ? demoChips : mode === 'coins' ? coins : gramUnits;

  const emptyGrid = useMemo(
    () => Array.from({ length: game.reels }, () => Array.from({ length: game.rows }, () => game.symbols[0].id)),
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
      setResult({
        grid: data.grid,
        wins: data.wins,
        multiplier: data.multiplier,
        totalWin: data.totalWin,
        capped: data.capped,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка спина');
    } finally {
      setSpinning(false);
    }
  }

  const balanceLabel = mode === 'gram'
    ? `${formatGramUnits(balance || 0)} GRAM`
    : `${balance ?? '…'} ${mode === 'demo' ? 'демо' : 'монет'}`;

  return (
    <main className={styles.page} style={themedPageShellStyle()}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={() => router.push('/slots')}>← Слоты</button>
        <strong>{balanceLabel}</strong>
      </div>
      <div className={styles.machine}>
        <h1 className={styles.title}>{game.title}</h1>
        <p className={styles.lead}>{game.mood} Риск: {game.volatility}.</p>
        <div className={styles.cabinet} style={{ background: `linear-gradient(180deg, ${game.felt}, #050505)` }}>
          <div
            className={`${styles.reels} ${spinning ? styles.spinning : ''}`}
            style={{ gridTemplateColumns: `repeat(${game.reels}, max-content)` }}
          >
            {grid.map((reel, reelIndex) => (
              <div key={reelIndex} className={styles.reel}>
                {reel.map((symbolId, rowIndex) => {
                  const symbol = game.symbols.find((item) => item.id === symbolId);
                  return (
                    <div
                      key={`${reelIndex}-${rowIndex}`}
                      className={styles.symbol}
                      style={{ background: `linear-gradient(160deg, #fff, ${SYMBOL_COLORS[symbolId] || game.accent})` }}
                    >
                      {symbol?.name || symbolId}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.controls}>
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
          <div className={styles.bets}>
            <button type="button" className={styles.bet} onClick={() => setBetIndex((value) => Math.max(0, value - 1))}>−</button>
            <span>Ставка {mode === 'gram' ? formatGramUnits(bet) : bet}</span>
            <button type="button" className={styles.bet} onClick={() => setBetIndex((value) => Math.min(bets.length - 1, value + 1))}>+</button>
          </div>
          <button type="button" className={styles.spin} disabled={spinning} onClick={() => void spin()}>
            {spinning ? '…' : 'Крутить'}
          </button>
        </div>

        {result && (
          <div className={styles.win}>
            {result.totalWin > 0
              ? `Выигрыш ${mode === 'gram' ? formatGramUnits(result.totalWin) + ' GRAM' : result.totalWin}${result.multiplier > 1 ? ` · множитель x${result.multiplier}` : ''}`
              : 'Пустой спин'}
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
                <span>{symbol.name}{symbol.wild ? ' · заменяет' : ''}{symbol.scatter ? ' · где угодно' : ''}</span>
                <span>3: {symbol.pays[0]} · 4: {symbol.pays[1]} · 5: {symbol.pays[2]}</span>
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
