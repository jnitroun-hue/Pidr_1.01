import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketProps {
  userId?: string;
  roomId?: string;
  autoConnect?: boolean;
}

interface GameMessage {
  type: string;
  data: any;
  timestamp: number;
}

export function useWebSocket({ userId, roomId, autoConnect = true }: UseWebSocketProps = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  const socketRef = useRef<Socket | null>(null);

  // Подключение к WebSocket серверу
  const connect = () => {
    if (socketRef.current?.connected) return;
    
    setIsConnecting(true);
    
    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('🔌 [WebSocket Client] Подключен к серверу:', newSocket.id);
      setIsConnected(true);
      setIsConnecting(false);
      
      // Присоединяемся к комнате если указана
      if (roomId && userId) {
        newSocket.emit('join-room', roomId, userId);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 [WebSocket Client] Отключен от сервера:', reason);
      setIsConnected(false);
      setIsConnecting(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 [WebSocket Client] Ошибка подключения:', error);
      setIsConnecting(false);
    });

    // Обработчики игровых событий
    newSocket.on('player-joined', (data: { userId: string, socketId: string }) => {
      console.log('👥 [WebSocket Client] Игрок присоединился:', data);
      setOnlineUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
      addMessage('player-joined', data);
    });

    newSocket.on('player-left', (data: { userId: string, socketId: string }) => {
      console.log('👥 [WebSocket Client] Игрок покинул игру:', data);
      setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      addMessage('player-left', data);
    });

    newSocket.on('game-state-sync', (gameState: any) => {
      console.log('🎮 [WebSocket Client] Синхронизация состояния игры:', gameState);
      addMessage('game-state-sync', gameState);
    });

    newSocket.on('player-move-sync', (moveData: any) => {
      console.log('🎯 [WebSocket Client] Синхронизация хода игрока:', moveData);
      addMessage('player-move-sync', moveData);
    });

    newSocket.on('friend-invitation', (data: { friendId: string, roomId: string, roomCode: string }) => {
      console.log('💌 [WebSocket Client] Приглашение от друга:', data);
      addMessage('friend-invitation', data);
    });

    newSocket.on('game-chat-message', (message: { userId: string, text: string, timestamp: number }) => {
      console.log('💬 [WebSocket Client] Сообщение в чате:', message);
      addMessage('game-chat-message', message);
    });

    newSocket.on('player-ready-sync', (data: { userId: string, isReady: boolean }) => {
      console.log('✅ [WebSocket Client] Статус готовности игрока:', data);
      addMessage('player-ready-sync', data);
    });

    newSocket.on('game-started', (gameSettings: any) => {
      console.log('🚀 [WebSocket Client] Игра началась:', gameSettings);
      addMessage('game-started', gameSettings);
    });

    newSocket.on('game-ended', (results: any) => {
      console.log('🏁 [WebSocket Client] Игра завершена:', results);
      addMessage('game-ended', results);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  };

  // Отключение от WebSocket сервера
  const disconnect = () => {
    if (socketRef.current) {
      if (roomId && userId) {
        socketRef.current.emit('leave-room', roomId, userId);
      }
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  };

  // Добавление сообщения в историю
  const addMessage = (type: string, data: any) => {
    const message: GameMessage = {
      type,
      data,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev.slice(-99), message]); // Храним последние 100 сообщений
  };

  // Функции для отправки событий
  const joinRoom = (newRoomId: string, newUserId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-room', newRoomId, newUserId);
    }
  };

  const leaveRoom = (roomIdToLeave: string, userIdToLeave: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-room', roomIdToLeave, userIdToLeave);
    }
  };

  const updateGameState = (gameState: any) => {
    if (socketRef.current?.connected && roomId) {
      socketRef.current.emit('game-state-update', roomId, gameState);
    }
  };

  const sendPlayerMove = (moveData: any) => {
    if (socketRef.current?.connected && roomId) {
      socketRef.current.emit('player-move', roomId, moveData);
    }
  };

  const inviteFriend = (friendId: string, roomCode: string) => {
    if (socketRef.current?.connected && roomId) {
      socketRef.current.emit('invite-friend', { friendId, roomId, roomCode });
    }
  };

  const sendChatMessage = (text: string) => {
    if (socketRef.current?.connected && roomId && userId) {
      const message = {
        userId,
        text,
        timestamp: Date.now()
      };
      socketRef.current.emit('game-chat', roomId, message);
    }
  };

  const setPlayerReady = (isReady: boolean) => {
    if (socketRef.current?.connected && roomId && userId) {
      socketRef.current.emit('player-ready', roomId, { userId, isReady });
    }
  };

  const startGame = (gameSettings: any) => {
    if (socketRef.current?.connected && roomId) {
      socketRef.current.emit('start-game', roomId, gameSettings);
    }
  };

  const endGame = (results: any) => {
    if (socketRef.current?.connected && roomId) {
      socketRef.current.emit('end-game', roomId, results);
    }
  };

  // Автоподключение при монтировании
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  // Переподключение к новой комнате
  useEffect(() => {
    if (socketRef.current?.connected && roomId && userId) {
      joinRoom(roomId, userId);
    }
  }, [roomId, userId]);

  return {
    socket,
    isConnected,
    isConnecting,
    messages,
    onlineUsers,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    updateGameState,
    sendPlayerMove,
    inviteFriend,
    sendChatMessage,
    setPlayerReady,
    startGame,
    endGame,
    clearMessages: () => setMessages([])
  };
}
