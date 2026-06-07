'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import PageLoadingScreen from '@/components/PageLoadingScreen';

const gameLoadingScreen = (
  <PageLoadingScreen
    title="P.I.D.R."
    subtitle="Загрузка игры..."
  />
);

const GamePageContent = dynamic(() => import('./GamePageContent'), {
  ssr: false,
  loading: () => gameLoadingScreen,
});

export default function GamePage() {
  return (
    <Suspense fallback={gameLoadingScreen}>
      <GamePageContent />
    </Suspense>
  );
}
