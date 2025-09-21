'use client'

import { useTelegram } from './useTelegram';

interface ShareOptions {
  url: string;
  text?: string;
  parse_mode?: 'HTML' | 'Markdown';
}

interface InviteToGameOptions {
  roomCode: string;
  roomName?: string;
  playerCount?: number;
  maxPlayers?: number;
}

export function useTelegramShare() {
  const { webApp, user } = useTelegram();

  // Поделиться ссылкой через Telegram
  const shareUrl = ({ url, text, parse_mode = 'HTML' }: ShareOptions) => {
    if (!url) return false;

    const shareText = text || 'Проверь это!';
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(shareText);
    
    // Используем Telegram Share URL
    const telegramShareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    
    try {
      if (webApp?.openTelegramLink) {
        webApp.openTelegramLink(telegramShareUrl);
        return true;
      } else {
        // Fallback: открыть в новом окне
        window.open(telegramShareUrl, '_blank');
        return true;
      }
    } catch (error) {
      console.error('Error sharing via Telegram:', error);
      return false;
    }
  };

  // Пригласить друзей в игру P.I.D.R.
  const inviteToGame = ({ roomCode, roomName, playerCount, maxPlayers }: InviteToGameOptions) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const gameUrl = `${baseUrl}/game?room=${roomCode}`;
    
    const playersText = playerCount && maxPlayers 
      ? `👥 Игроков: ${playerCount}/${maxPlayers}`
      : '👥 Ждем игроков!';
    
    const inviteText = `🎮 <b>Присоединяйся к игре P.I.D.R.!</b>\n\n` +
      `🏠 Комната: ${roomName || 'P.I.D.R. Игра'}\n` +
      `🎫 Код комнаты: <code>${roomCode}</code>\n` +
      `${playersText}\n\n` +
      `🃏 Самая захватывающая карточная игра!\n` +
      `⚡ Играй в режиме реального времени!\n\n` +
      `👆 Нажми на ссылку чтобы присоединиться:`;

    return shareUrl({
      url: gameUrl,
      text: inviteText,
      parse_mode: 'HTML'
    });
  };

  // Поделиться реферальной ссылкой
  const shareReferral = (referralCode: string, customText?: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const referralUrl = `${baseUrl}?ref=${referralCode}`;
    
    const defaultText = `🎮 <b>Присоединяйся к P.I.D.R.!</b>\n\n` +
      `🎁 Получи <b>100 монет</b> за регистрацию по моей ссылке!\n` +
      `👥 Играй с друзьями в режиме реального времени!\n` +
      `🃏 Самая захватывающая карточная игра в Telegram!\n\n` +
      `🔥 Особенности игры:\n` +
      `• 🎯 Уникальные правила P.I.D.R.\n` +
      `• ⚡ Real-time мультиплеер\n` +
      `• 🏆 Система рейтинга\n` +
      `• 💰 Игровая валюта\n` +
      `• 🤖 Умные боты\n\n` +
      `👆 Нажми на ссылку для регистрации:`;

    return shareUrl({
      url: referralUrl,
      text: customText || defaultText,
      parse_mode: 'HTML'
    });
  };

  // Пригласить друга в друзья
  const inviteFriend = (username?: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteUrl = `${baseUrl}/friends`;
    
    const userText = user?.username ? `от @${user.username}` : 'от твоего друга';
    const inviteText = `👋 <b>Приглашение в друзья P.I.D.R.!</b>\n\n` +
      `🎮 Получил приглашение ${userText}\n` +
      `🃏 Присоединяйся к самой крутой карточной игре!\n\n` +
      `🎁 Что тебя ждет:\n` +
      `• 🎯 Захватывающие партии с друзьями\n` +
      `• 🏆 Система рейтинга и достижений\n` +
      `• 💰 Игровая валюта и награды\n` +
      `• ⚡ Игра в режиме реального времени\n\n` +
      `👆 Нажми чтобы начать играть:`;

    return shareUrl({
      url: inviteUrl,
      text: inviteText,
      parse_mode: 'HTML'
    });
  };

  // Поделиться результатом игры
  const shareGameResult = (gameResult: {
    isWinner: boolean;
    stage: number;
    duration?: number;
    opponentCount?: number;
  }) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const gameUrl = `${baseUrl}/game-setup`;
    
    const resultEmoji = gameResult.isWinner ? '🏆' : '😤';
    const resultText = gameResult.isWinner ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ';
    const stageText = gameResult.stage === 3 ? 'до самого конца (3-я стадия)!' : `до ${gameResult.stage}-й стадии`;
    
    const durationText = gameResult.duration ? 
      `⏱️ Время: ${Math.floor(gameResult.duration / 60)}:${(gameResult.duration % 60).toString().padStart(2, '0')}` : '';
    
    const opponentText = gameResult.opponentCount ? 
      `👥 Против ${gameResult.opponentCount} соперников` : '';

    const shareText = `${resultEmoji} <b>${resultText} в P.I.D.R.!</b>\n\n` +
      `🎮 Дошел ${stageText}\n` +
      `${opponentText}\n` +
      `${durationText}\n\n` +
      `🃏 Сможешь меня обыграть?\n` +
      `🎯 Присоединяйся к самой захватывающей карточной игре!\n\n` +
      `👆 Играть в P.I.D.R.:`;

    return shareUrl({
      url: gameUrl,
      text: shareText,
      parse_mode: 'HTML'
    });
  };

  // Поделиться достижением
  const shareAchievement = (achievement: {
    title: string;
    description: string;
    emoji: string;
  }) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const gameUrl = `${baseUrl}/game-setup`;
    
    const shareText = `${achievement.emoji} <b>Новое достижение!</b>\n\n` +
      `🏆 ${achievement.title}\n` +
      `📝 ${achievement.description}\n\n` +
      `🎮 Получено в игре P.I.D.R. - самой захватывающей карточной игре!\n` +
      `🎯 Сможешь повторить?\n\n` +
      `👆 Играть в P.I.D.R.:`;

    return shareUrl({
      url: gameUrl,
      text: shareText,
      parse_mode: 'HTML'
    });
  };

  return {
    shareUrl,
    inviteToGame,
    shareReferral,
    inviteFriend,
    shareGameResult,
    shareAchievement,
    isSupported: !!webApp || typeof window !== 'undefined',
    user
  };
}
