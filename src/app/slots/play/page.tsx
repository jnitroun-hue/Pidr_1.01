'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { getApiHeaders } from '@/lib/api-headers';
import {
  COIN_BETS,
  DEMO_START_CHIPS,
  GRAM_UNIT_BETS,
  HOLD_WIN_GRAND,
  getSlotGame,
  triggerSymbol,
  type SlotGame,
} from '@/lib/slots/games';
import {
  buyBonus,
  formatGramUnits,
  spinSlot,
  type Board,
  type BonusPlay,
  type Cell,
  type MarkKind,
  type RoundResult,
  type SpinWin,
} from '@/lib/slots/engine';
import type { SlotEvent } from '@/lib/slots/characters';
import { anteCharge, reelSpinMs, type ReelSpeed } from '@/lib/slots/speed';
import SlotReel from '@/components/slots/SlotReel';
import BigWin from '@/components/slots/BigWin';
import HeroStage, { resolveHeroCue, sideHeroClass } from '@/components/slots/HeroStage';
import SlotInfo from '@/components/slots/SlotInfo';
import WheelBonus from '@/components/slots/WheelBonus';
import PickBonus from '@/components/slots/PickBonus';
import { slotArt, slotBackdrop, slotHero } from '@/lib/slots/art';
import styles from '../Slots.module.css';

type Mode = 'demo' | 'coins' | 'gram';
type Shown = { board: Board; fresh?: boolean[][]; popping?: boolean[][] };
type Phase = 'intro' | 'wheel' | 'pick' | 'spins' | 'done';

const EMPTY_WINS: SpinWin[] = [];

function cellGrid(game: SlotGame, cells: Cell[] | undefined): boolean[][] | undefined {
  if (!cells?.length) return undefined;
  const grid = Array.from({ length: game.reels }, () => Array.from({ length: game.rows }, () => false));
  cells.forEach((cell) => { if (grid[cell.reel]) grid[cell.reel][cell.row] = true; });
  return grid;
}

/** После каскада новые символы занимают верхние ряды: столько, сколько исчезло в барабане. */
function freshGrid(game: SlotGame, removed: Cell[] | undefined): boolean[][] | undefined {
  if (!removed?.length) return undefined;
  const perReel = Array.from({ length: game.reels }, () => 0);
  removed.forEach((cell) => { perReel[cell.reel] += 1; });
  return perReel.map((count) => Array.from({ length: game.rows }, (_, row) => row < count));
}

function markGrid(game: SlotGame, board: Board): (MarkKind | null)[][] | undefined {
  if (!board.marks?.length) return undefined;
  const grid = Array.from({ length: game.reels }, () => Array.from({ length: game.rows }, () => null as MarkKind | null));
  board.marks.forEach((mark) => { if (grid[mark.reel]) grid[mark.reel][mark.row] = mark.kind; });
  return grid;
}

function winLabel(win: SpinWin): string {
  if (win.kind === 'line') return `${win.count} в линии${win.direction === 'rtl' ? ' ←' : ''}`;
  if (win.kind === 'ways') return `${win.ways} путей`;
  if (win.kind === 'scatter-pays') return `${win.count} символов`;
  if (win.kind === 'cluster') return `кластер ${win.count}`;
  if (win.kind === 'coin') return 'монета';
  if (win.kind === 'grand') return 'гранд';
  return 'скаттер';
}

