// ============================================================
// 🍥 УЛУЧШЕННЫЙ ГЕНЕРАТОР НАРУТО PLACEHOLDER'ОВ
// Создаёт красивые градиентные PNG с символами персонажей
// БЕЗ ВНЕШНИХ ЗАВИСИМОСТЕЙ! ТОЛЬКО NODE.JS!
// ============================================================

const fs = require('fs');
const path = require('path');

// ✅ 52 ГЕРОЯ НАРУТО С ЭМОДЗИ
const NARUTO_HEROES = [
  { id: 1, name: 'Naruto', nameRu: 'Наруто Узумаки', emoji: '🦊', color1: '#FF6B35', color2: '#F7931E' },
  { id: 2, name: 'Sasuke', nameRu: 'Саске Учиха', emoji: '⚡', color1: '#667EEA', color2: '#4C51BF' },
  { id: 3, name: 'Sakura', nameRu: 'Сакура Харуно', emoji: '🌸', color1: '#F093FB', color2: '#F5576C' },
  { id: 4, name: 'Kakashi', nameRu: 'Какаши Хатакэ', emoji: '👁️', color1: '#4FACFE', color2: '#00F2FE' },
  { id: 5, name: 'Itachi', nameRu: 'Итачи Учиха', emoji: '🔥', color1: '#FA709A', color2: '#FEE140' },
  { id: 6, name: 'Gaara', nameRu: 'Гаара', emoji: '🏜️', color1: '#FFE259', color2: '#FFA751' },
  { id: 7, name: 'Rock Lee', nameRu: 'Рок Ли', emoji: '💪', color1: '#30CFD0', color2: '#330867' },
  { id: 8, name: 'Neji', nameRu: 'Неджи Хьюга', emoji: '👁️‍🗨️', color1: '#A8EDEA', color2: '#FED6E3' },
  { id: 9, name: 'Hinata', nameRu: 'Хината Хьюга', emoji: '💜', color1: '#FED6E3', color2: '#A8EDEA' },
  { id: 10, name: 'Shikamaru', nameRu: 'Шикамару Нара', emoji: '☁️', color1: '#FFD89B', color2: '#19547B' },
  { id: 11, name: 'Minato', nameRu: 'Минато Намикадзе', emoji: '⚡', color1: '#FDC830', color2: '#F37335' },
  { id: 12, name: 'Jiraiya', nameRu: 'Джирайя', emoji: '🐸', color1: '#F37335', color2: '#FDC830' },
  { id: 13, name: 'Tsunade', nameRu: 'Цунаде', emoji: '💎', color1: '#FAD961', color2: '#F76B1C' },
  { id: 14, name: 'Orochimaru', nameRu: 'Орочимару', emoji: '🐍', color1: '#9561E2', color2: '#EAAFC8' },
  { id: 15, name: 'Pain', nameRu: 'Пейн', emoji: '🔴', color1: '#F12711', color2: '#F5AF19' },
  { id: 16, name: 'Madara', nameRu: 'Мадара Учиха', emoji: '👹', color1: '#F5515F', color2: '#9F041B' },
  { id: 17, name: 'Obito', nameRu: 'Обито Учиха', emoji: '🌀', color1: '#9D50BB', color2: '#6E48AA' },
  { id: 18, name: 'Killer Bee', nameRu: 'Киллер Би', emoji: '🐙', color1: '#6A3093', color2: '#A044FF' },
  { id: 19, name: 'Shisui', nameRu: 'Шисуи Учиха', emoji: '🔥', color1: '#FC466B', color2: '#3F5EFB' },
  { id: 20, name: 'Might Guy', nameRu: 'Майто Гай', emoji: '💚', color1: '#3F5EFB', color2: '#FC466B' },
  { id: 21, name: 'Tobirama', nameRu: 'Тобирама Сенджу', emoji: '💧', color1: '#11998E', color2: '#38EF7D' },
  { id: 22, name: 'Hashirama', nameRu: 'Хаширама Сенджу', emoji: '🌳', color1: '#38EF7D', color2: '#11998E' },
  { id: 23, name: 'Kaguya', nameRu: 'Кагуя Оцуцуки', emoji: '👁️', color1: '#C471F5', color2: '#FA71CD' },
  { id: 24, name: 'Deidara', nameRu: 'Дейдара', emoji: '💥', color1: '#FA8BFF', color2: '#2BD2FF' },
  { id: 25, name: 'Sasori', nameRu: 'Сасори', emoji: '🎎', color1: '#2BDA8E', color2: '#6A82FB' },
  { id: 26, name: 'Hidan', nameRu: 'Хидан', emoji: '☠️', color1: '#6A82FB', color2: '#FC5C7D' },
  { id: 27, name: 'Kakuzu', nameRu: 'Какузу', emoji: '💰', color1: '#FC5C7D', color2: '#6A82FB' },
  { id: 28, name: 'Kisame', nameRu: 'Кисаме Хошигаки', emoji: '🦈', color1: '#8EC5FC', color2: '#E0C3FC' },
  { id: 29, name: 'Ino', nameRu: 'Ино Яманака', emoji: '💐', color1: '#E0C3FC', color2: '#8EC5FC' },
  { id: 30, name: 'Choji', nameRu: 'Чоджи Акимичи', emoji: '🍜', color1: '#8FD3F4', color2: '#96E6A1' },
  { id: 31, name: 'Kiba', nameRu: 'Киба Инузука', emoji: '🐕', color1: '#FFA8A8', color2: '#FCFF00' },
  { id: 32, name: 'Shino', nameRu: 'Шино Абураме', emoji: '🐛', color1: '#FEADA6', color2: '#F5EFEF' },
  { id: 33, name: 'Temari', nameRu: 'Темари', emoji: '🌪️', color1: '#A3BDED', color2: '#6991C7' },
  { id: 34, name: 'Kankuro', nameRu: 'Канкуро', emoji: '🎭', color1: '#F2D2BD', color2: '#E8B298' },
  { id: 35, name: 'Konan', nameRu: 'Конан', emoji: '📄', color1: '#D9AFD9', color2: '#97D9E1' },
  { id: 36, name: 'Yamato', nameRu: 'Ямато', emoji: '🌲', color1: '#97D9E1', color2: '#D9AFD9' },
  { id: 37, name: 'Sai', nameRu: 'Сай', emoji: '🖌️', color1: '#CBE86B', color2: '#F2E7DC' },
  { id: 38, name: 'Kurenai', nameRu: 'Куренай Юхи', emoji: '🌹', color1: '#F2C94C', color2: '#F2994A' },
  { id: 39, name: 'Asuma', nameRu: 'Асума Сарутоби', emoji: '🚬', color1: '#F38181', color2: '#FCE38A' },
  { id: 40, name: 'Hiruzen', nameRu: 'Хирузен Сарутоби', emoji: '👴', color1: '#95E1D3', color2: '#F38181' },
  { id: 41, name: 'Danzo', nameRu: 'Данзо Шимура', emoji: '🦴', color1: '#AA96DA', color2: '#FCBAD3' },
  { id: 42, name: 'Zabuza', nameRu: 'Забуза Момочи', emoji: '⚔️', color1: '#FCBAD3', color2: '#FFFFD2' },
  { id: 43, name: 'Haku', nameRu: 'Хаку', emoji: '❄️', color1: '#FFFFD2', color2: '#A8E6CE' },
  { id: 44, name: 'Kabuto', nameRu: 'Кабуто Якуши', emoji: '🐉', color1: '#A8E6CE', color2: '#DCEDC2' },
  { id: 45, name: 'Suigetsu', nameRu: 'Суйгецу Хозуки', emoji: '💧', color1: '#DCEDC2', color2: '#FFD3B5' },
  { id: 46, name: 'Jugo', nameRu: 'Джуго', emoji: '😡', color1: '#FFD3B5', color2: '#FFAAA6' },
  { id: 47, name: 'Karin', nameRu: 'Карин', emoji: '👓', color1: '#FFAAA6', color2: '#FF8C94' },
  { id: 48, name: 'Tenten', nameRu: 'Тентен', emoji: '🎯', color1: '#FF8C94', color2: '#A8D8EA' },
  { id: 49, name: 'Zetsu', nameRu: 'Зецу', emoji: '🌿', color1: '#A8D8EA', color2: '#AA96DA' },
  { id: 50, name: 'Konohamaru', nameRu: 'Конохамару', emoji: '👦', color1: '#AA96DA', color2: '#FCBAD3' },
  { id: 51, name: 'Iruka', nameRu: 'Ирука Умино', emoji: '📚', color1: '#FCBAD3', color2: '#FFFFD2' },
  { id: 52, name: 'Kurama', nameRu: 'Курама (Девятихвостый)', emoji: '🦊', color1: '#FF6B35', color2: '#F7931E' }
];

