# Инструкции по настройке P.I.D.R.

Пошаговые гайды «как для ребёнка» — что нажать, что скопировать и куда вставить.

| Что настраиваем | Файл |
|-----------------|------|
| Домен reg.ru → Vercel | [domain/REGRU_VERCEL_DOMAIN.md](./domain/REGRU_VERCEL_DOMAIN.md) |
| VK Mini App | [vk/VK_MINI_APP_GUIDE.md](./vk/VK_MINI_APP_GUIDE.md) |
| Поля для копирования VK | [vk/COPY_PASTE_FIELDS.txt](./vk/COPY_PASTE_FIELDS.txt) |
| ЮKassa (оплата ₽) | [payments/YOOKASSA_SETUP.md](./payments/YOOKASSA_SETUP.md) |

**Ваши адреса (пример):**
- Vercel: `https://pidr-1-01.vercel.app`
- Свой домен: `https://www.pidr1-01.ru` (после настройки DNS)

**Порядок настройки (рекомендуемый):**
1. Сначала домен reg.ru → Vercel
2. Потом VK Mini App (нужен рабочий HTTPS-адрес)
3. Потом ЮKassa (webhook тоже на HTTPS)
