'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NewMultiplayerFlow from '../../components/NewMultiplayerFlow';

export default function NewRoomPage() {
  const router = useRouter();

  const handleBack = () => {
    router.push('/');
  };

  const handleStartGame = (gameData: any) => {
    console.log('🎮 Начинаем игру с данными:', gameData);
    
    // Сохраняем данные игры в localStorage для передачи в игру
    localStorage.setItem('multiplayer_game_data', JSON.stringify(gameData));
    
    const searchParams = new URLSearchParams({
      mode: 'multiplayer',
      players: gameData.players.length.toString(),
      table: gameData.selectedTable.id,
      roomCode: gameData.roomCode
    });
    
    console.log('🔄 Перенаправляем в игру:', `/game?${searchParams.toString()}`);
    
    // Используем window.location для надежного перехода
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        if (window.Telegram?.WebApp) {
          console.log('📱 Переход в Telegram WebApp');
          window.location.href = `/game?${searchParams.toString()}`;
        } else {
          console.log('💻 Обычный переход');
          router.push(`/game?${searchParams.toString()}`);
        }
      }
    }, 500);
  };

  return (
    <div className="min-h-screen">
      <NewMultiplayerFlow
        onBack={handleBack}
        onStartGame={handleStartGame}
      />
    </div>
  );
}
