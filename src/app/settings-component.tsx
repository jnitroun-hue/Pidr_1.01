import React, { useState, useEffect } from 'react';

const Settings = () => {
  const [settings, setSettings] = useState({
    theme: 'light',
    colorScheme: 'purple',
    soundEnabled: true,
    musicEnabled: true,
    notifications: true,
    vibration: true,
    language: 'ru',
    autoSave: true,
    gameSpeed: 'normal',
    cardAnimation: true,
    backgroundEffects: true
  });

  const themes = [
    { id: 'light', name: 'Светлая', icon: '☀️' },
    { id: 'dark', name: 'Темная', icon: '🌙' },
    { id: 'auto', name: 'Авто', icon: '🌓' }
  ];

  const colorSchemes = [
    { id: 'purple', name: 'Фиолетовая', color: '#6c5ce7' },
    { id: 'blue', name: 'Синяя', color: '#0984e3' },
    { id: 'green', name: 'Зеленая', color: '#00b894' },
    { id: 'orange', name: 'Оранжевая', color: '#e17055' },
    { id: 'pink', name: 'Розовая', color: '#fd79a8' },
    { id: 'red', name: 'Красная', color: '#e84393' }
  ];

  const languages = [
    { id: 'ru', name: 'Русский', flag: '🇷🇺' },
    { id: 'en', name: 'English', flag: '🇺🇸' },
    { id: 'es', name: 'Español', flag: '🇪🇸' },
    { id: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  const gameSpeeds = [
    { id: 'slow', name: 'Медленная', icon: '🐌' },
    { id: 'normal', name: 'Обычная', icon: '🚶' },
    { id: 'fast', name: 'Быстрая', icon: '🏃' }
  ];

  useEffect(() => {
    const savedSettings = localStorage.getItem('pidr-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
      applyTheme(JSON.parse(savedSettings));
    }
  }, []);

  const applyTheme = (currentSettings: any) => {
    const root = document.documentElement;
    
    // Применение темы
    if (currentSettings.theme === 'dark') {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }

    // Применение цветовой схемы
    const scheme = colorSchemes.find(s => s.id === currentSettings.colorScheme);
    if (scheme) {
      root.style.setProperty('--primary-color', scheme.color);
    }
  };

  const updateSetting = (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('pidr-settings', JSON.stringify(newSettings));
    applyTheme(newSettings);
  };

  const resetSettings = () => {
    const defaultSettings = {
      theme: 'light',
      colorScheme: 'purple',
      soundEnabled: true,
      musicEnabled: true,
      notifications: true,
      vibration: true,
      language: 'ru',
      autoSave: true,
      gameSpeed: 'normal',
      cardAnimation: true,
      backgroundEffects: true
    };
    setSettings(defaultSettings);
    localStorage.setItem('pidr-settings', JSON.stringify(defaultSettings));
    applyTheme(defaultSettings);
    showNotification('Настройки сброшены!', 'info');
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pidr-settings.json';
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Настройки экспортированы!', 'success');
  };

  const showNotification = (message: string, type: string) => {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 10px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      animation: slideIn 0.3s ease;
      background: ${type === 'success' ? '#00b894' : type === 'error' ? '#e74c3c' : '#3498db'};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1>Настройки</h1>
        <div className="header-actions">
          <button className="action-btn" onClick={exportSettings}>
            <span>📤</span> Экспорт
          </button>
          <button className="action-btn reset-btn" onClick={resetSettings}>
            <span>🔄</span> Сброс
          </button>
        </div>
      </div>

      <div className="settings-sections">
        {/* Внешний вид */}
        <div className="settings-section">
          <h2 className="section-title">
            <span className="section-icon">🎨</span>
            Внешний вид
          </h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Тема</h3>
              <p>Выберите тему оформления</p>
            </div>
            <div className="theme-selector">
              {themes.map(theme => (
                <button
                  key={theme.id}
                  className={`theme-btn ${settings.theme === theme.id ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', theme.id)}
                >
                  <span>{theme.icon}</span>
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Цветовая схема</h3>
              <p>Выберите основной цвет интерфейса</p>
            </div>
            <div className="color-selector">
              {colorSchemes.map(scheme => (
                <button
                  key={scheme.id}
                  className={`color-btn ${settings.colorScheme === scheme.id ? 'active' : ''}`}
                  style={{ backgroundColor: scheme.color }}
                  onClick={() => updateSetting('colorScheme', scheme.id)}
                  title={scheme.name}
                >
                  {settings.colorScheme === scheme.id && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Звук и уведомления */}
        <div className="settings-section">
          <h2 className="section-title">
            <span className="section-icon">🔊</span>
            Звук и уведомления
          </h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Звуковые эффекты</h3>
              <p>Воспроизведение звуков в игре</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Фоновая музыка</h3>
              <p>Воспроизведение музыки во время игры</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.musicEnabled}
                onChange={(e) => updateSetting('musicEnabled', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Уведомления</h3>
              <p>Показывать игровые уведомления</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={(e) => updateSetting('notifications', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Вибрация</h3>
              <p>Тактильная обратная связь</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.vibration}
                onChange={(e) => updateSetting('vibration', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* Игровые настройки */}
        <div className="settings-section">
          <h2 className="section-title">
            <span className="section-icon">🎮</span>
            Игровые настройки
          </h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Скорость игры</h3>
              <p>Скорость анимаций и переходов</p>
            </div>
            <div className="speed-selector">
              {gameSpeeds.map(speed => (
                <button
                  key={speed.id}
                  className={`speed-btn ${settings.gameSpeed === speed.id ? 'active' : ''}`}
                  onClick={() => updateSetting('gameSpeed', speed.id)}
                >
                  <span>{speed.icon}</span>
                  <span>{speed.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Анимация карт</h3>
              <p>Показывать анимацию при игре картами</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.cardAnimation}
                onChange={(e) => updateSetting('cardAnimation', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Фоновые эффекты</h3>
              <p>Показывать визуальные эффекты на фоне</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.backgroundEffects}
                onChange={(e) => updateSetting('backgroundEffects', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <h3>Автосохранение</h3>
              <p>Автоматически сохранять прогресс</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => updateSetting('autoSave', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* Язык */}
        <div className="settings-section">
          <h2 className="section-title">
            <span className="section-icon">🌍</span>
            Язык
          </h2>
          
          <div className="setting-item">
            <div className="setting-info">
              <h3>Язык интерфейса</h3>
              <p>Выберите язык игры</p>
            </div>
            <select
              className="language-select"
              value={settings.language}
              onChange={(e) => updateSetting('language', e.target.value)}
            >
              {languages.map(lang => (
                <option key={lang.id} value={lang.id}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          color: var(--text-color, #333);
        }

        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding: 20px;
          background: var(--card-bg, #fff);
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .settings-header h1 {
          margin: 0;
          font-size: 2rem;
          color: var(--primary-color, #6c5ce7);
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 15px;
          background: var(--primary-color, #6c5ce7);
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .reset-btn {
          background: var(--danger-color, #e74c3c);
        }

        .settings-sections {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .settings-section {
          background: var(--card-bg, #fff);
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 20px 0;
          font-size: 1.3rem;
          color: var(--primary-color, #6c5ce7);
        }

        .section-icon {
          font-size: 1.5rem;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid var(--border-color, #eee);
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-info h3 {
          margin: 0 0 5px 0;
          font-size: 1rem;
          color: var(--text-color, #333);
        }

        .setting-info p {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-secondary, #666);
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: var(--primary-color, #6c5ce7);
        }

        input:checked + .slider:before {
          transform: translateX(26px);
        }

        .theme-selector, .speed-selector {
          display: flex;
          gap: 10px;
        }

        .theme-btn, .speed-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          padding: 10px 15px;
          background: var(--bg-secondary, #f8f9fa);
          border: 2px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.8rem;
        }

        .theme-btn.active, .speed-btn.active {
          background: var(--primary-color, #6c5ce7);
          color: white;
          border-color: var(--primary-color, #6c5ce7);
        }

        .color-selector {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .color-btn {
          width: 40px;
          height: 40px;
          border: 3px solid transparent;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .color-btn.active {
          border-color: var(--text-color, #333);
          transform: scale(1.1);
        }

        .language-select {
          padding: 10px 15px;
          background: var(--bg-secondary, #f8f9fa);
          border: 2px solid var(--border-color, #eee);
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.9rem;
          color: var(--text-color, #333);
        }

        .language-select:focus {
          outline: none;
          border-color: var(--primary-color, #6c5ce7);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .settings-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .setting-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .theme-selector, .speed-selector, .color-selector {
            justify-content: center;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;