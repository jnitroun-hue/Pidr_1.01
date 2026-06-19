'use client'
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { GRAM } from '@/lib/crypto/gram-brand';

export default function RulesPage() {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  const rules = [
    {
      title: '🎯 Цель игры',
      icon: '🏆',
      content: [
        'Избавиться от всех карт первым',
        'Игра проходит в 3 стадии с разными правилами',
        'Последний игрок с картами становится проигравшим'
      ]
    },
    {
      title: '1️⃣ Первая стадия',
      icon: '🎴',
      content: [
        'Каждый игрок получает по 1 открытой карте',
        'Ходите картой на соперника с меньшей картой',
        'Если не можете сходить - берите из колоды',
        'Когда карты закончатся - переход во 2-ю стадию'
      ]
    },
    {
      title: '2️⃣ Вторая стадия',
      icon: '🃏',
      content: [
        'Когда колода заканчивается, начинается вторая стадия',
        'Козырь определяется последней взятой картой (кроме пик)',
        'Козырь бьет любую некозырную карту',
        'Старший козырь бьет младший козырь',
        '⚠️ ВАЖНО: Пики можно бить ТОЛЬКО пиками!',
        'Пики НЕ могут быть козырем, даже если это последняя карта',
        'Если не можете побить - берете все карты со стола',
        '💡 ПРАВИЛО "ОДНА КАРТА!": Когда у вас остается одна карта, вы ОБЯЗАНЫ объявить "Одна карта!"',
        '💡 ПРАВИЛО "СКОЛЬКО КАРТ?": Любой игрок может спросить другого "Сколько карт?" в любой момент',
        '⚠️ ШТРАФ: Если у вас одна карта и вы НЕ объявили, а вас спросили - все игроки сдают вам по карте!'
      ]
    },
    {
      title: '3️⃣ Третья стадия (Пеньки)',
      icon: '🎯',
      content: [
        'Открываются 2 закрытые карты (пеньки)',
        'Правила как во 2-й стадии',
        'Сначала играйте открытыми картами',
        'Когда они закончатся - играйте пеньками'
      ]
    },
    {
      title: '⚠️ Система штрафов "Одна карта!"',
      icon: '💸',
      content: [
        'Когда у вас остается одна карта - ОБЯЗАТЕЛЬНО объявите "Одна карта!"',
        'Любой игрок может спросить другого "Сколько карт?" в любой момент',
        'Если у вас одна карта и вы НЕ объявили, а вас спросили - получаете штраф',
        'Штраф = все игроки сдают вам по 1 карте',
        'Игра останавливается пока все не сдадут штрафные карты',
        'Это правило действует во второй и третьей стадиях'
      ]
    },
    {
      title: '💎 NFT Карты',
      icon: '✨',
      content: [
        'Создавайте уникальные карты с разными дизайнами',
        'Добавляйте их в свою колоду',
        'Торгуйте картами на маркетплейсе',
        `Зарабатывайте монеты и ${GRAM.symbol}`
      ]
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      padding: '20px',
      paddingTop: '80px'
    }}>
      {/* Кнопка назад */}
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => router.back()}
        style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          background: 'rgba(99, 102, 241, 0.2)',
          border: '2px solid rgba(99, 102, 241, 0.3)',
          borderRadius: '12px',
          padding: '12px',
          color: '#6366f1',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '16px',
          fontWeight: '600',
          zIndex: 100,
          backdropFilter: 'blur(10px)'
        }}
      >
        <ArrowLeft size={20} />
        Назад
      </motion.button>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Заголовок */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{
              fontSize: '64px',
              marginBottom: '15px'
            }}
          >
            📖
          </motion.div>
          <h1 style={{
            fontSize: '42px',
            fontWeight: '900',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '10px'
          }}>
            Правила игры
          </h1>
          <p style={{
            color: '#94a3b8',
            fontSize: '16px'
          }}>
            Изучите правила и станьте мастером The Must!
          </p>
        </motion.div>

        {/* Аккордеон с правилами */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {rules.map((rule, index) => (
        <motion.div 
              key={index}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              style={{
                background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                borderRadius: '16px',
                border: '2px solid rgba(99, 102, 241, 0.3)',
                overflow: 'hidden',
                boxShadow: expandedSection === index 
                  ? '0 8px 24px rgba(99, 102, 241, 0.3)' 
                  : '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Заголовок секции */}
              <div
                onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                style={{
                  padding: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: expandedSection === index 
                    ? 'rgba(99, 102, 241, 0.1)' 
                    : 'transparent',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <div style={{
                    fontSize: '32px',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                  }}>
                    {rule.icon}
                </div>
                  <h3 style={{
                    color: '#f1f5f9',
                    fontSize: '20px',
                    fontWeight: '700',
                    margin: 0
                  }}>
                    {rule.title}
                  </h3>
                    </div>
                <motion.div
                  animate={{ rotate: expandedSection === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    color: '#6366f1'
                  }}
                >
                  <ChevronDown size={24} />
                </motion.div>
              </div>

              {/* Контент секции */}
              <AnimatePresence>
                {expandedSection === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{
                      padding: '0 20px 20px 20px'
                    }}>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        {rule.content.map((item, itemIndex) => (
                          <motion.li
                            key={itemIndex}
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: itemIndex * 0.1 }}
                            style={{
                              color: '#cbd5e1',
                              fontSize: '15px',
                              lineHeight: '1.6',
                              paddingLeft: '30px',
                              position: 'relative'
                            }}
                          >
                            <span style={{
                              position: 'absolute',
                              left: '0',
                              color: '#6366f1',
                              fontWeight: '700'
                            }}>
                              ▸
                      </span>
                            {item}
                          </motion.li>
                    ))}
                      </ul>
                  </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
              </div>

        {/* Кнопка "Начать играть" */}
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/')}
          style={{
            marginTop: '40px',
            width: '100%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '18px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
            transition: 'all 0.3s ease'
          }}
        >
          🎮 Начать играть
        </motion.button>
      </div>
    </div>
  );
} 
