'use client';

import { useState } from 'react';
import { Shield, ShieldOff, Users, Play, ArrowLeft } from 'lucide-react';

interface RoomCreationProps {
  onBack: () => void;
  onCreateRoom: (settings: RoomSettings) => void;
}

interface RoomSettings {
  hasPassword: boolean;
  password?: string;
  maxPlayers: number;
  isPrivate: boolean;
}

export default function RoomCreation({ onBack, onCreateRoom }: RoomCreationProps) {
  const [step, setStep] = useState<'privacy' | 'settings'>('privacy');
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);

  const handlePrivacyChoice = (withPassword: boolean) => {
    setHasPassword(withPassword);
    setStep('settings');
  };

  const handleCreateRoom = () => {
    const settings: RoomSettings = {
      hasPassword,
      password: hasPassword ? password : undefined,
      maxPlayers,
      isPrivate
    };
    onCreateRoom(settings);
  };

  if (step === 'privacy') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
            <span>Назад</span>
          </button>
          <h1 className="text-2xl font-bold text-white">Создать комнату</h1>
          <div className="w-20" /> {/* Spacer */}
        </div>

        {/* Privacy Options */}
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-xl text-white mb-2">Выберите тип комнаты</h2>
            <p className="text-white/60">Хотите защитить комнату паролем?</p>
          </div>

          {/* Open Room */}
          <button
            onClick={() => handlePrivacyChoice(false)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="bg-white/20 p-3 rounded-full">
                <ShieldOff size={32} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold">Открытая комната</h3>
                <p className="text-green-100">Любой может присоединиться по коду</p>
              </div>
            </div>
          </button>

          {/* Private Room */}
          <button
            onClick={() => handlePrivacyChoice(true)}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Shield size={32} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold">Приватная комната</h3>
                <p className="text-orange-100">Нужен пароль для входа</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => setStep('privacy')}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
          <span>Назад</span>
        </button>
        <h1 className="text-2xl font-bold text-white">Настройки комнаты</h1>
        <div className="w-20" /> {/* Spacer */}
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Password Section */}
        {hasPassword && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield size={20} />
              Пароль комнаты
            </h3>
            <input
              type="text"
              placeholder="Введите пароль (4-12 символов)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              maxLength={12}
              minLength={4}
            />
          </div>
        )}

        {/* Players Count */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={20} />
            Количество игроков
          </h3>
          
          <div className="grid grid-cols-3 gap-3">
            {[4, 5, 6, 7, 8, 9].map((count) => (
              <button
                key={count}
                onClick={() => setMaxPlayers(count)}
                className={`p-4 rounded-xl font-semibold transition-all duration-200 ${
                  maxPlayers === count
                    ? 'bg-blue-500 text-white shadow-lg scale-105'
                    : 'bg-white/20 text-white/80 hover:bg-white/30 hover:text-white'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Room Type */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Тип комнаты</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="roomType"
                checked={!isPrivate}
                onChange={() => setIsPrivate(false)}
                className="w-5 h-5 text-blue-500"
              />
              <div>
                <span className="text-white font-medium">Публичная</span>
                <p className="text-white/60 text-sm">Отображается в списке комнат</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="roomType"
                checked={isPrivate}
                onChange={() => setIsPrivate(true)}
                className="w-5 h-5 text-blue-500"
              />
              <div>
                <span className="text-white font-medium">Скрытая</span>
                <p className="text-white/60 text-sm">Только по коду комнаты</p>
              </div>
            </label>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateRoom}
          disabled={hasPassword && password.length < 4}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
        >
          <Play size={24} />
          Создать комнату
        </button>

        {hasPassword && password.length < 4 && (
          <p className="text-orange-300 text-sm text-center">
            Пароль должен содержать минимум 4 символа
          </p>
        )}
      </div>
    </div>
  );
}
