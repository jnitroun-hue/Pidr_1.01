import { useRef } from 'react';
import type { Card } from '../types/game';

type DragAndDropParams = {
  onDrop?: (card: Card, playerIdx: number) => void;
  onDragStart?: (card: Card, playerIdx: number) => void;
  onDragEnd?: () => void;
};

type DragProps = {
  onDragStart: (card: Card, playerIdx: number, e: React.DragEvent<HTMLDivElement>) => void;
  onTouchStart: (card: Card, playerIdx: number, e: React.TouchEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
};

type DropProps = {
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
};

export function useDragAndDrop({ onDrop, onDragStart, onDragEnd }: DragAndDropParams): { dragProps: DragProps; dropProps: DropProps } {
  const dragData = useRef<{ card: Card; playerIdx: number } | null>(null);

  const dragProps: DragProps = {
    onDragStart: (card, playerIdx, e) => {
      dragData.current = { card, playerIdx };
      if (onDragStart) onDragStart(card, playerIdx);
    },
    onTouchStart: (card, playerIdx, e) => {
      dragData.current = { card, playerIdx };
      if (onDragStart) onDragStart(card, playerIdx);
      const move = (evt: TouchEvent) => {
        if (evt.cancelable) evt.preventDefault();
      };
      const end = (evt: TouchEvent) => {
        if (onDrop && dragData.current) onDrop(dragData.current.card, dragData.current.playerIdx);
        if (onDragEnd) onDragEnd();
        window.removeEventListener('touchmove', move);
        window.removeEventListener('touchend', end);
      };
      window.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend', end, { passive: false });
    },
    onDragEnd: () => {
      if (onDragEnd) onDragEnd();
    },
  };

  const dropProps: DropProps = {
    onDrop: e => {
      e.preventDefault();
      if (dragData.current && onDrop) onDrop(dragData.current.card, dragData.current.playerIdx);
      if (onDragEnd) onDragEnd();
      dragData.current = null;
    },
    onDragOver: e => e.preventDefault(),
  };

  return { dragProps, dropProps };
} 