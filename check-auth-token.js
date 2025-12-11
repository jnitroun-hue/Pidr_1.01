// Скрипт для проверки JWT токена в браузере
// Выполните в консоли браузера (F12)

console.log('🔍 ПРОВЕРКА JWT ТОКЕНА');

// 1. Проверяем cookie
const cookies = document.cookie.split(';').reduce((acc, cookie) => {
  const [key, value] = cookie.trim().split('=');
  acc[key] = value;
  return acc;
}, {});

console.log('🍪 Все cookies:', cookies);

if (cookies.auth_token) {
  console.log('✅ auth_token найден!');
  console.log('🔑 Токен (первые 50 символов):', cookies.auth_token.substring(0, 50) + '...');
  
  // 2. Проверяем API
  fetch('/api/auth', {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => {
    console.log('📡 API ответ:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📊 Данные пользователя:', data);
  })
  .catch(error => {
    console.error('❌ Ошибка API:', error);
  });
  
} else {
  console.log('❌ auth_token НЕ найден в cookies');
}

// 3. Попробуем декодировать JWT (только payload, без проверки подписи)
if (cookies.auth_token) {
  try {
    const payload = JSON.parse(atob(cookies.auth_token.split('.')[1]));
    console.log('🔓 JWT payload:', payload);
    console.log('⏰ Expires:', new Date(payload.exp * 1000));
  } catch (e) {
    console.error('❌ Не удалось декодировать JWT:', e);
  }
}
