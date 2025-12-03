'use client'
import { useState, useEffect, useCallback, useRef } from 'react';
import { TutorialStep } from '@/components/TutorialModal';

export interface TutorialConfig {
  enabled: boolean; // Включены ли подсказки
  currentStepIndex: number; // Текущий шаг
  steps: TutorialStep[]; // Все шаги
}

export function useTutorial(gameStage: number, isFirstGame: boolean, isUserTurn: boolean) {
  const [tutorialConfig, setTutorialConfig] = useState<TutorialConfig>({
    enabled: false,
    currentStepIndex: 0,
    steps: []
  });
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [isTutorialPaused, setIsTutorialPaused] = useState(false);

  // Генерируем шаги для первой игры
  const generateFirstGameSteps = useCallback((): TutorialStep[] => {
    return [
      {
        id: 'welcome',
        title: 'Добро пожаловать в игру!',
        icon: '👋',
        content: 'Это ваша первая игра с ботами. Мы покажем вам все основные правила и механики игры. Нажимайте "Понятно" чтобы продолжить.'
      },
      {
        id: 'first_turn',
        title: 'Кто ходит первым?',
        icon: '🎯',
        content: 'Первым ходит игрок с самой младшей картой. Это вы! Вы можете положить свою карту на соперника с картой младше вашей.'
      },
      {
        id: 'stage1_rules',
        title: 'Правила первой стадии',
        icon: '🎴',
        content: 'В первой стадии у каждого игрока одна открытая карта. Старшая карта бьет младшую (Туз → Король → Дама → Валет → 10 → ... → 2). Двойка бьет только Туз. Масти не важны!'
      },
      {
        id: 'deck_usage',
        title: 'Использование колоды',
        icon: '🃏',
        content: 'Если не можете сходить на соперника, вы можете взять карту из колоды. Если эта карта старше вашей открытой карты, вы можете положить её на себя.'
      },
      {
        id: 'stage2_transition',
        title: 'Переход во вторую стадию',
        icon: '🔄',
        content: 'Когда колода заканчивается, начинается вторая стадия. Козырь определяется последней взятой картой (кроме пик). Пики НЕ могут быть козырем!'
      },
      {
        id: 'stage2_rules',
        title: 'Правила второй стадии',
        icon: '🃏',
        content: 'Во второй стадии вы можете ходить любой картой с руки. Козырь бьет любую некозырную карту. ⚠️ ВАЖНО: Пики можно бить ТОЛЬКО пиками! Пики не могут быть козырем.\n\n💡 ВАЖНОЕ ПРАВИЛО: Когда у вас остается одна карта, вы ОБЯЗАНЫ объявить "Одна карта!". Если забудете и вас спросят "Сколько карт?" - получите штрафные карты от всех игроков!'
      },
      {
        id: 'penki_intro',
        title: 'Что такое пеньки?',
        icon: '🎯',
        content: 'Пеньки - это 2 закрытые карты, которые вы получили в начале игры. Они используются в третьей стадии, когда у вас заканчиваются карты в руке.'
      },
      {
        id: 'stage3_transition',
        title: 'Третья стадия - пеньки',
        icon: '🎯',
        content: 'Когда у игрока заканчиваются карты в руке, открываются его пеньки. Игрок продолжает играть с пеньками до их окончания.'
      },
      {
        id: 'one_card_rule',
        title: 'Правило "Одна карта!" и "Сколько карт?"',
        icon: '⚠️',
        content: 'Когда у вас остается одна карта, вы ОБЯЗАНЫ объявить "Одна карта!".\n\nЛюбой игрок может спросить другого "Сколько карт?" в любой момент.\n\nЕсли у вас одна карта и вы НЕ объявили "Одна карта!", а вас спросили "Сколько карт?" - вы получаете штраф: все игроки сдают вам по одной карте!\n\nИгра останавливается, пока все игроки не сдадут штрафные карты.'
      }
    ];
  }, []);

  // Инициализация туториала для первой игры
  useEffect(() => {
    if (isFirstGame && !tutorialConfig.enabled) {
      const steps = generateFirstGameSteps();
      setTutorialConfig({
        enabled: true,
        currentStepIndex: 0,
        steps
      });
      setCurrentStep(steps[0]);
      setIsTutorialPaused(true);
    }
  }, [isFirstGame, tutorialConfig.enabled, generateFirstGameSteps]);

  // Переход к следующему шагу
  const nextStep = useCallback(() => {
    if (tutorialConfig.enabled && tutorialConfig.currentStepIndex < tutorialConfig.steps.length - 1) {
      const nextIndex = tutorialConfig.currentStepIndex + 1;
      setTutorialConfig(prev => ({ ...prev, currentStepIndex: nextIndex }));
      setCurrentStep(tutorialConfig.steps[nextIndex]);
    } else {
      // Завершение туториала
      setTutorialConfig(prev => ({ ...prev, enabled: false }));
      setCurrentStep(null);
      setIsTutorialPaused(false);
    }
  }, [tutorialConfig]);

  // Закрытие туториала
  const closeTutorial = useCallback(() => {
    setTutorialConfig(prev => ({ ...prev, enabled: false }));
    setCurrentStep(null);
    setIsTutorialPaused(false);
  }, []);

  // Показываем подсказки в нужные моменты
  const stageTransitionRef = useRef<number>(1);
  
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused) return;

    const steps = tutorialConfig.steps;
    const currentIndex = tutorialConfig.currentStepIndex;

    // Подсказка при переходе во вторую стадию
    if (gameStage === 2 && stageTransitionRef.current === 1) {
      stageTransitionRef.current = 2;
      // Пропускаем к шагу про вторую стадию
      const stage2Index = steps.findIndex(s => s.id === 'stage2_transition');
      if (stage2Index !== -1) {
        setTutorialConfig(prev => ({ ...prev, currentStepIndex: stage2Index }));
        setCurrentStep(steps[stage2Index]);
        setIsTutorialPaused(true);
      }
    }
    
    // Подсказка при переходе в третью стадию
    if (gameStage === 3 && stageTransitionRef.current === 2) {
      stageTransitionRef.current = 3;
      const stage3Index = steps.findIndex(s => s.id === 'stage3_transition');
      if (stage3Index !== -1) {
        setTutorialConfig(prev => ({ ...prev, currentStepIndex: stage3Index }));
        setCurrentStep(steps[stage3Index]);
        setIsTutorialPaused(true);
      }
    }
  }, [gameStage, tutorialConfig, isTutorialPaused]);

  return {
    currentStep,
    isTutorialPaused,
    nextStep,
    closeTutorial,
    isTutorialActive: tutorialConfig.enabled
  };
}

