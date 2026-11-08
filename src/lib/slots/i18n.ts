import type { SlotGame, SlotSymbol } from './games';
import type { SlotLang } from './locale';

const SYMBOLS: Record<string, Record<string, string>> = {
  'golden-must': {
    ten: '10', jack: 'J', queen: 'Q', king: 'K', ace: 'A',
    cherry: 'Cherry', lemon: 'Lemon', grape: 'Grapes', bell: 'Bell',
    gem: 'Emerald', crown: 'Crown', wild: 'Mustache', scatter: 'Star',
  },
  'hex-vault': {
    lock: 'Lock', dagger: 'Dagger', skull: 'Skull', rune: 'Rune', chest: 'Chest',
    wild: 'Hex', m2: 'x2', m3: 'x3', m5: 'x5', coin: 'Coin',
  },
  'oak-fortune': {
    leaf: 'Leaf', fern: 'Fern', acorn: 'Acorn', beetle: 'Beetle', mushroom: 'Mushroom',
    owl: 'Owl', hoard: 'Hoard', oak: 'Oak', orb: 'Orb', wild: 'Wild', scatter: 'Moon',
  },
  'neon-river': {
    drop: 'Drop', fish: 'Fish', lantern: 'Lantern', pearl: 'Pearl', wave: 'Wave',
    wild: 'Neon', m4: 'x4', m10: 'x10', mystery: 'Mystery', scatter: 'Lotus',
  },
  'limitless-city': {
    ticket: 'Ticket', neon: 'Sign', car: 'Car', vault: 'Vault', wild: 'City',
    m50: 'x50', m100: 'x100', scatter: 'Siren',
  },
  'green-arrow': {
    hood: 'Hood', target: 'Target', bag: 'Purse', bow: 'Bow', wild: 'Arrow', scatter: 'Apple',
  },
  'fairy-glade': {
    bloom: 'Flower', berry: 'Berry', dew: 'Dew', firefly: 'Firefly', moth: 'Moth',
    wand: 'Wand', wild: 'Wing', scatter: 'Spark',
  },
  'ash-dragon': {
    ember: 'Ember', scale: 'Scale', egg: 'Egg', horn: 'Horn', wild: 'Fang',
    m15: 'x15', m20: 'x20', scatter: 'Flame',
  },
  'frost-queen': {
    snow: 'Snow', crystal: 'Crystal', wolf: 'Wolf', 'ice-crown': 'Diadem', wild: 'Ice', scatter: 'Snowflake',
  },
  'blade-ronin': {
    mask: 'Mask', fan: 'Fan', katana: 'Katana', crest: 'Crest', wild: 'Slash', scatter: 'Seal',
  },
};

type GameEn = { title: string; mood: string; bonus: string; rule: string; top: string; features: string[] };

