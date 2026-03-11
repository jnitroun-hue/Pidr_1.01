'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  isMultiplayer = false,
}: GameChatProps) {
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
        const newMsgs = externalMessages.filter(m => !existingIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        if (!isOpen) setUnreadCount(c => c + newMsgs.length);
        return [...prev, ...newMsgs];
      });
    }
  }, [externalMessages, isOpen]);

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

  return (
    <>
      {/* Кнопка чата */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.9 }}
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          zIndex: 500,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '2px solid rgba(99,102,241,0.6)',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)',
          color: '#a5b4fc',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 15px rgba(99,102,241,0.2)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.2s',
        }}
      >
        💬
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(15,23,42,0.9)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Панель чата */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: '72px',
              left: '12px',
              width: 'min(320px, calc(100vw - 24px))',
              height: 'min(420px, 55vh)',
              zIndex: 501,
              borderRadius: '20px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              border: '1.5px solid rgba(99,102,241,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(99,102,241,0.1)',
            }}
          >
            {/* Заголовок чата */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(99,102,241,0.2)',
              backdropFilter: 'blur(16px)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#22c55e',
                  boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                }} />
                <span style={{
                  color: '#e2e8f0',
                  fontSize: '14px',
                  fontWeight: '700',
                  letterSpacing: '0.5px',
                }}>
                  Чат за столом
                </span>
                <span style={{
                  color: '#64748b',
                  fontSize: '11px',
                }}>
                  {messages.length} сообщ.
                </span>
              </div>
              <motion.button
                onClick={() => setIsOpen(false)}
                whileTap={{ scale: 0.85 }}
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  color: '#f87171',
                  fontSize: '16px',
                  lineHeight: 1,
                }}
              >
                ✕
              </motion.button>
            </div>

            {/* Область сообщений */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              background: 'linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(10,15,30,0.98) 100%)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              {messages.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  color: '#475569',
                  fontSize: '13px',
                  padding: '40px 16px',
                  lineHeight: '1.6',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>💬</div>
                  Начните общение!
                  <br />
                  <span style={{ fontSize: '11px', color: '#334155' }}>
                    Используйте быстрые фразы или эмодзи
                  </span>
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.playerId === playerId;
                const isSystem = msg.type === 'system';
                const isEmoji = msg.type === 'emoji';

                if (isSystem) {
                  return (
                    <div key={msg.id} style={{
                      textAlign: 'center',
                      color: '#64748b',
                      fontSize: '11px',
                      padding: '4px 0',
                      fontStyle: 'italic',
                    }}>
                      {msg.text}
                    </div>
                  );
                }

                if (isEmoji) {
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        fontSize: '32px',
                        lineHeight: 1,
                        padding: '4px',
                      }}
                    >
                      {msg.text}
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    {!isMe && (
                      <div style={{
                        fontSize: '10px',
                        color: '#8b5cf6',
                        fontWeight: '600',
                        marginBottom: '2px',
                        paddingLeft: '8px',
                      }}>
                        {msg.playerName}
                      </div>
                    )}
                    <div style={{
                      background: isMe
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.2) 100%)'
                        : 'rgba(30,41,59,0.7)',
                      border: `1px solid ${isMe ? 'rgba(99,102,241,0.3)' : 'rgba(51,65,85,0.4)'}`,
                      borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      padding: '8px 12px',
                      color: '#e2e8f0',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                    }}>
                      {msg.text}
                      <span style={{
                        fontSize: '9px',
                        color: '#475569',
                        marginLeft: '8px',
                        float: 'right',
                        marginTop: '2px',
                      }}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Быстрые эмодзи и фразы */}
            <AnimatePresence>
              {showEmojis && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: 'rgba(15,23,42,0.98)',
                    borderTop: '1px solid rgba(99,102,241,0.15)',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    padding: '8px 12px',
                  }}>
                    {QUICK_EMOJIS.map(e => (
                      <button
                        key={e}
                        onClick={() => { sendMessage(e); setShowEmojis(false); }}
                        style={{
                          background: 'rgba(51,65,85,0.4)',
                          border: '1px solid rgba(71,85,105,0.3)',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          fontSize: '18px',
                          lineHeight: 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    padding: '0 12px 8px',
                  }}>
                    {QUICK_PHRASES.map(p => (
                      <button
                        key={p}
                        onClick={() => { sendMessage(p); setShowEmojis(false); }}
                        style={{
                          background: 'rgba(99,102,241,0.12)',
                          border: '1px solid rgba(99,102,241,0.2)',
                          borderRadius: '10px',
                          padding: '4px 10px',
                          cursor: 'pointer',
                          color: '#a5b4fc',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.15s',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Поле ввода */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.98) 100%)',
              padding: '10px 12px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              borderTop: '1px solid rgba(99,102,241,0.15)',
            }}>
              <button
                onClick={() => setShowEmojis(!showEmojis)}
                style={{
                  background: showEmojis ? 'rgba(99,102,241,0.2)' : 'transparent',
                  border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '10px',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  lineHeight: 1,
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              >
                😊
              </button>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Сообщение..."
                maxLength={120}
                style={{
                  flex: 1,
                  background: 'rgba(15,23,42,0.6)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  color: '#e2e8f0',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              <motion.button
                onClick={() => sendMessage(inputText)}
                whileTap={{ scale: 0.85 }}
                style={{
                  background: inputText.trim()
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'rgba(51,65,85,0.4)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  cursor: inputText.trim() ? 'pointer' : 'default',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '700',
                  lineHeight: 1,
                  flexShrink: 0,
                  opacity: inputText.trim() ? 1 : 0.4,
                  transition: 'all 0.2s',
                }}
                disabled={!inputText.trim()}
              >
                ➤
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
