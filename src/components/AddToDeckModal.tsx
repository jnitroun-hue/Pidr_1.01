'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './AddToDeckModal.module.css';

export interface DeckPickerCard {
  id: string | number;
  rank?: string;
  suit?: string;
  image_url?: string;
  rarity?: string;
}

interface AddToDeckModalProps {
  cards: DeckPickerCard[];
  selectedIds: string[];
  isSubmitting: boolean;
  onToggle: (cardId: string | number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function AddToDeckModal({
  cards,
  selectedIds,
  isSubmitting,
  onToggle,
  onConfirm,
  onClose,
}: AddToDeckModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, isSubmitting]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Добавить карты в колоду"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Добавить в колоду</h3>
            <p className={styles.subtitle}>
              Выберите одну или несколько карт ({selectedIds.length} из {cards.length})
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Закрыть"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.grid}>
          {cards.map((card) => {
            const key = String(card.id);
            const isSelected = selectedIds.includes(key);
            return (
              <button
                key={key}
                type="button"
                className={`${styles.cardBtn} ${isSelected ? styles.cardBtnSelected : ''}`}
                onClick={() => onToggle(card.id)}
                disabled={isSubmitting}
              >
                {card.image_url ? (
                  <img src={card.image_url} alt={`${card.rank} ${card.suit}`} className={styles.cardImg} />
                ) : (
                  <div className={styles.cardPlaceholder}>?</div>
                )}
                <span className={styles.cardLabel}>
                  {isSelected ? '✓ ' : ''}
                  {card.rank} {card.suit}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
            disabled={isSubmitting || selectedIds.length === 0}
          >
            {isSubmitting ? '⏳ Добавляем...' : `✓ Добавить выбранные (${selectedIds.length})`}
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
            Отмена
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
