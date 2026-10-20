'use client';

import { slotHero } from '@/lib/slots/art';
import styles from './HeroStage.module.css';

export type HeroPose =
  | 'draw'
  | 'sweep'
  | 'lunge'
  | 'frost'
  | 'slash'
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
  'blade-ronin': styles.idleRonin,
};

const POSE_CLASS: Record<Exclude<HeroPose, 'present'>, string> = {
  draw: styles.poseDraw,
  sweep: styles.poseSweep,
  lunge: styles.poseLunge,
  frost: styles.poseFrost,
  slash: styles.poseSlash,
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
  if (id === 'blade-ronin' && (ofKind(marks, 'slash').length || cast?.actor === 'ronin')) {
    const cells = ofKind(marks, 'slash').length ? ofKind(marks, 'slash') : cast?.cells ?? [];
    return { pose: 'slash', cells, row: cells[0]?.row };
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
        className={`${styles.phoneHero} ${onRight ? styles.phoneRight : ''} ${motion} ${cells.length ? styles.away : ''}`}
        src={src}
        alt=""
        draggable={false}
      />
      {pose !== 'present' ? (
        <div key={`fx-${replayKey}`} className={styles.layer} aria-hidden>
          {pose === 'draw' && cells.map((cell, index) => (
            <span key={index} className={styles.flyWrap} style={spot(cell, index)}>
              <i className={styles.arrowArt} />
            </span>
          ))}
          {pose === 'sweep' && cells.map((cell, index) => <i key={index} className={styles.spark} style={spot(cell, index)} />)}
          {pose === 'lunge' && cells.slice(0, 3).map((cell, index) => (
            <span key={index} className={styles.flyWrap} style={spot(cell, index)}>
              <img className={styles.flyer} src={src} alt="" />
              <i className={styles.fireArt} />
            </span>
          ))}
          {pose === 'lunge' && !cells.length ? <i className={styles.breath} /> : null}
          {pose === 'frost' && <i className={styles.frostWash} />}
          {pose === 'frost' && cells.slice(0, 8).map((cell, index) => <i key={index} className={styles.crystal} style={spot(cell, index)} />)}
          {pose === 'slash' && <i className={styles.slashArc} style={{ ['--row' as string]: String(cue.row ?? cells[0]?.row ?? 1) }} />}
          {pose === 'slam' && [...new Set(cells.map((cell) => cell.reel))].map((reel) => (
            <i key={reel} className={styles.slamCol} style={{ ['--reel' as string]: String(reel) }} />
          ))}
          {pose === 'flip' && cells.slice(0, 8).map((cell, index) => <i key={index} className={styles.coinFly} style={spot(cell, index)} />)}
          {pose === 'pulse' && cells.map((cell, index) => (
            <span key={index} className={styles.flyWrap} style={spot(cell, index)}>
              <i className={styles.rootArt} />
            </span>
          ))}
          {pose === 'snap' && cells.map((cell, index) => <i key={index} className={styles.snapFlash} style={spot(cell, index)} />)}
          {pose === 'lean' && <i className={styles.neonWink} />}
        </div>
      ) : null}
    </>
  );
}
