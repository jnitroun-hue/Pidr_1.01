'use client';

import { slotHero } from '@/lib/slots/art';
import styles from './HeroStage.module.css';

export type HeroPose =
  | 'draw'
  | 'sweep'
  | 'lunge'
  | 'frost'
  | 'drop'
  | 'throw'
  | 'slam'
  | 'flip'
  | 'pulse'
  | 'snap'
  | 'lean'
  | 'present';

export type HeroCue = {
  pose: HeroPose;
  cells: { reel: number; row: number }[];
  row?: number;
};

type MarkLike = { reel: number; row: number; kind: string };
type CastLike = { actor: string; cells: { reel: number; row: number }[]; title?: string } | null;

const IDLE_CLASS: Record<string, string> = {
  'golden-must': styles.idleGolden,
  'hex-vault': styles.idleHex,
  'oak-fortune': styles.idleOak,
  'neon-river': styles.idleRiver,
  'limitless-city': styles.idleCity,
  'green-arrow': styles.idleArrow,
  'fairy-glade': styles.idleFairy,
  'ash-dragon': styles.idleDragon,
  'frost-queen': styles.idleQueen,
  'mad-dj': styles.idleDj,
};

const POSE_CLASS: Record<Exclude<HeroPose, 'present'>, string> = {
  draw: styles.poseDraw,
  sweep: styles.poseSweep,
  lunge: styles.poseLunge,
  frost: styles.poseFrost,
  drop: styles.poseDrop,
  throw: styles.poseDrop,
  slam: styles.poseSlam,
  flip: styles.poseFlip,
  pulse: styles.posePulse,
  snap: styles.poseSnap,
  lean: styles.poseLean,
};

function ofKind(marks: MarkLike[], kind: string) {
  return marks.filter((mark) => mark.kind === kind);
}

/** Which attack the hero should perform for the board currently on screen. */
export function resolveHeroCue(input: {
  gameId: string;
  phase: string | null;
  bonusKind?: string | null;
  label?: string;
  marks?: MarkLike[];
  cast?: CastLike;
}): HeroCue | null {
  const marks = input.marks ?? [];
  const id = input.gameId;
  const phase = input.phase;
  const cast = input.cast;

  if (id === 'green-arrow' && (cast?.actor === 'archer' || ofKind(marks, 'wild').length || ofKind(marks, 'mult').length || phase === 'pick' || (phase === 'intro' && input.bonusKind === 'pick'))) {
    const cells = [...ofKind(marks, 'wild'), ...ofKind(marks, 'mult')];
    return { pose: 'draw', cells: cells.length ? cells : (cast?.actor === 'archer' ? cast.cells : []) };
  }
  if (id === 'fairy-glade' && (ofKind(marks, 'wild').length > 0 || input.label?.startsWith('Фея') || cast?.actor === 'fairy')) {
    const cells = ofKind(marks, 'wild');
    return { pose: 'sweep', cells: cells.length ? cells : cast?.cells ?? [] };
  }
  if (id === 'ash-dragon' && (ofKind(marks, 'burn').length || ofKind(marks, 'mult').length || cast?.actor === 'dragon')) {
    return { pose: 'lunge', cells: [...ofKind(marks, 'burn'), ...ofKind(marks, 'mult')] };
  }
  if (id === 'frost-queen' && (ofKind(marks, 'frozen').length || ofKind(marks, 'colossal').length || cast?.actor === 'queen')) {
    return { pose: 'frost', cells: [...ofKind(marks, 'frozen'), ...ofKind(marks, 'colossal')] };
  }
  if (id === 'mad-dj' && (ofKind(marks, 'bomb').length || input.label === 'Бомба')) {
    return { pose: 'throw', cells: ofKind(marks, 'bomb') };
  }
  if (id === 'mad-dj' && (ofKind(marks, 'drop').length || cast?.actor === 'dj')) {
    const cells = ofKind(marks, 'drop').length ? ofKind(marks, 'drop') : cast?.cells ?? [];
    return { pose: 'drop', cells };
  }
  if (id === 'golden-must') return null;
  if (id === 'hex-vault' && ofKind(marks, 'coin').length) {
    return { pose: 'flip', cells: ofKind(marks, 'coin') };
  }
  if (id === 'oak-fortune' && ofKind(marks, 'orb').length) {
    return { pose: 'pulse', cells: ofKind(marks, 'orb') };
  }
  if (id === 'neon-river' && ofKind(marks, 'mystery').length) {
    return { pose: 'snap', cells: ofKind(marks, 'mystery') };
  }
  if (id === 'limitless-city' && (phase === 'wheel' || (phase === 'intro' && input.bonusKind === 'wheel'))) {
    return { pose: 'lean', cells: [] };
  }
  if (phase === 'intro' || phase === 'spins' || phase === 'wheel' || phase === 'pick') {
    return { pose: 'present', cells: [] };
  }
  return null;
}

