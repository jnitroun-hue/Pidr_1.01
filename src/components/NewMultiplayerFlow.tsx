'use client';

import { useState } from 'react';
import { useTelegram } from '../hooks/useTelegram';
import RoomCreation from './RoomCreation';
import TableSelection from './TableSelection';
import WaitingRoom from './WaitingRoom';

interface NewMultiplayerFlowProps {
  onBack: () => void;
  onStartGame: (gameData: any) => void;
}

type ViewType = 'room-creation' | 'table-selection' | 'waiting-room';

interface RoomSettings {
  hasPassword: boolean;
  password?: string;
  maxPlayers: number;
  isPrivate: boolean;
}

interface TableType {
  id: string;
  name: string;
  description: string;
  players: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function NewMultiplayerFlow({ onBack, onStartGame }: NewMultiplayerFlowProps) {
  const { user } = useTelegram();
  const [view, setView] = useState<ViewType>('room-creation');
  const [roomSettings, setRoomSettings] = useState<RoomSettings | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableType | null>(null);
  const [currentRoomCode, setCurrentRoomCode] = useState('');

  // Mock players for waiting room
  const [waitingRoomPlayers, setWaitingRoomPlayers] = useState([
    {
      id: '1',
      name: user?.first_name || user?.username || 'Вы',
      avatar: (user as any)?.photo_url || '🎮',
      isBot: false,
      isReady: true,
      isHost: true,
      isOnline: true
    }
  ]);

  const handleRoomCreated = (settings: RoomSettings) => {
    setRoomSettings(settings);
    setView('table-selection');
  };

  const handleTableSelected = (table: TableType) => {
    setSelectedTable(table);
    // Generate room code
    setCurrentRoomCode(Math.random().toString(36).substring(2, 8).toUpperCase());
    setView('waiting-room');
  };

  const handleAddBot = () => {
    if (!roomSettings || waitingRoomPlayers.length >= roomSettings.maxPlayers) return;

    const botNames = ['Алекс', 'Мария', 'Дмитрий', 'Анна', 'Сергей', 'Елена', 'Максим', 'Ольга'];
    const botAvatars = ['🤖', '🎯', '🎲', '⚡', '🔥', '💎', '🎪', '🎭'];
    
    const usedNames = waitingRoomPlayers.map(p => p.name);
    const availableNames = botNames.filter(name => !usedNames.includes(name));
    
    if (availableNames.length === 0) return;

    const newBot = {
      id: `bot-${Date.now()}`,
      name: availableNames[Math.floor(Math.random() * availableNames.length)],
      avatar: botAvatars[Math.floor(Math.random() * botAvatars.length)],
      isBot: true,
      isReady: true,
      isHost: false,
      isOnline: true
    };

    setWaitingRoomPlayers(prev => [...prev, newBot]);
  };

  const handleKickPlayer = (playerId: string) => {
    setWaitingRoomPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const handleStartGame = () => {
    const gameData = {
      roomSettings,
      selectedTable,
      players: waitingRoomPlayers,
      roomCode: currentRoomCode
    };
    
    console.log('Starting game with data:', gameData);
    onStartGame(gameData);
  };

  const handleLeaveRoom = () => {
    // Reset to initial state
    setView('room-creation');
    setRoomSettings(null);
    setSelectedTable(null);
    setCurrentRoomCode('');
    setWaitingRoomPlayers([{
      id: '1',
      name: user?.first_name || user?.username || 'Вы',
      avatar: (user as any)?.photo_url || '🎮',
      isBot: false,
      isReady: true,
      isHost: true,
      isOnline: true
    }]);
    onBack();
  };

  const handleBackFromTableSelection = () => {
    setView('room-creation');
    setRoomSettings(null);
  };

  const handleBackFromWaitingRoom = () => {
    setView('table-selection');
    setCurrentRoomCode('');
    setWaitingRoomPlayers([{
      id: '1',
      name: user?.first_name || user?.username || 'Вы',
      avatar: (user as any)?.photo_url || '🎮',
      isBot: false,
      isReady: true,
      isHost: true,
      isOnline: true
    }]);
  };

  if (view === 'room-creation') {
    return (
      <RoomCreation
        onBack={onBack}
        onCreateRoom={handleRoomCreated}
      />
    );
  }

  if (view === 'table-selection' && roomSettings) {
    return (
      <TableSelection
        maxPlayers={roomSettings.maxPlayers}
        onBack={handleBackFromTableSelection}
        onSelectTable={handleTableSelected}
      />
    );
  }

  if (view === 'waiting-room' && roomSettings && selectedTable) {
    return (
      <WaitingRoom
        roomCode={currentRoomCode}
        roomSettings={{
          hasPassword: roomSettings.hasPassword,
          maxPlayers: roomSettings.maxPlayers,
          tableType: selectedTable.name,
          isHost: true
        }}
        players={waitingRoomPlayers}
        onBack={handleBackFromWaitingRoom}
        onStartGame={handleStartGame}
        onAddBot={handleAddBot}
        onKickPlayer={handleKickPlayer}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return null;
}
