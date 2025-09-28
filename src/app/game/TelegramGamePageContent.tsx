'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import TelegramGameTable from '../../components/TelegramGameTable';
import { Player, Card } from '../../types/game';
import '../../styles/telegram-optimized.css';

// Mock data for demonstration
const createMockPlayer = (id: string, name: string, isUser: boolean = false): Player => ({
  id,
  name,
  hand: generateRandomHand(Math.floor(Math.random() * 7) + 3),
  isUser,
  avatar: isUser ? '/avatars/player.png' : `/avatars/bot-${Math.floor(Math.random() * 5) + 1}.png`,
  coins: Math.floor(Math.random() * 1000) + 100,
  status: Math.random() > 0.7 ? 'thinking' : 'ready'
});

const generateRandomHand = (count: number): Card[] => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const hand: Card[] = [];
  
  for (let i = 0; i < count; i++) {
    hand.push({
      suit: suits[Math.floor(Math.random() * suits.length)],
      rank: ranks[Math.floor(Math.random() * ranks.length)]
    });
  }
  
  return hand;
};

const TelegramGamePageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const [gameState, setGameState] = useState({
    players: [] as Player[],
    currentPlayerId: null as string | null,
    gameStage: 1 as 1 | 2 | 3,
    playedCards: [] as Card[],
    deckCount: 36,
    selectedCardIndex: null as number | null
  });

  // Initialize game
  useEffect(() => {
    const playerCount = parseInt(searchParams.get('players') || '4');
    const players: Player[] = [
      createMockPlayer('user', 'Вы', true),
      ...Array.from({ length: playerCount - 1 }, (_, i) => 
        createMockPlayer(`bot-${i + 1}`, `Игрок ${i + 1}`)
      )
    ];

    setGameState(prev => ({
      ...prev,
      players,
      currentPlayerId: 'user'
    }));
  }, [searchParams]);

  // Initialize Telegram WebApp
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Configure WebApp
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
      
      // Set theme
      tg.setHeaderColor('#17212b');
      tg.setBackgroundColor('#17212b');
      
      // Handle back button
      tg.BackButton.onClick(() => {
        window.history.back();
      });
      tg.BackButton.show();

      // Cleanup
      return () => {
        tg.BackButton.hide();
        tg.disableClosingConfirmation();
      };
    }
  }, []);

  // Game logic handlers
  const handleCardSelect = useCallback((index: number) => {
    setGameState(prev => ({
      ...prev,
      selectedCardIndex: index === -1 ? null : index
    }));
  }, []);

  const handleCardPlay = useCallback((index: number) => {
    const player = gameState.players.find(p => p.isUser);
    if (!player || index < 0 || index >= player.hand.length) return;

    const playedCard = player.hand[index];
    
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.isUser 
          ? { ...p, hand: p.hand.filter((_, i) => i !== index) }
          : p
      ),
      playedCards: [...prev.playedCards, playedCard],
      selectedCardIndex: null,
      currentPlayerId: getNextPlayerId(prev.players, prev.currentPlayerId || '')
    }));
  }, [gameState.players]);

  const handleDeckClick = useCallback(() => {
    const newCard = generateRandomHand(1)[0];
    
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.isUser 
          ? { ...p, hand: [...p.hand, newCard] }
          : p
      ),
      deckCount: Math.max(0, prev.deckCount - 1),
      currentPlayerId: getNextPlayerId(prev.players, prev.currentPlayerId || '')
    }));
  }, []);

  const handlePassTurn = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentPlayerId: getNextPlayerId(prev.players, prev.currentPlayerId || ''),
      selectedCardIndex: null
    }));
  }, []);

  const handleDeclareOneCard = useCallback(() => {
    // Handle "UNO" declaration
    console.log('Объявлена последняя карта!');
  }, []);

  // Helper functions
  const getNextPlayerId = (players: Player[], currentId: string): string => {
    const currentIndex = players.findIndex(p => p.id === currentId);
    const nextIndex = (currentIndex + 1) % players.length;
    return players[nextIndex].id;
  };

  const canPlayCard = useCallback((card: Card, index: number): boolean => {
    // Simple rule: can always play if it's your turn
    const isPlayerTurn = gameState.currentPlayerId === 'user';
    
    if (!isPlayerTurn) return false;
    
    // Add more complex game rules here
    if (gameState.playedCards.length === 0) return true;
    
    const lastCard = gameState.playedCards[gameState.playedCards.length - 1];
    return card.suit === lastCard.suit || card.rank === lastCard.rank;
  }, [gameState.currentPlayerId, gameState.playedCards]);

  const handlePlayerClick = useCallback((playerId: string) => {
    console.log('Clicked player:', playerId);
  }, []);

  if (gameState.players.length === 0) {
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
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>🎮</div>
          <div>Загрузка игры...</div>
        </div>
      </div>
    );
  }

  return (
    <TelegramGameTable
      players={gameState.players}
      currentPlayerId={gameState.currentPlayerId}
      gameStage={gameState.gameStage}
      playedCards={gameState.playedCards}
      deckCount={gameState.deckCount}
      selectedCardIndex={gameState.selectedCardIndex}
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
