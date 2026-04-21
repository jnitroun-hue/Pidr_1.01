'use client';

import type { Language } from '@/lib/i18n/translations';

const exactRuToEn: Record<string, string> = {
  'Добро пожаловать': 'Welcome',
  'Действие': 'Action',
  'Важно': 'Important',
  'Подсказка': 'Tip',
  'Обучение': 'Tutorial',
  'Обратите внимание на подсвеченный элемент': 'Look at the highlighted element',
  'Далее': 'Next',
  'Понятно': 'Got it',
  'Результаты игры': 'Game Results',
  'Рейтинговая игра': 'Ranked Game',
  'ВЫ': 'YOU',
  'Проигравший': 'Loser',
  'Место': 'Place',
  'Награда': 'Reward',
  'Рейтинг': 'Rating',
  'Игра с ботами': 'Game with bots',
  '☝️ ОДНА КАРТА!': '☝️ ONE CARD!',
  '☝️ Одна карта!': '☝️ One Card!',
  '✅ Уже объявлено!': '✅ Already declared!',
  '⏳ Недоступно сейчас': '⏳ Not available right now',
  '❓ Сколько карт?': '❓ How many cards?',
  '🔍 Проверка...': '🔍 Checking...',
  'Нет доступных целей для проверки': 'No available targets to check',
  'Смотреть': 'Watch',
  'Главная': 'Home',
  'В меню': 'To Menu',
  'Заново': 'Play Again',
  'Последний игрок в игре': 'Last player in the game',
  '🎮 Добро пожаловать!': '🎮 Welcome!',
  'Что такое «Пеньки»?': 'What are "Stumps"?',
  'Кто ходит первым?': 'Who goes first?',
  '⬆️ Ваш ход! Что делать?': '⬆️ Your turn! What to do?',
  '🃏 Вы взяли карту из колоды!': '🃏 You drew a card from the deck!',
  '🤖 Бот положил карту на вас!': '🤖 A bot placed a card on you!',
  '🃏 Карты на руке кончились!': '🃏 No cards left in hand!',
  '🔄 Круг закрылся!': '🔄 The round is closed!',
  '⚠️ Правило «Одна карта»!': '⚠️ "One Card" rule!',
  '🔍 Кнопка «Сколько карт?»': '🔍 "How many cards?" button',
  '🔄 Вторая стадия!': '🔄 Second stage!',
  '📜 Правила 2-й стадии': '📜 Stage 2 rules',
  '🎯 Как ходить (2-я стадия)': '🎯 How to play (Stage 2)',
  '📥 Когда нечем бить — берёте!': '📥 No card to beat? Take one!',
  '⬆️ Ваш ход (2-я стадия)': '⬆️ Your turn (Stage 2)',
  '🎯 Пеньки открылись!': '🎯 Stumps are opened!',
  '🎮 Вторая игра!': '🎮 Second game!',
  '⬆️ Ваш ход!': '⬆️ Your turn!',
  '⚠️ Важное напоминание!': '⚠️ Important reminder!',
  '☝️ Не забудьте «Одна карта»': '☝️ Do not forget "One Card"',
  'Пеньки лежат рубашкой вверх у каждого игрока': 'Stumps are face down near each player',
  'Активный игрок подсвечен зелёным': 'The active player is highlighted in green',
  'Нажмите на игрока с младшей картой': 'Tap a player with a lower card',
  'Нажмите на колоду чтобы взять карту': 'Tap the deck to draw a card',
  'Ваши пеньки теперь открыты': 'Your stumps are now open',
  'Это ваша первая игра в П.И.Д.Р.! Мы пошагово покажем как играть, куда нажимать и зачем. Расслабьтесь — боты будут терпеливо ждать ваши ходы. 😊':
    'This is your first game in P.I.D.R.! We will guide you step by step: what to do, where to tap, and why. Relax - bots will patiently wait for your turns. 😊',
  'В начале игры каждому раздаётся по 2 закрытые карты — это «пеньки». Они лежат рубашкой вверх рядом с аватаром.\n\n🔒 Пеньки откроются только когда закончится колода И у вас не останется карт на руке — это 3-я стадия!\n\n⚠️ Пока колода не кончилась — пеньки НЕ открываются, даже если рука пуста!\n\n💡 Пеньки могут быть как удачными, так и нет — это элемент интриги!':
    'At the start of the game each player gets 2 face-down cards - these are "stumps". They stay face down near your avatar.\n\n🔒 Stumps open only when the deck is empty AND you have no cards in hand - that is Stage 3.\n\n⚠️ Until the deck is over, stumps do NOT open even if your hand is empty.\n\n💡 Stumps can be lucky or unlucky - this adds suspense!',
  'Первый ход у игрока с самой СТАРШЕЙ открытой картой.\n\n📋 Иерархия карт (от старшей к младшей):\n🃏 Туз → Король → Дама → Валет → 10 → 9 → ... → 3 → 2\n\n⚡ Двойка — особая! Она бьёт ТОЛЬКО Туза.\n♠♥♦♣ Масти НЕ важны в 1-й стадии!\n\n📌 ВАЖНО: Бить можно только карту РОВНО на 1 значение младше!\nПример: 7 бьёт 6, но НЕ бьёт 5 или 4!':
    'The first turn belongs to the player with the HIGHEST open card.\n\n📋 Card hierarchy (highest to lowest):\n🃏 Ace → King → Queen → Jack → 10 → 9 → ... → 3 → 2\n\n⚡ The Two is special! It beats ONLY the Ace.\n♠♥♦♣ Suits do NOT matter in Stage 1.\n\n📌 IMPORTANT: You can beat only a card exactly 1 rank lower.\nExample: 7 beats 6, but NOT 5 or 4!',
  '👆 Посмотрите на открытые карты соперников вокруг стола.\n\n✅ Если у кого-то открытая карта РОВНО НА 1 ЗНАЧЕНИЕ МЛАДШЕ вашей — нажмите на его аватар, чтобы положить свою карту!\n\n📌 Пример: у вас 7 → можете положить на 6, но НЕ на 5!\n⚡ Двойка (2) бьёт ТОЛЬКО Туза!\n♠♥♦♣ Масти НЕ важны в 1-й стадии!\n\n❌ Если положить некуда — нажмите на КОЛОДУ в центре стола.\n\n🃏 Карта из колоды: если она СТАРШЕ НА 1 чьей-то открытой — можете СРАЗУ сходить ею!\n\n💡 Цель: избавиться от всех карт!':
    '👆 Look at opponents\' open cards around the table.\n\n✅ If someone has an open card exactly 1 rank LOWER than yours - tap their avatar to place your card.\n\n📌 Example: you have 7 -> you can place on 6, but NOT on 5.\n⚡ Two (2) beats ONLY Ace.\n♠♥♦♣ Suits do NOT matter in Stage 1.\n\n❌ If you cannot place a card, tap the DECK in the center.\n\n🃏 Drawn card: if it is 1 rank HIGHER than someone\'s open card, you can play it immediately.\n\n💡 Goal: get rid of all cards!',
  'Вы нажали на колоду и взяли новую карту!\n\n🔍 Игра автоматически проверила: можно ли этой картой побить кого-то?\n\n✅ Если карта СТАРШЕ НА 1 чьей-то открытой — вы СРАЗУ ходите ею и ход продолжается!\n\n❌ Если картой нельзя никого побить — она остаётся у вас как новая открытая карта. Ход переходит к следующему игроку.\n\n💡 Например: вы взяли Даму (Q). Ни у кого нет Валета (J)? Дама остаётся у вас.':
    'You tapped the deck and drew a new card.\n\n🔍 The game automatically checks if this card can beat someone.\n\n✅ If the card is 1 rank HIGHER than someone\'s open card, you play it immediately and continue the turn.\n\n❌ If the card cannot beat anyone, it remains with you as your new open card. Turn passes to the next player.\n\n💡 Example: you drew a Queen (Q). No one has a Jack (J)? The Queen stays with you.',
  'Бот положил свою карту поверх вашей — его карта СТАРШЕ НА 1 ЗНАЧЕНИЕ!\n\n📌 Пример: у вас была 6, бот положил 7 — потому что 7 ровно на 1 больше 6.\n\n⚠️ Теперь ваша открытая карта — это карта бота (7). Следующий игрок будет сравнивать с ней!\n\n💡 Не переживайте — когда будет ваш ход, вы сможете сделать то же самое с другими!':
    'A bot placed its card on top of yours - its card is exactly 1 rank HIGHER.\n\n📌 Example: you had 6, bot placed 7 - because 7 is exactly one higher than 6.\n\n⚠️ Now your open card is the bot\'s card (7). The next player compares against it.\n\n💡 No worries - on your turn you can do the same to others.',
  'У вас больше нет карт на руке!\n\n👆 Нажмите на КОЛОДУ в центре стола чтобы взять новую карту.\n\n🃏 Если взятая карта СТАРШЕ НА 1 чьей-то открытой — можете СРАЗУ сходить ею!\n\n⚠️ Пеньки пока НЕ открываются — только когда закончится колода!\n\n💡 Если не можете сходить — карта остаётся у вас как новая открытая.':
    'You have no cards left in hand.\n\n👆 Tap the DECK in the center to draw a new card.\n\n🃏 If the drawn card is 1 rank HIGHER than someone\'s open card, you can play it immediately.\n\n⚠️ Stumps still do NOT open - only when the deck is finished.\n\n💡 If you cannot play, the card stays with you as a new open card.',
  'Все игроки сходили по кругу — это называется «круг закрылся»!\n\n📌 Что произошло:\n• Каждый игрок по очереди либо положил карту, либо взял из колоды\n• Теперь ход снова переходит к первому игроку в очереди\n\n🔄 Круги повторяются пока не закончится колода (после чего начнётся 2-я стадия).\n\n💡 С каждым кругом ситуация меняется — следите за открытыми картами соперников!':
    'All players completed a full round - this is called "round closed".\n\n📌 What happened:\n• Each player either placed a card or drew from the deck\n• The turn order now returns to the first player\n\n🔄 Rounds repeat until the deck is empty (then Stage 2 starts).\n\n💡 The board changes every round - watch opponents\' open cards.',
  'Во 2-й стадии, когда у игрока остаётся ОДНА карта — он ОБЯЗАН нажать кнопку «Одна карта!»\n\n💀 Если забыл объявить — любой другой игрок может спросить «Сколько карт?» и наказать!\n\n📌 Штраф: каждый игрок отдаёт виновнику по ОДНОЙ своей карте.\n\n🔍 Кнопка «Сколько карт?» загорается когда у кого-то подозрительно мало карт. Нажмите её чтобы проверить!\n\n💡 Совет: следите за количеством карт у соперников!':
    'In Stage 2, when a player has ONE card left, they MUST press the "One Card!" button.\n\n💀 If they forget, any other player can ask "How many cards?" and punish them.\n\n📌 Penalty: each player gives one card to the offender.\n\n🔍 The "How many cards?" button lights up when someone has suspiciously few cards. Press it to check.\n\n💡 Tip: keep an eye on opponents\' card counts.',
  'Загорелась кнопка «Сколько карт?» — это значит у кого-то из соперников осталась 1 карта!\n\n📌 Что делать:\n1️⃣ Если соперник НЕ объявил «Одна карта!» — нажмите «Сколько карт?»\n2️⃣ Он получит ШТРАФ — по карте от каждого игрока!\n\n⚠️ Если соперник УЖЕ объявил — кнопка ничего не даст.\n\n💡 Это мощное правило! Следите внимательно — можете серьёзно наказать зазевавшегося противника!':
    'The "How many cards?" button is active - this means one opponent has 1 card left.\n\n📌 What to do:\n1️⃣ If the opponent did NOT declare "One Card!" - press "How many cards?"\n2️⃣ They get a PENALTY - one card from each player.\n\n⚠️ If they already declared, the button has no effect.\n\n💡 This is a powerful rule - use it to punish inattentive opponents.',
  '🎉 Колода закончилась! Начинается ВТОРАЯ стадия — правила «Дурака»!\n\n🏆 Козырная масть определена последней взятой картой из колоды.\n\n⚠️ ВАЖНО: Пики (♠) НИКОГДА не могут быть козырем! Если последняя карта — пика, козырь определяется предпоследней.\n\n🔄 Теперь вы ходите картами С РУКИ, а не открытыми!':
    '🎉 The deck is empty! Stage TWO begins - classic Fool rules.\n\n🏆 Trump suit is defined by the last card taken from the deck.\n\n⚠️ IMPORTANT: Spades (♠) can NEVER be trump. If the last card is a spade, trump is taken from the previous card.\n\n🔄 Now you play with cards from HAND, not open cards.',
  '🎴 Теперь карты кладутся НА СТОЛ в центр! Каждый игрок по очереди кладёт карту:\n\n📌 Как бить:\n✅ Карту той же масти, но СТАРШЕ по номиналу (♥5 бьёт ♥3)\n🏆 Козырной мастью бьёте ЛЮБУЮ некозырную карту\n♠ ПИКИ — особые! Пики бьются ТОЛЬКО пиками! Даже козырь не возьмёт пику!\n\n❌ Если нечем бить — нажмите «Взять» → вы берёте НИЖНЮЮ карту из боя на столе!\n\n⚠️ ОДНА КАРТА: Когда осталась 1 карта — ОБЯЗАТЕЛЬНО нажмите кнопку «Одна карта!»\n💀 Забудете — получите штрафные карты от КАЖДОГО игрока!':
    '🎴 Cards are now played to the CENTER TABLE stack. Each player places a card in turn.\n\n📌 How to beat:\n✅ Same suit with higher rank (♥5 beats ♥3)\n🏆 Trump beats ANY non-trump card\n♠ Spades are special: they are beaten ONLY by spades. Even trump cannot beat a spade.\n\n❌ Cannot beat? Press "Take" -> you take the BOTTOM card from the table stack.\n\n⚠️ ONE CARD: when you have 1 card left, press "One Card!"\n💀 Forget it and you receive penalty cards from EVERY player.',
  '📋 Пошаговая инструкция:\n\n1️⃣ Выберите карту из РУКИ (внизу экрана)\n2️⃣ Нажмите на соперника, чтобы положить карту на стол\n\n📌 Какой картой можно бить:\n• ♥ Та же масть + старше → бьёт (♥8 бьёт ♥5)\n• 🏆 Козырь → бьёт любую некозырную\n• ♠ Пика → бьёт ТОЛЬКО пику! Козырь не берёт!\n\n❌ Нечем бить? Нажмите «Взять» — вы забираете НИЖНЮЮ карту из боя на столе!\n\n💡 Стратегия: берегите козыри на конец игры!':
    '📋 Step-by-step:\n\n1️⃣ Select a card from your HAND (bottom of screen)\n2️⃣ Tap an opponent to place the card on the table\n\n📌 What can beat:\n• ♥ Same suit + higher rank (♥8 beats ♥5)\n• 🏆 Trump beats any non-trump\n• ♠ Spade beats ONLY a spade; trump does not beat spades\n\n❌ Cannot beat? Press "Take" - you take the BOTTOM card from the table stack.\n\n💡 Strategy: save trumps for the endgame.',
  'Если у вас НЕТ карты чтобы побить ту, что лежит на столе:\n\n1️⃣ Нажмите кнопку «Взять» (красная)\n2️⃣ Вы забираете НИЖНЮЮ карту из боя на столе — самую слабую!\n\n📌 Пример: на столе лежат ♥3, ♥7, ♥K\nУ вас нет червей и нет козырей → берёте ♥3 (нижнюю)\n\n⚠️ ВАЖНО: Вы берёте именно НИЖНЮЮ, не верхнюю!\n\n♠ Если на столе пика — бить можно ТОЛЬКО пикой, козырь не поможет!':
    'If you do NOT have a card to beat the one on the table:\n\n1️⃣ Press "Take" (red button)\n2️⃣ You take the BOTTOM card from the table stack - the weakest one.\n\n📌 Example: table has ♥3, ♥7, ♥K\nNo hearts and no trumps in hand -> you take ♥3 (bottom).\n\n⚠️ IMPORTANT: you take the BOTTOM card, not the top one.\n\n♠ If the table card is spade, only a spade can beat it; trump will not help.',
  '👆 Выберите карту из руки внизу экрана, затем нажмите на соперника!\n\n💡 Помните:\n🏆 Козырь бьёт все некозырные карты\n♠ Пики бьются ТОЛЬКО пиками — ни один козырь не возьмёт пику!\n📢 Не забудьте объявить «Одна карта!» когда останется одна!\n\n⚡ Если не можете побить — «Взять» забирает НИЖНЮЮ карту из боя!':
    '👆 Select a card from your hand, then tap an opponent.\n\n💡 Remember:\n🏆 Trump beats all non-trumps\n♠ Spades are beaten ONLY by spades - no trump can beat a spade.\n📢 Do not forget to declare "One Card!" when you have one left.\n\n⚡ Cannot beat? "Take" grabs the BOTTOM card from the table stack.',
  '🎉 Карты на руке закончились — ваши пеньки открылись!\n\n🎴 Теперь вы играете с этими 2 картами до конца. Это 3-я (финальная) стадия!\n\n📌 Правила те же что и во 2-й стадии:\n✅ Та же масть и старше → бьёт\n🏆 Козырь → бьёт некозырь\n♠ Пики → только пиками!\n\n🏆 Кто первым избавится от ВСЕХ карт (включая пеньки) — тот НЕ проиграл!\n💀 Проигрывает ПОСЛЕДНИЙ оставшийся с картами — он П.И.Д.Р.!':
    '🎉 Your hand is empty - your stumps are now open.\n\n🎴 You now play with these 2 cards to the end. This is Stage 3 (final).\n\n📌 Rules are the same as Stage 2:\n✅ Same suit and higher rank beats\n🏆 Trump beats non-trump\n♠ Spades beat only spades\n\n🏆 The first to get rid of ALL cards (including stumps) is safe.\n💀 The LAST player with cards loses - that is P.I.D.R.!',
  'Это ваша вторая игра! Краткие напоминания:\n\n📌 1-я стадия: кладите карту на соперника, если ваша СТАРШЕ НА 1 значение (7→6, Дама→Валет)\n📌 2-я стадия: козырь бьёт некозырь, пики — ТОЛЬКО пиками!\n📌 Не забывайте «Одна карта!»\n\n💪 Удачи!':
    'This is your second game. Quick reminders:\n\n📌 Stage 1: place a card if yours is exactly 1 rank higher (7->6, Queen->Jack)\n📌 Stage 2: trump beats non-trump, spades are beaten ONLY by spades\n📌 Do not forget "One Card!"\n\n💪 Good luck!',
  '👆 Найдите соперника с картой ровно на 1 МЛАДШЕ вашей и нажмите на его аватар!\n\n📌 Ваша 7 → бьёт 6 (но НЕ 5!)\n⚡ Двойка бьёт только Туза!\n\n❌ Если не можете — нажмите на колоду.':
    '👆 Find an opponent with a card exactly 1 rank LOWER than yours and tap their avatar.\n\n📌 Your 7 -> beats 6 (but NOT 5)\n⚡ Two beats only Ace.\n\n❌ If you cannot play, tap the deck.',
  'Колода кончилась! Напоминание:\n\n🏆 Козырь бьёт некозырную карту\n♠ Пики — ТОЛЬКО пиками (даже козырь не берёт!)\n🎴 Ходите картами с руки → нажмите карту → нажмите на соперника\n📢 Одна карта — ОБЯЗАТЕЛЬНО объявляйте!':
    'Deck is empty! Reminder:\n\n🏆 Trump beats non-trump\n♠ Spades are beaten ONLY by spades (even trump cannot beat them)\n🎴 Play from hand -> tap card -> tap opponent\n📢 One card must be declared.',
  '🎯 Последний урок!': '🎯 Final lesson!',
  'Это ваша последняя обучающая игра!\n\nПосле неё вы получите доступ к онлайн-мультиплееру! 🎮\n\n💡 Краткие правила:\n1️⃣ Стадия 1: бейте карту на 1 значение младше\n2️⃣ Стадия 2: козырь решает, пики только пиками!\n3️⃣ Стадия 3: играете пеньками по правилам 2-й стадии\n📢 Объявляйте «Одна карта!»':
    'This is your final tutorial game.\n\nAfter it, you unlock online multiplayer! 🎮\n\n💡 Quick rules:\n1️⃣ Stage 1: beat a card that is 1 rank lower\n2️⃣ Stage 2: trump matters, spades only with spades\n3️⃣ Stage 3: play stumps by Stage 2 rules\n📢 Declare "One Card!"',
  '📢 Не забывайте нажимать «ОДНА КАРТА!» когда останется 1 карта!\n\n💀 Штраф: каждый игрок даёт вам по одной своей карте.\n\n🎮 После этой игры откроется мультиплеер!':
    '📢 Do not forget to press "ONE CARD!" when one card remains.\n\n💀 Penalty: each player gives you one of their cards.\n\n🎮 Multiplayer unlocks after this game.',
};

const replaceRuToEn: Array<[string, string]> = [
  ['ИГРА', 'GAME'],
  ['игра', 'game'],
  ['игрок', 'player'],
  ['игрока', 'player'],
  ['игроков', 'players'],
  ['место', 'place'],
  ['места', 'places'],
  ['победитель', 'winner'],
  ['победа', 'victory'],
  ['монет', 'coins'],
  ['карта', 'card'],
  ['карты', 'cards'],
  ['колода', 'deck'],
  ['ход', 'turn'],
  ['козырь', 'trump'],
  ['штраф', 'penalty'],
  ['Одна карта', 'One Card'],
  ['Сколько карт', 'How many cards'],
  ['У вас', 'You have'],
  ['карт', 'cards'],
  ['карты', 'cards'],
  ['карта', 'card'],
  ['Сегодня', 'Today'],
  ['Недавно', 'Recently'],
];

export function translateGameText(value: string, language: Language): string {
  if (language !== 'en' || !value) return value;
  if (exactRuToEn[value]) return exactRuToEn[value];

  let translated = value;
  for (const [ru, en] of replaceRuToEn) {
    translated = translated.replaceAll(ru, en);
  }
  return translated;
}
