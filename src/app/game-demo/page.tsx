'use client'

import React, { useState } from 'react';
import ProfessionalGameTable from '../../components/GameTable/ProfessionalGameTable';
import { Player, Card } from '../../types/game';

// Демо данные для тестирования
const createDemoPlayers = (): Player[] => [
  {
    id: '1',
    name: 'Вы',
    isUser: true,
    hand: [
      { suit: 'hearts', rank: 'K' },
      { suit: 'spades', rank: 'A' },
      { suit: 'diamonds', rank: '10' },
      { suit: 'clubs', rank: 'Q' },
      { suit: 'hearts', rank: '7' },
    ],
    coins: 1000,
    avatar: '/avatars/player.png',
    status: 'ready'
  },
  {
    id: '2',
    name: 'Алексей',
    isUser: false,
    hand: Array(6).fill(null).map(() => ({ suit: 'clubs', rank: '2' })),
    coins: 850,
    avatar: '/avatars/bot1.png',
    status: 'thinking'
  },
  {
    id: '3',
    name: 'Мария',
    isUser: false,
    hand: Array(4).fill(null).map(() => ({ suit: 'clubs', rank: '2' })),
    coins: 1200,
    avatar: '/avatars/bot2.png',
    status: 'waiting'
  },
  {
    id: '4',
    name: 'Дмитрий',
    isUser: false,
    hand: Array(7).fill(null).map(() => ({ suit: 'clubs', rank: '2' })),
    coins: 650,
    avatar: '/avatars/bot3.png',
    status: 'ready'
  },
  {
    id: '5',
    name: 'Анна',
    isUser: false,
    hand: Array(3).fill(null).map(() => ({ suit: 'clubs', rank: '2' })),
    coins: 950,
    avatar: '/avatars/bot4.png',
    status: 'waiting'
  },
  {
    id: '6',
    name: 'Игорь',
    isUser: false,
    hand: Array(5).fill(null).map(() => ({ suit: 'clubs', rank: '2' })),
    coins: 1100,
    avatar: '/avatars/bot5.png',
    status: 'ready'
  },
  {
    id: '7',
    name: 'Елена',
    isUser: false,
    hand: Array(4).fill(null).map(() => ({ suit: 'clubs', rank: '2' })),
    coins: 800,
    avatar: '/avatars/bot6.png',
    status: 'thinking'
  },
  {
    id: '8',
    name: 'Максим',
    isUser: false,
    hand: Array(6).fill(null).map(() => ({ suit: 'clubs', rank: '2' })),
    coins: 750,
    avatar: '/avatars/bot7.png',
    status: 'waiting'
  }
];

const demoPlayedCards: Card[] = [
  { suit: 'hearts', rank: '9' },
  { suit: 'spades', rank: 'J' },
  { suit: 'diamonds', rank: '8' },
];

export default function GameDemoPage() {
  const [players, setPlayers] = useState<Player[]>(createDemoPlayers());
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('1'); // Начинаем с пользователя
  const [gameStage, setGameStage] = useState<1 | 2 | 3>(1);
  const [playedCards, setPlayedCards] = useState<Card[]>(demoPlayedCards);
  const [deckCount, setDeckCount] = useState(28);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);

  // Обработчики событий
  const handlePlayerClick = (playerId: string) => {
    console.log('Clicked on player:', playerId);
  };

  const handleCardSelect = (index: number) => {
    setSelectedCardIndex(index === -1 ? null : index);
  };

  const handleCardPlay = (index: number) => {
    const currentPlayer = players.find(p => p.id === currentPlayerId);
    if (!currentPlayer || currentPlayer.id !== '1') return; // Только если ход пользователя

    const card = currentPlayer.hand[index];
    
    // Добавляем карту в сыгранные
    setPlayedCards(prev => [...prev, card]);
    
    // Убираем карту из руки игрока
    setPlayers(prev => prev.map(player => 
      player.id === currentPlayerId 
        ? { ...player, hand: player.hand.filter((_, i) => i !== index) }
        : player
    ));
    
    // Сбрасываем выбор
    setSelectedCardIndex(null);
    
    // Переходим к следующему игроку
    const nextPlayerIndex = (players.findIndex(p => p.id === currentPlayerId) + 1) % players.length;
    setCurrentPlayerId(players[nextPlayerIndex].id);
  };

  const canPlayCard = (card: Card, index: number): boolean => {
    // Простая логика для демо - можно играть любой картой если ваш ход
    return currentPlayerId === '1';
  };

  const gameActions = {
    onTakeFromDeck: () => {
      if (currentPlayerId !== '1') return;
      
      // Добавляем случайную карту в руку
      const newCard: Card = { 
        suit: ['hearts', 'diamonds', 'clubs', 'spades'][Math.floor(Math.random() * 4)] as any, 
        rank: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)] as any
      };
      
      setPlayers(prev => prev.map(player => 
        player.id === '1' 
          ? { ...player, hand: [...player.hand, newCard] }
          : player
      ));
      
      setDeckCount(prev => Math.max(0, prev - 1));
      
      // Переход к следующему игроку
      const nextPlayerIndex = (players.findIndex(p => p.id === currentPlayerId) + 1) % players.length;
      setCurrentPlayerId(players[nextPlayerIndex].id);
    },
    
    onPassTurn: () => {
      if (currentPlayerId !== '1') return;
      
      // Переход к следующему игроку
      const nextPlayerIndex = (players.findIndex(p => p.id === currentPlayerId) + 1) % players.length;
      setCurrentPlayerId(players[nextPlayerIndex].id);
    },
    
    onDeclareOneCard: () => {
      console.log('Объявлено: ОДНА КАРТА!');
    }
  };

  // Демо контролы
  const demoControls = (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <h4 style={{ margin: 0, color: '#ffd700' }}>🎮 Демо Контролы</h4>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setGameStage(1)}
          style={{ 
            padding: '5px 10px', 
            background: gameStage === 1 ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Стадия 1
        </button>
        <button 
          onClick={() => setGameStage(2)}
          style={{ 
            padding: '5px 10px', 
            background: gameStage === 2 ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Стадия 2
        </button>
        <button 
          onClick={() => setGameStage(3)}
          style={{ 
            padding: '5px 10px', 
            background: gameStage === 3 ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Стадия 3
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setCurrentPlayerId('1')}
          style={{ 
            padding: '5px 10px', 
            background: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Ваш ход
        </button>
        <button 
          onClick={() => {
            const randomPlayer = players[Math.floor(Math.random() * players.length)];
            setCurrentPlayerId(randomPlayer.id);
          }}
          style={{ 
            padding: '5px 10px', 
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Случайный ход
        </button>
      </div>
      
      <div style={{ fontSize: '12px', opacity: 0.8 }}>
        Текущий ход: {players.find(p => p.id === currentPlayerId)?.name || 'Неизвестно'}
      </div>
    </div>
  );

  return (
    <div>
      <ProfessionalGameTable
        players={players}
        currentPlayerId={currentPlayerId}
        gameStage={gameStage}
        playedCards={playedCards}
        deckCount={deckCount}
        onPlayerClick={handlePlayerClick}
        onCardSelect={handleCardSelect}
        onCardPlay={handleCardPlay}
        canPlayCard={canPlayCard}
        selectedCardIndex={selectedCardIndex}
        gameActions={gameActions}
      />
      
      {demoControls}
    </div>
  );
}
