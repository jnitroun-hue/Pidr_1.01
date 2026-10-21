'use client';

import { useEffect, useState } from 'react';
import type { SpinWin } from '@/lib/slots/engine';
import styles from './WinTrace.module.css';

type Props = {
  gameId: string;
  reels: number;
  rows: number;
  wins: SpinWin[];
  color: string;
};

function points(win: SpinWin): string {
  const ordered = win.kind === 'line'
    ? [...win.cells]
    : [...win.cells].sort((a, b) => a.reel - b.reel || a.row - b.row);
  return ordered.map((cell) => `${cell.reel + 0.5},${cell.row + 0.5}`).join(' ');
}

export default function WinTrace({ gameId, reels, rows, wins, color }: Props) {
  const lines = wins.filter((win) => win.cells.length >= 2);
  const signature = lines.map((win) => win.cells.map((cell) => `${cell.reel}${cell.row}`).join('.')).join('|');
  const [cursor, setCursor] = useState(0);
  useEffect(() => {
    setCursor(0);
    if (lines.length < 2) return;
    const timer = window.setInterval(() => setCursor((value) => (value + 1) % lines.length), 900);
    return () => window.clearInterval(timer);
  }, [signature, lines.length]);
  const shown = lines.length ? lines[cursor % lines.length] : null;
  if (!shown) return null;
  const dash = gameId === 'neon-river' || gameId === 'frost-queen' ? '0.28 0.16' : gameId === 'blade-ronin' ? '0.55 0.18' : undefined;
  return (
    <svg className={styles.layer} viewBox={`0 0 ${reels} ${rows}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points(shown)} strokeDasharray={dash} style={{ stroke: color }} />
    </svg>
  );
}
