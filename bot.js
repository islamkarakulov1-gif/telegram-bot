require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // Для авто-пинга Render

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;
const PORT = process.env.PORT || 3000;
const SELF_URL = process.env.SELF_URL; // твой URL на Render, например: https://my-sauna-bot.onrender.com

// =============================
// 🔗 КАРТИНКИ, ВИДЕО и КАРТЫ
// =============================

// 🧖 Картинки для сауны поменьше (оставь свои ссылки)
const IMG_SMALL_URLS = [
  "https://ibb.co.com/LXBpNQ2c",
  "https://ibb.co.com/svVz87HS",
  "https://ibb.co.com/Kd76KQZ"
];

// 🧖 Картинки для сауны побольше
const IMG_BIG_URLS = [
  "https://ibb.co.com/F4KR98Jp",
  "https://ibb.co.com/F4VrQ1kR",
  "https://ibb.co.com/VpQtPP9M"
];

// 📍 Ссылки на карты
const MAP_LINK_SMALL = "https://go.2gis.com/30tRT";
const MAP_LINK_BIG = "https://go.2gis.com/OQSBA";

// 🎥 ВИДЕО (вставь свои HTTPS ссылки на видео)
const VIDEO_SMALL = "https://files.catbox.moe/y9slc1.mp4"; // 🔸 видео для сауны поменьше
const VIDEO_BIG = "https://files.catbox.moe/ol975e.mp4";     // 🔹 видео для сауны побольше

// =======================================
// ⚙️ Проверка безопасности
// =======================================
if (!BOT_TOKEN || !OWNER_CHAT_ID || !SELF_URL) {
  console.error("❌ Укажи BOT_TOKEN, OWNER_CHAT_ID и SELF_URL в .env");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// Главное меню
const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('Сауна поменьше', 'sauna_small')],
  [Markup.button.callback('Сауна побольше', 'sauna_big')],
]);

// =============================
// 🧾 Информация о саунах
// =============================
function getSaunaInfo(type) {
  if (type === 'small') {
    return {
      title: "Сауна поменьше",
      text_ru: `Информация:
- До 5 человек
- Если больше 5 — доплата 1000 за каждого
- 7000 за час
- Минимально 2 часа аренды
- Кухни нет`,
      map: MAP_LINK_SMALL,
      imgs: IMG_SMALL_URLS,
      video: VIDEO_SMALL
    };
  } else {
    return {
      title: "Сауна побольше",
      text_ru: `Информация:
- До 8 человек
- Доплата за каждого сверх — 2000
- Стоимость: 12000
- Минимально аренда: 2 часа
- Кухни нет`,
      map: MAP_LINK_BIG,
      imgs: IMG_BIG_URLS,
      video: VIDEO_BIG
    };
  }
}

// =============================
// 👋 Приветствие
// =============================
bot.on('message', async (ctx) => {
  const kaz = "Сәлем! Бізге хабарласқаныңыз үшін рахмет.";
  const rus = "Привет! Спасибо за обращение.";
  await ctx.reply(`${kaz}\n${rus}`, mainMenu);
});

// =============================
// 🖼 Фото + 🎥 Видео + Инфо
// =============================
bot.action(['sauna_small', 'sauna_big'], async (ctx) => {
  await ctx.answerCbQuery();
  const type = ctx.callbackQuery.data === 'sauna_small' ? 'small' : 'big';
  const info = getSaunaInfo(type);

  // Отправляем фото
  for (const img of info.imgs) {
    await ctx.replyWithPhoto({ url: img });
  }

  // Отправляем видео
  if (info.video) {
    await ctx.replyWithVideo({ url: info.video });
  }

  const text = `*${info.title}*\n\n${info.text_ru}\n\n📍 [Посмотреть на карте](${info.map})`;
  await ctx.replyWithMarkdown(text, Markup.inlineKeyboard([
    [Markup.button.callback('📅 Забронировать', `book_${type}`)],
    [Markup.button.callback('🔙 Назад', 'back_to_menu')]
  ]));
});

// =============================
// 🔙 Назад
// =============================
bot.action('back_to_menu', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Главное меню:', mainMenu);
});

// =============================
// 📝 Бронирование
// =============================
bot.action(/book_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const type = ctx.match[1];
  ctx.session.booking = { type };
  ctx.session.step = 'ask_name';
  await ctx.reply('Введите ваше имя:');
});

bot.on('text', async (ctx) => {
  if (!ctx.session || !ctx.session.step) return;
  const step = ctx.session.step;
  const text = ctx.message.text;

  if (step === 'ask_name') {
    ctx.session.booking.name = text;
    ctx.session.step = 'ask_phone';
    return ctx.reply('Введите номер телефона:');
  }

  if (step === 'ask_phone') {
    ctx.session.booking.phone = text;
    ctx.session.step = 'ask_hours';
    return ctx.reply('На сколько часов хотите забронировать?');
  }

  if (step === 'ask_hours') {
    ctx.session.booking.hours = text;
    const b = ctx.session.booking;
    const title = b.type === 'small' ? 'Сауна поменьше' : 'Сауна побольше';
    const summary = `🧖 Новая бронь:\n\n${title}\n👤 Имя: ${b.name}\n📞 Телефон: ${b.phone}\n⏰ Часов: ${b.hours}\n📍 Карта: ${b.type === 'small' ? MAP_LINK_SMALL : MAP_LINK_BIG}`;
    await ctx.telegram.sendMessage(OWNER_CHAT_ID, summary);
    await ctx.reply('✅ Спасибо! Ваша заявка отправлена.');
    ctx.session = null;
  }
});

// =============================
// 🌐 Express-сервер для Render
// =============================
const app = express();
app.use(bodyParser.json());
app.get('/', (req, res) => res.send('Бот работает — Render используется для безопасности токенов'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// 🕐 Авто-пинг Render каждые 5 минут
setInterval(() => {
  fetch(`${SELF_URL}/health`).catch(() => console.log('⏳ Авто-пинг Render...'));
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  bot.launch();
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
