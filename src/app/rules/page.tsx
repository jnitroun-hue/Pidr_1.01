'use client'
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Book, Users, Star, Crown, AlertTriangle, ListOrdered, Target, Shield, Brain, GamepadIcon, Clock, Search, Coins, Eye } from 'lucide-react';
import BottomNav from '../../components/BottomNav';

export default function RulesPage() {
  const [activeSection, setActiveSection] = useState('basics');

  const sections = [
    { id: 'basics', name: 'ОСНОВЫ', icon: Book },
    { id: 'stages', name: 'СТАДИИ', icon: ListOrdered },
    { id: 'onecard', name: 'ОДНА КАРТА!', icon: AlertTriangle },
    { id: 'strategy', name: 'СТРАТЕГИЯ', icon: Brain },
  ];

  const cardRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['♠️', '♥️', '♦️', '♣️'];

  return (
    <div className="main-menu-container">
      <div className="main-menu-inner">
        {/* Header */}
        <div className="menu-header">
          <button onClick={() => window.history.back()} className="px-3 py-1 rounded-lg border border-red-400 text-red-200 font-semibold text-base hover:bg-red-400/10 transition-all">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Назад
          </button>
          <span className="menu-title">ПРАВИЛА ИГРЫ</span>
          <div className="w-6"></div>
        </div>
        {/* Section Navigation */}
        <motion.div 
          className="rules-navigation"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="nav-grid">
            {sections.map((section, index) => {
              const IconComponent = section.icon;
              return (
                <motion.button
                  key={section.id}
                  className={`nav-btn ${activeSection === section.id ? 'active' : ''} ${section.id === 'strategy' ? 'strategy' : ''} ${section.id === 'onecard' ? 'onecard-btn' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: section.id === 'strategy' ? 0.7 : 1.05 }}
                  whileTap={{ scale: section.id === 'strategy' ? 0.63 : 0.95 }}
                  style={section.id === 'onecard' ? { 
                    background: 'linear-gradient(135deg, #ff4444 0%, #dc2626 100%)',
                    boxShadow: activeSection === section.id ? '0 0 20px rgba(255, 68, 68, 0.6)' : '0 0 10px rgba(255, 68, 68, 0.3)'
                  } : {}}
                >
                  <IconComponent className="nav-icon" />
                  <span className="nav-name">{section.name}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Content Sections */}
        <motion.div 
          className="rules-content"
          key={activeSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {activeSection === 'basics' && (
            <div className="content-section">
              {/* Game Overview */}
              <div className="rule-card">
                <div className="rule-header">
                  <GamepadIcon className="rule-icon" />
                  <h3 className="rule-title">ОБЗОР ИГРЫ</h3>
                </div>
                <div className="rule-content">
                  <p className="rule-description">
                    <strong>P.I.D.R.</strong> - это увлекательная карточная игра на основе классического &quot;Дурака&quot; с уникальными механиками и стадиями.
                  </p>
                  <div className="rule-points">
                    <div className="rule-point">
                      <Users className="point-icon" />
                      <span><strong>Игроки:</strong> 4-9 человек</span>
                    </div>
                    <div className="rule-point">
                      <Target className="point-icon" />
                      <span><strong>Цель:</strong> Избавиться от всех карт первым</span>
                    </div>
                    <div className="rule-point">
                      <Star className="point-icon" />
                      <span><strong>Карты:</strong> Стандартная колода 52 карты</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Hierarchy */}
              <div className="rule-card">
                <div className="rule-header">
                  <Crown className="rule-icon" />
                  <h3 className="rule-title">ИЕРАРХИЯ КАРТ</h3>
                </div>
                <div className="rule-content">
                  <p className="rule-description">От младшей к старшей:</p>
                  <div className="card-hierarchy">
                    {cardRanks.map((rank, index) => (
                      <span key={rank} className={`hierarchy-card ${rank === 'A' ? 'trump' : ''}`}>
                        {rank}{index < cardRanks.length - 1 && ' → '}
                      </span>
                    ))}
                  </div>
                  <div className="rule-points">
                    <div className="rule-point">
                      <AlertTriangle className="point-icon" />
                      <span><strong>Особое правило:</strong> Двойка (2) может побить только Туз (A)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suits */}
              <div className="rule-card">
                <div className="rule-header">
                  <Shield className="rule-icon" />
                  <h3 className="rule-title">МАСТИ</h3>
                </div>
                <div className="rule-content">
                  <div className="suits-grid">
                    {suits.map((suit, index) => {
                      const suitNames = ['Пики', 'Червы', 'Бубны', 'Трефы'];
                      return (
                        <div key={suit} className="suit-card">
                          <span className="suit-symbol">{suit}</span>
                          <span className="suit-name">{suitNames[index]}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="rule-description">
                    В первой стадии масти не важны. Во второй стадии действует правило: <strong>&quot;Пики только Пикями!&quot;</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'stages' && (
            <div className="content-section">
              {/* Stage 1 */}
              <div className="rule-card stage-1">
                <div className="rule-header">
                  <div className="stage-number">1</div>
                  <h3 className="rule-title">ПЕРВАЯ СТАДИЯ</h3>
                </div>
                <div className="rule-content">
                  <h4 className="stage-subtitle">Простые правила</h4>
                  <div className="rule-points">
                    <div className="rule-point">
                      <span><strong>Ходы:</strong> Только верхней (открытой) картой</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Бить карты:</strong> Карта должна быть на 1 ранг выше</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Масти:</strong> Не важны в первой стадии</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Переход:</strong> Когда заканчивается колода по середине стола</span>
                    </div>
                  </div>
                  <div className="algorithm-box">
                    <h5 className="algorithm-title">Алгоритм хода:</h5>
                    <ol className="algorithm-steps">
                      <li>Выберите верхнюю карту</li>
                      <li>Проверьте: ранг &gt; ранг последней карты на столе</li>
                      <li>Если да - положите карту на карту соперника</li>
                      <li>Если нет - возьмите карту из колоды</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="rule-card stage-2">
                <div className="rule-header">
                  <div className="stage-number">2</div>
                  <h3 className="rule-title">ВТОРАЯ СТАДИЯ</h3>
                </div>
                <div className="rule-content">
                  <h4 className="stage-subtitle">Правила &quot;Дурака&quot;</h4>
                  <div className="rule-points">
                    <div className="rule-point">
                      <span><strong>Ходы:</strong> Любой картой из руки</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Масти:</strong> Действует правило мастей</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Козырь:</strong> Последняя масть, кроме пики</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Пики только Пикями!</strong></span>
                    </div>
                    <div className="rule-point" style={{ color: '#ff4444', fontWeight: 'bold' }}>
                      <AlertTriangle className="point-icon" style={{ color: '#ff4444' }} />
                      <span><strong>⚠️ &quot;ОДНА КАРТА!&quot;:</strong> ОБЯЗАТЕЛЬНО объявлять за 5 сек!</span>
                    </div>
                  </div>
                  <div className="algorithm-box">
                    <h5 className="algorithm-title">Алгоритм битья P.I.D.R.:</h5>
                    <ol className="algorithm-steps">
                      <li>Атакующий кладет карту на стол</li>
                      <li>Защищающийся может:</li>
                      <li className="sub-step">• Побить картой старше той же масти</li>
                      <li className="sub-step">• Побить козырем (если атака не козырная)</li>
                      <li className="sub-step">• Взять нижнюю карту со стола</li>
                      <li><strong>Если побил:</strong> Ход переходит следующему игроку</li>
                      <li><strong>Следующий игрок:</strong> Пытается побить верхнюю карту</li>
                      <li style={{ color: '#ff4444', fontWeight: 'bold' }}><strong>ВАЖНО:</strong> Никакого подкидывания карт нет!</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="rule-card stage-3">
                <div className="rule-header">
                  <div className="stage-number">3</div>
                  <h3 className="rule-title">ТРЕТЬЯ СТАДИЯ</h3>
                </div>
                <div className="rule-content">
                  <h4 className="stage-subtitle">Открытие пеньков</h4>
                  <div className="rule-points">
                    <div className="rule-point">
                      <span><strong>Условие:</strong> Когда во 2-й стадии нет открытых карт с 1-й стадии</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Особенности:</strong> Игрок открывает пеньки и играет ими</span>
                    </div>
                    <div className="rule-point" style={{ color: '#ff4444', fontWeight: 'bold' }}>
                      <AlertTriangle className="point-icon" style={{ color: '#ff4444' }} />
                      <span><strong>⚠️ &quot;ОДНА КАРТА!&quot;:</strong> ОБЯЗАТЕЛЬНО объявлять при 1 пеньке!</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Победа:</strong> Побеждает тот, кто первый остался без карт</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Поражение:</strong> Проигравший - если у всех закончились карты, а у данного игрока еще есть</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'onecard' && (
            <div className="content-section">
              {/* One Card System Overview */}
              <div className="rule-card" style={{ border: '2px solid #ff4444', background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)' }}>
                <div className="rule-header">
                  <AlertTriangle className="rule-icon" style={{ color: '#ff4444' }} />
                  <h3 className="rule-title" style={{ color: '#ff4444' }}>СИСТЕМА &quot;ОДНА КАРТА!&quot; И ШТРАФОВ</h3>
                </div>
                <div className="rule-content">
                  <p className="rule-description" style={{ color: '#ff6666', fontSize: '16px', fontWeight: 'bold' }}>
                    ⚠️ Ключевая механика P.I.D.R.! Когда у игрока остается 1 открытая карта - он ОБЯЗАН объявить это!
                  </p>
                  <div className="rule-points">
                    <div className="rule-point">
                      <Clock className="point-icon" style={{ color: '#ff4444' }} />
                      <span><strong>Автотаймер:</strong> Система запускает 5-секундный отсчет</span>
                    </div>
                    <div className="rule-point">
                      <Search className="point-icon" style={{ color: '#6366f1' }} />
                      <span><strong>Поймать:</strong> Другие могут проверить забывчивого игрока</span>
                    </div>
                    <div className="rule-point">
                      <Coins className="point-icon" style={{ color: '#dc2626' }} />
                      <span><strong>Штраф:</strong> ВСЕ скидывают забывчивому плохие карты!</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Rules */}
              <div className="rule-card">
                <div className="rule-header">
                  <Clock className="rule-icon" />
                  <h3 className="rule-title">ОБЯЗАТЕЛЬНОЕ ОБЪЯВЛЕНИЕ</h3>
                </div>
                <div className="rule-content">
                  <div className="algorithm-box">
                    <h5 className="algorithm-title">Когда объявлять:</h5>
                    <ol className="algorithm-steps">
                      <li><strong>Во 2-й стадии:</strong> При 1 открытой карте в руке</li>
                      <li><strong>В 3-й стадии:</strong> При активации пеньков и 1 карте</li>
                      <li><strong>После хода:</strong> Если стало 1 карта - немедленно объявить</li>
                    </ol>
                  </div>
                  <div className="rule-points">
                    <div className="rule-point">
                      <span><strong>Таймер:</strong> 5 секунд на объявление с момента обнаружения</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Кнопка:</strong> Красная пульсирующая &quot;⚠️ ОДНА КАРТА! (ОБЯЗАТЕЛЬНО)&quot;</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Penalty System */}
              <div className="rule-card">
                <div className="rule-header">
                  <Coins className="rule-icon" />
                  <h3 className="rule-title">ШТРАФНАЯ СИСТЕМА</h3>
                </div>
                <div className="rule-content">
                  <div className="algorithm-box">
                    <h5 className="algorithm-title">Как поймать забывчивого:</h5>
                    <ol className="algorithm-steps">
                      <li><strong>Увидел:</strong> У соперника 1 карта, но он не объявил</li>
                      <li><strong>Действие:</strong> Нажать кнопку &quot;🎯 Сколько карт?&quot;</li>
                      <li><strong>Проверка:</strong> Система проверяет - объявил ли он вовремя</li>
                      <li><strong>Штраф:</strong> Если не объявил - ВСЕ игроки скидывают ему по 1 плохой карте</li>
                    </ol>
                  </div>
                  <div className="rule-points">
                    <div className="rule-point">
                      <span><strong>Плохие карты:</strong> Некозырные низкого ранга (2-7)</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Запасные:</strong> Любые некозырные карты</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>Крайний случай:</strong> Низкие козыри</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Guide */}
              <div className="rule-card">
                <div className="rule-header">
                  <Eye className="rule-icon" />
                  <h3 className="rule-title">ВИЗУАЛЬНЫЕ ПОДСКАЗКИ</h3>
                </div>
                <div className="rule-content">
                  <div className="rule-points">
                    <div className="rule-point" style={{ background: 'rgba(255, 68, 68, 0.1)', padding: '8px', borderRadius: '8px' }}>
                      <span><strong style={{ color: '#ff4444' }}>🚨 КРАСНАЯ КНОПКА:</strong> &quot;⚠️ ОДНА КАРТА! (ОБЯЗАТЕЛЬНО)&quot; - пульсирует</span>
                    </div>
                    <div className="rule-point" style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px', borderRadius: '8px' }}>
                      <span><strong style={{ color: '#6366f1' }}>🎯 СИНЯЯ КНОПКА:</strong> &quot;Сколько карт?&quot; - поймать забывчивого</span>
                    </div>
                    <div className="rule-point" style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '8px', borderRadius: '8px' }}>
                      <span><strong style={{ color: '#f59e0b' }}>☝️ ЖЕЛТАЯ КНОПКА:</strong> &quot;Одна карта!&quot; - ОБЯЗАТЕЛЬНОЕ объявление</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'strategy' && (
            <div className="content-section">
              {/* Algorithm Cards */}
              <div className="rule-card algorithm">
                <div className="rule-header">
                  <Brain className="rule-icon" />
                  <h3 className="rule-title">АЛГОРИТМЫ ХОДОВ</h3>
                </div>
                <div className="rule-content">
                  <div className="algorithm-box">
                    <h5 className="algorithm-title">Стадия 1 - Алгоритм:</h5>
                    <ol className="algorithm-steps">
                      <li><strong>Проверить верхнюю карту:</strong> можно ли положить на стол?</li>
                      <li><strong>Если да:</strong> ранг карты &gt; ранг на столе → положить</li>
                      <li><strong>Если нет:</strong> взять карту из колоды</li>
                      <li><strong>Переход хода</strong> к следующему игроку</li>
                    </ol>
                  </div>
                  
                  <div className="algorithm-box">
                    <h5 className="algorithm-title">Стадия 2 - Алгоритм P.I.D.R.:</h5>
                    <ol className="algorithm-steps">
                      <li><strong>Атака:</strong> выбрать карту для хода</li>
                      <li><strong>Защита:</strong> найти подходящую карту для битья</li>
                      <li><strong>Проверка масти:</strong> та же масть или козырь</li>
                      <li><strong>Проверка ранга:</strong> карта должна быть старше</li>
                      <li><strong>Если нельзя побить:</strong> взять нижнюю карту со стола</li>
                      <li><strong>Если побил:</strong> ход переходит следующему игроку</li>
                      <li style={{ color: '#ff4444', fontWeight: 'bold' }}><strong>⚠️ ОДНА КАРТА:</strong> объявить за 5 сек или ШТРАФ!</li>
                      <li style={{ color: '#ff4444', fontWeight: 'bold' }}><strong>ВАЖНО:</strong> Никакого подкидывания карт нет!</li>
                    </ol>
                  </div>

                  <div className="algorithm-box">
                    <h5 className="algorithm-title">Логика ИИ:</h5>
                    <ol className="algorithm-steps">
                      <li><strong>Анализ руки:</strong> оценка силы карт</li>
                      <li><strong>Выбор слабейшей:</strong> для атаки</li>
                      <li><strong>Сохранение козырей:</strong> для важных моментов</li>
                      <li><strong>Подсчет карт:</strong> запоминание сыгранных</li>
                      <li><strong>Блокировка:</strong> не дать сходить последней картой</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <BottomNav />
      </div>
    </div>
  );
} 