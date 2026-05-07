// ============================================================
// СКРИПТ ДЛЯ ЗАГРУЗКИ 52 ПОКЕМОНОВ В SUPABASE STORAGE
// ============================================================

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// ✅ КОНФИГ SUPABASE (ТОЛЬКО ИЗ ENV, БЕЗ ХАРДКОДА)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ОШИБКА: Не указаны SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  console.error('Добавь их в .env.local:');
  console.error('SUPABASE_URL=https://your-project.supabase.co  (или NEXT_PUBLIC_SUPABASE_URL)');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

const BUCKET_NAME = 'pokemon-images';

// Функция загрузки изображения из URL
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Функция загрузки в Supabase Storage
async function uploadToStorage(buffer, fileName, pokemon) {
  try {
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}

// Главная функция
async function uploadAllPokemon() {
  console.log('🚀 НАЧИНАЕМ ЗАГРУЗКУ 52 ПОКЕМОНОВ В SUPABASE STORAGE!');
  console.log('='.repeat(60));
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}`);
  console.log('='.repeat(60));
  
  const total = POKEMON_LIST.length;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < total; i++) {
    const pokemon = POKEMON_LIST[i];
    const index = i + 1;
    const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
    const fileName = `${index}.png`;

    try {
      // Скачиваем изображение
      const buffer = await downloadImage(url);
      
      // Загружаем в Storage
      await uploadToStorage(buffer, fileName, pokemon);
      
      console.log(`✅ ${index}. ${pokemon.name.padEnd(15)} (${pokemon.nameRu}) → ${BUCKET_NAME}/${fileName}`);
      success++;
      
      // Небольшая задержка
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ ФЕЙЛ: ${pokemon.name} - ${error.message}`);
      failed++;
    }
  }

  console.log('='.repeat(60));
  console.log('🎉 ЗАГРУЗКА ЗАВЕРШЕНА!');
  console.log(`✅ Успешно: ${success}/${total}`);
  if (failed > 0) {
    console.log(`❌ Ошибок: ${failed}/${total}`);
  }
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 СПИСОК ПОКЕМОНОВ:');
  console.log('');
  
  POKEMON_LIST.forEach((pokemon, i) => {
    const num = String(i + 1).padStart(2, ' ');
    console.log(`${num}. ${pokemon.name.padEnd(15)} (${pokemon.nameRu})`);
  });
  
  console.log('');
  console.log('🔗 Доступ к изображениям:');
  console.log(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/1.png`);
  console.log(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/2.png`);
  console.log('...');
}

// Запускаем!
uploadAllPokemon().catch((error) => {
  console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
  process.exit(1);
});

