'use client';

import { buildReferralShareText } from '@/lib/referral/referral-links';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  UserPlus,
  Search,
  User,
  Users,
  Share2,
  Trophy,
  Copy,
  Gamepad2,
  Target,
  Check,
  X as XIcon,
} from 'lucide-react';
import PageLoadingScreen from '@/components/PageLoadingScreen';
import { fetchWithAuth } from '@/lib/api-headers';
import { appAlert } from '@/lib/app-notice';
import UserAvatarBadge from '@/components/UserAvatarBadge';
import AuthMethodBadge from '@/components/AuthMethodBadge';
import type { AuthMethod } from '@/lib/user/resolve-auth-method';
import styles from './FriendsPage.module.css';

interface Friend {
  id: number;
  username: string;
  first_name: string;
  avatar_url?: string;
  auth_method?: AuthMethod;
  rating: number;
  games_played: number;
  wins: number;
  win_rate: number;
  status: 'online' | 'offline' | 'in_room' | 'playing';
  status_label: string;
  is_online: boolean;
  last_seen?: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteRoomId, setInviteRoomId] = useState<string | null>(null);
  const [inviteRoomCode, setInviteRoomCode] = useState<string | null>(null);
  const [referralInviteUrl, setReferralInviteUrl] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [invitingId, setInvitingId] = useState<number | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<Friend[]>([]);
  const [outgoingPendingIds, setOutgoingPendingIds] = useState<Set<number>>(new Set());
  const [actingOnId, setActingOnId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('invite_room');
    const roomCode = params.get('room_code');
    if (roomId && roomCode) {
      setInviteRoomId(roomId);
      setInviteRoomCode(roomCode);
    }
  }, []);

  const loadFriendRequests = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/friends/requests', {
        method: 'GET',
        cache: 'no-store',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setIncomingRequests(result.incoming || []);
          setOutgoingPendingIds(
            new Set((result.outgoing || []).map((u: Friend) => u.id))
          );
        }
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки запросов:', error);
    }
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/friends/list', {
        method: 'GET',
        cache: 'no-store',
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) setFriends(result.friends || []);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки друзей:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReferralLink = useCallback(async () => {
    try {
      const authResp = await fetchWithAuth('/api/auth', { method: 'GET', cache: 'no-store' });
      if (authResp.ok) {
        const authData = await authResp.json();
        if (authData.success && authData.user?.id) {
          setCurrentUserId(Number(authData.user.id));
        }
      }
      const refResp = await fetchWithAuth('/api/referral?action=get_link', {
        method: 'GET',
        cache: 'no-store',
      });
      if (refResp.ok) {
        const refData = await refResp.json();
        if (refData.success && refData.referralLink) {
          setReferralInviteUrl(refData.referralLink);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadFriends();
    void loadReferralLink();
    void loadFriendRequests();
    const interval = setInterval(() => {
      void loadFriends();
      void loadFriendRequests();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadFriends, loadReferralLink, loadFriendRequests]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const response = await fetchWithAuth(
        `/api/friends/search?query=${encodeURIComponent(query)}`,
        { cache: 'no-store' }
      );
      if (response.ok) {
        const result = await response.json();
        setSearchResults(result.users || []);
      }
    } catch (error) {
      console.error('❌ Ошибка поиска:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (friendDbId: number) => {
    try {
      const response = await fetchWithAuth('/api/friends/add', {
        method: 'POST',
        body: JSON.stringify({ friend_id: friendDbId }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        if (result.status === 'accepted') {
          await appAlert('Вы приняли встречный запрос — теперь вы друзья!', {
            title: 'Готово',
            type: 'success',
          });
          await loadFriends();
        } else {
          await appAlert(result.message || 'Приглашение отправлено — ждём ответа', {
            title: 'Запрос отправлен',
            type: 'success',
          });
        }
        await loadFriendRequests();
        setSearchQuery('');
        setSearchResults([]);
      } else {
        await appAlert(result.error || 'Не удалось отправить запрос', { title: 'Ошибка', type: 'error' });
      }
    } catch {
      await appAlert('Ошибка при отправке запроса', { title: 'Ошибка', type: 'error' });
    }
  };

  const handleAcceptFriend = async (friendDbId: number) => {
    try {
      setActingOnId(friendDbId);
      const response = await fetchWithAuth('/api/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ friend_id: friendDbId }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        await appAlert('Запрос принят!', { title: 'Друзья', type: 'success' });
        await loadFriends();
        await loadFriendRequests();
      } else {
        await appAlert(result.error || 'Не удалось принять', { title: 'Ошибка', type: 'error' });
      }
    } catch {
      await appAlert('Ошибка при принятии', { title: 'Ошибка', type: 'error' });
    } finally {
      setActingOnId(null);
    }
  };

  const handleRejectFriend = async (friendDbId: number) => {
    try {
      setActingOnId(friendDbId);
      const response = await fetchWithAuth('/api/friends/reject', {
        method: 'POST',
        body: JSON.stringify({ friend_id: friendDbId }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        await loadFriendRequests();
      } else {
        await appAlert(result.error || 'Не удалось отклонить', { title: 'Ошибка', type: 'error' });
      }
    } catch {
      await appAlert('Ошибка при отклонении', { title: 'Ошибка', type: 'error' });
    } finally {
      setActingOnId(null);
    }
  };

  const handleShareInvite = async () => {
    const inviteLink = referralInviteUrl || `${window.location.origin}/`;
    const shareText = buildReferralShareText(inviteLink);

    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`
      );
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText}\n${inviteLink}`);
      await appAlert('Реферальная ссылка скопирована', { title: 'Скопировано', type: 'success' });
    }
  };

  const handleCopyReferral = async () => {
    const inviteLink = referralInviteUrl || `${window.location.origin}/`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(inviteLink);
      await appAlert('Ссылка скопирована', { title: 'Реферал', type: 'success' });
    }
  };

  const inviteFriendToRoom = async (friend: Friend) => {
    if (!inviteRoomId) return;
    try {
      setInvitingId(friend.id);
      const response = await fetchWithAuth(`/api/rooms/${inviteRoomId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ friendId: friend.id }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        await appAlert(`Приглашение отправлено ${friend.first_name}`, {
          title: 'Приглашение',
          type: 'success',
        });
      } else {
        await appAlert(result.message || result.error || 'Не удалось пригласить', {
          title: 'Ошибка',
          type: 'error',
        });
      }
    } catch {
      await appAlert('Ошибка отправки приглашения', { title: 'Ошибка', type: 'error' });
    } finally {
      setInvitingId(null);
    }
  };

  const shareRoomLink = (friend: Friend) => {
    if (!inviteRoomId || !inviteRoomCode) return;
    const params = new URLSearchParams({
      roomId: String(inviteRoomId),
      roomCode: String(inviteRoomCode),
    });
    if (currentUserId) params.set('ref', String(currentUserId));
    const inviteLink = `${window.location.origin}/multiplayer?${params.toString()}`;
    const message = `🎮 ${friend.first_name}, присоединяйся к игре!\n\nКод: ${inviteRoomCode}\n${inviteLink}`;

    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(message)}`
      );
    } else if (navigator.clipboard) {
      void navigator.clipboard.writeText(message);
      void appAlert('Ссылка на комнату скопирована', { title: 'Комната', type: 'success' });
    }
  };

  const sortedFriends = [...friends].sort((a, b) => Number(b.is_online) - Number(a.is_online));
  const onlineCount = friends.filter((f) => f.is_online).length;
  const offlineFriends = sortedFriends.filter((f) => !f.is_online);
  const friendIds = new Set(friends.map((f) => f.id));

  return (
    <div className={styles.page}>
      <motion.button
        type="button"
        className={styles.backBtn}
        whileTap={{ scale: 0.96 }}
        onClick={() => router.back()}
      >
        <ArrowLeft size={18} />
        Назад
      </motion.button>

      <header className={styles.header}>
        <h1 className={styles.title}>ДРУЗЬЯ</h1>
        <p className={styles.subtitle}>Приглашай, играй вместе, следи за статистикой</p>
      </header>

      {inviteRoomId && inviteRoomCode && (
        <div className={styles.inviteBanner}>
          🎮 Режим приглашения в комнату · код <strong>{inviteRoomCode}</strong>
          <br />
          Онлайн-друзьям можно отправить invite прямо в игру.
        </div>
      )}

      <div className={styles.searchWrap}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Поиск по нику..."
          value={searchQuery}
          onChange={(e) => void handleSearch(e.target.value)}
        />
      </div>

      <div className={styles.actionsRow}>
        <button type="button" className={styles.btnPrimary} onClick={() => void handleShareInvite()}>
          <Share2 size={18} />
          Пригласить
        </button>
        <button type="button" className={styles.btnSecondary} onClick={() => void handleCopyReferral()}>
          <Copy size={18} />
          Ссылка
        </button>
      </div>

      {referralInviteUrl && (
        <div className={styles.referralBox}>Реферал: {referralInviteUrl}</div>
      )}

      {incomingRequests.length > 0 && (
        <section className={styles.section}>
          <div className={styles.requestsBanner}>
            📩 У вас {incomingRequests.length} запрос(ов) в друзья — примите или отклоните
          </div>
          <h2 className={styles.sectionTitle}>Входящие запросы · {incomingRequests.length}</h2>
          <div className={styles.cardList}>
            {incomingRequests.map((user) => (
              <PersonCard
                key={`req-${user.id}`}
                person={user}
                incomingRequest
                acting={actingOnId === user.id}
                onAccept={() => void handleAcceptFriend(user.id)}
                onReject={() => void handleRejectFriend(user.id)}
              />
            ))}
          </div>
        </section>
      )}

      {searchQuery.length >= 1 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>🔍 Поиск · {searchResults.length}</h2>
          {searching ? (
            <div className={styles.empty}>Поиск...</div>
          ) : searchResults.length === 0 ? (
            <div className={styles.empty}>Никого не найдено</div>
          ) : (
            <div className={styles.cardList}>
              {searchResults.map((user) => (
                <PersonCard
                  key={user.id}
                  person={user}
                  alreadyFriend={friendIds.has(user.id)}
                  requestSent={outgoingPendingIds.has(user.id)}
                  inviteRoomMode={Boolean(inviteRoomId && inviteRoomCode)}
                  inviting={invitingId === user.id}
                  onAdd={() => void handleAddFriend(user.id)}
                  onInviteRoom={() =>
                    inviteRoomId ? void inviteFriendToRoom(user) : void shareRoomLink(user)
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {onlineCount > 0 && (
        <section className={styles.section}>
          <h2 className={`${styles.sectionTitle} ${styles.sectionTitleOnline}`}>
            <span className={styles.onlineDot} />
            В сети · {onlineCount}
          </h2>
          <div className={styles.cardList}>
            {sortedFriends
              .filter((f) => f.is_online)
              .map((friend) => (
                <PersonCard
                  key={`online-${friend.id}`}
                  person={friend}
                  alreadyFriend
                  inviteRoomMode={Boolean(inviteRoomId && inviteRoomCode)}
                  inviting={invitingId === friend.id}
                  onInviteRoom={() =>
                    inviteRoomId ? void inviteFriendToRoom(friend) : void shareRoomLink(friend)
                  }
                />
              ))}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Users size={14} />
          Все друзья · {friends.length}
          {onlineCount > 0 && ` · ${onlineCount} онлайн`}
        </h2>
        {loading ? (
          <PageLoadingScreen fullScreen={false} compact showProgress={false} title="Друзья" subtitle="Загрузка..." />
        ) : friends.length === 0 ? (
          <div className={styles.empty}>
            <User size={40} />
            <div className={styles.emptyTitle}>Пока нет друзей</div>
            <p>Поделись реферальной ссылкой — друг появится здесь после регистрации</p>
          </div>
        ) : onlineCount > 0 && offlineFriends.length === 0 ? (
          <div className={styles.empty}>Все друзья сейчас в сети — смотри блок выше</div>
        ) : (
          <div className={styles.cardList}>
            {(onlineCount > 0 ? offlineFriends : sortedFriends).map((friend) => (
              <PersonCard
                key={friend.id}
                person={friend}
                alreadyFriend
                inviteRoomMode={Boolean(inviteRoomId && inviteRoomCode)}
                inviting={invitingId === friend.id}
                onInviteRoom={() =>
                  inviteRoomId ? void inviteFriendToRoom(friend) : void shareRoomLink(friend)
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PersonCard({
  person,
  alreadyFriend,
  requestSent,
  incomingRequest,
  acting,
  inviteRoomMode,
  inviting,
  onAdd,
  onAccept,
  onReject,
  onInviteRoom,
}: {
  person: Friend;
  alreadyFriend?: boolean;
  requestSent?: boolean;
  incomingRequest?: boolean;
  acting?: boolean;
  inviteRoomMode?: boolean;
  inviting?: boolean;
  onAdd?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onInviteRoom?: () => void;
}) {
  const presenceClass =
    person.status === 'playing' || person.status === 'in_room'
      ? styles.presencePlaying
      : person.is_online
        ? styles.presenceOnline
        : styles.presenceOffline;

  const dotClass =
    person.status === 'playing' || person.status === 'in_room'
      ? styles.statusPlaying
      : person.is_online
        ? styles.statusOnline
        : styles.statusOffline;

  return (
    <motion.div
      className={`${styles.card} ${person.is_online ? styles.cardOnline : ''}`}
      whileHover={{ y: -1 }}
    >
      <div className={styles.avatarWrap}>
        <UserAvatarBadge
          username={person.first_name || person.username}
          avatarUrl={person.avatar_url}
          authMethod={(person.auth_method as AuthMethod) || 'web'}
          size="md"
          showAuthBadge={false}
        />
        <span className={`${styles.statusDot} ${dotClass}`} />
      </div>

      <div className={styles.cardBody}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{person.first_name}</span>
          <AuthMethodBadge method={(person.auth_method as AuthMethod) || 'web'} size="sm" />
        </div>
        <div className={styles.handle}>@{person.username}</div>
        <div className={styles.statsRow}>
          <span className={`${styles.statPill} ${styles.statGold}`}>
            <Trophy size={11} />
            {person.rating}
          </span>
          <span className={styles.statPill}>
            <Gamepad2 size={11} />
            {person.games_played} игр
          </span>
          <span className={styles.statPill}>
            <Target size={11} />
            {person.win_rate}% побед
          </span>
        </div>
      </div>

      <div className={styles.cardActions}>
        <span className={`${styles.presencePill} ${presenceClass}`}>
          {person.status_label || (person.is_online ? 'В сети' : 'Не в сети')}
        </span>

        {inviteRoomMode && person.is_online && onInviteRoom && (
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnInvite}`}
            disabled={inviting}
            title="Пригласить в комнату"
            onClick={onInviteRoom}
          >
            <Gamepad2 size={18} />
          </button>
        )}

        {incomingRequest && onAccept && onReject && (
          <>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnAccept}`}
              disabled={acting}
              title="Принять"
              onClick={onAccept}
            >
              <Check size={18} />
            </button>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnReject}`}
              disabled={acting}
              title="Отклонить"
              onClick={onReject}
            >
              <XIcon size={18} />
            </button>
          </>
        )}

        {!alreadyFriend && !requestSent && !incomingRequest && onAdd && (
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnAdd}`}
            title="Отправить запрос в друзья"
            onClick={onAdd}
          >
            <UserPlus size={18} />
          </button>
        )}

        {requestSent && !alreadyFriend && (
          <span className={styles.pendingPill}>Ожидает</span>
        )}
      </div>
    </motion.div>
  );
}
