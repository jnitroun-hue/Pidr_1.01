'use client';

import { Suspense } from 'react';

function GamePageContentFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--tg-theme-bg-color)',
      color: 'var(--tg-theme-text-color)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎮</div>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>Игра временно недоступна</div>
        <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
          Мы обновляем игровой движок. Мультиплеер уже работает.
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--tg-theme-bg-color)',
        color: 'var(--tg-theme-text-color)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎮</div>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>Загрузка игры...</div>
          <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
            Подготавливаем карты для Telegram WebApp
          </div>
        </div>
      </div>
    }>
      <GamePageContentFallback />
    </Suspense>
  );
} 