const narutoDir = path.join(__dirname, '..', 'public', 'naruto');
if (!fs.existsSync(narutoDir)) {
  fs.mkdirSync(narutoDir, { recursive: true });
  console.log('✅ Папка public/naruto создана!');
}

// Создаём красивые SVG
function createBeautifulSVG(hero) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="700" xmlns="http://www.w3.org/2000/svg">
  <!-- Градиентный фон -->
  <defs>
    <linearGradient id="grad${hero.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${hero.color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${hero.color2};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow${hero.id}">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="4" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.5"/>
      </feComponentTransfer>
      <feMerge> 
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/> 
      </feMerge>
    </filter>
  </defs>
  
  <!-- Фон с градиентом -->
  <rect width="500" height="700" fill="url(#grad${hero.id})"/>
  
  <!-- Декоративные круги -->
  <circle cx="100" cy="100" r="80" fill="rgba(255,255,255,0.1)"/>
  <circle cx="400" cy="600" r="100" fill="rgba(0,0,0,0.1)"/>
  
  <!-- Рамка -->
  <rect x="15" y="15" width="470" height="670" fill="none" stroke="white" stroke-width="6" rx="20"/>
  
  <!-- Эмодзи (крупно) -->
  <text x="250" y="300" font-family="Arial, sans-serif" font-size="180" fill="white" text-anchor="middle" filter="url(#shadow${hero.id})">${hero.emoji}</text>
  
  <!-- Имя (English) -->
  <text x="250" y="450" font-family="Arial, sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle" filter="url(#shadow${hero.id})">${hero.name.toUpperCase()}</text>
  
  <!-- Имя (Русское) -->
  <text x="250" y="500" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="rgba(255,255,255,0.9)" text-anchor="middle">${hero.nameRu}</text>
  
  <!-- Узор Узумаки (спираль) -->
  <circle cx="250" cy="600" r="40" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
  <path d="M 250 560 Q 270 580 250 600 Q 230 580 250 560" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="3"/>
  
  <!-- Номер -->
  <text x="250" y="640" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle" filter="url(#shadow${hero.id})">#{hero.id}</text>
  
  <!-- Бренд -->
  <text x="250" y="670" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)" text-anchor="middle">NARUTO COLLECTION</text>
</svg>`;
}

console.log('🚀 СОЗДАЁМ 52 НАРУТО SVG С ЭМОДЗИ!');
console.log('📁 Папка: public/naruto/');
console.log('='.repeat(70));

let success = 0;

NARUTO_HEROES.forEach(hero => {
  const filepath = path.join(narutoDir, `${hero.id}.svg`);
  
  try {
    const svg = createBeautifulSVG(hero);
    fs.writeFileSync(filepath, svg);
    console.log(`✅ ${String(hero.id).padStart(2, '0')}. ${hero.name.padEnd(20)} ${hero.emoji} → ${hero.id}.svg`);
    success++;
  } catch (error) {
    console.error(`❌ ФЕЙЛ: ${hero.name} - ${error.message}`);
  }
});

console.log('='.repeat(70));
console.log('');
console.log('🎉 ГЕНЕРАЦИЯ ЗАВЕРШЕНА!');
console.log(`✅ Успешно: ${success}/${NARUTO_HEROES.length}`);
console.log('');
console.log('🎮 ГОТОВО! Файлы: public/naruto/1.svg ... public/naruto/52.svg');

