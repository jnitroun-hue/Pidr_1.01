'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
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

function GamePageInner() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const roomId = searchParams.get('roomId');
  const roomCode = searchParams.get('roomCode');
  const isHost = searchParams.get('isHost') === '1';
  const isMultiplayer = mode === 'multiplayer' && Boolean(roomId && roomCode);

  return (
    <GamePageContent
      isMultiplayer={isMultiplayer}
      multiplayerData={
        isMultiplayer
          ? { roomId: roomId!, roomCode: roomCode!, isHost }
          : undefined
      }
    />
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={gameLoadingScreen}>
      <GamePageInner />
    </Suspense>
  );
}
