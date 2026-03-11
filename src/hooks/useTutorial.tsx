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
  deckLength: number = 0,
  playersWithOneCard: string[] = [],
  pendingPenalty: any = null,
  penaltyDeck: any[] = [],
  oneCardDeclarations: Record<string, boolean> = {}
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
          content: 'В начале игры каждому раздаётся по 2 закрытые карты — это «пеньки». Они лежат рубашкой вверх рядом с аватаром.\n\n🔒 Пеньки откроются только когда закончится колода И у вас не останется карт на руке — это 3-я стадия!\n\n⚠️ Пока колода не кончилась — пеньки НЕ открываются, даже если рука пуста!\n\n💡 Пеньки могут быть как удачными, так и нет — это элемент интриги!'
        },
        {
          id: 'first_turn_start',
          title: 'Кто ходит первым?',
          icon: '🎯',
          stepType: 'info',
          position: 'top',
          arrowDirection: 'down',
          spotlightText: 'Активный игрок подсвечен зелёным',
          content: 'Первый ход у игрока с самой СТАРШЕЙ открытой картой.\n\n📋 Иерархия карт (от старшей к младшей):\n🃏 Туз → Король → Дама → Валет → 10 → 9 → ... → 3 → 2\n\n⚡ Двойка — особая! Она бьёт ТОЛЬКО Туза.\n♠♥♦♣ Масти НЕ важны в 1-й стадии!\n\n📌 ВАЖНО: Бить можно только карту РОВНО на 1 значение младше!\nПример: 7 бьёт 6, но НЕ бьёт 5 или 4!'
        },
        {
          id: 'your_turn_stage1',
          title: '⬆️ Ваш ход! Что делать?',
          icon: '🎴',
          stepType: 'action',
          position: 'top',
          arrowDirection: 'down',
          spotlightText: 'Нажмите на игрока с младшей картой',
          content: '👆 Посмотрите на открытые карты соперников вокруг стола.\n\n✅ Если у кого-то открытая карта РОВНО НА 1 ЗНАЧЕНИЕ МЛАДШЕ вашей — нажмите на его аватар, чтобы положить свою карту!\n\n📌 Пример: у вас 7 → можете положить на 6, но НЕ на 5!\n⚡ Двойка (2) бьёт ТОЛЬКО Туза!\n♠♥♦♣ Масти НЕ важны в 1-й стадии!\n\n❌ Если положить некуда — нажмите на КОЛОДУ в центре стола.\n\n🃏 Карта из колоды: если она СТАРШЕ НА 1 чьей-то открытой — можете СРАЗУ сходить ею!\n\n💡 Цель: избавиться от всех карт!'
        },
        {
          id: 'drew_card_from_deck',
          title: '🃏 Вы взяли карту из колоды!',
          icon: '📥',
          stepType: 'info',
          position: 'center',
          arrowDirection: 'none',
          content: 'Вы нажали на колоду и взяли новую карту!\n\n🔍 Игра автоматически проверила: можно ли этой картой побить кого-то?\n\n✅ Если карта СТАРШЕ НА 1 чьей-то открытой — вы СРАЗУ ходите ею и ход продолжается!\n\n❌ Если картой нельзя никого побить — она остаётся у вас как новая открытая карта. Ход переходит к следующему игроку.\n\n💡 Например: вы взяли Даму (Q). Ни у кого нет Валета (J)? Дама остаётся у вас.'
        },
        {
          id: 'bot_placed_on_you',
          title: '🤖 Бот положил карту на вас!',
          icon: '😮',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'none',
          content: 'Бот положил свою карту поверх вашей — его карта СТАРШЕ НА 1 ЗНАЧЕНИЕ!\n\n📌 Пример: у вас была 6, бот положил 7 — потому что 7 ровно на 1 больше 6.\n\n⚠️ Теперь ваша открытая карта — это карта бота (7). Следующий игрок будет сравнивать с ней!\n\n💡 Не переживайте — когда будет ваш ход, вы сможете сделать то же самое с другими!'
        },
        {
          id: 'no_cards_stage1',
          title: '🃏 Карты на руке кончились!',
          icon: '📦',
          stepType: 'action',
          position: 'center',
          arrowDirection: 'down',
          spotlightText: 'Нажмите на колоду чтобы взять карту',
          content: 'У вас больше нет карт на руке!\n\n👆 Нажмите на КОЛОДУ в центре стола чтобы взять новую карту.\n\n🃏 Если взятая карта СТАРШЕ НА 1 чьей-то открытой — можете СРАЗУ сходить ею!\n\n⚠️ Пеньки пока НЕ открываются — только когда закончится колода!\n\n💡 Если не можете сходить — карта остаётся у вас как новая открытая.'
        },
        {
          id: 'circle_closed',
          title: '🔄 Круг закрылся!',
          icon: '🔁',
          stepType: 'info',
          position: 'center',
          arrowDirection: 'none',
          content: 'Все игроки сходили по кругу — это называется «круг закрылся»!\n\n📌 Что произошло:\n• Каждый игрок по очереди либо положил карту, либо взял из колоды\n• Теперь ход снова переходит к первому игроку в очереди\n\n🔄 Круги повторяются пока не закончится колода (после чего начнётся 2-я стадия).\n\n💡 С каждым кругом ситуация меняется — следите за открытыми картами соперников!'
        },
        {
          id: 'one_card_penalty_explain',
          title: '⚠️ Правило «Одна карта»!',
          icon: '☝️',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'none',
          content: 'Во 2-й стадии, когда у игрока остаётся ОДНА карта — он ОБЯЗАН нажать кнопку «Одна карта!»\n\n💀 Если забыл объявить — любой другой игрок может спросить «Сколько карт?» и наказать!\n\n📌 Штраф: каждый игрок отдаёт виновнику по ОДНОЙ своей карте.\n\n🔍 Кнопка «Сколько карт?» загорается когда у кого-то подозрительно мало карт. Нажмите её чтобы проверить!\n\n💡 Совет: следите за количеством карт у соперников!'
        },
        {
          id: 'ask_cards_button_explain',
          title: '🔍 Кнопка «Сколько карт?»',
          icon: '❓',
          stepType: 'tip',
          position: 'center',
          arrowDirection: 'none',
          content: 'Загорелась кнопка «Сколько карт?» — это значит у кого-то из соперников осталась 1 карта!\n\n📌 Что делать:\n1️⃣ Если соперник НЕ объявил «Одна карта!» — нажмите «Сколько карт?»\n2️⃣ Он получит ШТРАФ — по карте от каждого игрока!\n\n⚠️ Если соперник УЖЕ объявил — кнопка ничего не даст.\n\n💡 Это мощное правило! Следите внимательно — можете серьёзно наказать зазевавшегося противника!'
        },
        {
          id: 'stage2_transition',
          title: '🔄 Вторая стадия!',
          icon: '🃏',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'none',
          content: '🎉 Колода закончилась! Начинается ВТОРАЯ стадия — правила «Дурака»!\n\n🏆 Козырная масть определена последней взятой картой из колоды.\n\n⚠️ ВАЖНО: Пики (♠) НИКОГДА не могут быть козырем! Если последняя карта — пика, козырь определяется предпоследней.\n\n🔄 Теперь вы ходите картами С РУКИ, а не открытыми!'
        },
        {
          id: 'stage2_rules',
          title: '📜 Правила 2-й стадии',
          icon: '📋',
          stepType: 'tip',
          position: 'center',
          arrowDirection: 'none',
          content: '🎴 Теперь карты кладутся НА СТОЛ в центр! Каждый игрок по очереди кладёт карту:\n\n📌 Как бить:\n✅ Карту той же масти, но СТАРШЕ по номиналу (♥5 бьёт ♥3)\n🏆 Козырной мастью бьёте ЛЮБУЮ некозырную карту\n♠ ПИКИ — особые! Пики бьются ТОЛЬКО пиками! Даже козырь не возьмёт пику!\n\n❌ Если нечем бить — нажмите «Взять» → вы берёте НИЖНЮЮ карту из боя на столе!\n\n⚠️ ОДНА КАРТА: Когда осталась 1 карта — ОБЯЗАТЕЛЬНО нажмите кнопку «Одна карта!»\n💀 Забудете — получите штрафные карты от КАЖДОГО игрока!'
        },
        {
          id: 'stage2_how_to_play',
          title: '🎯 Как ходить (2-я стадия)',
          icon: '👆',
          stepType: 'action',
          position: 'center',
          arrowDirection: 'none',
          content: '📋 Пошаговая инструкция:\n\n1️⃣ Выберите карту из РУКИ (внизу экрана)\n2️⃣ Нажмите на соперника, чтобы положить карту на стол\n\n📌 Какой картой можно бить:\n• ♥ Та же масть + старше → бьёт (♥8 бьёт ♥5)\n• 🏆 Козырь → бьёт любую некозырную\n• ♠ Пика → бьёт ТОЛЬКО пику! Козырь не берёт!\n\n❌ Нечем бить? Нажмите «Взять» — вы забираете НИЖНЮЮ карту из боя на столе!\n\n💡 Стратегия: берегите козыри на конец игры!'
        },
        {
          id: 'stage2_take_card',
          title: '📥 Когда нечем бить — берёте!',
          icon: '⬇️',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'none',
          content: 'Если у вас НЕТ карты чтобы побить ту, что лежит на столе:\n\n1️⃣ Нажмите кнопку «Взять» (красная)\n2️⃣ Вы забираете НИЖНЮЮ карту из боя на столе — самую слабую!\n\n📌 Пример: на столе лежат ♥3, ♥7, ♥K\nУ вас нет червей и нет козырей → берёте ♥3 (нижнюю)\n\n⚠️ ВАЖНО: Вы берёте именно НИЖНЮЮ, не верхнюю!\n\n♠ Если на столе пика — бить можно ТОЛЬКО пикой, козырь не поможет!'
        },
        {
          id: 'your_turn_stage2',
          title: '⬆️ Ваш ход (2-я стадия)',
          icon: '🎴',
          stepType: 'action',
          position: 'center',
          arrowDirection: 'none',
          content: '👆 Выберите карту из руки внизу экрана, затем нажмите на соперника!\n\n💡 Помните:\n🏆 Козырь бьёт все некозырные карты\n♠ Пики бьются ТОЛЬКО пиками — ни один козырь не возьмёт пику!\n📢 Не забудьте объявить «Одна карта!» когда останется одна!\n\n⚡ Если не можете побить — «Взять» забирает НИЖНЮЮ карту из боя!'
        },
        {
          id: 'penki_opened',
          title: '🎯 Пеньки открылись!',
          icon: '🔓',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'down',
          spotlightText: 'Ваши пеньки теперь открыты',
          content: '🎉 Карты на руке закончились — ваши пеньки открылись!\n\n🎴 Теперь вы играете с этими 2 картами до конца. Это 3-я (финальная) стадия!\n\n📌 Правила те же что и во 2-й стадии:\n✅ Та же масть и старше → бьёт\n🏆 Козырь → бьёт некозырь\n♠ Пики → только пиками!\n\n🏆 Кто первым избавится от ВСЕХ карт (включая пеньки) — тот НЕ проиграл!\n💀 Проигрывает ПОСЛЕДНИЙ оставшийся с картами — он П.И.Д.Р.!'
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
          content: 'Это ваша вторая игра! Краткие напоминания:\n\n📌 1-я стадия: кладите карту на соперника, если ваша СТАРШЕ НА 1 значение (7→6, Дама→Валет)\n📌 2-я стадия: козырь бьёт некозырь, пики — ТОЛЬКО пиками!\n📌 Не забывайте «Одна карта!»\n\n💪 Удачи!'
        },
        {
          id: 'your_turn_stage1_game2',
          title: '⬆️ Ваш ход!',
          icon: '🎴',
          stepType: 'action',
          position: 'top',
          arrowDirection: 'down',
          spotlightText: 'Нажмите на игрока с младшей картой',
          content: '👆 Найдите соперника с картой ровно на 1 МЛАДШЕ вашей и нажмите на его аватар!\n\n📌 Ваша 7 → бьёт 6 (но НЕ 5!)\n⚡ Двойка бьёт только Туза!\n\n❌ Если не можете — нажмите на колоду.'
        },
        {
          id: 'stage2_transition_game2',
          title: '🔄 Вторая стадия!',
          icon: '🃏',
          stepType: 'warning',
          position: 'center',
          arrowDirection: 'none',
          content: 'Колода кончилась! Напоминание:\n\n🏆 Козырь бьёт некозырную карту\n♠ Пики — ТОЛЬКО пиками (даже козырь не берёт!)\n🎴 Ходите картами с руки → нажмите карту → нажмите на соперника\n📢 Одна карта — ОБЯЗАТЕЛЬНО объявляйте!'
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
          content: 'Это ваша последняя обучающая игра!\n\nПосле неё вы получите доступ к онлайн-мультиплееру! 🎮\n\n💡 Краткие правила:\n1️⃣ Стадия 1: бейте карту на 1 значение младше\n2️⃣ Стадия 2: козырь решает, пики только пиками!\n3️⃣ Стадия 3: играете пеньками по правилам 2-й стадии\n📢 Объявляйте «Одна карта!»'
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

  // ✅ 2.5 Модалка когда первый раз закрывается круг (все сходили)
  const turnCountRef = useRef<number>(0);
  const circleShownRef = useRef<boolean>(false);
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused) return;
    if (tutorialConfig.shownSteps.has('circle_closed') || circleShownRef.current) return;
    if (gameStage !== 1) return;
    
    // Считаем смены хода — когда currentPlayerId меняется
    if (currentPlayerId && currentPlayerId !== lastCurrentPlayerRef.current) {
      turnCountRef.current += 1;
    }
    
    // Если количество смен хода >= количество игроков, значит круг закрылся
    if (turnCountRef.current >= players.length && players.length >= 3) {
      circleShownRef.current = true;
      const step = tutorialConfig.steps.find(s => s.id === 'circle_closed');
      if (step) {
        setTimeout(() => {
          setCurrentStep(step);
          setIsTutorialPaused(true);
        }, 600);
      }
    }
  }, [currentPlayerId, gameStage, players.length, tutorialConfig, isTutorialPaused]);

  // ✅ 2.6 Модалка про правило «Одна карта» — когда бот ловит кого-то
  const penaltyShownRef = useRef<boolean>(false);
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused) return;
    if (tutorialConfig.shownSteps.has('one_card_penalty_explain') || penaltyShownRef.current) return;
    if (gameStage < 2) return;
    
    // Если появился штраф (penaltyDeck не пуст)
    if (penaltyDeck && penaltyDeck.length > 0) {
      penaltyShownRef.current = true;
      const step = tutorialConfig.steps.find(s => s.id === 'one_card_penalty_explain');
      if (step) {
        setTimeout(() => {
          setCurrentStep(step);
          setIsTutorialPaused(true);
        }, 800);
      }
    }
  }, [penaltyDeck, gameStage, tutorialConfig, isTutorialPaused]);

  // ✅ 2.7 Модалка про кнопку «Сколько карт?» — когда у бота 1 карта
  const askCardsShownRef = useRef<boolean>(false);
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused) return;
    if (tutorialConfig.shownSteps.has('ask_cards_button_explain') || askCardsShownRef.current) return;
    if (gameStage < 2) return;
    
    // Если есть игроки с 1 картой
    if (playersWithOneCard && playersWithOneCard.length > 0) {
      askCardsShownRef.current = true;
      const step = tutorialConfig.steps.find(s => s.id === 'ask_cards_button_explain');
      if (step) {
        setTimeout(() => {
          setCurrentStep(step);
          setIsTutorialPaused(true);
        }, 1200);
      }
    }
  }, [playersWithOneCard, gameStage, tutorialConfig, isTutorialPaused]);

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

    // Показываем пошаговую инструкцию после правил
    if (gameStage === 2 && tutorialConfig.shownSteps.has('stage2_rules') && !tutorialConfig.shownSteps.has('stage2_how_to_play')) {
      const step = tutorialConfig.steps.find(s => s.id === 'stage2_how_to_play');
      if (step) {
        setCurrentStep(step);
        setIsTutorialPaused(true);
        return;
      }
    }
    
    // Показываем подсказку для хода пользователя во 2-й стадии (после всех объяснений)
    if (gameStage === 2 && isUserTurn && !lastUserTurnRef.current && tutorialConfig.shownSteps.has('stage2_how_to_play') && !tutorialConfig.shownSteps.has('your_turn_stage2')) {
      lastUserTurnRef.current = true;
      
      const step = tutorialConfig.steps.find(s => s.id === 'your_turn_stage2');
      if (step) {
        setCurrentStep(step);
        setIsTutorialPaused(true);
      }
    }
  }, [gameStage, isUserTurn, tutorialConfig, isTutorialPaused]);

  // ✅ 3.5 Модалка когда игрок взял карту из колоды и она осталась (не смог походить)
  const lastDeckLengthRef = useRef<number>(deckLength);
  const drewCardShownRef = useRef<boolean>(false);
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused || !userPlayerId) return;
    if (tutorialConfig.shownSteps.has('drew_card_from_deck') || drewCardShownRef.current) return;
    
    const userPlayer = players.find(p => p.id === userPlayerId);
    if (!userPlayer) return;
    
    // Колода уменьшилась и карты у юзера увеличились — значит он взял из колоды
    const deckDecreased = deckLength < lastDeckLengthRef.current && lastDeckLengthRef.current > 0;
    const userGotCard = gameStage === 1 && deckDecreased && isUserTurn;
    
    if (userGotCard) {
      drewCardShownRef.current = true;
      const step = tutorialConfig.steps.find(s => s.id === 'drew_card_from_deck');
      if (step) {
        setTimeout(() => {
          setCurrentStep(step);
          setIsTutorialPaused(true);
        }, 800);
      }
    }
    
    lastDeckLengthRef.current = deckLength;
  }, [deckLength, players, userPlayerId, gameStage, isUserTurn, tutorialConfig, isTutorialPaused]);

  // ✅ 3.6 Модалка для stage2_take_card — когда игроку нечем бить во 2-й стадии
  useEffect(() => {
    if (!tutorialConfig.enabled || isTutorialPaused) return;
    if (!tutorialConfig.shownSteps.has('stage2_how_to_play')) return;
    if (tutorialConfig.shownSteps.has('stage2_take_card')) return;
    
    if (gameStage >= 2 && isUserTurn && tutorialConfig.shownSteps.has('your_turn_stage2')) {
      const step = tutorialConfig.steps.find(s => s.id === 'stage2_take_card');
      if (step) {
        setTimeout(() => {
          setCurrentStep(step);
          setIsTutorialPaused(true);
        }, 1500);
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
