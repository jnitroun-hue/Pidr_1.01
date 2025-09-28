'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import TelegramGameTable from '../../components/TelegramGameTable';
import { useGameStore } from '../../store/gameStore';
import { useTelegramWebApp } from '../../hooks/useTelegramWebApp';
import { Card as StoreCard } from '../../store/gameStore';
import '../../styles/telegram-optimized.css';

// Адаптер для конвертации карт из gameStore в формат компонента
const convertStoreCardToGameCard = (storeCard: StoreCard) => ({
  suit: storeCard.suit || 'hearts',
  rank: storeCard.rank?.toString() || '2'
});

// Адаптер для конвертации игроков из gameStore в формат компонента  
const convertStorePlayerToGamePlayer = (storePlayer: any, index: number) => ({
  id: storePlayer.id,
  name: storePlayer.name,
  hand: storePlayer.cards?.filter((c: StoreCard) => c.open).map(convertStoreCardToGameCard) || [],
  isUser: storePlayer.isUser || false,
  avatar: storePlayer.avatar,
  coins: 0, // Используем gameCoins из store отдельно
  status: storePlayer.isBot ? 'ready' : 'thinking'
});

const TelegramGamePageContent: React.FC = () => {
  const searchParams = useSearchParams();
  
  // Получаем состояние из реального gameStore
  const { 
    isGameActive, 
    gameStage, 
    players, 
    currentPlayerId, 
    deck, 
    tableStack,
    selectedHandCard,
    gameCoins,
    trumpSuit,
    stage2TurnPhase,
    // Методы
    startGame,
    makeMove,
    selectHandCard,
    playSelectedCard,
    takeTableCards,
    onDeckClick,
    declareOneCard,
    askHowManyCards,
    showNotification
  } = useGameStore();

  const { hapticFeedback, mainButton, backButton, utils } = useTelegramWebApp();
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  // Конвертируем данные из gameStore в формат компонента
  const gameData = {
    players: players.map(convertStorePlayerToGamePlayer),
    currentPlayerId,
    gameStage: gameStage as 1 | 2 | 3,
    playedCards: tableStack?.map(convertStoreCardToGameCard) || [],
    deckCount: deck.length,
    selectedCardIndex
  };

  // Инициализация игры при первом запуске
  useEffect(() => {
    if (!isGameActive && players.length === 0) {
      const playerCount = parseInt(searchParams.get('players') || '4');
      startGame('single', playerCount);
    }
  }, [isGameActive, players.length, searchParams, startGame]);

  // Initialize Telegram WebApp
  useEffect(() => {
    utils.setHeaderColor('#17212b');
    utils.setBackgroundColor('#17212b');
    utils.expand();
    
    // Handle back button
    backButton.show(() => {
      window.history.back();
    });

    return () => {
      backButton.hide();
    };
  }, [utils, backButton]);

  // Game logic handlers - используем реальные методы из gameStore
  const handleCardSelect = useCallback((index: number) => {
    hapticFeedback.light();
    setSelectedCardIndex(index === -1 ? null : index);
    
    // Если есть выбранная карта в руке, используем её
    const currentPlayer = players.find(p => p.isUser);
    if (currentPlayer && index >= 0 && index < currentPlayer.cards.length) {
      const card = currentPlayer.cards[index];
      if (card.open) {
        selectHandCard(card);
      }
    }
  }, [hapticFeedback, selectHandCard, players]);

  const handleCardPlay = useCallback((index: number) => {
    const currentPlayer = players.find(p => p.isUser);
    if (!currentPlayer || !currentPlayer.isUser) return;
    
    hapticFeedback.medium();
    
    // Используем реальную игровую логику
    if (gameStage === 1) {
      // В первой стадии используем makeMove
      const card = currentPlayer.cards[index];
      if (card) {
        makeMove(card.id);
      }
    } else if (gameStage === 2 || gameStage === 3) {
      // Во второй и третьей стадиях играем выбранную карту
      playSelectedCard();
    }
    
    setSelectedCardIndex(null);
  }, [hapticFeedback, players, gameStage, makeMove, playSelectedCard]);

  const handleDeckClick = useCallback(() => {
    hapticFeedback.medium();
    onDeckClick();
  }, [hapticFeedback, onDeckClick]);

  const handlePassTurn = useCallback(() => {
    hapticFeedback.light();
    // Логика пропуска хода зависит от стадии игры
    if (gameStage === 2 && tableStack && tableStack.length > 0) {
      takeTableCards(); // Во второй стадии "пас" = взять карты
    }
  }, [hapticFeedback, gameStage, tableStack, takeTableCards]);

  const handleDeclareOneCard = useCallback(() => {
    const currentPlayer = players.find(p => p.isUser);
    if (currentPlayer) {
      hapticFeedback.heavy();
      declareOneCard(currentPlayer.id);
    }
  }, [hapticFeedback, players, declareOneCard]);

  const canPlayCard = useCallback((card: any, index: number): boolean => {
    const currentPlayer = players.find(p => p.isUser);
    if (!currentPlayer || currentPlayer.id !== currentPlayerId) return false;
    
    // Проверяем по стадиям игры
    if (gameStage === 1) {
      return true; // В первой стадии можно играть любой картой
    } else if (gameStage === 2) {
      return stage2TurnPhase === 'selecting_card'; // Во второй стадии только в фазе выбора
    } else {
      return currentPlayer.cards[index]?.open || false; // В третьей только открытыми
    }
  }, [players, currentPlayerId, gameStage, stage2TurnPhase]);

  const handlePlayerClick = useCallback((playerId: string) => {
    hapticFeedback.light();
    console.log('Clicked player:', playerId);
    // Можно добавить логику взаимодействия с игроками
  }, [hapticFeedback]);

  if (!isGameActive || gameData.players.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--tg-theme-bg-color)',
        color: 'var(--tg-theme-text-color)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎮</div>
          <div style={{ fontSize: '18px', fontWeight: '600' }}>Загрузка P.I.D.R. игры...</div>
          <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
            Подготавливаем карты для Telegram WebApp
          </div>
          {/* Показываем баланс во время загрузки */}
          <div style={{
            marginTop: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, var(--game-gold) 0%, #f5a623 100%)',
            color: '#0f172a',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '700'
          }}>
            🪙 {gameCoins.toLocaleString()} монет
          </div>
        </div>
      </div>
    );
  }

  return (
    <TelegramGameTable
      players={gameData.players}
      currentPlayerId={gameData.currentPlayerId}
      gameStage={gameData.gameStage}
      playedCards={gameData.playedCards}
      deckCount={gameData.deckCount}
      selectedCardIndex={gameData.selectedCardIndex}
      onPlayerClick={handlePlayerClick}
      onCardSelect={handleCardSelect}
      onCardPlay={handleCardPlay}
      onDeckClick={handleDeckClick}
      canPlayCard={canPlayCard}
      gameActions={{
        onTakeFromDeck: handleDeckClick,
        onPassTurn: handlePassTurn,
        onDeclareOneCard: handleDeclareOneCard
      }}
    />
  );
};

export default TelegramGamePageContent;
