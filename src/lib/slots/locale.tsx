'use client';

import { useSyncExternalStore } from 'react';

export type SlotLang = 'ru' | 'en';

let lang: SlotLang = 'ru';
let social = false;
let booted = false;
const listeners = new Set<() => void>();

function boot() {
  if (booted || typeof window === 'undefined') return;
  booted = true;
  const params = new URLSearchParams(window.location.search);
  const query = params.get('lang');
  const stored = window.localStorage.getItem('slot-lang');
  lang = query === 'en' || query === 'ru' ? query : stored === 'en' ? 'en' : 'ru';
  social = params.get('social') === '1';
}

function snapshot() {
  boot();
  return `${lang}:${social ? 1 : 0}`;
}

export function useSlotLocale() {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    snapshot,
    () => 'ru:0',
  );
  const [current, flag] = value.split(':');
  return {
    lang: (current === 'en' ? 'en' : 'ru') as SlotLang,
    social: flag === '1',
    toggle() {
      boot();
      lang = lang === 'en' ? 'ru' : 'en';
      window.localStorage.setItem('slot-lang', lang);
      listeners.forEach((cb) => cb());
    },
  };
}

const SPIN_EN: Record<string, string> = {
  'golden-must': 'SPIN',
  'hex-vault': 'OPEN',
  'oak-fortune': 'SPIN',
  'neon-river': 'GO',
  'limitless-city': 'PLAY',
  'green-arrow': 'DRAW',
  'fairy-glade': 'SPIN',
  'ash-dragon': 'FIRE',
  'frost-queen': 'SPIN',
  'blade-ronin': 'SLASH',
};

export function spinWord(lang: SlotLang, gameId: string, russian: string): string {
  return lang === 'en' ? (SPIN_EN[gameId] ?? 'SPIN') : russian;
}

export function cabinetCopy(lang: SlotLang, social: boolean) {
  if (lang === 'en') {
    return {
      balance: 'Balance',
      win: 'Win',
      stake: social ? 'Play' : 'Bet',
      stakeHint: social ? 'size' : 'bet',
      buy: social ? 'Feature' : 'Buy',
      buyHint: social ? 'round' : 'bonus',
      ante: 'Ante',
      anteOn: 'on ×1.5',
      anteOff: '+50%',
      turbo: 'Turbo',
      turboOff: 'off',
      auto: 'Auto',
      autoHint: 'spins',
      info: 'Info',
      infoHint: 'rules',
      on: 'on',
      off: 'off',
      lines: 'Lines',
      ways: 'Ways',
      grid: 'Grid',
      collect: 'Collect',
      bonusDone: 'Feature complete',
      cap: 'Win cap reached',
      floor: 'Feature floor added',
      popping: 'Symbols break',
      toWheel: 'To the wheel',
      spin: 'Spin',
      miss: 'miss',
      collected: 'Won',
      autoPick: 'Auto',
      wheelTitle: 'Bonus wheel',
      launch: 'Spin the wheel',
      big: 'BIG WIN',
      mega: 'MEGA WIN',
      epic: 'EPIC WIN',
    };
  }
  return {
    balance: 'Баланс',
    win: 'Выигрыш',
    stake: social ? 'Игра' : 'Ставка',
    stakeHint: social ? 'размер' : 'ставка',
    buy: social ? 'Режим' : 'Купить',
    buyHint: social ? 'раунд' : 'бонус',
    ante: 'Анте',
    anteOn: 'вкл ×1.5',
    anteOff: '+50%',
    turbo: 'Турбо',
    turboOff: 'выкл',
    auto: 'Авто',
    autoHint: 'спины',
    info: 'Инфо',
    infoHint: 'правила',
    on: 'вкл',
    off: 'выкл',
    lines: 'Линии',
    ways: 'Пути',
    grid: 'Поле',
    collect: 'Забрать',
    bonusDone: 'Бонус завершён',
    cap: 'Сработал потолок выигрыша',
    floor: 'Гарантия покупки добавила',
    popping: 'Символы лопаются',
    toWheel: 'К колесу',
    spin: 'Крутить',
    miss: 'мимо',
    collected: 'Собрано',
    autoPick: 'Автовыбор',
    wheelTitle: 'Колесо бонуса',
    launch: 'Запустить',
    big: 'БОЛЬШОЙ ВЫИГРЫШ',
    mega: 'МЕГА ВЫИГРЫШ',
    epic: 'ЭПИЧЕСКИЙ',
  };
}
