// ============================================================
// СКРИПТ ДЛЯ АВТОЗАГРУЗКИ 52 ПОКЕМОНОВ ИЗ PokeAPI
// СОХРАНЯЕТ В: public/pokemon/
// ============================================================

const https = require('https');
const fs = require('fs');
const path = require('path');

// ✅ 52 ПОКЕМОНА (САМЫЕ ПОПУЛЯРНЫЕ И КРАСИВЫЕ!)
const POKEMON_LIST = [
  { id: 1, name: 'Bulbasaur', nameRu: 'Бульбазавр' },
  { id: 4, name: 'Charmander', nameRu: 'Чармандер' },
  { id: 7, name: 'Squirtle', nameRu: 'Сквиртл' },
  { id: 25, name: 'Pikachu', nameRu: 'Пикачу' },
  { id: 6, name: 'Charizard', nameRu: 'Чаризард' },
  { id: 9, name: 'Blastoise', nameRu: 'Бластойз' },
  { id: 3, name: 'Venusaur', nameRu: 'Венузавр' },
  { id: 39, name: 'Jigglypuff', nameRu: 'Джигглипафф' },
  { id: 94, name: 'Gengar', nameRu: 'Генгар' },
  { id: 150, name: 'Mewtwo', nameRu: 'Мьюту' },
  { id: 151, name: 'Mew', nameRu: 'Мью' },
  { id: 143, name: 'Snorlax', nameRu: 'Снорлакс' },
  { id: 54, name: 'Psyduck', nameRu: 'Псайдак' },
  { id: 133, name: 'Eevee', nameRu: 'Иви' },
  { id: 12, name: 'Butterfree', nameRu: 'Баттерфри' },
  { id: 130, name: 'Gyarados', nameRu: 'Гьярадос' },
  { id: 149, name: 'Dragonite', nameRu: 'Драгонайт' },
  { id: 144, name: 'Articuno', nameRu: 'Артикуно' },
  { id: 145, name: 'Zapdos', nameRu: 'Заподос' },
  { id: 146, name: 'Moltres', nameRu: 'Молтрес' },
  { id: 26, name: 'Raichu', nameRu: 'Райчу' },
  { id: 38, name: 'Ninetales', nameRu: 'Найнтейлс' },
  { id: 59, name: 'Arcanine', nameRu: 'Арканайн' },
  { id: 65, name: 'Alakazam', nameRu: 'Алаказам' },
  { id: 68, name: 'Machamp', nameRu: 'Мачамп' },
  { id: 76, name: 'Golem', nameRu: 'Голем' },
  { id: 80, name: 'Slowbro', nameRu: 'Слоубро' },
  { id: 91, name: 'Cloyster', nameRu: 'Клойстер' },
  { id: 106, name: 'Hitmonlee', nameRu: 'Хитмонли' },
  { id: 107, name: 'Hitmonchan', nameRu: 'Хитмончан' },
  { id: 113, name: 'Chansey', nameRu: 'Чанси' },
  { id: 115, name: 'Kangaskhan', nameRu: 'Кангасхан' },
  { id: 121, name: 'Starmie', nameRu: 'Старми' },
  { id: 131, name: 'Lapras', nameRu: 'Лапрас' },
  { id: 134, name: 'Vaporeon', nameRu: 'Вапореон' },
  { id: 135, name: 'Jolteon', nameRu: 'Джолтеон' },
  { id: 136, name: 'Flareon', nameRu: 'Флареон' },
  { id: 196, name: 'Espeon', nameRu: 'Эспеон' },
  { id: 197, name: 'Umbreon', nameRu: 'Амбреон' },
  { id: 448, name: 'Lucario', nameRu: 'Лукарио' },
  { id: 445, name: 'Garchomp', nameRu: 'Гарчомп' },
  { id: 384, name: 'Rayquaza', nameRu: 'Райкваза' },
  { id: 249, name: 'Lugia', nameRu: 'Лугия' },
  { id: 250, name: 'Ho-Oh', nameRu: 'Хо-Ох' },
  { id: 282, name: 'Gardevoir', nameRu: 'Гардевуар' },
  { id: 302, name: 'Sableye', nameRu: 'Сэйблай' },
  { id: 373, name: 'Salamence', nameRu: 'Саламенс' },
  { id: 382, name: 'Kyogre', nameRu: 'Кайогр' },
  { id: 383, name: 'Groudon', nameRu: 'Граудон' },
  { id: 430, name: 'Honchkrow', nameRu: 'Хончкроу' },
  { id: 461, name: 'Weavile', nameRu: 'Уивайл' },
  { id: 474, name: 'Porygon-Z', nameRu: 'Поригон-Z' }
];

