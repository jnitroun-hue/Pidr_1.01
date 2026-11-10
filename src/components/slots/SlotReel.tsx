'use client';

import { useEffect, useRef, useState } from 'react';
import { slotArt, slotHero } from '@/lib/slots/art';
import { playMustCurtain, playMustLand } from '@/lib/slots/mustSound';
import { CURTAIN_MULTIPLIERS, getSlotGame, type SlotSymbol } from '@/lib/slots/games';
import { GRAVITY_STEP_MS, reelPlan, SLOW_DUMP_MS, slowCellTiming, type ReelSpeed } from '@/lib/slots/speed';
import type { MarkKind } from '@/lib/slots/engine';
import styles from '@/app/slots/Slots.module.css';

const SCATTER_FX: Record<string, string> = {
  'golden-must': styles.fxShimmer,
  'hex-vault': styles.fxFire,
  'oak-fortune': styles.fxFlicker,
  'neon-river': styles.fxSpin,
  'limitless-city': styles.fxShake,
  'green-arrow': styles.fxPulse,
  'fairy-glade': styles.fxSpark,
  'ash-dragon': styles.fxFlame,
  'frost-queen': styles.fxIce,
  'mad-dj': styles.fxBeat,
};

const MARK_CLASS: Record<MarkKind, string> = {
  wild: styles.mkWild,
  mult: styles.mkMult,
  mystery: styles.mkMystery,
  colossal: styles.mkColossal,
  burn: styles.mkBurn,
  drop: styles.mkDrop,
  sticky: styles.mkSticky,
  coin: styles.mkCoin,
  orb: styles.mkOrb,
  frozen: styles.mkFrozen,
  bomb: styles.mkBomb,
  way: styles.mkWay,
  nudge: styles.mkNudge,
};

type Props = {
  gameId: string;
  reelIndex: number;
  rows: number;
  symbolIds: string[];
  /** Какие id считаются дикими / множителями — для анимации приземления. */
  wildIds: string[];
  landed: string[];
  values?: (number | null)[];
  marks?: (MarkKind | null)[];
  /** Клетки, которые не крутятся (Hold & Win, заморозка). */
  locked?: boolean[];
  /** Клетки, упавшие сверху после каскада. */
  fresh?: boolean[];
  /** Новые символы медленного каскада: падают сверху после того, как свои осели. */
  arrive?: boolean[];
  /** На сколько рядов уцелевший символ падает вниз. */
  shift?: number[];
  /** Клетки, которые лопаются перед каскадом. */
  popping?: boolean[];
  rolling: boolean;
  speed: ReelSpeed;
  bonus: boolean;
  /** Барабан крутится дольше: ждём третий скаттер. */
  extraMs?: number;
  /** Сумма ожиданий предыдущих играющих барабанов, чтобы очередь не наезжала. */
  priorExtra?: number;
  /** Номер среди барабанов, которые в этом спине крутятся. */
  playIndex?: number;
  highlight: boolean[];
  /** Множитель шторы. null — барабан открыт. */
  curtain?: number | null;
};

