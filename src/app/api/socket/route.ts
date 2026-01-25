import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export async function GET(req: NextRequest) {
  if (!io) {
    // Создание HTTP сервера для Socket.IO
    const httpServer = new HTTPServer();
    
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      path: '/api/socket'
    });

    // Обработка WebSocket соединений
    io.on('connection', (socket) => {
      console.log('🔌 [WebSocket] Новое подключение:', socket.id);

      // Присоединение к игровой комнате
      socket.on('join-room', (roomId: string, userId: string) => {
        console.log(`🚪 [WebSocket] Пользователь ${userId} присоединяется к комнате ${roomId}`);
        socket.join(roomId);
        socket.to(roomId).emit('player-joined', { userId, socketId: socket.id });
      });

      // Покидание игровой комнаты
      socket.on('leave-room', (roomId: string, userId: string) => {
        console.log(`🚪 [WebSocket] Пользователь ${userId} покидает комнату ${roomId}`);
        socket.leave(roomId);
        socket.to(roomId).emit('player-left', { userId, socketId: socket.id });
      });

      // Синхронизация состояния игры
      socket.on('game-state-update', (roomId: string, gameState: any) => {
        console.log(`🎮 [WebSocket] Обновление состояния игры в комнате ${roomId}`);
        socket.to(roomId).emit('game-state-sync', gameState);
      });

      // Ход игрока
      socket.on('player-move', (roomId: string, moveData: any) => {
        console.log(`🎯 [WebSocket] Ход игрока в комнате ${roomId}:`, moveData);
        socket.to(roomId).emit('player-move-sync', moveData);
      });

      // Пригласить друга в игру
      socket.on('invite-friend', (data: { friendId: string, roomId: string, roomCode: string }) => {
        console.log(`💌 [WebSocket] Приглашение друга ${data.friendId} в комнату ${data.roomId}`);
        io?.emit('friend-invitation', data);
      });

      // Чат в игре
      socket.on('game-chat', (roomId: string, message: { userId: string, text: string, timestamp: number }) => {
        console.log(`💬 [WebSocket] Сообщение в комнате ${roomId}:`, message);
        socket.to(roomId).emit('game-chat-message', message);
      });

      // Статус игрока (готов/не готов)
      socket.on('player-ready', (roomId: string, data: { userId: string, isReady: boolean }) => {
        console.log(`✅ [WebSocket] Статус готовности игрока ${data.userId}: ${data.isReady}`);
        socket.to(roomId).emit('player-ready-sync', data);
      });

      // Начало игры
      socket.on('start-game', (roomId: string, gameSettings: any) => {
        console.log(`🚀 [WebSocket] Начало игры в комнате ${roomId}`);
        io?.to(roomId).emit('game-started', gameSettings);
      });

      // Окончание игры
      socket.on('end-game', (roomId: string, results: any) => {
        console.log(`🏁 [WebSocket] Окончание игры в комнате ${roomId}`);
        io?.to(roomId).emit('game-ended', results);
      });

      // Отключение
      socket.on('disconnect', (reason) => {
        console.log('🔌 [WebSocket] Отключение:', socket.id, reason);
      });
    });

    // Запуск сервера на порту 3001
    httpServer.listen(3001, () => {
      console.log('🔌 [WebSocket] Сервер запущен на порту 3001');
    });
  }

  return NextResponse.json({ 
    success: true, 
    message: 'WebSocket сервер запущен',
    port: 3001 
  });
}