export function sideHeroClass(gameId: string, cue: HeroCue | null): string {
  if (!cue) return styles.rest;
  if (cue.pose === 'present') return IDLE_CLASS[gameId] ?? styles.rest;
  return POSE_CLASS[cue.pose];
}

function spot(cell: { reel: number; row: number }, index: number) {
  return {
    ['--reel' as string]: String(cell.reel),
    ['--row' as string]: String(cell.row),
    animationDelay: `${index * 70}ms`,
  };
}

export default function HeroStage({
  gameId,
  cue,
  replayKey,
}: {
  gameId: string;
  cue: HeroCue | null;
  replayKey: string;
}) {
  const src = slotHero(gameId);
  if (!src || !cue) return null;
  const pose = cue.pose;
  const motion = pose === 'present' ? (IDLE_CLASS[gameId] ?? styles.rest) : POSE_CLASS[pose];
  const onRight = pose === 'lean' || pose === 'snap' || gameId === 'limitless-city';
  const cells = cue.cells.slice(0, 10);

  return (
    <>
      <img
        key={replayKey}
        className={`${styles.phoneHero} ${onRight ? styles.phoneRight : ''} ${motion}`}
        src={src}
        alt=""
        draggable={false}
      />
      {pose !== 'present' && cells.length ? (
        <div key={`fx-${replayKey}`} className={styles.layer} aria-hidden>
          {pose === 'draw' && cells.map((cell, index) => <i key={index} className={styles.bolt} style={spot(cell, index)} />)}
          {pose === 'sweep' && cells.map((cell, index) => <i key={index} className={styles.spark} style={spot(cell, index)} />)}
          {pose === 'lunge' && <i className={styles.breath} />}
          {pose === 'lunge' && cells.map((cell, index) => <i key={index} className={styles.fire} style={spot(cell, index)} />)}
          {pose === 'frost' && <i className={styles.frostWash} />}
          {pose === 'frost' && cells.slice(0, 8).map((cell, index) => <i key={index} className={styles.crystal} style={spot(cell, index)} />)}
          {pose === 'drop' && cells.map((cell, index) => <i key={index} className={styles.dropRing} style={spot(cell, index)} />)}
          {pose === 'slam' && [...new Set(cells.map((cell) => cell.reel))].map((reel) => (
            <i key={reel} className={styles.slamCol} style={{ ['--reel' as string]: String(reel) }} />
          ))}
          {pose === 'flip' && cells.slice(0, 8).map((cell, index) => <i key={index} className={styles.coinFly} style={spot(cell, index)} />)}
          {pose === 'pulse' && cells.map((cell, index) => <i key={index} className={styles.orbRing} style={spot(cell, index)} />)}
          {pose === 'snap' && cells.map((cell, index) => <i key={index} className={styles.snapFlash} style={spot(cell, index)} />)}
          {pose === 'lean' && <i className={styles.neonWink} />}
        </div>
      ) : null}
    </>
  );
}
