'use client'
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Moon, Palette, Volume2, Bell, User, Trash2, Shield, Eye, Database, Download, Upload, RefreshCw } from 'lucide-react';
import BottomNav from '../../components/BottomNav';

export default function SettingsPage() {
  const [darkTheme, setDarkTheme] = useState(true);
  const [colorScheme, setColorScheme] = useState('blue');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="main-menu-container">
      <div className="main-menu-inner">
        {/* Header */}
        <div className="menu-header">
          <button onClick={() => window.history.back()} className="px-3 py-1 rounded-lg border border-red-400 text-red-200 font-semibold text-base hover:bg-red-400/10 transition-all">
            <ArrowLeft className="inline w-4 h-4 mr-1" />
            Назад
          </button>
          <span className="menu-title">НАСТРОЙКИ</span>
          <div className="w-6"></div>
        </div>
        {/* Settings Sections */}
        
        {/* Appearance Settings */}
        <motion.div 
          className="settings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            margin: '20px 0',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}
        >
          <h3 style={{
            color: '#ffd700',
            fontSize: '1.1rem',
            fontWeight: '700',
            marginBottom: '15px',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Palette className="w-5 h-5" />
            ВНЕШНИЙ ВИД
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Moon className="w-5 h-5 text-green-400" />
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: '600' }}>Тёмная тема</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Изменить цветовую схему приложения</div>
                </div>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={darkTheme}
                  onChange={(e) => setDarkTheme(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Palette className="w-5 h-5 text-green-400" />
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: '600' }}>Цветовая схема</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Выберите основной цвет интерфейса</div>
                </div>
              </div>
              <select 
                value={colorScheme}
                onChange={(e) => setColorScheme(e.target.value)}
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.7) 100%)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.9rem'
                }}
              >
                <option value="blue">Синий</option>
                <option value="green">Зелёный</option>
                <option value="purple">Фиолетовый</option>
                <option value="orange">Оранжевый</option>
              </select>
            </div>
          </div>
        </motion.div>
        {/* Game Settings */}
        <motion.div 
          className="settings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            margin: '20px 0',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}
        >
          <h3 style={{
            color: '#ffd700',
            fontSize: '1.1rem',
            fontWeight: '700',
            marginBottom: '15px',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Volume2 className="w-5 h-5" />
            ИГРОВОЙ ПРОЦЕСС
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Volume2 className="w-5 h-5 text-green-400" />
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: '600' }}>Звуковые эффекты</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Включить звуки в игре</div>
                </div>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Bell className="w-5 h-5 text-green-400" />
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: '600' }}>Уведомления</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Получать уведомления о ходе игры</div>
                </div>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </motion.div>
        {/* Account Settings */}
        <motion.div 
          className="settings-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '16px',
            padding: '20px',
            margin: '20px 0',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
          }}
        >
          <h3 style={{
            color: '#ffd700',
            fontSize: '1.1rem',
            fontWeight: '700',
            marginBottom: '15px',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <User className="w-5 h-5" />
            АККАУНТ
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User className="w-5 h-5 text-green-400" />
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: '600' }}>Изменить никнейм</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Текущий никнейм: Игрок #1</div>
                </div>
              </div>
              <button
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #f59e0b 100%)',
                  color: '#0f172a',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Изменить
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Trash2 className="w-5 h-5 text-red-400" />
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: '600' }}>Удалить аккаунт</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Это действие нельзя отменить</div>
                </div>
              </div>
              <button
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(239, 68, 68, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </motion.div>

        <BottomNav />
      </div>
    </div>
  );
} 