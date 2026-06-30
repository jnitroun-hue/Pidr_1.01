'use client'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './GameChat.module.css';

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
  type: 'message' | 'system' | 'emoji';
}

interface GameChatProps {
  playerName: string;
  playerId: string;
  onSendMessage?: (text: string) => void;
  externalMessages?: ChatMessage[];
  isMultiplayer?: boolean;
  /** playerId из игры — сообщения этих игроков не показываются только вам */
  blockedPlayerIds?: string[];
}

const QUICK_EMOJIS = ['👍', '😂', '😎', '🔥', '💀', '😡', '🎉', '👏'];

const QUICK_PHRASES = [
  'gg', 'nh', 'wp',
  'Ходи!', 'Думай!', 'Удачи!',
];

export default function GameChat({
  playerName,
  playerId,
  onSendMessage,
  externalMessages = [],
  blockedPlayerIds = [],
}: GameChatProps) {
  const blockedSet = useMemo(
    () => new Set(blockedPlayerIds.map(String)),
    [blockedPlayerIds]
  );

  const isVisible = useCallback(
    (msg: ChatMessage) => !blockedSet.has(String(msg.playerId)),
    [blockedSet]
  );
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalMessages.length > 0) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = externalMessages.filter(
          (m) => !existingIds.has(m.id) && isVisible(m)
        );
        if (newMsgs.length === 0) return prev;
        if (!isOpen) setUnreadCount(c => c + newMsgs.length);
        return [...prev, ...newMsgs];
      });
    }
  }, [externalMessages, isOpen, isVisible]);

  useEffect(() => {
    setMessages((prev) => prev.filter(isVisible));
  }, [blockedSet, isVisible]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId,
      playerName,
      text: trimmed,
      timestamp: Date.now(),
      type: trimmed.length <= 3 && QUICK_EMOJIS.includes(trimmed) ? 'emoji' : 'message',
    };

    setMessages(prev => [...prev, msg]);
    onSendMessage?.(trimmed);
    setInputText('');
  }, [playerId, playerName, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const canSend = Boolean(inputText.trim());

  return (
    <div className={styles.root}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.92 }}
        className={`${styles.toggleBtn} ${isOpen ? styles.toggleBtnOpen : ''}`}
        aria-label={isOpen ? 'Закрыть чат' : 'Открыть чат'}
      >
        <svg className={styles.toggleIcon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={styles.unreadBadge}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={styles.panel}
          >
            <div className={styles.header}>
              <div className={styles.headerTitle}>
                <span className={styles.statusDot} />
                <span>Чат за столом</span>
                <span className={styles.headerMeta}>{messages.length}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={styles.closeBtn}
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div className={styles.messages}>
              {messages.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>♠</div>
                  Быстрые фразы и эмодзи — над столом и здесь
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.playerId === playerId;
                const isSystem = msg.type === 'system';
                const isEmoji = msg.type === 'emoji';

                if (isSystem) {
                  return (
                    <div key={msg.id} className={styles.systemMsg}>
                      {msg.text}
                    </div>
                  );
                }

                if (isEmoji) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`${styles.msgRow} ${isMe ? styles.msgRowMe : styles.msgRowOther}`}
                    >
                      <span className={styles.emojiMsg}>{msg.text}</span>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${styles.msgRow} ${isMe ? styles.msgRowMe : styles.msgRowOther}`}
                  >
                    {!isMe && (
                      <div className={styles.msgAuthor}>{msg.playerName}</div>
                    )}
                    <div className={`${styles.msgBubble} ${isMe ? styles.msgBubbleMe : styles.msgBubbleOther}`}>
                      {msg.text}
                      <span className={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <AnimatePresence>
              {showEmojis && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className={styles.quickPanel}
                >
                  <div className={styles.quickEmojis}>
                    {QUICK_EMOJIS.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => { sendMessage(e); setShowEmojis(false); }}
                        className={styles.quickEmojiBtn}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className={styles.quickPhrases}>
                    {QUICK_PHRASES.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { sendMessage(p); setShowEmojis(false); }}
                        className={styles.quickChip}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.inputBar}>
              <button
                type="button"
                onClick={() => setShowEmojis(!showEmojis)}
                className={`${styles.emojiToggle} ${showEmojis ? styles.emojiToggleActive : ''}`}
                aria-label="Быстрые фразы"
              >
                ☺
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Сообщение..."
                maxLength={120}
                className={styles.input}
              />
              <motion.button
                type="button"
                onClick={() => sendMessage(inputText)}
                whileTap={canSend ? { scale: 0.9 } : undefined}
                className={`${styles.sendBtn} ${canSend ? styles.sendBtnActive : styles.sendBtnDisabled}`}
                disabled={!canSend}
                aria-label="Отправить"
              >
                ➤
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
