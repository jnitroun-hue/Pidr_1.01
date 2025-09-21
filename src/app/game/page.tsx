'use client';

import { Suspense } from 'react';
import GamePageContent from './GamePageContent';

export default function GamePage() {
  return (
    <Suspense fallback={<div>Загрузка...</div>}>
      <GamePageContent />
    </Suspense>
  );
} 