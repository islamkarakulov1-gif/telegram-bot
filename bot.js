require('dotenv').config();
console.log("🚀 Bot запускается...");

const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const LocalSession = require('telegraf-session-local'); // ✅ локальные сессии

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;
const SELF_URL = process.env.SELF_URL;
const PORT = process.env.PORT || 3000;

// =============================
// ⚙️ Проверка переменных окружения
// =============================
if (!BOT_TOKEN || !OWNER_CHAT_ID || !SELF_URL) {
  console.error("❌ Укажи BOT_TOKEN, OWNER_CHAT_ID и SELF_URL в .env");
  process.exit(1);
}

// =============================
// 🧖 Медиа для саун
// =============================
const IMG_SMALL_URLS = [
  "https://i.ibb.co/ty5QdSg/IMG-20251010-WA0006.jpg",
  "https://i.ibb.co/sp2ZfMXx/IMG-20251010-WA0004.jpg",
  "https://i.ibb.co/bgmtyCZ7/IMG-20251010-WA0005.jpg"
];

const IMG_BIG_URLS = [
  "https://i.ibb.co/R4zfm85d/IMG-20251003-WA0008.jpg",
  "https://i.ibb.co/VpPhh83C/IMG-20251003-WA0004.jpg",
  "https://i.ibb.co/23s0WjgT/IMG-20251003-WA0005.jpg"
];

const MAP_LINK_SMALL = "https://go.2gis.com/30tRT";
const MAP_LINK_BIG = "https://go.2gis.com/OQSBA";

const VIDEO_SMALL = "https://files.catbox.moe/y9slc1.mp4";
const VIDEO_BIG = "https://files.catbox.moe/ol975e.mp4";

// =============================
// 🤖 Инициализация бота
// =============================
const bot = new Telegraf(BOT_TOKEN);

// ✅ Сессии хранятся в памяти (а не в файле)
bot.use(new LocalSession({ storage: LocalSession.storageMemory }).middleware());

// Главное меню
const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('Сауна поменьше', 'sauna_small')],
  [Markup.button.callback('Сауна побольше', 'sauna_big')],
]);

// =============================
// 🧾 Инфо о саунах
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
  if (ctx.session && ctx.session.step) return;

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

  try {
    for (const img of info.imgs) {
      await ctx.replyWithPhoto({ url: img });
    }

    if (info.video) {
      await ctx.replyWithVideo({ url: info.video });
    }

    const text = `*${info.title}*\n\n${info.text_ru}\n\n📍 [Посмотреть на карте](${info.map})`;
    await ctx.replyWithMarkdown(text, Markup.inlineKeyboard([
      [Markup.button.callback('📅 Забронировать', `book_${type}`)],
      [Markup.button.callback('🔙 Назад', 'back_to_menu')]
    ]));
  } catch (err) {
    console.error("Ошибка при отправке фото/видео:", err.message);
    await ctx.reply("⚠️ Ошибка при загрузке изображений. Попробуйте позже.");
  }
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
  if (!ctx.session.step) return;

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
    ctx.session = {}; // очищаем сессию
  }
});

// =============================
// 🌐 Express для Render
// =============================
const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => res.send('✅ Бот работает — Render активен.'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// 🕐 Автопинг Render каждые 5 минут
setInterval(() => {
  fetch(`${SELF_URL}/health`).catch(() => console.log('⏳ Автопинг Render...'));
}, 5 * 60 * 1000);

// =============================
// 🚀 Запуск
// =============================
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  bot.launch();
  console.log("✅ Bot запущен!");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