const GAMES: Record<string, GameEn> = {
  'golden-must': {
    title: 'Golden Must',
    mood: 'A 5×5 board. A curtain covers a whole reel, and the Mustache steps out of the gold to show his multiplier.',
    bonus: 'Golden Rain',
    rule: 'Three stars start the regular feature, with at most two curtains. Four start the top feature: one curtain at the start and no more than two on the board. Five, very rarely, start Hot Mod: two curtains at the start and no more than three. Before the spins, the wheel sets 6–15 free spins and a curtain floor from x2 to x50. Curtain multipliers add on a line, up to x10.',
    top: 'The top buy opens on four stars. The wheel is the same. One curtain is waiting, a second lands rarely, and a third never will. The round cap is x15000.',
    features: [
      '5×5 board, 25 lines. 10, J, Q, K and A are the common low symbols',
      '3 stars — regular feature, 4 — top, 5 — Hot Mod with two curtains',
      'A wheel before the feature: 6–15 spins and a curtain floor from x2 to x50',
      'The curtain sticks to the end. Regular and top allow two, Hot Mod allows three',
      'Curtain multipliers add on a line, capped at x10',
    ],
  },
  'hex-vault': {
    title: 'Hex Vault',
    mood: 'Hold & Win. Coins with values stick to the board, three respins, a full board pays grand x1000.',
    bonus: 'Open Vault',
    rule: '6 or more coins start the respins. Coins stick, and each new coin restores 3 respins. A full board of 15 coins pays grand x1000.',
    top: 'Starts with 9 coins, values five times larger, and coins land more often.',
    features: ['10 lines', 'Wilds x2, x3 and x5 multiply the line', 'Fixed prizes Mini x20, Minor x50, Major x200', 'Grand x1000 for a full board'],
  },
  'oak-fortune': {
    title: 'Oak Fortune',
    mood: 'A 6×5 board. Eight of a kind pay anywhere and break. The orb stands in for any symbol and multiplies the ones it hits.',
    bonus: 'Moon Glade',
    rule: '4 moons award 20 free spins. The orb stands in for any symbol and multiplies the symbols it hits.',
    top: 'Orb values are doubled, and every spin is guaranteed at least one orb.',
    features: ['Pays for 8+ symbols anywhere', 'Cascade: the win lights up and breaks, new symbols fall', 'The orb is a wild and a multiplier for the symbols it hits', 'Orbs land more often in the feature'],
  },
  'neon-river': {
    title: 'Neon River',
    mood: '1024 ways and mystery lanterns: every “?” becomes the same symbol at once.',
    bonus: 'High Tide',
    rule: '10 free spins. Mystery symbols open only into pearl, wave or wild.',
    top: 'Every spin adds four mystery symbols, and they open only into wave or wild.',
    features: ['Up to 1024 ways, left to right', 'A way pays coefficient × stake / 1000 × number of ways', 'Mystery “?” becomes one shared symbol', 'Wilds x4 and x10 multiply the way'],
  },
  'limitless-city': {
    title: 'Limitless City',
    mood: 'Sirens spin a wheel: cash up to x500, free spins with a multiplier, or the next wheel.',
    bonus: 'Night Siren',
    rule: '3 sirens start a 12-sector wheel: cash, free spins with a fixed multiplier, or LEVEL UP onto the second wheel, up to x500.',
    top: 'Starts on the second wheel. Every sector is boosted by 2.25.',
    features: ['10 lines', 'A random spin multiplier up to x50', 'Wilds x50 and x100', 'A two-level wheel'],
  },
  'green-arrow': {
    title: 'Green Arrow',
    mood: 'The apple lands only on reels 2–5. Three start the volley, four start the 6×6 range.',
    bonus: 'Volley',
    rule: '3 apples on reels 2–5 award 15 spins. The archer throws 1 to 6 wilds each spin. A multiplier arrow stays until the feature ends.',
    top: '4 apples open the 6×6 range. The field holds exactly 6 misses, and the third ends the feature. Multipliers run from x10 to x2500.',
    features: ['15 lines', 'The apple lands only on reels 2, 3, 4 and 5, one per reel', '3 apples — 15 spins and wilds from the archer', '4 apples — a 6×6 range, multipliers x10–x2500'],
  },
  'fairy-glade': {
    title: 'Fairy Glade',
    mood: '6×6 clusters: five or more neighbours break, the board settles, and the fairy adds wilds.',
    bonus: 'Ring Dance',
    rule: '3 sparks award 8 free spins. Every winning cascade raises the shared multiplier by 1, and it does not reset.',
    top: 'The multiplier starts at x8 and climbs by 5 per cascade.',
    features: ['Clusters of 5 connected symbols', 'Cascades, and the board settles', 'The fairy adds wilds after an empty cascade', 'The feature multiplier climbs and never falls'],
  },
  'ash-dragon': {
    title: 'Ash Dragon',
    mood: 'Every feature win burns the cheapest symbol and raises the multiplier. By the end the board is treasure.',
    bonus: 'Breath',
    rule: '10 free spins with a multiplier from x2. The first winning spin burns the cheapest symbol, and every winning spin raises the multiplier by 1.',
    top: 'The cheapest symbol is already burned. The multiplier starts at x3, and wilds x15 and x20 drop twice.',
    features: ['10 lines', 'The dragon randomly multiplies a win by x2–x5', 'Wilds x15 and x20', 'Burned symbols and a climbing multiplier in the feature'],
  },
  'frost-queen': {
    title: 'Frost Queen',
    mood: 'A freeze and respin in the base game. In the feature a colossal 3×3 symbol lands.',
    bonus: 'Ice Throne',
    rule: '10 free spins. Each one plants a colossal 3×3 of wolf, diadem or ice.',
    top: 'The colossus is always wild, wins come with x3, and there are 2 extra spins.',
    features: ['15 lines', 'The queen freezes a reel and awards a respin', 'A colossal 3×3 symbol in the feature'],
  },
  'blade-ronin': {
    title: 'Blade Ronin',
    mood: 'Pays both ways. The ronin slashes rows, and every slash raises the multiplier.',
    bonus: 'Slash',
    rule: '10 free spins with a multiplier from x2. Each spin the ronin turns one row across three neighbouring reels wild, and every slash raises the multiplier by 2.',
    top: 'Two slashes a spin. The multiplier starts at x6 and climbs by 4.',
    features: ['12 lines, both ways', 'Five of a kind on a full line pays once. A shorter one can pay from both sides', 'The ronin slashes a row wild in the base game', 'The multiplier climbs with every slash'],
  },
};

const VOLATILITY: Record<string, string> = {
  'средняя': 'medium',
  'высокая': 'high',
  'очень высокая': 'very high',
};

