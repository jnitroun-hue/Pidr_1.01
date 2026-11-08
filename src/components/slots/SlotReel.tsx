'use client';

import { useEffect, useRef, useState } from 'react';
import { slotArt, slotHero } from '@/lib/slots/art';
import { playMustCurtain, playMustLand } from '@/lib/slots/mustSound';
import { CURTAIN_MULTIPLIERS, getSlotGame, type SlotSymbol } from '@/lib/slots/games';
import { reelPlan, slowCellTiming, type ReelSpeed } from '@/lib/slots/speed';
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
  'blade-ronin': styles.fxTwist,
};

const MARK_CLASS: Record<MarkKind, string> = {
  wild: styles.mkWild,
  mult: styles.mkMult,
  mystery: styles.mkMystery,
  colossal: styles.mkColossal,
  burn: styles.mkBurn,
  slash: styles.mkSlash,
  sticky: styles.mkSticky,
  coin: styles.mkCoin,
  orb: styles.mkOrb,
  frozen: styles.mkFrozen,
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
  gameId, reelIndex, rows, wildIds, landed, values, marks, locked, fresh, popping,
  rolling, speed, bonus, extraMs = 0, priorExtra = 0, playIndex = reelIndex, highlight, curtain = null,
}: Props) {
  const held = useRef(landed);
  if (!rolling) held.current = landed;
  const plan = reelPlan(speed, playIndex, rows, bonus, priorExtra, extraMs);
  const anyLocked = Boolean(locked?.some(Boolean));
  const dropping = rolling && !anyLocked;
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
        {symbol?.mystery ? <small className={styles.roleMystery}>?</small> : null}
        {mult ? <b className={styles.multBadge}>x{mult}</b> : null}
        {value != null && curtain == null && !mult && !symbol?.wild ? <b className={`${styles.valueBadge} ${mark === 'orb' ? styles.valueOrb : ''} ${mark === 'mult' ? styles.valueEdge : ''}`}>x{formatValue(value)}</b> : null}
      </>
    );
  }

  const faceLanded = rolling ? held.current : landed;
  const clearOld = dropping && speed !== 'fast';

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
          const classes = [
            styles.cell,
            kind === 'cell' ? styles.cellDrop : '',
            hot ? styles.hot : '',
            boardHot && !hot ? styles.dim : '',
            settled && (symbol?.scatter || symbol?.bonusCoin) ? `${styles.cellBonus} ${SCATTER_FX[gameId] ?? ''}` : '',
            settled && symbol?.wild ? styles.cellWild : '',
            mark ? MARK_CLASS[mark] : '',
            isLocked ? styles.cellLocked : '',
            respinning ? styles.cellRespin : '',
            kind === 'rest' && fresh?.[row] ? styles.cellFresh : '',
            kind === 'rest' && popping?.[row] ? styles.cellPop : '',
            landWild && !fresh?.[row] ? styles.cellLand : '',
          ].filter(Boolean).join(' ');
          return (
            <div
              key={`${kind}-${reelIndex}-${row}-${id}`}
              className={classes}
              style={{
                ['--row' as string]: row,
                ['--fall' as string]: pieceFall(plan.mode, row, rows, bonus),
                ['--drop-ms' as string]: `${pieceDrop(plan, row, rows, bonus)}ms`,
                ['--drop-at' as string]: `${pieceAt(plan, row, rows, bonus)}ms`,
              }}
            >
              {kind === 'cell' ? <span className={styles.cellDropFace}>{face(id, value, mark)}</span> : face(id, value, mark)}
              {mark === 'slash' ? <i className={styles.slashLine} /> : null}
              {mark === 'burn' ? <i className={styles.burnFlame} /> : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`${styles.reelWindow} ${clearOld ? styles.reelClear : ''} ${dropping ? styles.reelBusy : ''} ${!rolling ? styles.reelIdle : ''} ${extraMs > 0 && rolling ? styles.reelAnticipate : ''}`}
      style={{ ['--rows' as string]: rows }}
    >
      {clearOld ? null : stack(faceLanded, 'rest')}
      {dropping ? stack(landed, plan.mode) : null}
      {curtain != null && (!dropping || reelLanded) ? (
        <CurtainShow key={`curtain-${reelIndex}-${curtain}`} gameId={gameId} mult={curtain} />
      ) : null}
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
