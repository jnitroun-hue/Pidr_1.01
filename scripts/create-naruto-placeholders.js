// ============================================================
// ПРОСТОЙ СКРИПТ ДЛЯ СОЗДАНИЯ 52 НАРУТО PLACEHOLDER'ОВ
// БЕЗ ВНЕШНИХ ЗАВИСИМОСТЕЙ! ТОЛЬКО NODE.JS!
// СОХРАНЯЕТ В: public/naruto/
// ============================================================

const fs = require('fs');
const path = require('path');

// ✅ 52 ГЕРОЯ НАРУТО
const NARUTO_LIST = [
  { id: 1, name: 'Naruto Uzumaki', nameRu: 'Наруто Узумаки', color: '#FF6B35' },
  { id: 2, name: 'Sasuke Uchiha', nameRu: 'Саске Учиха', color: '#667EEA' },
  { id: 3, name: 'Sakura Haruno', nameRu: 'Сакура Харуно', color: '#F093FB' },
  { id: 4, name: 'Kakashi Hatake', nameRu: 'Какаши Хатакэ', color: '#4FACFE' },
  { id: 5, name: 'Itachi Uchiha', nameRu: 'Итачи Учиха', color: '#43E97B' },
  { id: 6, name: 'Gaara', nameRu: 'Гаара', color: '#FA709A' },
  { id: 7, name: 'Rock Lee', nameRu: 'Рок Ли', color: '#30CFD0' },
  { id: 8, name: 'Neji Hyuga', nameRu: 'Неджи Хьюга', color: '#A8EDEA' },
  { id: 9, name: 'Hinata Hyuga', nameRu: 'Хината Хьюга', color: '#FED6E3' },
  { id: 10, name: 'Shikamaru Nara', nameRu: 'Шикамару Нара', color: '#FFD89B' },
  { id: 11, name: 'Minato Namikaze', nameRu: 'Минато Намикадзе', color: '#FDC830' },
  { id: 12, name: 'Jiraiya', nameRu: 'Джирайя', color: '#F37335' },
  { id: 13, name: 'Tsunade', nameRu: 'Цунаде', color: '#FAD961' },
  { id: 14, name: 'Orochimaru', nameRu: 'Орочимару', color: '#9561E2' },
  { id: 15, name: 'Pain (Nagato)', nameRu: 'Пейн (Нагато)', color: '#F12711' },
  { id: 16, name: 'Madara Uchiha', nameRu: 'Мадара Учиха', color: '#F5515F' },
  { id: 17, name: 'Obito Uchiha', nameRu: 'Обито Учиха', color: '#9D50BB' },
  { id: 18, name: 'Killer Bee', nameRu: 'Киллер Би', color: '#6A3093' },
  { id: 19, name: 'Shisui Uchiha', nameRu: 'Шисуи Учиха', color: '#FC466B' },
  { id: 20, name: 'Might Guy', nameRu: 'Майто Гай', color: '#3F5EFB' },
  { id: 21, name: 'Tobirama Senju', nameRu: 'Тобирама Сенджу', color: '#11998E' },
  { id: 22, name: 'Hashirama Senju', nameRu: 'Хаширама Сенджу', color: '#38EF7D' },
  { id: 23, name: 'Kaguya Otsutsuki', nameRu: 'Кагуя Оцуцуки', color: '#C471F5' },
  { id: 24, name: 'Deidara', nameRu: 'Дейдара', color: '#FA8BFF' },
  { id: 25, name: 'Sasori', nameRu: 'Сасори', color: '#2BDA8E' },
  { id: 26, name: 'Hidan', nameRu: 'Хидан', color: '#6A82FB' },
  { id: 27, name: 'Kakuzu', nameRu: 'Какузу', color: '#FC5C7D' },
  { id: 28, name: 'Kisame Hoshigaki', nameRu: 'Кисаме Хошигаки', color: '#8EC5FC' },
  { id: 29, name: 'Ino Yamanaka', nameRu: 'Ино Яманака', color: '#E0C3FC' },
  { id: 30, name: 'Choji Akimichi', nameRu: 'Чоджи Акимичи', color: '#8FD3F4' },
  { id: 31, name: 'Kiba Inuzuka', nameRu: 'Киба Инузука', color: '#FFA8A8' },
  { id: 32, name: 'Shino Aburame', nameRu: 'Шино Абураме', color: '#FEADA6' },
  { id: 33, name: 'Temari', nameRu: 'Темари', color: '#A3BDED' },
  { id: 34, name: 'Kankuro', nameRu: 'Канкуро', color: '#F2D2BD' },
  { id: 35, name: 'Konan', nameRu: 'Конан', color: '#D9AFD9' },
  { id: 36, name: 'Yamato', nameRu: 'Ямато', color: '#97D9E1' },
  { id: 37, name: 'Sai', nameRu: 'Сай', color: '#CBE86B' },
  { id: 38, name: 'Kurenai Yuhi', nameRu: 'Куренай Юхи', color: '#F2C94C' },
  { id: 39, name: 'Asuma Sarutobi', nameRu: 'Асума Сарутоби', color: '#F38181' },
  { id: 40, name: 'Hiruzen Sarutobi', nameRu: 'Хирузен Сарутоби', color: '#95E1D3' },
  { id: 41, name: 'Danzo Shimura', nameRu: 'Данзо Шимура', color: '#AA96DA' },
  { id: 42, name: 'Zabuza Momochi', nameRu: 'Забуза Момочи', color: '#FCBAD3' },
  { id: 43, name: 'Haku', nameRu: 'Хаку', color: '#FFFFD2' },
  { id: 44, name: 'Kabuto Yakushi', nameRu: 'Кабуто Якуши', color: '#A8E6CE' },
  { id: 45, name: 'Suigetsu Hozuki', nameRu: 'Суйгецу Хозуки', color: '#DCEDC2' },
  { id: 46, name: 'Jugo', nameRu: 'Джуго', color: '#FFD3B5' },
  { id: 47, name: 'Karin', nameRu: 'Карин', color: '#FFAAA6' },
  { id: 48, name: 'Tenten', nameRu: 'Тентен', color: '#FF8C94' },
  { id: 49, name: 'Zetsu', nameRu: 'Зецу', color: '#A8D8EA' },
  { id: 50, name: 'Konohamaru', nameRu: 'Конохамару', color: '#AA96DA' },
  { id: 51, name: 'Iruka Umino', nameRu: 'Ирука Умино', color: '#FCBAD3' },
  { id: 52, name: 'Kurama (Nine-Tails)', nameRu: 'Курама (Девятихвостый)', color: '#FF6B35' }
];