function multiplierOf(id: string): number | null {
  const match = /^m(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

function pieceFall(mode: 'cell' | 'column', row: number, rows: number, bonus: boolean): number {
  return mode === 'cell' ? slowCellTiming(row, rows, bonus).fall : 1;
}

function pieceDrop(plan: { mode: 'cell' | 'column'; drop: number }, row: number, rows: number, bonus: boolean): number {
  return plan.mode === 'cell' ? slowCellTiming(row, rows, bonus).drop : plan.drop;
}

function pieceAt(plan: { mode: 'cell' | 'column'; delay: number; step: number }, row: number, rows: number, bonus: boolean): number {
  const inner = plan.mode === 'cell' ? slowCellTiming(row, rows, bonus).start : row * plan.step;
  return plan.delay + inner;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function findSymbol(symbols: SlotSymbol[] | undefined, id: string): SlotSymbol | undefined {
  return symbols?.find((symbol) => symbol.id === id);
}

export default function SlotReel({
  gameId, reelIndex, rows, wildIds, landed, values, marks, locked, fresh, arrive, shift, popping,
  rolling, speed, bonus, extraMs = 0, priorExtra = 0, playIndex = reelIndex, highlight, curtain = null,
}: Props) {
  const held = useRef(landed);
  if (!rolling) held.current = landed;
  const plan = reelPlan(speed, playIndex, rows, bonus, priorExtra, extraMs);
  const anyLocked = Boolean(locked?.some(Boolean));
  const dropping = rolling && !anyLocked;
  const dumpOld = gameId === 'mad-dj' && speed === 'slow' && dropping;
  const gravityLead = (shift?.reduce((max, value) => Math.max(max, value), 0) ?? 0) * GRAVITY_STEP_MS + 40;
  const landAt = plan.mode === 'cell'
    ? pieceAt(plan, 0, rows, bonus) + pieceDrop(plan, 0, rows, bonus)
    : plan.delay + plan.drop;
  const [reelLanded, setReelLanded] = useState(!rolling);
  const voiced = gameId === 'golden-must' || gameId === 'green-arrow';
  const freshKey = fresh?.map((cell) => (cell ? '1' : '0')).join('') ?? '';

  useEffect(() => {
    if (!dropping) {
      setReelLanded(true);
      return;
    }
    setReelLanded(false);
    const timer = window.setTimeout(() => setReelLanded(true), Math.max(0, landAt));
    return () => window.clearTimeout(timer);
  }, [dropping, landAt]);

  useEffect(() => {
    if (!dropping || !voiced) return;
    const timers: number[] = [];
    if (plan.mode === 'cell') {
      for (let row = 0; row < rows; row += 1) {
        const landAt = pieceAt(plan, row, rows, bonus) + pieceDrop(plan, row, rows, bonus) * 0.82;
        const tone = rows - 1 - row;
        timers.push(window.setTimeout(() => playMustLand(tone), landAt));
      }
    } else if (speed === 'fast') {
      if (playIndex === 0) timers.push(window.setTimeout(() => playMustLand(2), plan.delay + plan.drop * 0.78));
    } else {
      timers.push(window.setTimeout(() => playMustLand(reelIndex % 5), plan.delay + plan.drop * 0.78));
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [dropping, voiced, speed, bonus, rows, reelIndex, playIndex, plan.delay, plan.drop, plan.mode, plan.step]);

  useEffect(() => {
    if (rolling || !voiced || !freshKey.includes('1')) return;
    const timers: number[] = [];
    fresh?.forEach((cell, row) => {
      if (!cell) return;
      timers.push(window.setTimeout(() => playMustLand(rows - 1 - row), row * 55 + 520));
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [rolling, voiced, freshKey, fresh, rows]);

  const symbols = getSlotGame(gameId)?.symbols;

  function face(id: string, value: number | null = null, mark: MarkKind | null = null) {
    const symbol = findSymbol(symbols, id);
    const mult = symbol?.multiplier ?? multiplierOf(id);
    return (
      <>
        <img src={slotArt(gameId, id)} alt="" draggable={false} />
        {gameId === 'mad-dj' && symbol?.scatter ? <span className={styles.scatterWord}>SCATTER</span> : null}
        {gameId === 'mad-dj' && symbol?.nudge ? <span className={styles.nudgeWord}>NUDGE</span> : null}
        {gameId === 'mad-dj' && symbol?.way ? <span className={styles.waysWord}>WAYS</span> : null}
        {symbol?.mystery ? <small className={styles.roleMystery}>?</small> : null}
        {mult ? <b className={styles.multBadge}>x{mult}</b> : null}
        {value != null && curtain == null && !mult && !symbol?.wild ? <b className={`${styles.valueBadge} ${mark === 'orb' ? styles.valueOrb : ''} ${mark === 'mult' ? styles.valueEdge : ''}`}>x{formatValue(value)}</b> : null}
      </>
    );
  }

  const faceLanded = rolling ? held.current : landed;
  const clearOld = dropping && speed !== 'fast' && !dumpOld;

  function stack(ids: string[], kind: 'rest' | 'cell' | 'column') {
    return (
      <div
        className={kind === 'column' ? `${styles.dropLayer} ${styles.columnDrop}` : kind === 'cell' ? styles.dropLayer : styles.reelCells}
        style={kind === 'column' ? {
          ['--spin-ms' as string]: `${plan.drop}ms`,
          ['--drop-at' as string]: `${plan.delay}ms`,
        } : undefined}
      >
        {ids.map((id, row) => {
          const isLocked = Boolean(locked?.[row]);
          const respinning = kind === 'rest' && rolling && anyLocked && !isLocked;
          const boardHot = kind === 'rest' && !rolling && highlight.some(Boolean);
          const hot = boardHot && highlight[row];
          const multiplier = multiplierOf(id);
          const showMeta = kind !== 'rest' || !dropping;
          const mark = showMeta ? marks?.[row] ?? null : null;
          const value = showMeta ? values?.[row] ?? null : null;
          const landWild = kind === 'rest' && !rolling && (wildIds.includes(id) || multiplier != null);
          const settled = kind === 'rest';
          const symbol = findSymbol(symbols, id);
          const slowArrive = settled && Boolean(arrive?.[row]);
          const fell = settled && (shift?.[row] ?? 0) > 0;
          const bombIn = gameId === 'mad-dj' && id === 'bomb' && mark === 'bomb' && !popping?.[row] && !rolling;
          const bombNear = gameId === 'mad-dj' && mark === 'bomb' && id !== 'bomb' && !popping?.[row] && !rolling;
          const wayOn = gameId === 'mad-dj' && mark === 'way' && !popping?.[row] && !rolling;
          const wayArrow = wayOn && (id === 'way-left' || id === 'way-right');
          const freshCount = arrive?.reduce((count, cell) => count + (cell ? 1 : 0), 0) ?? 0;
          const arriveOrder = freshCount - 1 - row;
          const arriveTiming = slowCellTiming(Math.max(0, rows - 1 - Math.max(0, arriveOrder)), rows, bonus);
          const classes = [
            styles.cell,
            kind === 'cell' ? styles.cellDrop : '',
            hot ? styles.hot : '',
            boardHot && !hot && gameId !== 'mad-dj' ? styles.dim : '',
            settled && (symbol?.scatter || symbol?.bonusCoin) ? `${styles.cellBonus} ${SCATTER_FX[gameId] ?? ''}` : '',
            settled && symbol?.wild ? styles.cellWild : '',
            mark ? MARK_CLASS[mark] : '',
            isLocked ? styles.cellLocked : '',
            respinning ? styles.cellRespin : '',
            settled && fresh?.[row] && !slowArrive ? styles.cellFresh : '',
            slowArrive ? styles.cellArrive : '',
            fell ? styles.cellFall : '',
            kind === 'rest' && popping?.[row] ? (gameId === 'mad-dj' ? styles.cellBurst : styles.cellPop) : '',
            kind === 'rest' && popping?.[row] && id === 'bomb' ? styles.cellBombBurst : '',
            bombIn ? styles.cellBombIn : '',
            bombNear ? styles.cellBombNear : '',
            wayOn ? styles.wayCut : '',
            wayArrow ? styles.wayArrow : '',
            wayOn && id === 'way-left' ? styles.wayLeft : '',
            landWild && !fresh?.[row] && !slowArrive ? styles.cellLand : '',
          ].filter(Boolean).join(' ');
          const dropAt = pieceAt(plan, row, rows, bonus) + (kind !== 'rest' && dumpOld ? SLOW_DUMP_MS : 0);
          return (
            <div
              key={`${kind}-${reelIndex}-${row}-${id}`}
              className={classes}
              style={{
                ['--row' as string]: row,
                ['--reel' as string]: reelIndex,
                ['--shift' as string]: shift?.[row] ?? 0,
                ['--fall-ms' as string]: `${(shift?.[row] ?? 0) * GRAVITY_STEP_MS}ms`,
                ['--fall' as string]: slowArrive ? row + 1 : pieceFall(plan.mode, row, rows, bonus),
                ['--drop-ms' as string]: `${slowArrive ? arriveTiming.drop : pieceDrop(plan, row, rows, bonus)}ms`,
                ['--drop-at' as string]: `${slowArrive ? gravityLead + arriveTiming.start : dropAt}ms`,
              }}
            >
              {kind === 'cell' ? <span className={styles.cellDropFace}>{face(id, value, mark)}</span> : face(id, value, mark)}
              {bombIn ? <img className={styles.bombProjectile} src={slotArt(gameId, 'bomb')} alt="" draggable={false} /> : null}
              {wayArrow ? <i className={`${styles.wayBlade} ${id === 'way-left' ? styles.wayBladeLeft : ''}`} /> : null}
              {mark === 'drop' ? <i className={styles.dropBeat} /> : null}
              {mark === 'burn' ? <i className={styles.burnFlame} /> : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`${styles.reelWindow} ${clearOld ? styles.reelClear : ''} ${dumpOld ? styles.reelDump : ''} ${dropping ? styles.reelBusy : ''} ${!rolling ? styles.reelIdle : ''} ${extraMs > 0 && rolling ? styles.reelAnticipate : ''}`}
      style={{ ['--rows' as string]: rows, ['--dump-at' as string]: `${plan.delay}ms` }}
    >
      {clearOld ? null : stack(faceLanded, 'rest')}
      {dropping ? stack(landed, plan.mode) : null}
      {curtain != null && (!dropping || reelLanded) ? (
        gameId === 'mad-dj'
          ? <VinylPick key={`vinyl-${reelIndex}-${curtain}`} mult={curtain} />
          : <CurtainShow key={`curtain-${reelIndex}-${curtain}`} gameId={gameId} mult={curtain} />
      ) : null}
    </div>
  );
}

const VINYL_FACE = [2, 3, 5, 8, 10];

/** Пластинка диджея, затем штора с выбранным множителем падает на этот барабан. */
function VinylPick({ mult }: { mult: number }) {
  const [dropped, setDropped] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDropped(true), 1500);
    return () => window.clearTimeout(timer);
  }, [mult]);
  if (dropped) return <DjCurtain mult={mult} />;
  const index = Math.max(0, VINYL_FACE.indexOf(mult));
  const land = 720 - (index * 72 + 36);
  return (
    <div className={styles.vinylCurtain} aria-hidden>
      <div className={styles.vinylSpin} style={{ ['--land' as string]: `${land}deg` }}>
        <img src="/img/slots/vinyl-nudge.jpg?v=2" alt="" draggable={false} />
        {VINYL_FACE.map((value, slice) => (
          <b key={value} data-win={value === mult ? '' : undefined} style={{ ['--slice' as string]: `${slice * 72 + 36}deg` }}>{`x${value}`}</b>
        ))}
      </div>
      <i className={styles.vinylNeedle} />
    </div>
  );
}

/** Штора диджея на барабане, где выпал Nudge. x10 ярче остальных. */
function DjCurtain({ mult }: { mult: number }) {
  return (
    <div className={`${styles.djCurtain} ${mult === 10 ? styles.djCurtainMax : ''}`} aria-hidden>
      <img src={`/img/slots/curtain-dj-x${mult}.jpg?v=1`} alt="" draggable={false} />
      <b>{`x${mult}`}</b>
    </div>
  );
}

/** Пара из таблицы: выпавший множитель и сосед. Сторона победителя — 50/50 и не меняется, пока штора стоит. */
function CurtainShow({ gameId, mult }: { gameId: string; mult: number }) {
  const deal = useRef<{ top: number; bottom: number; pick: 'top' | 'bottom' } | null>(null);
  useEffect(() => {
    if (gameId === 'golden-must') playMustCurtain();
  }, [gameId]);
  if (!deal.current) {
    const pool = CURTAIN_MULTIPLIERS.filter((value) => value !== mult);
    const other = pool[Math.floor(Math.random() * pool.length)] ?? mult;
    const pickTop = Math.random() < 0.5;
    deal.current = {
      top: pickTop ? mult : other,
      bottom: pickTop ? other : mult,
      pick: pickTop ? 'top' : 'bottom',
    };
  }
  const { top, bottom, pick } = deal.current;
  const climber = gameId === 'golden-must'
    ? (pick === 'top' ? '/img/slots/hero-must-climb.png?v=1' : '/img/slots/hero-must-fall.png?v=1')
    : slotHero(gameId);
  return (
    <div className={styles.curtain} data-pick={pick}>
      <img className={styles.curtainRope} src="/img/slots/ui/rope-gold.png" alt="" draggable={false} />
      <img className={styles.curtainOffer} data-side="top" src={`/img/slots/mult/x${top}.png`} alt={`x${top}`} draggable={false} />
      <img className={styles.curtainHero} src={climber} alt="" draggable={false} />
      <img className={styles.curtainOffer} data-side="bottom" src={`/img/slots/mult/x${bottom}.png`} alt={`x${bottom}`} draggable={false} />
    </div>
  );
}
