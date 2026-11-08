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
  scoreArcherPick,
  spinSlot,
  type Board,
  type BonusPlay,
  type Cell,
  type MarkKind,
  type RoundResult,
  type SpinWin,
} from '@/lib/slots/engine';
import type { SlotEvent } from '@/lib/slots/characters';
import { bonusTitle, playerNote, translateRibbon } from '@/lib/slots/i18n';
import { cabinetCopy, useSlotLocale, type SlotLang } from '@/lib/slots/locale';
import {
  isMustSoundOn,
  playMustBig,
  stopMustEpic,
  playMustHit,
  playMustSpin,
  playMustWin,
  setMustSoundOn,
  stopMustAudio,
  stopMustSpin,
  unlockMustSound,
} from '@/lib/slots/mustSound';
import { anteCharge, isReelHeld, openOrder, openPriorExtra, reelSpinMs, type ReelSpeed } from '@/lib/slots/speed';
import GameConsole from '@/components/slots/GameConsole';
import SlotReel from '@/components/slots/SlotReel';
import BigWin from '@/components/slots/BigWin';
import HeroStage, { resolveHeroCue, sideHeroClass } from '@/components/slots/HeroStage';
import SlotInfo from '@/components/slots/SlotInfo';
import WheelBonus from '@/components/slots/WheelBonus';
import PickBonus from '@/components/slots/PickBonus';
import CurtainWheel from '@/components/slots/CurtainWheel';
import WinTrace from '@/components/slots/WinTrace';
import { slotArt, slotBackdrop, slotBuyArt, slotHero, slotLogo } from '@/lib/slots/art';
import styles from '../Slots.module.css';

type Mode = 'demo' | 'coins' | 'gram';
type Shown = { board: Board; fresh?: boolean[][]; popping?: boolean[][] };
type Phase = 'intro' | 'wheel' | 'curtain' | 'pick' | 'spins' | 'done';

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

function WinFigure({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    const delta = value - start;
    if (!delta) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - t0) / 700);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(start + delta * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <strong>{format(shown)}</strong>;
}

const BUY_BLURB: Record<string, { ru: [string, string]; en: [string, string] }> = {
  'golden-must': {
    ru: ['Колесо задаёт спины и минимальную штору. Шторы остаются на барабанах.', 'Четыре скаттера. Бонус стартует с одной шторой.'],
    en: ['The wheel sets the spins and the minimum curtain. Curtains stay.', 'Four scatters. The feature starts with one curtain.'],
  },
  'hex-vault': {
    ru: ['Монеты остаются. Каждая новая возвращает три респина.', 'Старт с девяти монет и более крупные номиналы.'],
    en: ['Coins stick. Each new coin restores three respins.', 'Starts with nine coins and bigger values.'],
  },
  'oak-fortune': {
    ru: ['Шар заменяет символы и умножает выигрыш, в котором сыграл.', 'Шары удвоены, и каждый спин приходит с шаром.'],
    en: ['The orb stands in and multiplies the win it joins.', 'Orb values are doubled, and every spin has one.'],
  },
  'neon-river': {
    ru: ['Мистика раскрывается только в старшие символы.', 'В каждом спине четыре мистики.'],
    en: ['Mystery symbols open only into the top symbols.', 'Four mystery symbols land on every spin.'],
  },
  'limitless-city': {
    ru: ['Колесо: кэш, бесплатные спины или второй уровень.', 'Сразу второе колесо, сектора сильнее.'],
    en: ['The wheel pays cash, free spins, or the next level.', 'Starts on the second wheel, with stronger sectors.'],
  },
  'green-arrow': {
    ru: ['15 спинов. Лучник бросает от 1 до 6 диких.', 'Тир 6×6. Третий промах заканчивает бонус.'],
    en: ['15 spins. The archer throws 1 to 6 wilds.', 'A 6×6 range. The third miss ends it.'],
  },
  'fairy-glade': {
    ru: ['Каждый выигрышный каскад поднимает множитель.', 'Множитель начинается с x8 и растёт быстрее.'],
    en: ['Every winning cascade raises the multiplier.', 'The multiplier starts at x8 and climbs faster.'],
  },
  'ash-dragon': {
    ru: ['Первый выигрыш сжигает самый дешёвый символ.', 'Символ уже сожжён, множитель начинается с x3.'],
    en: ['The first win burns the cheapest symbol.', 'That symbol is already gone. The multiplier starts at x3.'],
  },
  'frost-queen': {
    ru: ['В каждом спине на поле встаёт символ 3×3.', 'Колосс всегда дикий, спинов больше.'],
    en: ['Every spin plants a 3×3 symbol.', 'The giant is always wild, with extra spins.'],
  },
  'blade-ronin': {
    ru: ['Удар превращает ряд в дикие и поднимает множитель.', 'Два удара за спин, множитель начинается с x6.'],
    en: ['A slash turns a row wild and raises the multiplier.', 'Two slashes a spin. The multiplier starts at x6.'],
  },
};

