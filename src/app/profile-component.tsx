import React, { useState, useEffect } from 'react';

const Profile = () => {
  const [user, setUser] = useState({
    name: 'Игрок',
    level: 1,
    experience: 0,
    coins: 100,
    avatar: '🎮',
    achievements: [],
    gamesPlayed: 0,
    wins: 0,
    losses: 0
  });

  const [achievements] = useState([
    { id: 1, name: 'Первая игра', description: 'Сыграть первую игру', unlocked: true, icon: '🎯' },
    { id: 2, name: 'Победитель', description: 'Выиграть 5 игр', unlocked: false, icon: '🏆' },
    { id: 3, name: 'Коллекционер', description: 'Собрать 10 карт', unlocked: false, icon: '🃏' },
    { id: 4, name: 'Миллионер', description: 'Накопить 1000 монет', unlocked: false, icon: '💰' }
  ]);

  useEffect(() => {
    // Загрузка данных пользователя из localStorage
    const savedUser = localStorage.getItem('pidr-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const winRate = user.gamesPlayed > 0 ? ((user.wins / user.gamesPlayed) * 100).toFixed(1) : 0;
  const experienceToNextLevel = user.level * 100;
  const experienceProgress = (user.experience % 100);

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="avatar-section">
          <div className="avatar">{user.avatar}</div>
          <button className="change-avatar-btn">Изменить</button>
        </div>
        <div className="user-info">
          <h2 className="username">{user.name}</h2>
          <div className="level-info">
            <span className="level">Уровень {user.level}</span>
            <div className="experience-bar">
              <div 
                className="experience-fill" 
                style={{ width: `${(experienceProgress / 100) * 100}%` }}
              ></div>
            </div>
            <span className="experience-text">
              {experienceProgress}/{experienceToNextLevel} XP
            </span>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3>Статистика</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon">🎮</div>
            <div className="stat-info">
              <span className="stat-value">{user.gamesPlayed}</span>
              <span className="stat-label">Игр сыграно</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">🏆</div>
            <div className="stat-info">
              <span className="stat-value">{user.wins}</span>
              <span className="stat-label">Побед</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">💔</div>
            <div className="stat-info">
              <span className="stat-value">{user.losses}</span>
              <span className="stat-label">Поражений</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-value">{winRate}%</span>
              <span className="stat-label">Процент побед</span>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-value">{user.coins}</span>
              <span className="stat-label">Монеты</span>
            </div>
          </div>
        </div>
      </div>

      <div className="achievements-section">
        <h3>Достижения</h3>
        <div className="achievements-grid">
          {achievements.map(achievement => (
            <div 
              key={achievement.id} 
              className={`achievement-item ${achievement.unlocked ? 'unlocked' : 'locked'}`}
            >
              <div className="achievement-icon">{achievement.icon}</div>
              <div className="achievement-info">
                <h4 className="achievement-name">{achievement.name}</h4>
                <p className="achievement-description">{achievement.description}</p>
              </div>
              {achievement.unlocked && <div className="achievement-badge">✓</div>}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .profile-container {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
          color: var(--text-color, #333);
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
          padding: 20px;
          background: var(--card-bg, #fff);
          border-radius: 15px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .avatar-section {
          text-align: center;
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--primary-color, #6c5ce7);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          margin-bottom: 10px;
        }

        .change-avatar-btn {
          padding: 5px 15px;
          background: var(--secondary-color, #a29bfe);
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .user-info {
          flex: 1;
        }

        .username {
          margin: 0 0 10px 0;
          font-size: 1.5rem;
          color: var(--text-color, #333);
        }

        .level-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .level {
          font-weight: bold;
          color: var(--primary-color, #6c5ce7);
        }

        .experience-bar {
          flex: 1;
          height: 8px;
          background: var(--bg-secondary, #f0f0f0);
          border-radius: 4px;
          overflow: hidden;
        }

        .experience-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--primary-color, #6c5ce7), var(--secondary-color, #a29bfe));
          transition: width 0.3s ease;
        }

        .experience-text {
          font-size: 0.8rem;
          color: var(--text-secondary, #666);
        }

        .stats-section, .achievements-section {
          margin-bottom: 30px;
        }

        .stats-section h3, .achievements-section h3 {
          margin-bottom: 15px;
          color: var(--text-color, #333);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: var(--card-bg, #fff);
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .stat-icon {
          font-size: 1.5rem;
        }

        .stat-info {
          display: flex;
          flex-direction: column;
        }

        .stat-value {
          font-size: 1.2rem;
          font-weight: bold;
          color: var(--primary-color, #6c5ce7);
        }

        .stat-label {
          font-size: 0.8rem;
          color: var(--text-secondary, #666);
        }

        .achievements-grid {
          display: grid;
          gap: 15px;
        }

        .achievement-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: var(--card-bg, #fff);
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          position: relative;
          transition: all 0.3s ease;
        }

        .achievement-item.locked {
          opacity: 0.5;
          filter: grayscale(100%);
        }

        .achievement-item.unlocked {
          border-left: 4px solid var(--primary-color, #6c5ce7);
        }

        .achievement-icon {
          font-size: 1.5rem;
        }

        .achievement-info {
          flex: 1;
        }

        .achievement-name {
          margin: 0 0 5px 0;
          font-size: 1rem;
          color: var(--text-color, #333);
        }

        .achievement-description {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-secondary, #666);
        }

        .achievement-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          color: var(--success-color, #00b894);
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
            text-align: center;
          }

          .level-info {
            flex-direction: column;
            gap: 5px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Profile;