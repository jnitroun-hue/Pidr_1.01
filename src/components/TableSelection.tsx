'use client';

import { useState } from 'react';
import { Users, Crown, Star, Zap, ArrowLeft, Play } from 'lucide-react';

interface TableSelectionProps {
  maxPlayers: number;
  onBack: () => void;
  onSelectTable: (tableType: TableType) => void;
}

interface TableType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  hoverGradient: string;
  players: number;
  difficulty: 'easy' | 'medium' | 'hard';
  features: string[];
}

const tableTypes: TableType[] = [
  {
    id: 'casual',
    name: 'Обычный стол',
    description: 'Классическая игра P.I.D.R. для новичков',
    icon: <Users size={32} />,
    gradient: 'from-green-500 to-emerald-600',
    hoverGradient: 'from-green-600 to-emerald-700',
    players: 4,
    difficulty: 'easy',
    features: ['Стандартные правила', 'Подсказки для новичков', 'Спокойный темп']
  },
  {
    id: 'competitive',
    name: 'Соревновательный',
    description: 'Для опытных игроков с рейтингом',
    icon: <Crown size={32} />,
    gradient: 'from-blue-500 to-indigo-600',
    hoverGradient: 'from-blue-600 to-indigo-700',
    players: 6,
    difficulty: 'medium',
    features: ['Рейтинговая игра', 'Статистика', 'Средний темп']
  },
  {
    id: 'pro',
    name: 'Профессиональный',
    description: 'Турнирные условия для мастеров',
    icon: <Star size={32} />,
    gradient: 'from-purple-500 to-pink-600',
    hoverGradient: 'from-purple-600 to-pink-700',
    players: 8,
    difficulty: 'hard',
    features: ['Турнирные правила', 'Быстрый темп', 'Без подсказок']
  },
  {
    id: 'blitz',
    name: 'Блиц',
    description: 'Молниеносная игра на максимум',
    icon: <Zap size={32} />,
    gradient: 'from-orange-500 to-red-600',
    hoverGradient: 'from-orange-600 to-red-700',
    players: 9,
    difficulty: 'hard',
    features: ['Максимум игроков', 'Очень быстрый темп', 'Экстремальный режим']
  }
];

export default function TableSelection({ maxPlayers, onBack, onSelectTable }: TableSelectionProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const availableTables = tableTypes.filter(table => table.players <= maxPlayers);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-300';
      case 'medium': return 'text-yellow-300';
      case 'hard': return 'text-red-300';
      default: return 'text-gray-300';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Легкий';
      case 'medium': return 'Средний';
      case 'hard': return 'Сложный';
      default: return 'Неизвестно';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
          <span>Назад</span>
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Выбор стола</h1>
          <p className="text-white/60">Максимум {maxPlayers} игроков</p>
        </div>
        <div className="w-20" /> {/* Spacer */}
      </div>

      {/* Tables Grid */}
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-6 md:grid-cols-2">
          {availableTables.map((table) => (
            <div
              key={table.id}
              className={`relative overflow-hidden rounded-3xl transition-all duration-300 transform hover:scale-105 cursor-pointer ${
                selectedTable === table.id 
                  ? 'ring-4 ring-white/50 scale-105' 
                  : ''
              }`}
              onClick={() => setSelectedTable(table.id)}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${table.gradient} opacity-90`} />
              
              {/* Content */}
              <div className="relative p-6 text-white">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    {table.icon}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-white/80">
                      <Users size={16} />
                      <span className="text-sm">{table.players} игроков</span>
                    </div>
                    <div className={`text-sm font-medium ${getDifficultyColor(table.difficulty)}`}>
                      {getDifficultyText(table.difficulty)}
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold mb-2">{table.name}</h3>
                <p className="text-white/80 text-sm mb-4">{table.description}</p>

                {/* Features */}
                <div className="space-y-2">
                  {table.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                      <span className="text-white/70 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Selection Indicator */}
                {selectedTable === table.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full" />
                    </div>
                  </div>
                )}
              </div>

              {/* Hover Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${table.hoverGradient} opacity-0 hover:opacity-20 transition-opacity duration-300`} />
            </div>
          ))}
        </div>

        {/* Action Button */}
        {selectedTable && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                const table = availableTables.find(t => t.id === selectedTable);
                if (table) onSelectTable(table);
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 mx-auto"
            >
              <Play size={24} />
              Перейти в комнату ожидания
            </button>
          </div>
        )}
      </div>

      {/* Info Panel */}
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h3 className="text-lg font-semibold text-white mb-4">Информация о столах</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-green-300 font-semibold">Легкий</div>
              <div className="text-white/60 text-sm">Подсказки, медленный темп</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-300 font-semibold">Средний</div>
              <div className="text-white/60 text-sm">Рейтинг, стандартный темп</div>
            </div>
            <div className="text-center">
              <div className="text-red-300 font-semibold">Сложный</div>
              <div className="text-white/60 text-sm">Без подсказок, быстрый темп</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