const EN_FEATURE: Record<string, string> = {
  'golden-must': 'Golden Rain',
  'hex-vault': 'Open Vault',
  'oak-fortune': 'Moon Glade',
  'neon-river': 'High Tide',
  'limitless-city': 'Night Siren',
  'green-arrow': 'Volley',
  'fairy-glade': 'Ring Dance',
  'ash-dragon': 'Breath',
  'frost-queen': 'Ice Throne',
  'blade-ronin': 'Slash',
};

function featureSpinLine(bonus: BonusPlay, en: boolean): string {
  const counted = bonus.kind !== 'hold-win' && bonus.kind !== 'pick' ? bonus.spins.length : 0;
  if (counted < 1) return en ? 'IN THE BONUS GAME' : 'В БОНУСНОЙ ИГРЕ';
  if (en) return counted === 1 ? 'IN 1 FREE SPIN' : `IN ${counted} FREE SPINS`;
  const mod10 = counted % 10;
  const mod100 = counted % 100;
  const single = mod10 === 1 && mod100 !== 11;
  return single ? `В ${counted} БЕСПЛАТНОМ СПИНЕ` : `В ${counted} БЕСПЛАТНЫХ СПИНАХ`;
}

function introText(game: SlotGame, bonus: BonusPlay, lang: SlotLang): { title: string; text: string; button: string } {
  const spins = bonus.spins.length;
  const en = lang === 'en';
  const title = en ? (EN_FEATURE[game.id] ?? bonus.title) : bonus.title;
  const wheelBtn = en ? 'To the wheel' : 'К колесу';
  const spinBtn = en ? 'Spin' : 'Крутить';
  switch (bonus.kind) {
    case 'hold-win':
      return { title, text: en ? `${bonus.scatterCount} coins. Three respins. Each new coin resets them. A full board pays grand x${HOLD_WIN_GRAND}.` : `Монет на поле: ${bonus.scatterCount}. Три респина, каждая новая монета возвращает их. Полное поле — гранд x${HOLD_WIN_GRAND}.`, button: en ? 'Spin respins' : 'Крутить респины' };
    case 'wheel':
      return { title, text: en ? '12 sectors: cash, free spins with a multiplier, or the next wheel.' : 'Колесо с 12 секторами: кэш, бесплатные спины с множителем или новый уровень.', button: wheelBtn };
    case 'pick':
      if (bonus.spins.length && !bonus.pick) {
        return { title, text: en ? '15 spins. The archer throws 1 to 6 wilds. A multiplier arrow stays until the feature ends.' : '15 спинов. Лучник сверху бросает от 1 до 6 диких. Стрела с множителем остаётся на клетке до конца бонуса.', button: spinBtn };
      }
      return { title, text: en ? '6×6. Six misses. The third miss ends it. Multipliers run from x10 to x2500.' : 'Поле 6×6. Шесть клеток — мимо. Третий промах заканчивает тир. Множители от x10 до x2500.', button: en ? 'Open' : 'В тир' };
    case 'tumble-mult':
      return { title, text: en ? `${spins} free spins. The orb stands in for any symbol and multiplies the ones it hits.` : `${spins} бесплатных спинов. Шар заменяет любой символ и умножает те, с которыми сыграл.`, button: spinBtn };
    case 'mystery':
      return { title, text: en ? `${spins} free spins. Mystery symbols open only into the top symbols. The spin multiplier equals how many opened.` : `${spins} бесплатных спинов. Мистика раскрывается только в старшие символы, множитель спина равен числу мистик.`, button: spinBtn };
    case 'cluster-fs':
      return { title, text: en ? `${spins} free spins. Every winning cascade raises the multiplier, and it does not reset.` : `${spins} бесплатных спинов. Множитель растёт с каждым выигрышным каскадом и не сбрасывается.`, button: spinBtn };
    case 'burn':
      return { title, text: en ? `${spins} free spins. The first win burns the cheapest symbol. Every win raises the multiplier.` : `${spins} бесплатных спинов. Первый выигрыш сжигает самый дешёвый символ, каждый выигрыш поднимает множитель.`, button: spinBtn };
    case 'colossal':
      return { title, text: en ? `${spins} free spins. Each one plants a 3×3 symbol.` : `${spins} бесплатных спинов. В каждом на поле встаёт колоссальный символ 3×3.`, button: spinBtn };
    case 'slash':
      return { title, text: en ? `${spins} free spins. A slash turns a row wild. The multiplier grows with every slash.` : `${spins} бесплатных спинов. Ронин рубит ряд в дикие, множитель растёт с каждым ударом.`, button: spinBtn };
    default:
      return {
        title,
        text: bonus.curtainWheel
          ? (en ? 'The wheel chooses the spins and the curtain floor. One curtain is already on the reels.' : bonus.rule)
          : (en ? `${spins} free spins. A curtain covers a reel and stays until the feature ends.` : `${spins} бесплатных спинов. Штора закрывает барабан и остаётся до конца бонуса.`),
        button: bonus.curtainWheel ? wheelBtn : spinBtn,
      };
  }
}

