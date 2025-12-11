'use client'
import { useState, useEffect, useCallback, useRef } from 'react';
import { TutorialStep } from '@/components/TutorialModal';

export interface TutorialConfig {
  enabled: boolean; // Включены ли подсказки
  shownSteps: Set<string>; // Какие шаги уже показаны
  steps: TutorialStep[]; // Все шаги
}

export function useTutorial(
  gameStage: number, 
  isFirstGame: boolean, 
  isUserTurn: boolean,
  currentPlayerId: string | null,
  userPlayerId: string | null,
  players: any[],
  deckLength: number = 0
) {
  const [tutorialConfig, setTutorialConfig] = useState<TutorialConfig>({
    enabled: false,
    shownSteps: new Set(),
    steps: []
  });
  const [currentStep, setCurrentStep] = useState<TutorialStep | null>(null);
  const [isTutorialPaused, setIsTutorialPaused] = useState(false);

  // Refs для отслеживания состояний
  const lastGameStageRef = useRef<number>(1);
  const lastUserTurnRef = useRef<boolean>(false);
  const lastCurrentPlayerRef = useRef<string | null>(null);
  const penkiOpenedRef = useRef<boolean>(false);

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
        id: 'penki_explanation',
        title: 'Что такое пеньки?',
        icon: '🎯',
        content: 'В начале игры каждому игроку раздается по 2 закрытые карты - это "пеньки". Они лежат закрытыми до тех пор, пока у вас не закончатся карты в руке. Тогда пеньки открываются, и вы продолжаете играть с ними.'
      },
      {
        id: 'first_turn_start',
        title: 'Начало игры - кто ходит первым?',
        icon: '🎯',
        content: 'Первым ходит игрок с самой младшей открытой картой. Цель первой стадии: положить свою карту на соперника, у которого карта младше вашей. Старшая карта бьет младшую (Туз → Король → Дама → Валет → 10 → ... → 2). Двойка бьет только Туз. Масти не важны!'
      },
      {
        id: 'your_turn_stage1',
        title: 'Ваш ход - что делать?',
        icon: '🎴',
        content: 'Сейчас ваш ход! Посмотрите на открытые карты соперников. Если у кого-то карта младше вашей - нажмите на этого игрока, чтобы положить на него свою карту. Если не можете сходить на соперника, нажмите на колоду, чтобы взять новую карту.'
      },
      {
        id: 'no_cards_stage1',
        title: 'У вас не осталось карт!',
        icon: '🃏',
        content: 'У вас закончились карты в руке! В первой стадии вы должны взять карту из колоды. Нажмите на колоду, чтобы взять новую карту. Если эта карта старше вашей открытой карты, вы можете положить её на себя. Если не можете сходить - передайте ход следующему игроку.'
      },
      {
        id: 'stage2_transition',
        title: 'Переход во вторую стадию',
        icon: '🔄',
        content: 'Колода закончилась! Начинается вторая стадия. Козырь определяется последней взятой картой (кроме пик). ⚠️ Пики НЕ могут быть козырем!'
      },
      {
        id: 'stage2_rules',
        title: 'Правила второй стадии',
        icon: '🃏',
        content: 'Во второй стадии вы можете ходить любой картой с руки. Козырь бьет любую некозырную карту.\n\n⚠️ ВАЖНО: Пики можно бить ТОЛЬКО пиками! Пики не могут быть козырем.\n\n💡 Когда у вас остается одна карта, вы ОБЯЗАНЫ объявить "Одна карта!". Если забудете и вас спросят "Сколько карт?" - получите штрафные карты от всех игроков!'
      },
      {
        id: 'your_turn_stage2',
        title: 'Ваш ход во второй стадии',
        icon: '🎴',
        content: 'Сейчас ваш ход! Выберите карту из руки и положите её на соперника. Помните: козырь бьет любую некозырную карту, а пики можно бить только пиками!'
      },
      {
        id: 'penki_opened',
        title: 'Пеньки открыты!',
        icon: '🎯',
        content: 'У вас закончились карты в руке во второй стадии, поэтому открылись ваши пеньки (2 закрытые карты, которые вы получили в начале игры). Теперь вы играете с этими картами до их окончания. Это третья стадия игры.'
      }
    ];
  }, []);

  // Инициализация туториала для первой игры
  useEffect(() => {
    if (isFirstGame && !tutorialConfig.enabled) {
      const steps = generateFirstGameSteps();
      setTutorialConfig({
        enabled: true,
        shownSteps: new Set(),
        steps
      });
      // Показываем приветствие
      setCurrentStep(steps[0]);
      setIsTutorialPaused(true);
    }
  }, [isFirstGame, tutorialConfig.enabled, generateFirstGameSteps]);

  // Переход к следующему шагу
  const nextStep = useCallback(() => {
    if (tutorialConfig.enabled && currentStep) {
      // Помечаем текущий шаг как показанный
      const newShownSteps = new Set(tutorialConfig.shownSteps);
      newShownSteps.add(currentStep.id);
      
      setTutorialConfig(prev => ({ 
        ...prev, 
        shownSteps: newShownSteps 
      }));
      
      setCurrentStep(null);
      setIsTutorialPaused(false);
    }
  }, [tutorialConfig, currentStep]);

  // Закрытие туториала
  const closeTutorial = useCallback(() => {
    if (currentStep) {
      const newShownSteps = new Set(tutorialConfig.shownSteps);
      newShownSteps.add(currentStep.id);
      
      setTutorialConfig(prev => ({ 
        ...prev, 
        shownSteps: newShownSteps 
      }));
    }
    setCurrentStep(null);
    setIsTutorialPaused(false);
  }, [tutorialConfig, currentStep]);

  // ✅ 1. Модалка при начале хода - кто ходит и цель 1-й стадии
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused) return;
    
    // Проверяем, изменился ли текущий игрок (начался новый ход)
    const isNewTurn = currentPlayerId !== lastCurrentPlayerRef.current && currentPlayerId !== null;
    const isFirstTurn = !lastCurrentPlayerRef.current && currentPlayerId !== null;
    
    if ((isNewTurn || isFirstTurn) && gameStage === 1 && !tutorialConfig.shownSteps.has('first_turn_start')) {
      lastCurrentPlayerRef.current = currentPlayerId;
      
      const step = tutorialConfig.steps.find(s => s.id === 'first_turn_start');
      if (step) {
        setCurrentStep(step);
        setIsTutorialPaused(true);
      }
    }
  }, [currentPlayerId, gameStage, tutorialConfig, isTutorialPaused]);

  // ✅ 2. Модалка когда до игрока дошел ход (если он не ходил первым)
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused) return;
    
    // Проверяем, стал ли ход пользователя (и он не первый)
    const becameUserTurn = isUserTurn && !lastUserTurnRef.current;
    const alreadyShownFirstTurn = tutorialConfig.shownSteps.has('first_turn_start');
    
    if (becameUserTurn && gameStage === 1 && alreadyShownFirstTurn && !tutorialConfig.shownSteps.has('your_turn_stage1')) {
      lastUserTurnRef.current = true;
      
      const step = tutorialConfig.steps.find(s => s.id === 'your_turn_stage1');
      if (step) {
        setCurrentStep(step);
        setIsTutorialPaused(true);
      }
    }
    
    if (!isUserTurn) {
      lastUserTurnRef.current = false;
    }
  }, [isUserTurn, gameStage, tutorialConfig, isTutorialPaused]);

  // ✅ 3. Модалка при переходе во 2-ю стадию
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused) return;
    
    const stageChanged = gameStage === 2 && lastGameStageRef.current === 1;
    
    if (stageChanged && !tutorialConfig.shownSteps.has('stage2_transition')) {
      lastGameStageRef.current = 2;
      
      const step = tutorialConfig.steps.find(s => s.id === 'stage2_transition');
      if (step) {
        setCurrentStep(step);
        setIsTutorialPaused(true);
        return;
      }
    }
    
    // После перехода показываем правила 2-й стадии (только если нет текущей модалки)
    if (gameStage === 2 && tutorialConfig.shownSteps.has('stage2_transition') && !tutorialConfig.shownSteps.has('stage2_rules')) {
      const step = tutorialConfig.steps.find(s => s.id === 'stage2_rules');
      if (step) {
        setCurrentStep(step);
        setIsTutorialPaused(true);
        return;
      }
    }
    
    // Показываем подсказку для хода пользователя во 2-й стадии
    if (gameStage === 2 && isUserTurn && !lastUserTurnRef.current && tutorialConfig.shownSteps.has('stage2_rules') && !tutorialConfig.shownSteps.has('your_turn_stage2')) {
      lastUserTurnRef.current = true;
      
      const step = tutorialConfig.steps.find(s => s.id === 'your_turn_stage2');
      if (step) {
        setCurrentStep(step);
        setIsTutorialPaused(true);
      }
    }
  }, [gameStage, isUserTurn, tutorialConfig, isTutorialPaused]);

  // ✅ 4. Модалка когда в 1-й стадии закончились карты (только если колода еще есть!)
  const noCardsStage1Ref = useRef<boolean>(false);
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused || !userPlayerId) return;
    
    const userPlayer = players.find(p => p.id === userPlayerId);
    if (!userPlayer) return;
    
    // В первой стадии: если закончились карты, но есть колода - нужно брать из колоды
    // ✅ КРИТИЧНО: Показываем только если колода еще есть (deckLength > 0)!
    const noCardsInStage1 = gameStage === 1 && userPlayer.cards.length === 0 && userPlayer.penki.length > 0 && deckLength > 0;
    
    if (noCardsInStage1 && !noCardsStage1Ref.current && !tutorialConfig.shownSteps.has('no_cards_stage1')) {
      noCardsStage1Ref.current = true;
      
      const step = tutorialConfig.steps.find(s => s.id === 'no_cards_stage1');
      if (step) {
        setCurrentStep(step);
        setIsTutorialPaused(true);
      }
    }
    
    // Сбрасываем флаг если карты появились или колода закончилась
    if (userPlayer.cards.length > 0 || deckLength === 0) {
      noCardsStage1Ref.current = false;
    }
  }, [players, userPlayerId, gameStage, deckLength, tutorialConfig, isTutorialPaused]);

  // ✅ 5. Модалка при открытии пеньков (ТОЛЬКО во 2-й стадии и позже!)
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused || !userPlayerId) return;
    
    const userPlayer = players.find(p => p.id === userPlayerId);
    if (!userPlayer) return;
    
    // ✅ КРИТИЧНО: Пеньки открываются ТОЛЬКО во 2-й стадии и позже!
    // Проверяем, открылись ли пеньки (у игрока закончились карты в руке, но есть пеньки)
    // И это должно быть во 2-й стадии или позже
    const penkiOpened = gameStage >= 2 && userPlayer.cards.length === 0 && userPlayer.penki.length > 0;
    
    if (penkiOpened && !penkiOpenedRef.current && !tutorialConfig.shownSteps.has('penki_opened')) {
      penkiOpenedRef.current = true;
      
      const step = tutorialConfig.steps.find(s => s.id === 'penki_opened');
      if (step) {
        setCurrentStep(step);
        setIsTutorialPaused(true);
      }
    }
  }, [players, userPlayerId, gameStage, tutorialConfig, isTutorialPaused]);

  // Обновляем refs
  useEffect(() => {
    lastGameStageRef.current = gameStage;
  }, [gameStage]);

  return {
    currentStep,
    isTutorialPaused,
    nextStep,
    closeTutorial,
    isTutorialActive: tutorialConfig.enabled
  };
}
