'use client'
import { motion } from 'framer-motion';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomData: {
    name: string;
    maxPlayers: number;
    isPrivate: boolean;
    password: string;
  };
  setRoomData: (data: any) => void;
  onCreateRoom: () => void;
}

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  onJoinRoom: () => void;
}

export function CreateRoomModal({ isOpen, onClose, roomData, setRoomData, onCreateRoom }: CreateRoomModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h3 className="text-xl font-bold text-white mb-4">Создать комнату</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Название комнаты</label>
            <input
              type="text"
              value={roomData.name}
              onChange={(e) => setRoomData((prev: any) => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Максимум игроков</label>
            <select
              value={roomData.maxPlayers}
              onChange={(e) => setRoomData((prev: any) => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
            >
              {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <option key={num} value={num}>{num} игроков</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-300">Приватная комната</label>
            <button
              onClick={() => setRoomData((prev: any) => ({ ...prev, isPrivate: !prev.isPrivate }))}
              className={`w-12 h-6 rounded-full ${roomData.isPrivate ? 'bg-blue-500' : 'bg-gray-600'} relative transition-colors`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${roomData.isPrivate ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {roomData.isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Пароль (опционально)</label>
              <input
                type="text"
                value={roomData.password}
                onChange={(e) => setRoomData((prev: any) => ({ ...prev, password: e.target.value }))}
                className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none"
                placeholder="Оставьте пустым для комнаты без пароля"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onCreateRoom}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Создать
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function JoinRoomModal({ isOpen, onClose, roomCode, setRoomCode, onJoinRoom }: JoinRoomModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="bg-gray-800 rounded-lg p-6 w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h3 className="text-xl font-bold text-white mb-4">Присоединиться к комнате</h3>
        <input
          type="text"
          placeholder="Введите код комнаты (например: ABC123)"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none mb-4 text-center text-lg font-mono"
          autoFocus
          maxLength={6}
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onJoinRoom}
            disabled={roomCode.length !== 6}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Присоединиться
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