// Создаем папку если её нет
const pokemonDir = path.join(__dirname, '..', 'public', 'pokemon');
if (!fs.existsSync(pokemonDir)) {
  fs.mkdirSync(pokemonDir, { recursive: true });
  console.log('✅ Папка public/pokemon создана!');
} else {
  console.log('📁 Папка public/pokemon уже существует');
}

// Функция загрузки изображения
function downloadImage(url, filepath, index, pokemon) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        console.error(`❌ Ошибка загрузки ${pokemon.name}: ${response.statusCode}`);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const file = fs.createWriteStream(filepath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`✅ ${String(index).padStart(2, ' ')}. ${pokemon.name.padEnd(15)} (${pokemon.nameRu.padEnd(12)}) → ${index}.png`);
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filepath, () => {});
        console.error(`❌ Ошибка записи ${pokemon.name}:`, err.message);
        reject(err);
      });
    }).on('error', (err) => {
      console.error(`❌ Ошибка сети для ${pokemon.name}:`, err.message);
      reject(err);
    });
  });
}

// Главная функция
async function downloadAllPokemon() {
  console.log('🚀 НАЧИНАЕМ ЗАГРУЗКУ 52 ПОКЕМОНОВ!');
  console.log('📁 Папка: public/pokemon/');
  console.log('🔗 Источник: PokeAPI (Official Artwork)');
  console.log('='.repeat(70));
  
  const total = POKEMON_LIST.length;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const pokemon = POKEMON_LIST[i];
    const index = i + 1;
    const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
    const filepath = path.join(pokemonDir, `${index}.png`);

    // Пропускаем если файл уже существует
    if (fs.existsSync(filepath)) {
      console.log(`⏭️  ${String(index).padStart(2, ' ')}. ${pokemon.name.padEnd(15)} (${pokemon.nameRu.padEnd(12)}) → УЖЕ СУЩЕСТВУЕТ`);
      success++;
      continue;
    }

    try {
      await downloadImage(url, filepath, index, pokemon);
      success++;
      
      // Небольшая задержка чтобы не заDDOS'ить GitHub
      await new Promise(resolve => setTimeout(resolve, 150));
    } catch (error) {
      console.error(`❌ ФЕЙЛ: ${pokemon.name}`);
      failed++;
    }
  }

  console.log('='.repeat(70));
  console.log('');
  console.log('🎉 ЗАГРУЗКА ЗАВЕРШЕНА!');
  console.log(`✅ Успешно: ${success}/${total}`);
  if (failed > 0) {
    console.log(`❌ Ошибок: ${failed}/${total}`);
  }
  console.log('');
  console.log('='.repeat(70));
  console.log('📋 СПИСОК ВСЕХ ПОКЕМОНОВ:');
  console.log('='.repeat(70));
  
  // Выводим в 2 колонки
  for (let i = 0; i < POKEMON_LIST.length; i += 2) {
    const left = POKEMON_LIST[i];
    const right = POKEMON_LIST[i + 1];
    
    const leftNum = String(i + 1).padStart(2, ' ');
    const leftName = `${leftNum}. ${left.name.padEnd(13)} (${left.nameRu})`;
    
    if (right) {
      const rightNum = String(i + 2).padStart(2, ' ');
      const rightName = `${rightNum}. ${right.name.padEnd(13)} (${right.nameRu})`;
      console.log(`${leftName.padEnd(35)} │ ${rightName}`);
    } else {
      console.log(leftName);
    }
  }
  
  console.log('='.repeat(70));
  console.log('');
  console.log('🎮 ГОТОВО К ИСПОЛЬЗОВАНИЮ!');
  console.log('📁 Картинки находятся в: public/pokemon/1.png ... public/pokemon/52.png');
  console.log('🔗 Доступ в браузере: /pokemon/1.png ... /pokemon/52.png');
  console.log('');
}

// Запускаем!
downloadAllPokemon().catch(console.error);
