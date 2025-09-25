'use client'
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Book, Users, Star, Crown, AlertTriangle, ListOrdered, Target, Shield, Brain, GamepadIcon, Clock, Search, Coins, Eye } from 'lucide-react';
import BottomNav from '../../components/BottomNav';
import { useLanguage } from '../../components/LanguageSwitcher';
import { useTranslations } from '../../lib/i18n/translations';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function RulesPage() {
  const [activeSection, setActiveSection] = useState('basics');
  const { language, changeLanguage } = useLanguage();
  const t = useTranslations(language);

  const sections = [
    { id: 'basics', name: t.rules.basics, icon: Book },
    { id: 'stages', name: t.rules.stages, icon: ListOrdered },
    { id: 'onecard', name: t.rules.oneCard, icon: AlertTriangle },
    { id: 'strategy', name: t.rules.strategy, icon: Brain },
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
            {t.common.back}
          </button>
          <span className="menu-title">{t.rules.title}</span>
          <LanguageSwitcher 
            currentLanguage={language}
            onLanguageChange={changeLanguage}
            className="ml-2"
          />
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
                  <h3 className="rule-title">{t.rules.gameOverview}</h3>
                </div>
                <div className="rule-content">
                  <p className="rule-description">
                    {t.rules.gameDescription}
                  </p>
                  <div className="rule-points">
                    <div className="rule-point">
                      <Users className="point-icon" />
                      <span><strong>{t.rules.players}:</strong> {t.rules.playersCount}</span>
                    </div>
                    <div className="rule-point">
                      <Target className="point-icon" />
                      <span><strong>{t.rules.goal}:</strong> {t.rules.goalDescription}</span>
                    </div>
                    <div className="rule-point">
                      <Star className="point-icon" />
                      <span><strong>{t.rules.cards}:</strong> {t.rules.cardsDescription}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Hierarchy */}
              <div className="rule-card">
                <div className="rule-header">
                  <Crown className="rule-icon" />
                  <h3 className="rule-title">{t.rules.cardHierarchy}</h3>
                </div>
                <div className="rule-content">
                  <p className="rule-description">{t.rules.hierarchyDescription}</p>
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
                      <span><strong>{t.rules.specialRule}:</strong> {t.rules.specialRuleDescription}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Suits */}
              <div className="rule-card">
                <div className="rule-header">
                  <Shield className="rule-icon" />
                  <h3 className="rule-title">{t.rules.suits}</h3>
                </div>
                <div className="rule-content">
                  <div className="suits-grid">
                    {suits.map((suit, index) => {
                      const suitNames = [t.rules.suitNames.spades, t.rules.suitNames.hearts, t.rules.suitNames.diamonds, t.rules.suitNames.clubs];
                      return (
                        <div key={suit} className="suit-card">
                          <span className="suit-symbol">{suit}</span>
                          <span className="suit-name">{suitNames[index]}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="rule-description">
                    {t.rules.suitsDescription}
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
                  <h3 className="rule-title">{t.rules.stage1}</h3>
                </div>
                <div className="rule-content">
                  <h4 className="stage-subtitle">{t.rules.stage1Description}</h4>
                  <div className="rule-points">
                    <div className="rule-point">
                      <span><strong>{t.rules.moves}:</strong> {t.rules.stage1Moves}</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>{t.rules.beatCards}:</strong> {t.rules.stage1Beat}</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>{t.rules.suits}:</strong> {t.rules.stage1Suits}</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>{t.rules.transition}:</strong> {t.rules.stage1Transition}</span>
                    </div>
                  </div>
                  <div className="algorithm-box">
                    <h5 className="algorithm-title">{t.rules.algorithm}:</h5>
                    <ol className="algorithm-steps">
                      <li>{language === 'ru' ? 'Выберите верхнюю карту' : 'Choose the top card'}</li>
                      <li>{language === 'ru' ? 'Проверьте: ранг > ранг последней карты на столе' : 'Check: rank > rank of the last card on the table'}</li>
                      <li>{language === 'ru' ? 'Если да - положите карту на карту соперника' : 'If yes - put the card on the opponent\'s card'}</li>
                      <li>{language === 'ru' ? 'Если нет - возьмите карту из колоды' : 'If no - take a card from the deck'}</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="rule-card stage-2">
                <div className="rule-header">
                  <div className="stage-number">2</div>
                  <h3 className="rule-title">{t.rules.stage2}</h3>
                </div>
                <div className="rule-content">
                  <h4 className="stage-subtitle">{t.rules.stage2Description}</h4>
                  <div className="rule-points">
                    <div className="rule-point">
                      <span><strong>{t.rules.moves}:</strong> {t.rules.stage2Moves}</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>{t.rules.suits}:</strong> {t.rules.stage2Beat}</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>{language === 'ru' ? 'Козырь:' : 'Trump:'}:</strong> {language === 'ru' ? 'Последняя масть, кроме пики' : 'Last suit, except spades'}</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>{t.rules.stage2SpadesRule}</strong></span>
                    </div>
                    <div className="rule-point" style={{ color: '#ff4444', fontWeight: 'bold' }}>
                      <AlertTriangle className="point-icon" style={{ color: '#ff4444' }} />
                      <span><strong>⚠️ "{t.rules.oneCard}":</strong> {t.rules.mandatory} {language === 'ru' ? 'за 5 сек!' : 'within 5 seconds!'}</span>
                    </div>
                  </div>
                  <div className="algorithm-box">
                    <h5 className="algorithm-title">{t.rules.algorithmStage2}</h5>
                    <ol className="algorithm-steps">
                      <li>{language === 'ru' ? 'Атакующий кладет карту на стол' : 'Attacker places card on table'}</li>
                      <li>{language === 'ru' ? 'Защищающийся может:' : 'Defender can:'}</li>
                      <li className="sub-step">• {language === 'ru' ? 'Побить картой старше той же масти' : 'Beat with higher card of same suit'}</li>
                      <li className="sub-step">• {language === 'ru' ? 'Побить козырем (если атака не козырная)' : 'Beat with trump (if attack is not trump)'}</li>
                      <li className="sub-step">• {language === 'ru' ? 'Взять нижнюю карту со стола' : 'Take bottom card from table'}</li>
                      <li><strong>{language === 'ru' ? 'Если побил:' : 'If beaten:'}</strong> {language === 'ru' ? 'Ход переходит следующему игроку' : 'Turn passes to next player'}</li>
                      <li><strong>{language === 'ru' ? 'Следующий игрок:' : 'Next player:'}</strong> {language === 'ru' ? 'Пытается побить верхнюю карту' : 'Tries to beat top card'}</li>
                      <li style={{ color: '#ff4444', fontWeight: 'bold' }}><strong>{t.rules.important}:</strong> {t.rules.noThrowing}</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="rule-card stage-3">
                <div className="rule-header">
                  <div className="stage-number">3</div>
                  <h3 className="rule-title">{t.rules.stage3}</h3>
                </div>
                <div className="rule-content">
                  <h4 className="stage-subtitle">{t.rules.stage3Description}</h4>
                  <div className="rule-points">
                    <div className="rule-point">
                      <span><strong>{language === 'ru' ? 'Условие:' : 'Condition:'}:</strong> {language === 'ru' ? 'Когда во 2-й стадии нет открытых карт с 1-й стадии' : 'When there are no open cards from stage 1 in stage 2'}</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>{language === 'ru' ? 'Особенности:' : 'Features:'}:</strong> {language === 'ru' ? 'Игрок открывает пеньки и играет ими' : 'Player reveals stumps and plays with them'}</span>
                    </div>
                    <div className="rule-point" style={{ color: '#ff4444', fontWeight: 'bold' }}>
                      <AlertTriangle className="point-icon" style={{ color: '#ff4444' }} />
                      <span><strong>⚠️ "{t.rules.oneCard}":</strong> {t.rules.mandatory} {language === 'ru' ? 'при 1 пеньке!' : 'with 1 stump!'}</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>{language === 'ru' ? 'Победа:' : 'Victory:'}:</strong> {language === 'ru' ? 'Побеждает тот, кто первый остался без карт' : 'Winner is the first to run out of cards'}</span>
                    </div>
                    <div className="rule-point">
                      <span><strong>{language === 'ru' ? 'Поражение:' : 'Defeat:'}:</strong> {language === 'ru' ? 'Проигравший - если у всех закончились карты, а у данного игрока еще есть' : 'Loser - if everyone else is out of cards but this player still has some'}</span>
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
                  <h3 className="rule-title" style={{ color: '#ff4444' }}>{language === 'ru' ? 'СИСТЕМА "ОДНА КАРТА!" И ШТРАФОВ' : 'ONE CARD! SYSTEM AND PENALTIES'}</h3>
                </div>
                <div className="rule-content">
                  <p className="rule-description" style={{ color: '#ff6666', fontSize: '16px', fontWeight: 'bold' }}>
                    ⚠️ {t.rules.oneCardDescription}
                  </p>
                  <div className="rule-points">
                    <div className="rule-point">
                      <Clock className="point-icon" style={{ color: '#ff4444' }} />
                      <span><strong>{language === 'ru' ? 'Автотаймер:' : 'Auto-timer:'}:</strong> {language === 'ru' ? 'Система запускает 5-секундный отсчет' : 'System starts 5-second countdown'}</span>
                    </div>
                    <div className="rule-point">
                      <Search className="point-icon" style={{ color: '#6366f1' }} />
                      <span><strong>{language === 'ru' ? 'Поймать:' : 'Catch:'}:</strong> {language === 'ru' ? 'Другие могут проверить забывчивого игрока' : 'Others can check forgetful player'}</span>
                    </div>
                    <div className="rule-point">
                      <Coins className="point-icon" style={{ color: '#dc2626' }} />
                      <span><strong>{language === 'ru' ? 'Штраф:' : 'Penalty:'}:</strong> {language === 'ru' ? 'ВСЕ скидывают забывчивому плохие карты!' : 'ALL players throw bad cards to the forgetful one!'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Rules */}
              <div className="rule-card">
                <div className="rule-header">
                  <Clock className="rule-icon" />
                  <h3 className="rule-title">{t.rules.mandatory}</h3>
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
                  <h3 className="rule-title">{t.rules.penaltySystem}</h3>
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
                  <h3 className="rule-title">{language === 'ru' ? 'АЛГОРИТМЫ ХОДОВ' : 'MOVE ALGORITHMS'}</h3>
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