function introText(game: SlotGame, bonus: BonusPlay): { title: string; text: string; button: string } {
  const spins = bonus.spins.length;
  switch (bonus.kind) {
    case 'hold-win':
      return { title: bonus.title, text: `Монет на поле: ${bonus.scatterCount}. Три респина, каждая новая монета возвращает их. Полное поле — гранд x${HOLD_WIN_GRAND}.`, button: 'Крутить респины' };
    case 'wheel':
      return { title: bonus.title, text: 'Колесо с 12 секторами: кэш, бесплатные спины с множителем или новый уровень.', button: 'К колесу' };
    case 'pick':
      return { title: bonus.title, text: '12 мишеней. Каждое попадание — множитель ставки, третий промах заканчивает тир.', button: 'В тир' };
    case 'tumble-mult':
      return { title: bonus.title, text: `${spins} бесплатных спинов. Шары-множители копятся весь бонус.`, button: 'Крутить' };
    case 'mystery':
      return { title: bonus.title, text: `${spins} бесплатных спинов. Мистика раскрывается только в старшие символы, множитель спина равен числу мистик.`, button: 'Крутить' };
    case 'cluster-fs':
      return { title: bonus.title, text: `${spins} бесплатных спинов. Множитель растёт с каждым выигрышным каскадом и не сбрасывается.`, button: 'Крутить' };
    case 'burn':
      return { title: bonus.title, text: `${spins} бесплатных спинов. Первый выигрыш сжигает самый дешёвый символ, каждый выигрыш поднимает множитель.`, button: 'Крутить' };
    case 'colossal':
      return { title: bonus.title, text: `${spins} бесплатных спинов. В каждом на поле встаёт колоссальный символ 3×3.`, button: 'Крутить' };
    case 'slash':
      return { title: bonus.title, text: `${spins} бесплатных спинов. Ронин рубит ряд в дикие, множитель растёт с каждым ударом.`, button: 'Крутить' };
    default:
      return { title: bonus.title, text: `${spins} бесплатных спинов. Штора закрывает барабан, Ус показывает множитель и остаётся до конца бонуса. Новая штора падает так же, как в обычном спине.`, button: 'Крутить' };
  }
}

function PlayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const game = getSlotGame(params.get('game') || '') ?? getSlotGame('golden-must')!;
  const modeParam = params.get('mode');
  const mode: Mode = modeParam === 'coins' || modeParam === 'gram' ? modeParam : 'demo';
  const [betIndex, setBetIndex] = useState(2);
  const [demoChips, setDemoChips] = useState(DEMO_START_CHIPS);
  const [coins, setCoins] = useState<number | null>(null);
  const [gramUnits, setGramUnits] = useState<number | null>(null);
  const [gramReady, setGramReady] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [shown, setShown] = useState<Shown | null>(null);
  const [rolling, setRolling] = useState(false);
  const [extra, setExtra] = useState<number[]>([]);
  const [ribbon, setRibbon] = useState('');
  const [winSoFar, setWinSoFar] = useState(0);
  const [round, setRound] = useState<RoundResult | null>(null);
  const [feature, setFeature] = useState<BonusPlay | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [counter, setCounter] = useState<{ step: number; total: number } | null>(null);
  const [cast, setCast] = useState<SlotEvent | null>(null);
  const [bigMultiple, setBigMultiple] = useState<number | null>(null);
  const [speed, setSpeed] = useState<ReelSpeed>('slow');
  const [ante, setAnte] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [buyMenu, setBuyMenu] = useState(false);
  const [autoLeft, setAutoLeft] = useState(0);
  const [autoOpen, setAutoOpen] = useState(false);
  const stopAuto = useRef(false);
  const waiter = useRef<(() => void) | null>(null);
  const autoLeftRef = useRef(0);
  const spinningRef = useRef(false);
  const spinRef = useRef<() => Promise<boolean>>(async () => false);

  const bets = mode === 'gram' ? GRAM_UNIT_BETS : COIN_BETS;
  const bet = bets[Math.min(betIndex, bets.length - 1)];
  const charge = ante ? anteCharge(bet) : bet;
  const balance = mode === 'demo' ? demoChips : mode === 'coins' ? coins : gramUnits;
  const live = useRef({ bet, charge, ante, mode, speed, game, demoChips });
  live.current = { bet, charge, ante, mode, speed, game, demoChips };

  const wildIds = useMemo(() => game.symbols.filter((symbol) => symbol.wild).map((symbol) => symbol.id), [game]);
  const trigger = triggerSymbol(game);
  const emptyBoard = useMemo<Board>(() => ({
    grid: Array.from({ length: game.reels }, (_, reel) =>
      Array.from({ length: game.rows }, (_, row) => game.symbols.filter((symbol) => !symbol.bonusOnly)[(reel * 3 + row * 2) % game.symbols.filter((symbol) => !symbol.bonusOnly).length].id)
    ),
    wins: [],
    multiplier: 1,
    win: 0,
  }), [game]);

  useEffect(() => {
    if (mode !== 'demo') void loadBalance();
  }, [mode]);

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

  /* ------------------------------------------------------------------ */
  /* Тайминги                                                            */
  /* ------------------------------------------------------------------ */

  function pace() {
    const current = live.current.speed;
    return current === 'fast'
      ? { pop: 190, show: 360, showWin: 560, respin: 700, idle: 160 }
      : current === 'mid'
        ? { pop: 300, show: 560, showWin: 820, respin: 1000, idle: 300 }
        : { pop: 420, show: 760, showWin: 1100, respin: 1300, idle: 460 };
  }

  function anticipation(grid: string[][]): number[] {
    if (!trigger || game.trigger < 3) return grid.map(() => 0);
    let seen = 0;
    let hotFrom = -1;
    return grid.map((reel, index) => {
      const value = hotFrom >= 0 && index > hotFrom ? 650 + (index - hotFrom - 1) * 260 : 0;
      seen += reel.filter((id) => id === trigger.id).length;
      if (hotFrom < 0 && seen >= game.trigger - 1 && index < grid.length - 1) hotFrom = index;
      return value;
    });
  }

  function awaitUser(autoMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      waiter.current = resolve;
      if (autoLeftRef.current > 0 && autoMs > 0) window.setTimeout(resolve, autoMs);
    });
  }

  function release() {
    const resolve = waiter.current;
    waiter.current = null;
    resolve?.();
  }

  /* ------------------------------------------------------------------ */
  /* Показ досок                                                         */
  /* ------------------------------------------------------------------ */

  function hideFreshCurtains(board: Board): Board {
    const fresh = new Set((board.marks ?? []).filter((mark) => mark.kind === 'sticky').map((mark) => mark.reel));
    return {
      ...board,
      wins: EMPTY_WINS,
      marks: undefined,
      locked: board.locked?.map((reel, index) => (fresh.has(index) ? reel.map(() => false) : reel)),
      curtains: board.curtains?.map((value, index) => (fresh.has(index) ? null : value)),
    };
  }

  async function rollTo(board: Board, bonus: boolean, keepLocked = false) {
    const extraMs = anticipation(board.grid);
    setExtra(extraMs);
    setShown({
      board: keepLocked
        ? hideFreshCurtains(board)
        : { ...board, wins: EMPTY_WINS, locked: undefined, marks: undefined, curtains: undefined },
    });
    setRibbon('');
    setRolling(true);
    await wait(reelSpinMs(live.current.speed, game.reels, bonus) + Math.max(0, ...extraMs));
    setRolling(false);
    setExtra([]);
    setShown({ board });
    setRibbon(board.label ?? '');
    if (board.win > 0) setWinSoFar((value) => value + board.win);
  }

  async function respinTo(board: Board) {
    setShown({ board: { ...board, wins: EMPTY_WINS } });
    setRolling(true);
    await wait(Math.max(pace().respin, reelSpinMs(live.current.speed, game.reels, false)));
    setRolling(false);
    setShown({ board });
    setRibbon(board.label ?? '');
    if (board.win > 0) setWinSoFar((value) => value + board.win);
  }

  async function cascadeTo(prev: Board, next: Board, events: SlotEvent[] = []) {
    if (next.removed?.length) {
      setShown({ board: prev, popping: cellGrid(game, next.removed) });
      await wait(pace().pop);
    }
    const mysteryCells = next.marks?.filter((mark) => mark.kind === 'mystery').map((mark) => ({ reel: mark.reel, row: mark.row }));
    setShown({ board: next, fresh: freshGrid(game, next.removed) ?? (next.removed ? undefined : cellGrid(game, mysteryCells)) });
    setRibbon(next.label ?? '');
    if (next.win > 0) setWinSoFar((value) => value + next.win);
    if (next.label?.startsWith('Фея')) await showCast(events.find((event) => event.actor === 'fairy'));
  }

  async function showCast(event: SlotEvent | undefined) {
    if (!event) return;
    setCast(event);
    await wait(1500);
    setCast(null);
  }

  /** Серия досок одного спина: первая крутится, остальные — каскад или респин. */
  async function playBoards(boards: Board[], bonus: boolean, first: 'roll' | 'respin' | 'show', events: SlotEvent[] = []) {
    const timing = pace();
    const head = boards[0];
    if (first === 'roll') await rollTo(head, bonus, Boolean(head.locked?.some((reel) => reel.some(Boolean))));
    else if (first === 'respin') await respinTo(head);
    else {
      setShown({ board: head });
      setRibbon(head.label ?? '');
      if (head.win > 0) setWinSoFar((value) => value + head.win);
    }
    const lead = events.find((event) => event.actor !== 'fairy');
    if (lead) await showCast(lead);
    await wait(head.win > 0 || boards.length > 1 ? timing.showWin : timing.idle);
    for (let index = 1; index < boards.length; index += 1) {
      const board = boards[index];
      if (board.locked) await respinTo(board);
      else await cascadeTo(boards[index - 1], board, events);
      await wait(board.win > 0 ? timing.showWin : timing.show);
    }
  }

  async function present(next: RoundResult) {
    setRound(next);
    setWinSoFar(0);
    setCounter(null);
    await playBoards(next.boards, false, 'roll', next.events);
    if (next.bonus) await playBonus(next, next.bonus);
    setWinSoFar(next.totalWin);
    const ratio = live.current.bet > 0 ? next.totalWin / live.current.bet : 0;
    if (ratio >= 8) {
      setBigMultiple(ratio);
      await awaitUser(2600);
      setBigMultiple(null);
    }
    if (next.bonus) {
      setPhase('done');
      await awaitUser(2200);
      setPhase(null);
      setFeature(null);
      setCounter(null);
    }
  }

  async function playBonus(next: RoundResult, bonus: BonusPlay) {
    setFeature(bonus);
    setPhase('intro');
    await awaitUser(1700);
    if (bonus.kind === 'wheel' && bonus.wheel) {
      setPhase('wheel');
      await awaitUser(0);
      setWinSoFar((value) => value + bonus.wheel!.cash);
    }
    if (bonus.kind === 'pick' && bonus.pick) {
      setPhase('pick');
      await awaitUser(0);
      setWinSoFar((value) => value + bonus.totalWin);
    }
    if (bonus.spins.length) {
      setPhase('spins');
      for (let index = 0; index < bonus.spins.length; index += 1) {
        const step = bonus.spins[index];
        setCounter({ step: index + 1, total: bonus.spins.length });
        const first = bonus.kind === 'hold-win'
          ? (bonus.tier === 'natural' && index === 0 ? 'show' : 'roll')
          : 'roll';
        await playBoards(step.boards, true, first);
      }
    }
    if (bonus.floorAdded > 0) {
      setRibbon(`Гарантия покупки +${money(bonus.floorAdded)}`);
      if (!bonus.spins.length && bonus.kind !== 'pick' && !bonus.wheel) setWinSoFar((value) => value + bonus.floorAdded);
      await wait(pace().show);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Спин и покупка                                                      */
  /* ------------------------------------------------------------------ */

  async function spin(): Promise<boolean> {
    if (spinningRef.current) return false;
    const snap = live.current;
    spinningRef.current = true;
    setError('');
    setFeature(null);
    setPhase(null);
    setSpinning(true);
    try {
      if (snap.mode === 'demo') {
        if (snap.demoChips < snap.charge) throw new Error('Не хватает демо-фишек');
        const next = spinSlot(snap.game, snap.bet, snap.ante);
        setDemoChips((value) => value - snap.charge);
        await present(next);
        setDemoChips((value) => value + next.totalWin);
        return true;
      }
      await ensureBalance();
      const response = await fetch('/api/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ gameId: snap.game.id, mode: snap.mode, bet: snap.bet, ante: snap.ante, spinId: crypto.randomUUID() }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Спин не прошёл');
      const next = fromPayload(data);
      const after = Number(data.balance);
      const setter = snap.mode === 'coins' ? setCoins : setGramUnits;
      setter(Math.max(0, after - next.totalWin));
      await present(next);
      setter(after);
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
    const snap = live.current;
    spinningRef.current = true;
    const cost = snap.bet * (tier === 'top' ? 500 : 100);
    setError('');
    setFeature(null);
    setPhase(null);
    setSpinning(true);
    try {
      if (snap.mode === 'demo') {
        if (snap.demoChips < cost) throw new Error('Не хватает демо-фишек на покупку бонуса');
        const next = buyBonus(snap.game, snap.bet, tier);
        setDemoChips((value) => value - cost);
        await present(next);
        setDemoChips((value) => value + next.totalWin);
        return;
      }
      await ensureBalance();
      const response = await fetch('/api/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ gameId: snap.game.id, mode: snap.mode, bet: snap.bet, buy: tier, spinId: crypto.randomUUID() }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Покупка не прошла');
      const next = fromPayload(data);
      const after = Number(data.balance);
      const setter = snap.mode === 'coins' ? setCoins : setGramUnits;
      setter(Math.max(0, after - next.totalWin));
      await present(next);
      setter(after);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка покупки');
    } finally {
      spinningRef.current = false;
      setSpinning(false);
    }
  }

  function fromPayload(data: Record<string, unknown>): RoundResult {
    const boards = (data.boards as Board[] | undefined) ?? [{ grid: data.grid as string[][], wins: (data.wins as SpinWin[]) ?? [], multiplier: Number(data.multiplier ?? 1), win: Number(data.totalWin ?? 0) }];
    return {
      grid: (data.grid as string[][]) ?? boards[0].grid,
      boards,
      wins: (data.wins as SpinWin[]) ?? [],
      multiplier: Number(data.multiplier ?? 1),
      totalWin: Number(data.totalWin ?? 0),
      capped: Boolean(data.capped),
      scatterCount: Number(data.scatterCount ?? 0),
      events: (data.events as SlotEvent[]) ?? [],
      bonus: (data.bonus as BonusPlay | null) ?? null,
    };
  }

  async function runAuto(count: number) {
    setAutoOpen(false);
    stopAuto.current = false;
    for (let left = count; left > 0; left -= 1) {
      if (stopAuto.current) break;
      setAutoLeft(left);
      autoLeftRef.current = left;
      const ok = await spinRef.current();
      if (!ok || stopAuto.current) break;
    }
    setAutoLeft(0);
    autoLeftRef.current = 0;
  }

  /* ------------------------------------------------------------------ */
  /* Вывод                                                               */
  /* ------------------------------------------------------------------ */

  const money = (value: number) => mode === 'gram' ? `${formatGramUnits(value)} GRAM` : String(value);
  const stakeLabel = mode === 'gram' ? formatGramUnits(charge) : String(charge);
  const balanceLabel = mode === 'gram' ? `${formatGramUnits(balance || 0)} GRAM` : `${balance ?? '…'}`;
  const unit = mode === 'gram' ? 'GRAM' : mode === 'coins' ? 'монет' : 'демо';

  function cycleSpeed() {
    setSpeed((value) => (value === 'slow' ? 'mid' : value === 'mid' ? 'fast' : 'slow'));
  }

  spinRef.current = spin;
  autoLeftRef.current = autoLeft;
  const locked = spinning || autoLeft > 0;
  const board = shown?.board ?? emptyBoard;
  const marks = markGrid(game, board);
  const inBonus = phase === 'spins';
  const bonusIntro = phase === 'intro';

  function reelHighlight(reelIndex: number): boolean[] {
    const hot = Array.from({ length: game.rows }, () => false);
    if (!showLines || rolling) return hot;
    for (const win of board.wins) {
      for (const cell of win.cells) if (cell.reel === reelIndex) hot[cell.row] = true;
    }
    return hot;
  }

  const pots = game.bonus.kind === 'hold-win'
    ? [...(feature?.pots ?? [{ name: 'Mini', value: 20, amount: bet * 20 }, { name: 'Minor', value: 50, amount: bet * 50 }, { name: 'Major', value: 200, amount: bet * 200 }]), { name: 'Grand', value: HOLD_WIN_GRAND, amount: bet * HOLD_WIN_GRAND }]
    : null;

  const intro = feature ? introText(game, feature) : null;
  const heroSrc = slotHero(game.id);
  const cue = resolveHeroCue({
    gameId: game.id,
    phase,
    bonusKind: feature?.kind ?? null,
    label: board.label,
    marks: board.marks,
    cast,
  });
  const actToken = cue && cue.pose !== 'present'
    ? `${cue.pose}:${board.label ?? ''}:${cast?.title ?? ''}:${counter?.step ?? 0}:${board.marks?.length ?? 0}`
    : 'idle';

  return (
    <main
      className={`${styles.stage} ${inBonus ? styles.stageBonus : ''} ${pots ? styles.stagePots : ''}`}
      style={{ backgroundImage: `url(${slotBackdrop(game.id)})`, ['--accent' as string]: game.accent }}
    >
      <div className={styles.vignette} />
      <header className={styles.hud}>
        <button type="button" className={styles.hudBack} onClick={() => router.push('/slots')}>
          ←
        </button>
        <div className={styles.hudTitle}>
          <strong>{game.title}</strong>
          <span>{trigger ? `${game.trigger}× ${trigger.name} — ${game.bonus.title}` : game.bonus.title}</span>
        </div>
        <div className={styles.hudMark}>{unit}</div>
      </header>

      {mode === 'gram' && (
        <div className={styles.exchange}>
          <button type="button" onClick={() => void exchange('to-gram', 1000)}>1000 монет → 1 GRAM</button>
          <button type="button" onClick={() => void exchange('to-coins', 1000)}>1 GRAM → 1000 монет</button>
        </div>
      )}

      <section className={styles.board} style={{ ['--reels' as string]: String(game.reels), ['--rows' as string]: String(game.rows) }}>
        {heroSrc ? (
          <img key={actToken} className={`${styles.hero} ${sideHeroClass(game.id, cue)}`} src={heroSrc} alt="" draggable={false} />
        ) : null}
        <div className={styles.frameWrap}>
          {pots ? (
            <div className={styles.pots}>
              {pots.map((pot) => (
                <span key={pot.name} className={pot.name === 'Grand' ? styles.potGrand : ''}>
                  <small>{pot.name}</small>
                  <b>{money(pot.amount)}</b>
                </span>
              ))}
            </div>
          ) : null}
          <div className={styles.ribbonRow}>
            {counter ? <em className={styles.counter}>{feature?.title} · {counter.step}/{counter.total}</em> : trigger ? (
              <button type="button" className={styles.triggerChip} onClick={() => setShowInfo(true)}>
                <img src={slotArt(game.id, trigger.id)} alt="" />
                <span>{game.trigger}× {trigger.name}</span>
              </button>
            ) : null}
            {ribbon ? <em className={styles.ribbon}>{ribbon}</em> : null}
          </div>
          <div className={styles.frame}>
            <div className={styles.reels}>
              {board.grid.map((reel, reelIndex) => (
                <SlotReel
                  key={`${game.id}-${reelIndex}`}
                  gameId={game.id}
                  reelIndex={reelIndex}
                  rows={game.rows}
                  symbolIds={game.symbols.filter((symbol) => !symbol.bonusOnly).map((symbol) => symbol.id)}
                  wildIds={wildIds}
                  landed={reel}
                  values={board.values?.[reelIndex]}
                  marks={marks?.[reelIndex]}
                  locked={board.locked?.[reelIndex]}
                  fresh={shown?.fresh?.[reelIndex]}
                  popping={shown?.popping?.[reelIndex]}
                  rolling={rolling}
                  speed={speed}
                  bonus={inBonus}
                  extraMs={extra[reelIndex] ?? 0}
                  highlight={reelHighlight(reelIndex)}
                  curtain={board.curtains?.[reelIndex] ?? null}
                />
              ))}
            </div>
            <HeroStage gameId={game.id} cue={cue} replayKey={actToken} />
          </div>
          {!rolling && board.win > 0 ? (
            <div className={styles.winBurst} key={`${board.win}-${ribbon}`}>
              <span>Выигрыш</span>
              <strong>{money(board.win)}</strong>
            </div>
          ) : null}
          <div className={styles.winStrip}>
            {!rolling && board.wins.filter((win) => win.kind !== 'coin').slice(0, 3).map((win, index) => (
              <div key={`${win.symbolId}-${win.lineIndex ?? index}-${win.kind}`} className={styles.winChip}>
                <img src={slotArt(game.id, win.symbolId)} alt="" />
                <span>{winLabel(win)}</span>
                <b>{money(win.amount)}</b>
              </div>
            ))}
            {!rolling && board.wins.some((win) => win.kind === 'coin') ? (
              <div className={styles.winChip}>
                <img src={slotArt(game.id, 'coin')} alt="" />
                <span>монет {board.wins.filter((win) => win.kind === 'coin').length}</span>
                <b>{money(board.wins.filter((win) => win.kind === 'coin').reduce((sum, win) => sum + win.amount, 0))}</b>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <footer className={styles.controls}>
        <div className={styles.dock}>
          <div className={styles.dockSide}>
            <button type="button" className={styles.buy} disabled={locked} onClick={() => setBuyMenu(true)}>
              Купить
              <small>бонус</small>
            </button>
            <button type="button" className={styles.tumbler} onClick={() => setShowLines((value) => !value)} aria-pressed={showLines}>
              <span><b>ПОДСВЕТКА</b></span>
              <span className={`${styles.track} ${showLines ? styles.trackOn : styles.trackOff}`}>
                <i className={styles.knob} />
                <em>{showLines ? 'ON' : 'OFF'}</em>
              </span>
            </button>
          </div>
          <div className={styles.dockCenter}>
            <button type="button" className={styles.spin} disabled={spinning} onClick={() => void spin()}>
              <span>{spinning ? '…' : 'SPIN'}</span>
              <small>{stakeLabel}</small>
            </button>
            <button
              type="button"
              className={`${styles.autoRound} ${autoLeft ? styles.autoOn : ''}`}
              onClick={() => {
                if (autoLeft) {
                  stopAuto.current = true;
                  setAutoLeft(0);
                  return;
                }
                if (!spinning) setAutoOpen(true);
              }}
              aria-label="Автоспины"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4a8 8 0 1 1-7.5 5.2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M4 4.5v5h5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <b>{autoLeft ? autoLeft : 'auto'}</b>
            </button>
          </div>
          <div className={styles.dockSideRight}>
            <div className={styles.toolRow}>
              <button type="button" className={styles.infoBtn} onClick={() => setShowInfo(true)} aria-label="Информация">i</button>
              <button
                type="button"
                className={`${styles.bolt} ${speed === 'slow' ? styles.boltSlow : speed === 'mid' ? styles.boltMid : styles.boltFast}`}
                onClick={cycleSpeed}
                aria-label={speed === 'slow' ? 'Медленно' : speed === 'mid' ? 'Средне' : 'Быстро'}
              >
                <Bolt />
              </button>
            </div>
            <div className={styles.rightControls}>
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
            </div>
          </div>
        </div>
        <div className={styles.meter}>
          <div>
            <span>Баланс</span>
            <strong>{balanceLabel}</strong>
          </div>
          <div>
            <span>Ставка</span>
            <strong>{stakeLabel}</strong>
          </div>
          <div className={winSoFar > 0 ? styles.meterWin : undefined}>
            <span>Выигрыш</span>
            <strong>{winSoFar > 0 ? money(winSoFar) : '—'}</strong>
          </div>
        </div>
      </footer>

      {error && <p className={styles.toast}>{error}</p>}
      {mode === 'gram' && !gramReady && (
        <p className={styles.toast}>Для GRAM нужно один раз применить scripts/sql/slots-wallet.sql</p>
      )}

      {feature && intro && bonusIntro && (
        <div className={styles.overlay}>
          <div className={`${styles.sheet} ${styles.congrats}`}>
            {heroSrc ? <img className={`${styles.sheetHero} ${sideHeroClass(game.id, { pose: 'present', cells: [] })}`} src={heroSrc} alt="" /> : null}
            <p>{feature.tier === 'natural' ? 'Поздравляем!' : feature.tier === 'top' ? 'Супер-бонус куплен' : 'Бонус куплен'}</p>
            <strong>{intro.title}</strong>
            <span>{intro.text}</span>
            <button type="button" className={styles.sheetGo} onClick={release}>{intro.button}</button>
          </div>
        </div>
      )}
      {feature?.wheel && phase === 'wheel' && (
        <WheelBonus
          heroSrc={heroSrc}
          stops={feature.wheel.stops}
          boost={feature.tier === 'top' ? 2.25 : 1}
          cash={feature.wheel.cash}
          moneyLabel={money}
          auto={autoLeft > 0}
          onDone={release}
        />
      )}
      {feature?.pick && phase === 'pick' && (
        <PickBonus
          heroSrc={heroSrc}
          gameId={game.id}
          reveals={feature.pick.reveals}
          total={feature.totalWin}
          floorAdded={feature.floorAdded}
          moneyLabel={money}
          auto={autoLeft > 0}
          onDone={release}
        />
      )}
      {feature && phase === 'done' && bigMultiple == null && (
        <div className={styles.overlay}>
          <div className={styles.sheet}>
            <img src={slotArt(game.id, trigger?.id ?? 'scatter')} alt="" />
            <p>{feature.title}</p>
            <strong>{money(feature.totalWin)}</strong>
            <span>{round?.capped ? 'Сработал потолок выигрыша' : feature.floorAdded > 0 ? `Гарантия покупки добавила ${money(feature.floorAdded)}` : 'Бонус завершён'}</span>
            <button type="button" className={styles.sheetGo} onClick={release}>Забрать</button>
          </div>
        </div>
      )}
      {buyMenu && (
        <div className={styles.overlay}>
          <div className={styles.sheet}>
            {heroSrc ? <img className={styles.sheetHero} src={heroSrc} alt="" /> : null}
            <p>Какой бонус покупаем?</p>
            <span>«{game.bonus.title}» открывается сразу. Цена — от текущей ставки.</span>
            <div className={styles.buyChoices}>
              <button type="button" onClick={() => { setBuyMenu(false); void buy('regular'); }}>
                <b>Бонус</b>
                <small>{game.bonus.rule}</small>
                <strong>{money(bet * 100)}</strong>
                <em>гарантия {money(bet * 10)}</em>
              </button>
              <button type="button" className={styles.buyChoiceTop} onClick={() => { setBuyMenu(false); void buy('top'); }}>
                <b>Супер-бонус</b>
                <small>{game.bonus.top}</small>
                <strong>{money(bet * 500)}</strong>
                <em>гарантия {money(bet * 50)}</em>
              </button>
            </div>
            <button type="button" onClick={() => setBuyMenu(false)}>Отмена</button>
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

      {showInfo && <SlotInfo game={game} bet={bet} gram={mode === 'gram'} onClose={() => setShowInfo(false)} />}
      {bigMultiple != null && round && (
        <BigWin
          multiple={bigMultiple}
          amountLabel={money(round.totalWin)}
          onClose={release}
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