// Создаем папку
const narutoDir = path.join(__dirname, '..', 'public', 'naruto');
if (!fs.existsSync(narutoDir)) {
  fs.mkdirSync(narutoDir, { recursive: true });
  console.log('✅ Папка public/naruto создана!');
}

// Создаём SVG → PNG через встроенный data URL
function createSVGPlaceholder(index, character) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="500" height="700" xmlns="http://www.w3.org/2000/svg">
  <!-- Градиентный фон -->
  <defs>
    <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${character.color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Фон -->
  <rect width="500" height="700" fill="url(#grad${index})"/>
  
  <!-- Рамка -->
  <rect x="10" y="10" width="480" height="680" fill="none" stroke="white" stroke-width="8"/>
  
  <!-- Имя (English) -->
  <text x="250" y="280" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">${character.name.toUpperCase()}</text>
  
  <!-- Имя (Русское) -->
  <text x="250" y="330" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">${character.nameRu}</text>
  
  <!-- Эмодзи (симуляция) -->
  <circle cx="250" cy="420" r="60" fill="rgba(255,255,255,0.2)"/>
  <text x="250" y="445" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle">🍥</text>
  
  <!-- Номер -->
  <text x="250" y="580" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">#${index}</text>
  
  <!-- Бренд -->
  <text x="250" y="650" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.6)" text-anchor="middle">NARUTO COLLECTION</text>
</svg>`;

  return Buffer.from(svg);
}

async function createAllNaruto() {
  console.log('🚀 СОЗДАЁМ 52 НАРУТО PLACEHOLDER (SVG)!');
  console.log('📁 Папка: public/naruto/');
  console.log('🎨 SVG с градиентами');
  console.log('='.repeat(70));
  
  const total = NARUTO_LIST.length;
  let success = 0;

  for (let i = 0; i < total; i++) {
    const character = NARUTO_LIST[i];
    const index = i + 1;
    const filepath = path.join(narutoDir, `${index}.svg`);

    // Пропускаем если файл уже существует
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  ${String(index).padStart(2, ' ')}. ${character.name.padEnd(25)} (${character.nameRu.padEnd(20)}) → УЖЕ СУЩЕСТВУЕТ`);
      success++;
      continue;
    }

    try {
      const buffer = createSVGPlaceholder(index, character);
      fs.writeFileSync(filepath, buffer);
      console.log(`✅ ${String(index).padStart(2, ' ')}. ${character.name.padEnd(25)} (${character.nameRu.padEnd(20)}) → ${index}.svg`);
      success++;
    } catch (error) {
      console.error(`❌ ФЕЙЛ: ${character.name} - ${error.message}`);
    }
  }

  console.log('='.repeat(70));
  console.log('');
  console.log('🎉 ГЕНЕРАЦИЯ ЗАВЕРШЕНА!');
  console.log(`✅ Успешно: ${success}/${total}`);
  console.log('');
  console.log('📋 СПИСОК:');
  
  for (let i = 0; i < NARUTO_LIST.length; i += 2) {
    const left = NARUTO_LIST[i];
    const right = NARUTO_LIST[i + 1];
    
    const leftNum = String(i + 1).padStart(2, ' ');
    const leftName = `${leftNum}. ${left.name.padEnd(20)} (${left.nameRu})`;
    
    if (right) {
      const rightNum = String(i + 2).padStart(2, ' ');
      const rightName = `${rightNum}. ${right.name.padEnd(20)} (${right.nameRu})`;
      console.log(`${leftName.padEnd(45)} │ ${rightName}`);
    } else {
      console.log(leftName);
    }
  }
  
  console.log('='.repeat(70));
  console.log('');
  console.log('🎮 ГОТОВО!');
  console.log('📁 Файлы: public/naruto/1.svg ... public/naruto/52.svg');
  console.log('🔗 Доступ: /naruto/1.svg ... /naruto/52.svg');
  console.log('');
  console.log('💡 Браузер автоматически отрендерит SVG как картинку!');
}

createAllNaruto().catch(console.error);

