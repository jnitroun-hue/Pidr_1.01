'use client';

import { useRef } from 'react';
import { slotArt, slotHero } from '@/lib/slots/art';
import { getSlotGame, type SlotSymbol } from '@/lib/slots/games';
import { reelPlan, type ReelSpeed } from '@/lib/slots/speed';
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
                ['--drop-ms' as string]: `${plan.drop}ms`,
                ['--drop-at' as string]: `${plan.delay + row * plan.step}ms`,
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
      {curtain != null && !dropping ? (
        <div className={styles.curtain} key={`curtain-${reelIndex}-${curtain}`}>
          <img src={slotHero(gameId)} alt="" draggable={false} />
          <b>x{curtain}</b>
        </div>
      ) : null}
    </div>
  );
}
