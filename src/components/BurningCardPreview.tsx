'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BurningSuitAnimator, BurningSuitParams } from '../lib/nft/burning-suit-generator';
import styles from './BurningCardPreview.module.css';

interface BurningCardPreviewProps {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  burningParams: Omit<BurningSuitParams, 'suit'>;
  animated?: boolean;
  width?: number;
  height?: number;
}

export default function BurningCardPreview({
  suit,
  rank,
  burningParams,
  animated = true,
  width = 200,
  height = 300,
}: BurningCardPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatorRef = useRef<BurningSuitAnimator | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const fullParams: BurningSuitParams = {
      suit,
      ...burningParams,
    };

    // Создаем аниматор
    const animator = new BurningSuitAnimator(canvas, fullParams);
    animatorRef.current = animator;

    if (animated) {
      animator.start();
    } else {
      // Рендерим один раз
      (animator as any).render();
    }

    setIsLoaded(true);

    return () => {
      animator.stop();
    };
  }, [suit, burningParams, animated]);

  return (
    <div className={styles.cardContainer} style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={600}
        className={styles.canvas}
        style={{ 
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />
      
      {/* Ранг карты */}
      <div className={styles.rankOverlay}>
        <div className={styles.rankTop}>{rank}</div>
        <div className={styles.rankBottom}>{rank}</div>
      </div>
      
      {/* Информация о редкости */}
      <div className={styles.rarityBadge}>
        {getRarityName(burningParams.intensity)}
      </div>
    </div>
  );
}

function getRarityName(intensity: number): string {
  if (intensity > 80) return 'LEGENDARY';
  if (intensity > 60) return 'EPIC';
  if (intensity > 40) return 'RARE';
  return 'COMMON';
}