function FlagRu() {
  return (
    <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="60" height="40" fill="#fff" />
      <rect y="13.34" width="60" height="13.33" fill="#1d4ed8" />
      <rect y="26.67" width="60" height="13.33" fill="#d32011" />
    </svg>
  );
}

function FlagUk() {
  return (
    <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <clipPath id="slot-uk">
          <rect width="60" height="30" />
        </clipPath>
      </defs>
      <g clipPath="url(#slot-uk)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0 0 L60 30 M60 0 L0 30" stroke="#fff" strokeWidth="7" />
        <path d="M0 0 L60 30 M60 0 L0 30" stroke="#C8102E" strokeWidth="3.2" />
        <path d="M30 0 V30 M0 15 H60" stroke="#fff" strokeWidth="12" />
        <path d="M30 0 V30 M0 15 H60" stroke="#C8102E" strokeWidth="7" />
      </g>
    </svg>
  );
}

function PlayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang, toggle } = useSlotLocale();
  const copy = cabinetCopy(lang, false);
  const [soundOn, setSoundOn] = useState(true);
  const game = getSlotGame(params.get('game') || '') ?? getSlotGame('golden-must')!;
  const voiced = game.id === 'golden-must';
  const modeParam = params.get('mode');
  const mode: Mode = modeParam === 'coins' || modeParam === 'gram' ? modeParam : 'demo';
  const allowAuto = params.get('autoplay') !== '0';
  const allowBuy = params.get('buy') !== '0';
  const [betIndex, setBetIndex] = useState(Math.max(0, COIN_BETS.indexOf(50)));
  const [betOpen, setBetOpen] = useState(false);
  const [pickTotal, setPickTotal] = useState(0);
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
  const pickWaiter = useRef<((opened: number[]) => void) | null>(null);
  const spinIdRef = useRef('');
  const settledBalance = useRef<number | null>(null);
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
      ? { pop: 220, show: 420, showWin: 780, respin: 760, idle: 180 }
      : current === 'mid'
        ? { pop: 340, show: 640, showWin: 1200, respin: 1100, idle: 320 }
        : { pop: 480, show: 860, showWin: 1500, respin: 1400, idle: 480 };
  }

  function spinWait(locked: boolean[][] | undefined, bonus: boolean, extraMs: number[]) {
    const held = Array.from({ length: game.reels }, (_, index) => isReelHeld(locked?.[index]));
    if (held.every(Boolean)) return pace().respin;
    return reelSpinMs(live.current.speed, game.reels, game.rows, bonus, extraMs, held);
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

  useEffect(() => {
    setSoundOn(isMustSoundOn());
    return () => stopMustAudio();
  }, []);

  function beginRoll() {
    if (voiced) playMustSpin();
  }

  function endRoll(board: Board) {
    if (!voiced) return;
    stopMustSpin();
    if (board.win <= 0) return;
    const lines = board.wins.filter((win) => win.amount > 0).length || 1;
    const ratio = live.current.bet > 0 ? board.win / live.current.bet : 0;
    const delay = playMustHit(lines);
    if (ratio < 15) playMustWin(delay);
  }

  async function rollTo(board: Board, bonus: boolean, keepLocked = false) {
    const extraMs = anticipation(board.grid);
    const view = keepLocked
      ? hideFreshCurtains(board)
      : { ...board, wins: EMPTY_WINS, locked: undefined, marks: undefined, curtains: undefined };
    setExtra(extraMs);
    setShown({ board: view });
    setRibbon('');
    setRolling(true);
    beginRoll();
    await wait(spinWait(view.locked, bonus, extraMs));
    setRolling(false);
    setExtra([]);
    setShown({ board });
    setRibbon(board.label ?? '');
    endRoll(board);
    if (board.win > 0) setWinSoFar((value) => value + board.win);
  }

  async function respinTo(board: Board) {
    setShown({ board: { ...board, wins: EMPTY_WINS } });
    setRolling(true);
    beginRoll();
    await wait(spinWait(board.locked, false, []));
    setRolling(false);
    setShown({ board });
    setRibbon(board.label ?? '');
    endRoll(board);
    if (board.win > 0) setWinSoFar((value) => value + board.win);
  }

  async function cascadeTo(prev: Board, next: Board, events: SlotEvent[] = []) {
    if (next.removed?.length) {
      setShown({ board: prev, popping: cellGrid(game, next.removed) });
      setRibbon(copy.popping);
      await wait(Math.max(pace().pop, 900));
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

  async function present(next: RoundResult): Promise<number | undefined> {
    settledBalance.current = null;
    setRound(next);
    setWinSoFar(0);
    setCounter(null);
    await playBoards(next.boards, false, 'roll', next.events);
    if (next.bonus) await playBonus(next, next.bonus);
    setWinSoFar(next.totalWin);
    const ratio = live.current.bet > 0 ? next.totalWin / live.current.bet : 0;
    if (ratio >= 15 && voiced) playMustBig(next.capped || ratio >= 100 ? 'epic' : ratio >= 50 ? 'mega' : 'nice');
    if (!next.bonus && ratio >= 15) {
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
    return settledBalance.current ?? undefined;
  }

  async function playBonus(next: RoundResult, bonus: BonusPlay) {
    setFeature(bonus);
    setPhase('intro');
    await awaitUser(1700);
    if (bonus.curtainWheel) {
      setPhase('curtain');
      await awaitUser(0);
    }
    if (bonus.kind === 'wheel' && bonus.wheel) {
      setPhase('wheel');
      await awaitUser(0);
      setWinSoFar((value) => value + bonus.wheel!.cash);
    }
    if (bonus.kind === 'pick' && bonus.pick?.cells?.length) {
      setPickTotal(0);
      setPhase('pick');
      const opened = await new Promise<number[]>((resolve) => { pickWaiter.current = resolve; });
      const scored = scoreArcherPick(
        bonus.pick.cells,
        opened,
        bonus.pick.missLimit ?? 3,
        next.totalWin,
        live.current.bet,
        bonus.tier,
        live.current.game.maxWinMultiplier,
      );
      bonus.totalWin = scored.extra;
      bonus.floorAdded = scored.floorAdded;
      next.totalWin = scored.total;
      next.capped = next.capped || scored.capped;
      setRound({ ...next });
      setFeature({ ...bonus });
      setWinSoFar(scored.total);
      if (live.current.mode !== 'demo' && spinIdRef.current) {
        try {
          const response = await fetch('/api/slots/pick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
            body: JSON.stringify({ spinId: spinIdRef.current, gameId: live.current.game.id, opened }),
          });
          const data = await response.json();
          if (!data.success) throw new Error(data.error || 'Тир не записался');
          if (typeof data.balance === 'number') {
            settledBalance.current = data.balance;
            const setter = live.current.mode === 'coins' ? setCoins : setGramUnits;
            setter(data.balance);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Тир не записался');
        }
      }
    } else if (bonus.kind === 'pick' && bonus.pick) {
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
      setRibbon(`${copy.floor} +${money(bonus.floorAdded)}`);
      if (!bonus.spins.length && bonus.kind !== 'pick' && !bonus.wheel) setWinSoFar((value) => value + bonus.floorAdded);
      await wait(pace().show);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Спин и покупка                                                      */
  /* ------------------------------------------------------------------ */

  async function closeRound(spinId: string): Promise<number> {
    const response = await fetch('/api/slots/end-round', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
      body: JSON.stringify({ spinId }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Раунд не закрылся');
    return Number(data.balance);
  }

  async function spin(): Promise<boolean> {
    if (spinningRef.current) return false;
    if (voiced) await unlockMustSound();
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
      const spinId = crypto.randomUUID();
      spinIdRef.current = spinId;
      const response = await fetch('/api/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ gameId: snap.game.id, mode: snap.mode, bet: snap.bet, ante: snap.ante, spinId }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Спин не прошёл');
      const next = fromPayload(data);
      const setter = snap.mode === 'coins' ? setCoins : setGramUnits;
      setter(Number(data.balance));
      await present(next);
      setter(await closeRound(spinId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка спина');
      return false;
    } finally {
      spinningRef.current = false;
      setSpinning(false);
      if (voiced) stopMustSpin();
    }
  }

  async function buy(tier: 'regular' | 'top') {
    if (spinningRef.current) return;
    if (voiced) await unlockMustSound();
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
      const spinId = crypto.randomUUID();
      spinIdRef.current = spinId;
      const response = await fetch('/api/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ gameId: snap.game.id, mode: snap.mode, bet: snap.bet, buy: tier, spinId }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Покупка не прошла');
      const next = fromPayload(data);
      const setter = snap.mode === 'coins' ? setCoins : setGramUnits;
      setter(Number(data.balance));
      await present(next);
      setter(await closeRound(spinId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка покупки');
    } finally {
      spinningRef.current = false;
      setSpinning(false);
      if (voiced) stopMustSpin();
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
    if (rolling || !showLines) return hot;
    for (const win of board.wins) {
      for (const cell of win.cells) if (cell.reel === reelIndex) hot[cell.row] = true;
    }
    return hot;
  }

  const pots = game.bonus.kind === 'hold-win'
    ? [...(feature?.pots ?? [{ name: 'Mini', value: 20, amount: bet * 20 }, { name: 'Minor', value: 50, amount: bet * 50 }, { name: 'Major', value: 200, amount: bet * 200 }]), { name: 'Grand', value: HOLD_WIN_GRAND, amount: bet * HOLD_WIN_GRAND }]
    : null;

  const intro = feature ? introText(game, feature, lang) : null;
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
      className={`${styles.stage} ${game.id === 'golden-must' ? styles.stageMust : ''} ${inBonus ? styles.stageBonus : ''} ${pots ? styles.stagePots : ''}`}
      style={{ backgroundImage: `url(${slotBackdrop(game.id)})`, ['--accent' as string]: game.accent }}
    >
      <div className={styles.vignette} />
      <header className={styles.hud}>
        <button type="button" className={styles.hudBack} onClick={() => router.push('/slots')}>
          ←
        </button>
        <img className={styles.wordmark} src={slotLogo(game.id)} alt={lang === 'en' ? (EN_FEATURE[game.id] ?? game.title) : game.title} draggable={false} />
        <div className={styles.hudTools}>
          <button
              type="button"
              className={`${styles.hudLang} ${soundOn ? styles.hudSoundOn : ''}`}
              aria-pressed={soundOn}
              aria-label={soundOn ? (lang === 'en' ? 'Sound on' : 'Звук включён') : (lang === 'en' ? 'Sound off' : 'Звук выключен')}
              onClick={() => {
                const next = !soundOn;
                setMustSoundOn(next);
                setSoundOn(next);
                if (next && voiced) {
                  unlockMustSound();
                  if (rolling) playMustSpin();
                }
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9h4l5-4v14l-5-4H4z" />
                {soundOn ? <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="2" /> : <path d="M16 10l6 6M22 10l-6 6" fill="none" stroke="currentColor" strokeWidth="2" />}
              </svg>
            </button>
          <button
            type="button"
            className={styles.hudFlag}
            onClick={toggle}
            aria-label={lang === 'en' ? 'English' : 'Русский'}
          >
            {lang === 'en' ? <FlagUk /> : <FlagRu />}
          </button>
        </div>
      </header>

      {mode === 'gram' && (
        <div className={styles.exchange}>
          <button type="button" onClick={() => void exchange('to-gram', 1000)}>{lang === 'en' ? '1000 coins → 1 GRAM' : '1000 монет → 1 GRAM'}</button>
          <button type="button" onClick={() => void exchange('to-coins', 1000)}>{lang === 'en' ? '1 GRAM → 1000 coins' : '1 GRAM → 1000 монет'}</button>
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
            {cue && heroSrc && phase !== 'pick' ? (
              <img key={actToken} className={`${styles.bonusHero} ${sideHeroClass(game.id, cue)}`} src={heroSrc} alt="" draggable={false} />
            ) : null}
            <div className={styles.winPlaque} data-skin={game.id} data-hot={!rolling && (phase === 'pick' ? pickTotal : winSoFar) > 0 ? '1' : undefined}>
              <span>{copy.win}</span>
              <WinFigure value={phase === 'pick' ? pickTotal : winSoFar} format={money} />
            </div>
            {counter ? <em className={styles.counter}>{feature ? bonusTitle(game, lang) : ''} · {counter.step}/{counter.total}</em> : null}
            {ribbon ? <em className={styles.ribbon}>{translateRibbon(ribbon, game, lang)}</em> : null}
          </div>
          <div className={styles.frame} data-skin={game.id} data-win={!rolling && board.wins.some((win) => win.amount > 0) ? '1' : undefined}>
            <div className={styles.reelStage}>
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
                  priorExtra={openPriorExtra(board.locked, extra, reelIndex)}
                  playIndex={openOrder(board.locked, reelIndex)}
                  highlight={reelHighlight(reelIndex)}
                  curtain={board.curtains?.[reelIndex] ?? null}
                />
              ))}
            </div>
            <HeroStage gameId={game.id} cue={cue} replayKey={actToken} />
            {!rolling && showLines ? (
              <WinTrace gameId={game.id} reels={game.reels} rows={game.rows} wins={board.wins} color={game.accent} />
            ) : null}
            </div>
            {feature?.pick?.cells?.length && phase === 'pick' ? (
              <PickBonus
                heroSrc={heroSrc}
                gameId={game.id}
                cells={feature.pick.cells}
                columns={feature.pick.columns ?? 6}
                rows={feature.pick.rows ?? 6}
                missLimit={feature.pick.missLimit ?? 3}
                bet={bet}
                moneyLabel={money}
                auto={autoLeft > 0}
                onProgress={setPickTotal}
                onDone={(opened) => {
                  const resolve = pickWaiter.current;
                  pickWaiter.current = null;
                  resolve?.(opened);
                }}
              />
            ) : null}
          </div>
        </div>
      </section>

      <GameConsole
        gameId={game.id}
        locked={locked}
        spinning={spinning}
        showLines={showLines}
        ante={ante}
        autoLeft={autoLeft}
        speed={speed}
        stakeLabel={stakeLabel}
        balanceLabel={balanceLabel}
        winLabel={winSoFar > 0 ? money(winSoFar) : '—'}
        winHot={winSoFar > 0}
        allowBuy={allowBuy}
        allowAuto={allowAuto}
        onBuy={() => { if (allowBuy) setBuyMenu(true); }}
        onToggleLines={() => setShowLines((value) => !value)}
        onSpin={() => void spin()}
        onAuto={() => {
          if (!allowAuto) return;
          if (autoLeft) {
            stopAuto.current = true;
            setAutoLeft(0);
            return;
          }
          if (!spinning) setAutoOpen(true);
        }}
        onInfo={() => setShowInfo(true)}
        onSpeed={cycleSpeed}
        onAnte={() => setAnte((value) => !value)}
        onBet={(dir) => setBetIndex((value) => Math.min(bets.length - 1, Math.max(0, value + dir)))}
        onMaxBet={() => { if (!locked) setBetIndex(bets.length - 1); }}
        atMaxBet={betIndex >= bets.length - 1}
        onOpenBets={() => { if (!locked) setBetOpen(true); }}
        winKey={game.mechanic === 'ways' ? 'Пути' : game.mechanic === 'lines' || game.mechanic === 'both-ways' ? 'Линии' : 'Поле'}
      />

      {error && <p className={styles.toast}>{playerNote(error, lang)}</p>}
      {mode === 'gram' && !gramReady && (
        <p className={styles.toast}>{playerNote('Для GRAM нужно один раз применить scripts/sql/slots-wallet.sql', lang)}</p>
      )}

      {feature && intro && bonusIntro && (
        <div className={styles.overlay}>
          <div className={`${styles.sheet} ${styles.congrats}`}>
            {heroSrc ? <img className={`${styles.sheetHero} ${sideHeroClass(game.id, { pose: 'present', cells: [] })}`} src={heroSrc} alt="" /> : null}
            <p>{feature.tier === 'natural' ? (lang === 'en' ? 'Congratulations!' : 'Поздравляем!') : feature.tier === 'top' ? (lang === 'en' ? 'Super feature bought' : 'Супер-бонус куплен') : (lang === 'en' ? 'Feature bought' : 'Бонус куплен')}</p>
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
      {feature && phase === 'done' && bigMultiple == null && (
        <button type="button" className={styles.featureEnd} onClick={release}>
          <span className={styles.featurePlaque}>
            <p>{lang === 'en' ? 'CONGRATULATIONS!' : 'ПОЗДРАВЛЯЕМ!'}</p>
            <span>{lang === 'en' ? 'YOU WON' : 'ВЫ ВЫИГРАЛИ'}</span>
            <strong>{money(feature.totalWin)}</strong>
            <em>{featureSpinLine(feature, lang === 'en')}</em>
            {round?.capped ? <i>{copy.cap}</i> : null}
            <small>{lang === 'en' ? 'Click anywhere to continue' : 'Нажмите в любом месте, чтобы продолжить'}</small>
          </span>
        </button>
      )}
      {buyMenu && allowBuy && (
        <div className={styles.overlay}>
          <div className={`${styles.sheet} ${styles.buyModal}`}>
            <p className={styles.buyKicker}>{lang === 'en' ? 'Features' : 'Бонусы'}</p>
            <div className={styles.buyChoices}>
              <button type="button" onClick={() => { setBuyMenu(false); void buy('regular'); }}>
                <img className={styles.buyArt} src={slotBuyArt(game.id)} alt="" />
                <b>{lang === 'en' ? (EN_FEATURE[game.id] ?? game.bonus.title) : game.bonus.title}</b>
                <small>{(BUY_BLURB[game.id] ?? BUY_BLURB['golden-must'])[lang][0]}</small>
                <strong>{money(bet * 100)}</strong>
                <i>{lang === 'en' ? `floor ${money(bet * 10)}` : `пол ${money(bet * 10)}`}</i>
                <em>{lang === 'en' ? 'Activate' : 'Активировать'}</em>
              </button>
              <button type="button" className={styles.buyChoiceTop} onClick={() => { setBuyMenu(false); void buy('top'); }}>
                <img className={styles.buyArt} src={slotBuyArt(game.id)} alt="" />
                <b>{lang === 'en' ? `Top · ${EN_FEATURE[game.id] ?? game.bonus.title}` : `Топ · ${game.bonus.title}`}</b>
                <small>{(BUY_BLURB[game.id] ?? BUY_BLURB['golden-must'])[lang][1]}</small>
                <strong>{money(bet * 500)}</strong>
                <i>{lang === 'en' ? `floor ${money(bet * 50)}` : `пол ${money(bet * 50)}`}</i>
                <em>{lang === 'en' ? 'Activate' : 'Активировать'}</em>
              </button>
            </div>
            <button type="button" className={styles.buyCancel} onClick={() => setBuyMenu(false)}>{lang === 'en' ? 'Close' : 'Закрыть'}</button>
          </div>
        </div>
      )}
      {betOpen && (
        <div className={styles.overlay}>
          <div className={styles.sheet}>
            <p>{lang === 'en' ? 'Bet' : 'Ставка'}</p>
            <span>{lang === 'en' ? 'From 10 to 25,000. Plus and minus step through the ladder. MAX jumps to the top.' : 'от 10 до 25 000. Плюс и минус листают лестницу, MAX ставит потолок сразу.'}</span>
            <button type="button" className={styles.betMax} onClick={() => { setBetIndex(bets.length - 1); setBetOpen(false); }}>{copy.maxBet}</button>
            <div className={styles.betGrid}>
              {bets.map((value, index) => (
                <button
                  key={value}
                  type="button"
                  className={index === betIndex ? styles.betOn : ''}
                  onClick={() => { setBetIndex(index); setBetOpen(false); }}
                >
                  {mode === 'gram' ? formatGramUnits(value) : value.toLocaleString('ru-RU')}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setBetOpen(false)}>{lang === 'en' ? 'Close' : 'Закрыть'}</button>
          </div>
        </div>
      )}
      {autoOpen && (
        <div className={styles.overlay}>
          <div className={styles.sheet}>
            <p>{lang === 'en' ? 'Auto spins' : 'Автоспины'}</p>
            <span>{lang === 'en' ? 'How many spins to run in a row' : 'Сколько вращений запустить подряд'}</span>
            <div className={styles.autoList}>
              {[10, 20, 50, 100].map((count) => (
                <button key={count} type="button" onClick={() => void runAuto(count)}>{count}</button>
              ))}
            </div>
            <button type="button" onClick={() => setAutoOpen(false)}>{lang === 'en' ? 'Cancel' : 'Отмена'}</button>
          </div>
        </div>
      )}

      {feature?.curtainWheel && phase === 'curtain' ? (
        <CurtainWheel index={feature.curtainWheel.index} auto={autoLeft > 0} onDone={release} />
      ) : null}
      {showInfo && <SlotInfo game={game} bet={bet} gram={mode === 'gram'} onClose={() => setShowInfo(false)} />}
      {bigMultiple != null && round && (
        <BigWin
          multiple={bigMultiple}
          amountLabel={money(round.totalWin)}
          capped={Boolean(round.capped)}
          onClose={() => {
            if (voiced) stopMustEpic();
            release();
          }}
        />
      )}
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
