// bot.js
require('dotenv').config();
console.log("🚀 Bot запускается...");

const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const fetch = require('node-fetch');
const LocalSession = require('telegraf-session-local');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;
const SELF_URL = process.env.SELF_URL || null; // https://your-app.onrender.com (опционально, для пинга)
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN || !OWNER_CHAT_ID) {
  console.error('❌ Укажи BOT_TOKEN и OWNER_CHAT_ID в .env');
  process.exit(1);
}

// --- инициализация бота ---
const bot = new Telegraf(BOT_TOKEN);

// сессии в локальном файле sessions.json
bot.use(new LocalSession({ database: 'sessions.json' }).middleware());

// --- меню и данные ---
const mainMenu = Markup.inlineKeyboard([
  [ Markup.button.callback('Сауна поменьше', 'sauna_small') ],
  [ Markup.button.callback('Сауна побольше', 'sauna_big') ],
]);

const saunaInfo = {
  small: {
    title: 'Сауна поменьше',
    text: `Информация:
- До 5 человек
- Если больше 5 — доплата 1000 за каждого
- 7000 за час
- Минимум 2 часа
- Кухни нет`,
    map: 'https://go.2gis.com/30tRT',
    imgs: [
      'https://i.ibb.co/ty5QdSg/IMG-20251010-WA0006.jpg',
      'https://i.ibb.co/sp2ZfMXx/IMG-20251010-WA0004.jpg',
      'https://i.ibb.co/bgmtyCZ7/IMG-20251010-WA0005.jpg'
    ],
    video: 'https://files.catbox.moe/y9slc1.mp4'
  },
  big: {
    title: 'Сауна побольше',
    text: `Информация:
- До 8 человек
- Доплата за каждого сверх — 2000
- Стоимость: 12000
- Минимум 2 часа
- Кухни нет`,
    map: 'https://go.2gis.com/OQSBA',
    imgs: [
      'https://i.ibb.co/R4zfm85d/IMG-20251003-WA0008.jpg',
      'https://i.ibb.co/VpPhh83C/IMG-20251003-WA0004.jpg',
      'https://i.ibb.co/23s0WjgT/IMG-20251003-WA0005.jpg'
    ],
    video: 'https://files.catbox.moe/ol975e.mp4'
  }
};

// --- утилиты и защита от падений ---
async function safeAnswerCb(ctx) {
  try {
    await ctx.answerCbQuery();
  } catch (err) {
    // игнорируем устаревшие / недействительные callback'и
    console.warn('answerCbQuery error (ignored):', err && err.message ? err.message : err);
  }
}

// --- обработчики ---
bot.on('message', async (ctx) => {
  if (ctx.session && ctx.session.step) return; // если в процессе брони — не мешаем
  const kaz = 'Сәлем! Бізге хабарласқаныңыз үшін рахмет.';
  const rus = 'Привет! Спасибо за обращение.';
  await ctx.reply(`${kaz}\n${rus}`, mainMenu);
});

bot.action(['sauna_small', 'sauna_big'], async (ctx) => {
  await safeAnswerCb(ctx);
  const type = ctx.callbackQuery && ctx.callbackQuery.data === 'sauna_small' ? 'small' : 'big';
  const info = saunaInfo[type];

  try {
    for (const url of info.imgs) {
      try {
        await ctx.replyWithPhoto({ url });
      } catch (err) {
        console.warn('photo send error (skipped):', err && err.message ? err.message : err);
      }
    }
    if (info.video) {
      try {
        await ctx.replyWithVideo({ url: info.video });
      } catch (err) {
        console.warn('video send error (skipped):', err && err.message ? err.message : err);
      }
    }

    const text = `*${info.title}*\n\n${info.text}\n\n📍 [Посмотреть на карте](${info.map})`;
    await ctx.replyWithMarkdown(text, Markup.inlineKeyboard([
      [ Markup.button.callback('📅 Забронировать', `book_${type}`) ],
      [ Markup.button.callback('🔙 Назад', 'back_to_menu') ]
    ]));
  } catch (err) {
    console.error('Ошибка при отправке медиа/текста:', err);
    await ctx.reply('⚠️ Ошибка при загрузке материалов. Попробуйте позже.');
  }
});

bot.action('back_to_menu', async (ctx) => {
  await safeAnswerCb(ctx);
  await ctx.reply('Главное меню:', mainMenu);
});

// бронирование (простая состоятельная логика с сессией)
bot.action(/book_(.+)/, async (ctx) => {
  await safeAnswerCb(ctx);
  const type = ctx.match[1];
  ctx.session.booking = { type };
  ctx.session.step = 'ask_name';
  await ctx.reply('Введите ваше имя:');
});

bot.on('text', async (ctx) => {
  if (!ctx.session || !ctx.session.step) return;
  const step = ctx.session.step;
  const t = ctx.message && ctx.message.text ? ctx.message.text.trim() : '';

  if (step === 'ask_name') {
    ctx.session.booking.name = t || '—';
    ctx.session.step = 'ask_phone';
    return ctx.reply('Введите номер телефона:');
  }

  if (step === 'ask_phone') {
    ctx.session.booking.phone = t || '—';
    ctx.session.step = 'ask_hours';
    return ctx.reply('На сколько часов хотите забронировать?');
  }

  if (step === 'ask_hours') {
    ctx.session.booking.hours = t || '—';
    const b = ctx.session.booking;
    const info = saunaInfo[b.type] || {};
    const title = info.title || (b.type === 'small' ? 'Сауна поменьше' : 'Сауна побольше');
    const summary = `🧖 Новая бронь:\n\n${title}\n👤 Имя: ${b.name}\n📞 Телефон: ${b.phone}\n⏰ Часов: ${b.hours}\n📍 ${info.map || ''}`;

    try {
      await ctx.telegram.sendMessage(OWNER_CHAT_ID, summary);
    } catch (err) {
      console.error('Не удалось отправить владельцу (OWNER_CHAT_ID):', err && err.message ? err.message : err);
    }

    await ctx.reply('✅ Спасибо! Ваша заявка отправлена.');
    ctx.session = {}; // очищаем
  }
});

// --- Express сервер (чтобы Render думал, что это сайт) ---
const app = express();
app.get('/', (req, res) => res.send('✅ Бот работает — Render активен (polling).'));

// Самопинг (опционально) — чтобы Render не засыпал
if (SELF_URL) {
  setInterval(() => {
    fetch(SELF_URL + '/').catch(() => {});
    console.log('🔁 self-ping');
  }, 60 * 1000);
} else {
  console.log('ℹ️ SELF_URL не задан — self-ping отключен (можешь задать в .env)');
}

// Удаляем возможный webhook, чтобы не получить 409 (если раньше ставили webhook)
(async () => {
  try {
    await bot.telegram.deleteWebhook();
    console.log('✅ Webhook (если был) удалён — переход на polling.');
  } catch (err) {
    console.warn('Webhook delete warning (ignored):', err && err.message ? err.message : err);
  }

  // Запускаем polling
  try {
    await bot.launch();
    console.log('✅ Bot запущен (polling).');
  } catch (err) {
    console.error('Ошибка при запуске bot.launch():', err && err.message ? err.message : err);
    process.exit(1);
  }
})();

app.listen(PORT, () => {
  console.log(`✅ Express слушает порт ${PORT}`);
});

// graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
