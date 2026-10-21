'use client';

import { useEffect, useMemo, useState } from 'react';
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
  gameId, reelIndex, rows, symbolIds, wildIds, landed, values, marks, locked, fresh, popping,
  rolling, speed, bonus, extraMs = 0, highlight, curtain = null,
}: Props) {
  const [phase, setPhase] = useState<'idle' | 'clear' | 'ready' | 'go'>('idle');
  const plan = reelPlan(speed, reelIndex, bonus);
  const duration = plan.duration + extraMs;
  const anyLocked = Boolean(locked?.some(Boolean));
  const filler = useMemo(() => {
    const count = speed === 'fast' ? 22 : speed === 'mid' ? 28 : 34;
    const extra = Math.round(extraMs / 60);
    return Array.from({ length: count + extra }, (_, index) => symbolIds[(index * 5 + reelIndex * 3 + 1) % symbolIds.length]);
  }, [symbolIds, reelIndex, rolling, speed, extraMs]);
  const spinning = !anyLocked && (phase === 'ready' || phase === 'go');
  const strip = spinning ? [...landed, ...filler] : landed;
  const startShift = filler.length;

  useEffect(() => {
    if (!rolling) {
      setPhase('idle');
      return;
    }
    if (anyLocked) {
      setPhase('go');
      return;
    }
    setPhase('idle');
    let frame = 0;
    const timer = window.setTimeout(() => {
      setPhase('ready');
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setPhase('go'));
      });
    }, plan.delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [rolling, landed.join('|'), plan.delay, anyLocked]);

  const symbols = getSlotGame(gameId)?.symbols;

  function face(id: string, value: number | null = null, mark: MarkKind | null = null) {
    const symbol = findSymbol(symbols, id);
    const mult = symbol?.multiplier ?? multiplierOf(id);
    return (
      <>
        <img src={slotArt(gameId, id)} alt="" draggable={false} />
        {symbol?.mystery ? <small className={styles.roleMystery}>?</small> : null}
        {mult ? <b className={styles.multBadge}>x{mult}</b> : null}
        {value != null && curtain == null && !mult ? <b className={`${styles.valueBadge} ${mark === 'orb' ? styles.valueOrb : ''} ${mark === 'mult' ? styles.valueEdge : ''}`}>x{formatValue(value)}</b> : null}
      </>
    );
  }

  const cells = (
    <div className={styles.reelCells}>
      {landed.map((id, row) => {
        const isLocked = Boolean(locked?.[row]);
        const respinning = rolling && anyLocked && !isLocked;
        const boardHot = !rolling && highlight.some(Boolean);
        const hot = boardHot && highlight[row];
        const multiplier = multiplierOf(id);
        const mark = marks?.[row] ?? null;
        const value = values?.[row] ?? null;
        const landWild = !rolling && (wildIds.includes(id) || multiplier != null);
        const classes = [
          styles.cell,
          hot ? styles.hot : '',
          boardHot && !hot ? styles.dim : '',
          findSymbol(symbols, id)?.scatter || findSymbol(symbols, id)?.bonusCoin ? `${styles.cellBonus} ${SCATTER_FX[gameId] ?? ''}` : '',
          findSymbol(symbols, id)?.wild ? styles.cellWild : '',
          mark ? MARK_CLASS[mark] : '',
          isLocked ? styles.cellLocked : '',
          respinning ? styles.cellRespin : '',
          fresh?.[row] ? styles.cellFresh : '',
          popping?.[row] ? styles.cellPop : '',
          landWild && !fresh?.[row] ? styles.cellLand : '',
        ].filter(Boolean).join(' ');
        return (
          <div key={`${reelIndex}-${row}-${id}-${mark ?? ''}-${value ?? ''}`} className={classes} style={{ ['--row' as string]: row }}>
            {face(id, value, mark)}
            {mark === 'slash' ? <i className={styles.slashLine} /> : null}
            {mark === 'burn' ? <i className={styles.burnFlame} /> : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className={`${styles.reelWindow} ${spinning ? styles.reelBusy : ''} ${phase === 'idle' ? styles.reelIdle : ''} ${extraMs > 0 && rolling ? styles.reelAnticipate : ''}`}
      style={{ ['--rows' as string]: rows }}
    >
      {spinning ? (
        <div
          className={`${styles.reelStrip} ${phase === 'go' ? styles.reelGo : ''}`}
          style={{
            ['--shift' as string]: String(startShift),
            ['--spin-ms' as string]: `${duration}ms`,
            transform: phase === 'ready' ? `translateY(calc(${startShift} * var(--cell) * -1))` : undefined,
          }}
        >
          {strip.map((id, index) => (
              <div key={`${reelIndex}-${index}-${id}`} className={`${styles.cell} ${findSymbol(symbols, id)?.scatter || findSymbol(symbols, id)?.bonusCoin ? styles.cellBonus : ''} ${findSymbol(symbols, id)?.wild ? styles.cellWild : ''}`}>
                {face(id)}
              </div>
          ))}
        </div>
      ) : cells}
      {curtain != null && !spinning ? (
        <div className={styles.curtain} key={`curtain-${reelIndex}-${curtain}`}>
          <img src={slotHero(gameId)} alt="" draggable={false} />
          <b>x{curtain}</b>
        </div>
      ) : null}
    </div>
  );
}
