// ============================================================
// СКРИПТ ДЛЯ АВТОЗАГРУЗКИ 52 ГЕРОЕВ НАРУТО
// СОХРАНЯЕТ В: public/naruto/
// ============================================================

const https = require('https');
const fs = require('fs');
const path = require('path');

// ✅ 52 ГЕРОЯ НАРУТО (САМЫЕ ПОПУЛЯРНЫЕ!)
const NARUTO_LIST = [
  { id: 1, name: 'Naruto Uzumaki', nameRu: 'Наруто Узумаки', img: 'https://static.wikia.nocookie.net/naruto/images/d/d6/Naruto_Part_II.png' },
  { id: 2, name: 'Sasuke Uchiha', nameRu: 'Саске Учиха', img: 'https://static.wikia.nocookie.net/naruto/images/2/21/Sasuke_Part_2.png' },
  { id: 3, name: 'Sakura Haruno', nameRu: 'Сакура Харуно', img: 'https://static.wikia.nocookie.net/naruto/images/f/f1/Sakura_Part_II.png' },
  { id: 4, name: 'Kakashi Hatake', nameRu: 'Какаши Хатакэ', img: 'https://static.wikia.nocookie.net/naruto/images/2/27/Kakashi_Hatake.png' },
  { id: 5, name: 'Itachi Uchiha', nameRu: 'Итачи Учиха', img: 'https://static.wikia.nocookie.net/naruto/images/b/bb/Itachi.png' },
  { id: 6, name: 'Gaara', nameRu: 'Гаара', img: 'https://static.wikia.nocookie.net/naruto/images/0/0f/Gaara_Part_II.png' },
  { id: 7, name: 'Rock Lee', nameRu: 'Рок Ли', img: 'https://static.wikia.nocookie.net/naruto/images/7/7d/Rock_Lee_Part_II.png' },
  { id: 8, name: 'Neji Hyuga', nameRu: 'Неджи Хьюга', img: 'https://static.wikia.nocookie.net/naruto/images/7/70/Neji_Part_II.png' },
  { id: 9, name: 'Hinata Hyuga', nameRu: 'Хината Хьюга', img: 'https://static.wikia.nocookie.net/naruto/images/d/d2/Hinata_Part_II.png' },
  { id: 10, name: 'Shikamaru Nara', nameRu: 'Шикамару Нара', img: 'https://static.wikia.nocookie.net/naruto/images/a/a8/Shikamaru_Nara.png' },
  { id: 11, name: 'Minato Namikaze', nameRu: 'Минато Намикадзе', img: 'https://static.wikia.nocookie.net/naruto/images/b/b8/Minato_Namikaze.png' },
  { id: 12, name: 'Jiraiya', nameRu: 'Джирайя', img: 'https://static.wikia.nocookie.net/naruto/images/2/21/Jiraiya.png' },
  { id: 13, name: 'Tsunade', nameRu: 'Цунаде', img: 'https://static.wikia.nocookie.net/naruto/images/b/b3/Tsunade_infobox2.png' },
  { id: 14, name: 'Orochimaru', nameRu: 'Орочимару', img: 'https://static.wikia.nocookie.net/naruto/images/4/41/Orochimaru_Infobox.png' },
  { id: 15, name: 'Pain (Nagato)', nameRu: 'Пейн (Нагато)', img: 'https://static.wikia.nocookie.net/naruto/images/6/6e/Pain_Rikudo.png' },
  { id: 16, name: 'Madara Uchiha', nameRu: 'Мадара Учиха', img: 'https://static.wikia.nocookie.net/naruto/images/b/bc/Madara_Uchiha.png' },
  { id: 17, name: 'Obito Uchiha', nameRu: 'Обито Учиха', img: 'https://static.wikia.nocookie.net/naruto/images/a/a5/Obito_Jinch%C5%ABriki.png' },
  { id: 18, name: 'Killer Bee', nameRu: 'Киллер Би', img: 'https://static.wikia.nocookie.net/naruto/images/5/51/Killer_B.png' },
  { id: 19, name: 'Shisui Uchiha', nameRu: 'Шисуи Учиха', img: 'https://static.wikia.nocookie.net/naruto/images/9/90/Shisui_Uchiha.png' },
  { id: 20, name: 'Might Guy', nameRu: 'Майто Гай', img: 'https://static.wikia.nocookie.net/naruto/images/7/77/Might_Guy.png' },
  { id: 21, name: 'Tobirama Senju', nameRu: 'Тобирама Сенджу', img: 'https://static.wikia.nocookie.net/naruto/images/6/60/Tobirama_Senju.png' },
  { id: 22, name: 'Hashirama Senju', nameRu: 'Хаширама Сенджу', img: 'https://static.wikia.nocookie.net/naruto/images/7/7e/Hashirama_Senju.png' },
  { id: 23, name: 'Kaguya Otsutsuki', nameRu: 'Кагуя Оцуцуки', img: 'https://static.wikia.nocookie.net/naruto/images/1/15/Kaguya_infobox.png' },
  { id: 24, name: 'Deidara', nameRu: 'Дейдара', img: 'https://static.wikia.nocookie.net/naruto/images/5/50/Deidara.png' },
  { id: 25, name: 'Sasori', nameRu: 'Сасори', img: 'https://static.wikia.nocookie.net/naruto/images/f/f7/Sasori.png' },
  { id: 26, name: 'Hidan', nameRu: 'Хидан', img: 'https://static.wikia.nocookie.net/naruto/images/9/97/Hidan.png' },
  { id: 27, name: 'Kakuzu', nameRu: 'Какузу', img: 'https://static.wikia.nocookie.net/naruto/images/b/be/Kakuzu.png' },
  { id: 28, name: 'Kisame Hoshigaki', nameRu: 'Кисаме Хошигаки', img: 'https://static.wikia.nocookie.net/naruto/images/5/5c/Kisame_Hoshigaki.png' },
  { id: 29, name: 'Ino Yamanaka', nameRu: 'Ино Яманака', img: 'https://static.wikia.nocookie.net/naruto/images/9/93/Ino_Part_II.png' },
  { id: 30, name: 'Choji Akimichi', nameRu: 'Чоджи Акимичи', img: 'https://static.wikia.nocookie.net/naruto/images/4/49/Ch%C5%8Dji_Akimichi.png' },
  { id: 31, name: 'Kiba Inuzuka', nameRu: 'Киба Инузука', img: 'https://static.wikia.nocookie.net/naruto/images/b/b7/Kiba_Inuzuka.png' },
  { id: 32, name: 'Shino Aburame', nameRu: 'Шино Абураме', img: 'https://static.wikia.nocookie.net/naruto/images/0/05/Shino_Aburame.png' },
  { id: 33, name: 'Temari', nameRu: 'Темари', img: 'https://static.wikia.nocookie.net/naruto/images/1/12/Temari.png' },
  { id: 34, name: 'Kankuro', nameRu: 'Канкуро', img: 'https://static.wikia.nocookie.net/naruto/images/9/95/Kankur%C5%8D.png' },
  { id: 35, name: 'Konan', nameRu: 'Конан', img: 'https://static.wikia.nocookie.net/naruto/images/e/e3/Konan.png' },
  { id: 36, name: 'Yamato', nameRu: 'Ямато', img: 'https://static.wikia.nocookie.net/naruto/images/4/46/Yamato.png' },
  { id: 37, name: 'Sai', nameRu: 'Сай', img: 'https://static.wikia.nocookie.net/naruto/images/9/90/Sai_Infobox.png' },
  { id: 38, name: 'Kurenai Yuhi', nameRu: 'Куренай Юхи', img: 'https://static.wikia.nocookie.net/naruto/images/4/45/Kurenai_Y%C5%ABhi.png' },
  { id: 39, name: 'Asuma Sarutobi', nameRu: 'Асума Сарутоби', img: 'https://static.wikia.nocookie.net/naruto/images/4/41/Asuma_Sarutobi.png' },
  { id: 40, name: 'Hiruzen Sarutobi', nameRu: 'Хирузен Сарутоби', img: 'https://static.wikia.nocookie.net/naruto/images/6/69/Hiruzen_Sarutobi.png' },
  { id: 41, name: 'Danzo Shimura', nameRu: 'Данзо Шимура', img: 'https://static.wikia.nocookie.net/naruto/images/9/9f/Danz%C5%8D_Shimura.png' },
  { id: 42, name: 'Zabuza Momochi', nameRu: 'Забуза Момочи', img: 'https://static.wikia.nocookie.net/naruto/images/b/b1/Zabuza_Momochi.png' },
  { id: 43, name: 'Haku', nameRu: 'Хаку', img: 'https://static.wikia.nocookie.net/naruto/images/9/9c/Haku.png' },
  { id: 44, name: 'Kabuto Yakushi', nameRu: 'Кабуто Якуши', img: 'https://static.wikia.nocookie.net/naruto/images/a/a5/Kabuto_Yakushi.png' },
  { id: 45, name: 'Suigetsu Hozuki', nameRu: 'Суйгецу Хозуки', img: 'https://static.wikia.nocookie.net/naruto/images/8/84/Suigetsu_H%C5%8Dzuki.png' },
  { id: 46, name: 'Jugo', nameRu: 'Джуго', img: 'https://static.wikia.nocookie.net/naruto/images/b/b1/J%C5%ABgo.png' },
  { id: 47, name: 'Karin', nameRu: 'Карин', img: 'https://static.wikia.nocookie.net/naruto/images/0/0f/Karin.png' },
  { id: 48, name: 'Tenten', nameRu: 'Тентен', img: 'https://static.wikia.nocookie.net/naruto/images/b/bb/Tenten.png' },
  { id: 49, name: 'Zetsu', nameRu: 'Зецу', img: 'https://static.wikia.nocookie.net/naruto/images/e/e5/Zetsu_Infobox.png' },
  { id: 50, name: 'Konohamaru', nameRu: 'Конохамару', img: 'https://static.wikia.nocookie.net/naruto/images/0/0c/Konohamaru_Sarutobi.png' },
  { id: 51, name: 'Iruka Umino', nameRu: 'Ирука Умино', img: 'https://static.wikia.nocookie.net/naruto/images/c/cb/Iruka_Umino.png' },
  { id: 52, name: 'Kurama (Nine-Tails)', nameRu: 'Курама (Девятихвостый)', img: 'https://static.wikia.nocookie.net/naruto/images/4/4c/Kurama.png' }
];

