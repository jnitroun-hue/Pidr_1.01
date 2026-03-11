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
  isTutorialGame: boolean, 
  tutorialGameNumber: number | null,
  isUserTurn: boolean,
  currentPlayerId: string | null,
  userPlayerId: string | null,
  players: any[],
  deckLength: number = 0
) {
  // Сохраняем tutorialGameNumber в ref для использования в useEffect
  const tutorialGameNumberRef = useRef<number | null>(tutorialGameNumber);
  useEffect(() => {
    tutorialGameNumberRef.current = tutorialGameNumber;
  }, [tutorialGameNumber]);
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

  // Индекс текущего шага
  const currentStepIndex = currentStep 
    ? tutorialConfig.steps.findIndex(s => s.id === currentStep.id) 
    : 0;

  // Генерируем шаги для обучающих игр (1, 2, 3) — УЛУЧШЕННЫЕ
  const generateTutorialSteps = useCallback((gameNumber: number): TutorialStep[] => {
    if (gameNumber === 1) {
      // Первая игра - полное обучение с визуальными подсказками
      return [
        {
          id: 'welcome',
          title: '🎮 Добро пожаловать!',
          icon: '👋',
          stepType: 'welcome',
          position: 'center',
          arrowDirection: 'none',
          content: 'Это ваша первая игра в П.И.Д.Р.! Мы пошагово покажем как играть, куда нажимать и зачем. Расслабьтесь — боты будут терпеливо ждать ваши ходы. 😊'
        },
        {
          id: 'penki_explanation',
          title: 'Что такое «Пеньки»?',
          icon: '🎯',
          stepType: 'info',
          position: 'center',
          arrowDirection: 'down',
          spotlightText: 'Пеньки лежат рубашкой вверх у каждого игрока',
          content: 'В начале игры каждому раздаётся по 2 закрытые карты — это «пеньки». Они лежат рубашкой вверх рядом с аватаром.\n\n🔒 Пеньки откроются только когда у вас закончатся карты на руке!\n\n💡 Пеньки могут быть как удачными, так и нет — это элемент интриги!'
        },
        {
          id: 'first_turn_start',
          title: 'Кто ходит первым?',
          icon: '🎯',
          stepType: 'info',
          position: 'top',
          arrowDirection: 'down',
          spotlightText: 'Активный игрок подсвечен зелёным',
          content: 'Первый ход у игрока с самой СТАРШЕЙ открытой картой.\n\n📋 Иерархия карт (от старшей к младшей):\n🃏 Туз → Король → Дама → Валет → 10 → 9 → ... → 3 → 2\n\n⚡ Двойка — особая! Она бьёт ТОЛЬКО Туза.\n♠♥♦♣ Масти НЕ важны в 1-й стадии!'
        },
        {
          id: 'your_turn_stage1',
          title: '⬆️ Ваш ход! Что делать?',
          icon: '🎴',
          stepType: 'action',
          position: 'top',
          arrowDirection: 'down',
          spotlightText: 'Нажмите на игрока с младшей картой',
          content: '👆 Посмотрите на открытые карты соперников вокруг стола.\n\n✅ Если у кого-то карта МЛАДШЕ вашей — нажмите на его аватар, чтобы положить свою карту на него!\n\n❌ Если положить некуда — нажмите на КОЛОДУ в центре стола.\n\n🃏 Карта из колоды: если она СТАРШЕ чьей-то открытой — можете СРАЗУ сходить ею на этого игрока! Если нет — она остаётся у вас.\n\n💡 Цель: избавиться от всех карт!'
        },
        {
          id: 'bot_placed_on_you',
          title: '🤖 Бот положил карту на вас!',
          icon: '😮',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'none',
          content: 'Бот положил свою карту поверх вашей — это значит его карта СТАРШЕ!\n\n📌 Пример: у вас была 2, бот положил 3 — потому что 3 > 2.\n\n⚠️ Теперь ваша открытая карта — это карта бота (3). Следующий игрок будет сравнивать с ней!\n\n💡 Не переживайте — когда будет ваш ход, вы сможете сделать то же самое с другими!'
        },
        {
          id: 'no_cards_stage1',
          title: '🃏 Карты на руке кончились!',
          icon: '📦',
          stepType: 'action',
          position: 'center',
          arrowDirection: 'down',
          spotlightText: 'Нажмите на колоду чтобы взять карту',
          content: 'У вас больше нет карт на руке!\n\n👆 Нажмите на КОЛОДУ в центре стола чтобы взять новую карту.\n\n🃏 Если взятая карта СТАРШЕ чьей-то открытой — можете СРАЗУ сходить ею!\n\n💡 Если не можете сходить — карта остаётся у вас как новая открытая.'
        },
        {
          id: 'stage2_transition',
          title: '🔄 Вторая стадия!',
          icon: '🃏',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'none',
          content: '🎉 Колода закончилась! Начинается ВТОРАЯ стадия игры!\n\n🏆 Козырная масть определена последней взятой картой.\n\n⚠️ ВАЖНО: Пики (♠) НИКОГДА не могут быть козырем! Если последняя карта — пика, козырь определяется предпоследней.'
        },
        {
          id: 'stage2_rules',
          title: '📜 Правила 2-й стадии',
          icon: '📋',
          stepType: 'tip',
          position: 'center',
          arrowDirection: 'none',
          content: '🎴 Теперь вы ходите картами С РУКИ на соперников:\n\n✅ Козырь бьёт ЛЮБУЮ некозырную карту\n♠ Пики можно бить ТОЛЬКО пиками!\n🔢 Старшая карта той же масти бьёт младшую\n\n⚠️ ОДНА КАРТА: Когда осталась 1 карта — ОБЯЗАТЕЛЬНО нажмите кнопку «Одна карта!»\n\n💀 Если забудете и вас спросят «Сколько карт?» — получите штраф от КАЖДОГО игрока!'
        },
        {
          id: 'your_turn_stage2',
          title: '⬆️ Ваш ход (2-я стадия)',
          icon: '🎴',
          stepType: 'action',
          position: 'top',
          arrowDirection: 'down',
          spotlightText: 'Выберите карту из руки и нажмите на соперника',
          content: '👆 Выберите карту из руки внизу экрана, затем нажмите на соперника!\n\n💡 Помните:\n🏆 Козырь бьёт все некозырные карты\n♠ Пики бьются ТОЛЬКО пиками\n📢 Не забудьте объявить «Одна карта!» когда останется одна!'
        },
        {
          id: 'penki_opened',
          title: '🎯 Пеньки открылись!',
          icon: '🔓',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'down',
          spotlightText: 'Ваши пеньки теперь открыты',
          content: '🎉 Карты на руке закончились — ваши пеньки открылись!\n\n🎴 Теперь вы играете с этими 2 картами до конца.\n\n💡 Это 3-я (финальная) стадия — те же правила что и во 2-й стадии.\n\n🏆 Кто первым избавится от ВСЕХ карт (включая пеньки) — тот НЕ проиграл! Проигрывает ПОСЛЕДНИЙ оставшийся с картами!'
        }
      ];
    } else if (gameNumber === 2) {
      // Вторая игра - краткое напоминание с подсказками
      return [
        {
          id: 'welcome_game2',
          title: '🎮 Вторая игра!',
          icon: '✌️',
          stepType: 'welcome',
          position: 'center',
          arrowDirection: 'none',
          content: 'Это ваша вторая игра! Краткие напоминания:\n\n📌 1-я стадия: бейте младшие карты соперников\n📌 2-я стадия: козырь бьёт всё, пики — только пиками\n📌 Не забывайте объявлять «Одна карта!»\n\n💪 Удачи!'
        },
        {
          id: 'your_turn_stage1_game2',
          title: '⬆️ Ваш ход!',
          icon: '🎴',
          stepType: 'action',
          position: 'top',
          arrowDirection: 'down',
          spotlightText: 'Нажмите на игрока с младшей картой',
          content: '👆 Найдите соперника с картой младше вашей и нажмите на его аватар!\n\n❌ Если не можете — нажмите на колоду.'
        },
        {
          id: 'stage2_transition_game2',
          title: '🔄 Вторая стадия!',
          icon: '🃏',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'none',
          content: 'Колода кончилась! Напоминание:\n\n🏆 Козырь бьёт всё\n♠ Пики — только пиками\n📢 Одна карта — ОБЯЗАТЕЛЬНО объявляйте!'
        }
      ];
    } else if (gameNumber === 3) {
      // Третья игра - минимальное напоминание
      return [
        {
          id: 'welcome_game3',
          title: '🎯 Последний урок!',
          icon: '🏆',
          stepType: 'welcome',
          position: 'center',
          arrowDirection: 'none',
          content: 'Это ваша последняя обучающая игра!\n\n После неё вы получите доступ к онлайн-мультиплееру! 🎮\n\n💡 Краткие правила: бейте младшие → козырь решает → пики особые → объявляйте «Одна карта!»'
        },
        {
          id: 'one_card_reminder',
          title: '⚠️ Важное напоминание!',
          icon: '☝️',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'none',
          content: '📢 Не забывайте нажимать «ОДНА КАРТА!» когда останется 1 карта!\n\n💀 Штраф: каждый игрок даёт вам по одной своей карте.\n\n🎮 После этой игры откроется мультиплеер!'
        }
      ];
    }
    return [];
  }, []);

  // Инициализация туториала для обучающих игр (1, 2, 3)
  useEffect(() => {
    console.log('🎓 [useTutorial] Проверка инициализации:', { 
      isTutorialGame, 
      tutorialGameNumber, 
      enabled: tutorialConfig.enabled,
      stepsCount: tutorialConfig.steps.length
    });
    
    // ✅ ИСПРАВЛЕНО: Инициализируем туториал если это обучающая игра
    if (isTutorialGame && tutorialGameNumber) {
      // Если туториал еще не инициализирован или шаги пустые
      if (!tutorialConfig.enabled || tutorialConfig.steps.length === 0) {
        console.log(`✅ [useTutorial] Инициализируем обучение для игры #${tutorialGameNumber}`);
        const steps = generateTutorialSteps(tutorialGameNumber);
        console.log(`📚 [useTutorial] Сгенерировано шагов: ${steps.length}`, steps.map(s => s.id));
        
        if (steps.length === 0) {
          console.warn('⚠️ [useTutorial] Нет шагов для туториала!');
          return;
        }
        
        setTutorialConfig({
          enabled: true,
          shownSteps: new Set(),
          steps
        });
        
        // ✅ Показываем приветствие СРАЗУ с небольшой задержкой для анимации
        const firstStep = steps[0];
        if (firstStep) {
          console.log(`🎯 [useTutorial] Показываем первый шаг: ${firstStep.id} - "${firstStep.title}"`);
          // Небольшая задержка для плавной анимации
          setTimeout(() => {
            setCurrentStep(firstStep);
            setIsTutorialPaused(true);
            console.log('✅ [useTutorial] Модалка туториала открыта!');
          }, 800); // Чуть больше задержки для красивого эффекта
        } else {
          console.error('❌ [useTutorial] Первый шаг не найден! Шаги:', steps);
        }
      } else {
        console.log('ℹ️ [useTutorial] Туториал уже инициализирован');
      }
    } else if (!isTutorialGame && tutorialConfig.enabled) {
      console.log('❌ [useTutorial] Отключаем обучение - это не обучающая игра');
      // Отключаем туториал если это не обучающая игра
      setTutorialConfig({
        enabled: false,
        shownSteps: new Set(),
        steps: []
      });
      setCurrentStep(null);
      setIsTutorialPaused(false);
    } else if (!isTutorialGame) {
      console.log('ℹ️ [useTutorial] Это не обучающая игра, туториал не нужен');
    }
  }, [isTutorialGame, tutorialGameNumber, tutorialConfig.enabled, tutorialConfig.steps.length, generateTutorialSteps]);

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

  // ✅ 0. Модалка когда бот положил карту на игрока (объяснение ПОЧЕМУ)
  const userCardCountRef = useRef<number>(0);
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused || !userPlayerId) return;
    if (tutorialConfig.shownSteps.has('bot_placed_on_you')) return;
    
    const userPlayer = players.find(p => p.id === userPlayerId);
    if (!userPlayer) return;
    
    const currentCardCount = userPlayer.cards?.length || 0;
    const prevCount = userCardCountRef.current;
    
    // Если количество карт у юзера УВЕЛИЧИЛОСЬ на 1 (бот положил на него) и это не ход юзера
    if (gameStage === 1 && prevCount > 0 && currentCardCount > prevCount && !isUserTurn) {
      userCardCountRef.current = currentCardCount;
      
      const step = tutorialConfig.steps.find(s => s.id === 'bot_placed_on_you');
      if (step) {
        // Небольшая задержка чтобы игрок увидел анимацию карты
        setTimeout(() => {
          setCurrentStep(step);
          setIsTutorialPaused(true);
        }, 600);
      }
    } else {
      userCardCountRef.current = currentCardCount;
    }
  }, [players, userPlayerId, gameStage, isUserTurn, tutorialConfig, isTutorialPaused]);

  // ✅ 1. Модалка при начале хода - кто ходит и цель 1-й стадии
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused) return;
    
    // Проверяем, изменился ли текущий игрок (начался новый ход)
    const isNewTurn = currentPlayerId !== lastCurrentPlayerRef.current && currentPlayerId !== null;
    const isFirstTurn = !lastCurrentPlayerRef.current && currentPlayerId !== null;
    
    // Проверяем шаги для разных игр
    const stepId = tutorialGameNumber === 1 ? 'first_turn_start' : 
                   tutorialGameNumber === 2 ? 'your_turn_stage1_game2' : null;
    
    if ((isNewTurn || isFirstTurn) && gameStage === 1 && stepId && !tutorialConfig.shownSteps.has(stepId)) {
      lastCurrentPlayerRef.current = currentPlayerId;
      
      const step = tutorialConfig.steps.find(s => s.id === stepId);
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
    isTutorialActive: tutorialConfig.enabled,
    totalSteps: tutorialConfig.steps.length,
    currentStepIndex,
  };
}