export function symbolLabel(game: SlotGame, symbol: SlotSymbol, lang: SlotLang): string {
  if (lang !== 'en') return symbol.name;
  return SYMBOLS[game.id]?.[symbol.id] ?? symbol.name;
}

function english(game: SlotGame): GameEn | undefined {
  return GAMES[game.id];
}

export function gameTitle(game: SlotGame, lang: SlotLang): string {
  return lang === 'en' ? (english(game)?.title ?? game.title) : game.title;
}

export function gameMood(game: SlotGame, lang: SlotLang): string {
  return lang === 'en' ? (english(game)?.mood ?? game.mood) : game.mood;
}

export function bonusTitle(game: SlotGame, lang: SlotLang): string {
  return lang === 'en' ? (english(game)?.bonus ?? game.bonus.title) : game.bonus.title;
}

export function bonusRule(game: SlotGame, lang: SlotLang): string {
  return lang === 'en' ? (english(game)?.rule ?? game.bonus.rule) : game.bonus.rule;
}

export function bonusTop(game: SlotGame, lang: SlotLang): string {
  return lang === 'en' ? (english(game)?.top ?? game.bonus.top) : game.bonus.top;
}

export function featureLines(game: SlotGame, lang: SlotLang): string[] {
  return lang === 'en' ? (english(game)?.features ?? game.features) : game.features;
}

export function volatilityLabel(game: SlotGame, lang: SlotLang): string {
  return lang === 'en' ? (VOLATILITY[game.volatility] ?? game.volatility) : game.volatility;
}

export function translateRibbon(label: string, game: SlotGame, lang: SlotLang): string {
  if (lang !== 'en' || !label) return label;
  const nameOf = (russian: string) => {
    const symbol = game.symbols.find((item) => item.name === russian.trim());
    return symbol ? symbolLabel(game, symbol, 'en') : russian;
  };
  const patterns: [RegExp, (...groups: string[]) => string][] = [
    [/^Монет: (\d+) · респинов: (\d+)$/, (coins, respins) => `Coins: ${coins} · respins: ${respins}`],
    [/^Новых монет: (\d+) · респинов: 3$/, (coins) => `New coins: ${coins} · respins: 3`],
    [/^Респинов: (\d+)$/, (left) => `Respins: ${left}`],
    [/^Полное поле · гранд x(\d+)$/, (grand) => `Full board · grand x${grand}`],
    [/^Общий множитель x(\d+)$/, (value) => `Total multiplier x${value}`],
    [/^Шар x(\d+) заменил символы$/, (value) => `Orb x${value} stood in`],
    [/^Мистика: (\d+)$/, (count) => `Mystery: ${count}`],
    [/^Мистика → (.+?)(?: · x(\d+))?$/, (name, mult) => `Mystery → ${nameOf(name)}${mult ? ` · x${mult}` : ''}`],
    [/^Множитель x(\d+)$/, (value) => `Multiplier x${value}`],
    [/^Дыхание x(\d+)$/, (value) => `Breath x${value}`],
    [/^Колосс: (.+?)( · x3)?$/, (name, extra) => `Colossus: ${nameOf(name)}${extra ? ' · x3' : ''}`],
    [/^Удар · множитель x(\d+)$/, (value) => `Slash · multiplier x${value}`],
    [/^(\d+)× (.+)$/, (count, name) => `${count}× ${nameOf(name)}`],
  ];
  for (const [pattern, format] of patterns) {
    const match = label.match(pattern);
    if (match) return format(...match.slice(1));
  }
  if (label === 'Сбор монет') return 'Collecting coins';
  if (label === 'Фея добавляет дикие') return 'The fairy adds wilds';
  if (label === 'Каскад окончен') return 'Cascade finished';
  if (label === 'Заморозка и респин') return 'Freeze and respin';
  return label;
}

const NOTES: Record<string, string> = {
  'Обмен не прошёл': 'The exchange did not go through',
  'Тир не записался': 'The range was not saved',
  'Не хватает демо-фишек': 'Not enough demo chips',
  'Раунд не закрылся': 'The round did not close',
  'Спин не прошёл': 'The spin did not go through',
  'Ошибка спина': 'Spin error',
  'Не хватает демо-фишек на покупку бонуса': 'Not enough demo chips to buy the feature',
  'Покупка не прошла': 'The buy did not go through',
  'Ошибка покупки': 'Buy error',
  'Для GRAM нужно один раз применить scripts/sql/slots-wallet.sql': 'GRAM needs scripts/sql/slots-wallet.sql applied once',
};

export function playerNote(message: string, lang: SlotLang): string {
  if (lang !== 'en') return message;
  return NOTES[message] ?? message;
}