// ВНИМАНИЕ: Wikia требует User-Agent!
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Создаем папку если её нет
const narutoDir = path.join(__dirname, '..', 'public', 'naruto');
if (!fs.existsSync(narutoDir)) {
  fs.mkdirSync(narutoDir, { recursive: true });
  console.log('✅ Папка public/naruto создана!');
} else {
  console.log('📁 Папка public/naruto уже существует');
}

// Функция загрузки изображения
function downloadImage(url, filepath, index, character) {
  return new Promise((resolve, reject) => {
    // Для Wikia нужны особые заголовки
    const options = {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    };

    https.get(url, options, (response) => {
      // Обрабатываем редиректы
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, filepath, index, character)
            .then(resolve)
            .catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        console.error(`❌ Ошибка загрузки ${character.name}: ${response.statusCode}`);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(filepath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`✅ ${String(index).padStart(2, ' ')}. ${character.name.padEnd(25)} (${character.nameRu.padEnd(20)}) → ${index}.png`);
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filepath, () => {});
        console.error(`❌ Ошибка записи ${character.name}:`, err.message);
        reject(err);
      });
    }).on('error', (err) => {
      console.error(`❌ Ошибка сети для ${character.name}:`, err.message);
      reject(err);
    });
  });
}

// Главная функция
async function downloadAllNaruto() {
  console.log('🚀 НАЧИНАЕМ ЗАГРУЗКУ 52 ГЕРОЕВ НАРУТО!');
  console.log('📁 Папка: public/naruto/');
  console.log('🔗 Источник: Narutopedia (Wikia)');
  console.log('⚠️  ВНИМАНИЕ: Wikia может блокировать запросы, используем User-Agent');
  console.log('='.repeat(80));
  
  const total = NARUTO_LIST.length;
  let success = 0;
  let failed = 0;
  const failedList = [];

  for (let i = 0; i < total; i++) {
    const character = NARUTO_LIST[i];
    const index = i + 1;
    const filepath = path.join(narutoDir, `${index}.png`);

    // Пропускаем если файл уже существует
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  ${String(index).padStart(2, ' ')}. ${character.name.padEnd(25)} (${character.nameRu.padEnd(20)}) → УЖЕ СУЩЕСТВУЕТ`);
      success++;
      continue;
    }

    try {
      await downloadImage(character.img, filepath, index, character);
      success++;
      
      // Задержка чтобы не заблокировали
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ ФЕЙЛ: ${character.name} - ${error.message}`);
      failedList.push({ index, character });
      failed++;
    }
  }

  console.log('='.repeat(80));
  console.log('');
  console.log('🎉 ЗАГРУЗКА ЗАВЕРШЕНА!');
  console.log(`✅ Успешно: ${success}/${total}`);
  if (failed > 0) {
    console.log(`❌ Ошибок: ${failed}/${total}`);
    console.log('');
    console.log('⚠️  ОШИБКИ ЗАГРУЗКИ (можно скачать вручную):');
    failedList.forEach(({ index, character }) => {
      console.log(`   ${index}. ${character.name} - ${character.img}`);
    });
  }
  console.log('');
  console.log('='.repeat(80));
  console.log('📋 СПИСОК ВСЕХ ГЕРОЕВ НАРУТО:');
  console.log('='.repeat(80));
  
  // Выводим в 2 колонки
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
  
  console.log('='.repeat(80));
  console.log('');
  console.log('🎮 ГОТОВО К ИСПОЛЬЗОВАНИЮ!');
  console.log('📁 Картинки находятся в: public/naruto/1.png ... public/naruto/52.png');
  console.log('🔗 Доступ в браузере: /naruto/1.png ... /naruto/52.png');
  console.log('');
  
  if (failed > 0) {
    console.log('⚠️  ЕСЛИ ЕСТЬ ОШИБКИ - МОЖНО:');
    console.log('   1. Запустить скрипт ещё раз');
    console.log('   2. Скачать картинки вручную по ссылкам выше');
    console.log('   3. Найти альтернативные изображения');
  }
}

// Запускаем!
downloadAllNaruto().catch(console.error);

